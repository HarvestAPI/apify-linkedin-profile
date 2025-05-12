// Apify SDK - toolkit for building Apify Actors (Read more at https://docs.apify.com/sdk/js/).
import { Actor } from 'apify';
import { createHarvestApiScraper } from './utils/scraper.js';
import { config } from 'dotenv';

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

const profileScraper = createHarvestApiScraper({
  concurrency: 6,
});

const promises = profiles.map((profile, index) => {
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
await Actor.exit();
