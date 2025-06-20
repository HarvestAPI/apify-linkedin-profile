// Apify SDK - toolkit for building Apify Actors (Read more at https://docs.apify.com/sdk/js/).
import { Actor } from 'apify';
import { createHarvestApiScraper } from './utils/scraper.js';
import { config } from 'dotenv';
import { styleText } from 'node:util';

config();

// this is ESM project, and as such, it requires you to specify extensions in your relative imports
// read more about this here: https://nodejs.org/docs/latest-v18.x/api/esm.html#mandatory-file-extensions
// note that we need to use `.js` even when inside TS files
// import { router } from './routes.js';

// The init() call configures the Actor for its environment. It's recommended to start every Actor with an init().
await Actor.init();

// console.log(`userId:`, Actor.getEnv().userId);

interface Input {
  urls?: string[];
  publicIdentifiers?: string[];
  profileIds?: string[];
  queries?: string[];
}
// Structure of input is defined in input_schema.json
const input = await Actor.getInput<Input>();
if (!input) throw new Error('Input is missing!');

const profiles = [
  ...(input.urls || []).map((url) => ({ url })),
  ...(input.publicIdentifiers || []).map((publicIdentifier) => ({ publicIdentifier })),
  ...(input.profileIds || []).map((profileId) => ({ profileId })),
  ...(input.queries || []).map((query) => ({ query })),
];

const state: {
  datasetPushPromise?: Promise<void>;
} = {};

const { userId } = Actor.getEnv();
const client = Actor.newClient();

const user = userId ? await client.user(userId).get() : null;
const isPaying = (user as Record<string, any> | null)?.isPaying === false ? false : true;
const maxItems = Actor.getEnv().actorMaxPaidDatasetItems || 100000;

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

let isFreeUserExceeding = false;
const logFreeUserExceeding = () =>
  console.warn(
    styleText('bgYellow', ' [WARNING] ') +
      ' Free users are limited up to 10 items per run. Please upgrade to a paid plan to scrape more items.',
  );

if (!isPaying) {
  if (totalRuns > 15) {
    console.warn(
      styleText('bgYellow', ' [WARNING] ') +
        ' Free users are limited to 15 runs. Please upgrade to a paid plan to run more.',
    );
    await Actor.exit();
    process.exit(0);
  }

  if (itemsToScrape > 10) {
    isFreeUserExceeding = true;
    itemsToScrape = 10;
    logFreeUserExceeding();
  }
}

const profileScraper = await createHarvestApiScraper({
  concurrency: 6,
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

await state.datasetPushPromise;

if (isFreeUserExceeding) {
  logFreeUserExceeding();
}

// Gracefully exit the Actor process. It's recommended to quit all Actors with an exit().
await Actor.exit();
