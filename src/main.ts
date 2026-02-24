// Apify SDK - toolkit for building Apify Actors (Read more at https://docs.apify.com/sdk/js/).
import { Actor } from 'apify';
import { config } from 'dotenv';
import { handleInputProfiles } from './utils/input.js';
import { createHarvestApiScraper } from './utils/scraper.js';
import { createState, preserveState } from './utils/state.js';
import { Input } from './utils/types.js';

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

const state = await createState(input);

if (state.pricingInfo.maxTotalChargeUsd < 0.004) {
  console.warn(
    'Warning: The maximum total charge is set to less than $0.004, which will not be sufficient for scraping LinkedIn profiles.',
  );
  await Actor.exit({
    statusMessage: 'max charge reached',
  });
}

const { profiles } = handleInputProfiles(input, state);

let itemsToScrape = profiles.length;
if (itemsToScrape > state.maxItems) {
  itemsToScrape = state.maxItems;
}

Actor.on('migrating', async () => {
  await preserveState(state);
  await Actor.reboot();
});

const profileScraper = await createHarvestApiScraper({
  concurrency: state.isPaying ? 12 : 2,
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

// Gracefully exit the Actor process. It's recommended to quit all Actors with an exit().
await Actor.exit({
  statusMessage: 'success',
});
