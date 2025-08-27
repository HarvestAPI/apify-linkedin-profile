// Apify SDK - toolkit for building Apify Actors (Read more at https://docs.apify.com/sdk/js/).
import { Actor } from 'apify';
import { config } from 'dotenv';
import { styleText } from 'node:util';
import { handleInput } from './utils/input.js';
import { createHarvestApiScraper } from './utils/scraper.js';
import { Input, ProfileScraperMode, ScraperState } from './utils/types.js';

config();

// this is ESM project, and as such, it requires you to specify extensions in your relative imports
// read more about this here: https://nodejs.org/docs/latest-v18.x/api/esm.html#mandatory-file-extensions
// note that we need to use `.js` even when inside TS files
// import { router } from './routes.js';

// The init() call configures the Actor for its environment. It's recommended to start every Actor with an init().
await Actor.init();

// Structure of input is defined in input_schema.json
const input = await Actor.getInput<Input>();
if (!input) throw new Error('Input is missing!');

const { userId } = Actor.getEnv();
const client = Actor.newClient();

const user = userId ? await client.user(userId).get() : null;
const isPaying = (user as Record<string, any> | null)?.isPaying === false ? false : true; // default is true, in case we cannot determine the user status, and to not limit paid users
const maxItems = Actor.getEnv().actorMaxPaidDatasetItems || 100000;
const cm = Actor.getChargingManager();
const pricingInfo = cm.getPricingInfo();

if (pricingInfo.maxTotalChargeUsd < 0.004) {
  console.warn(
    'Warning: The maximum total charge is set to less than $0.004, which will not be sufficient for scraping LinkedIn profiles.',
  );
  await Actor.exit({
    statusMessage: 'max charge reached',
  });
}

const { profiles, profileScraperMode } = handleInput(input);

export const state: ScraperState = {
  isPaying,
  profileScraperMode,
  user,
  isPayPerEvent: pricingInfo.isPayPerEvent,
};

let itemsToScrape = profiles.length;
if (itemsToScrape > maxItems) {
  itemsToScrape = maxItems;
}

let totalRuns = 0;
if (userId && !isPaying) {
  const store = await Actor.openKeyValueStore('linkedin-profile-scraper-run-counter-store');
  totalRuns = Number(await store.getValue(userId)) || 0;
  totalRuns++;
  await store.setValue(userId, totalRuns);
}

let maxItemsExceeding: number | null = null;
let isFreeUserExceeding = false;
const logFreeUserExceeding = () =>
  console.warn(
    styleText('bgYellow', ' [WARNING] ') +
      ` Free users are limited up to ${maxItemsExceeding} items per run. Please upgrade to a paid plan to scrape more items.`,
  );

if (!isPaying && state.profileScraperMode === ProfileScraperMode.EMAIL) {
  if (totalRuns > 15) {
    console.warn(
      styleText('bgYellow', ' [WARNING] ') +
        ' Free users are limited to 15 runs. Please upgrade to a paid plan to run more.',
    );
    await Actor.exit({
      statusMessage: 'max runs reached',
    });
  }
  maxItemsExceeding = 5;
} else if (!isPaying) {
  maxItemsExceeding = 50;
}

if (maxItemsExceeding && itemsToScrape > maxItemsExceeding) {
  isFreeUserExceeding = true;
  itemsToScrape = maxItemsExceeding;
  logFreeUserExceeding();
}

const profileScraper = await createHarvestApiScraper({
  concurrency: state.isPaying ? 8 : 2,
  state,
});

const promises = profiles.slice(0, itemsToScrape).map((profile, index) => {
  return profileScraper.addJob({
    query: profile,
    index,
    total: profiles.length,
  });
});

await Promise.all(promises).catch((error) => {
  console.error(`Error scraping profiles:`, error);
});

if (isFreeUserExceeding) {
  logFreeUserExceeding();
}

// Gracefully exit the Actor process. It's recommended to quit all Actors with an exit().
await Actor.exit({
  statusMessage: 'success',
});
