// Apify SDK - toolkit for building Apify Actors (Read more at https://docs.apify.com/sdk/js/).
import { Actor } from 'apify';

// this is ESM project, and as such, it requires you to specify extensions in your relative imports
// read more about this here: https://nodejs.org/docs/latest-v18.x/api/esm.html#mandatory-file-extensions
// note that we need to use `.js` even when inside TS files
// import { router } from './routes.js';

// The init() call configures the Actor for its environment. It's recommended to start every Actor with an init().
await Actor.init();

interface Input {
  profiles: {
    url: string;
    publicIdentifier: string;
    profileId: string;
  }[];
}
// Structure of input is defined in input_schema.json
const input = await Actor.getInput<Input>();
if (!input) throw new Error('Input is missing!');

for (const profile of input.profiles) {
  const params = new URLSearchParams({ ...profile });

  let response = await fetch(`https://api.harvest-api.com/linkedin/profile?${params.toString()}`, {
    headers: { 'X-API-Key': process.env.HARVESTAPI_TOKEN! },
  }).then((response) => response.json());

  if (response.status && response.status >= 400 && typeof response.error === 'object') {
    response = response.error;
  }

  delete response.user;
  delete response.credits;

  // Save headings to Dataset - a table-like storage.
  await Actor.pushData(response);
}

// Gracefully exit the Actor process. It's recommended to quit all Actors with an exit().
await Actor.exit();
