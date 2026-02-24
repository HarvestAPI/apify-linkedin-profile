import { handleInputProfileScraperMode } from './input.js';
import { Input, ScraperState } from './types.js';
import { Actor } from 'apify';

const isPaying = !!process.env.APIFY_USER_IS_PAYING;

export async function createState(input: Input) {
  const maxItems = Actor.getEnv().actorMaxPaidDatasetItems || 1000000;
  const cm = Actor.getChargingManager();
  const pricingInfo = cm.getPricingInfo();

  const { profileScraperMode } = handleInputProfileScraperMode(input);

  const resurrectedState: ScraperState | null = await Actor.getValue('crawling-state');

  const state: ScraperState = {
    isPaying,
    profileScraperMode,
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
