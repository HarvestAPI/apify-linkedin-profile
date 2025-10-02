import { handleInputProfileScraperMode } from './input.js';
import { Input, ScraperState } from './types.js';
import { Actor } from 'apify';

const client = Actor.newClient();
const { userId } = Actor.getEnv();

export async function createState(input: Input) {
  const user = userId ? await client.user(userId).get() : null;
  const isPaying = (user as Record<string, any> | null)?.isPaying === false ? false : true; // default is true, in case we cannot determine the user status, and to not limit paid users
  const maxItems = Actor.getEnv().actorMaxPaidDatasetItems || 1000000;
  const cm = Actor.getChargingManager();
  const pricingInfo = cm.getPricingInfo();

  const { profileScraperMode } = handleInputProfileScraperMode(input);

  const resurrectedState: ScraperState | null = await Actor.getValue('crawling-state');

  const state: ScraperState = {
    isPaying,
    profileScraperMode,
    user,
    isPayPerEvent: pricingInfo.isPayPerEvent,
    scrapedProfiles: resurrectedState?.scrapedProfiles || [],
    maxItems,
    pricingInfo,
  };

  return state;
}

export async function preserveState(state: ScraperState) {
  await Actor.setValue('crawling-state', state);
}
