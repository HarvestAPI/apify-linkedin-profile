import { Actor } from 'apify';
import { createConcurrentQueues } from './queue.js';

const MAX_SCRAPED_ITEMS = 1000;

export function createHarvestApiScraper({ concurrency }: { concurrency: number }) {
  let processedCounter = 0;

  return {
    addJob: createConcurrentQueues(
      concurrency,
      async ({
        path,
        index,
        query,
        total,
      }: {
        query: Record<string, string>;
        path: string;
        index: number;
        total: number;
      }) => {
        if (processedCounter >= MAX_SCRAPED_ITEMS) {
          console.warn(`Max scraped items reached: ${MAX_SCRAPED_ITEMS}`);
          return;
        }

        const params = new URLSearchParams({ ...query });

        console.info(`Starting item#${index + 1} ${JSON.stringify(query)}...`);
        const timestamp = new Date();

        const response = await fetch(`https://api.harvest-api.com/${path}?${params.toString()}`, {
          headers: { 'X-API-Key': process.env.HARVESTAPI_TOKEN! },
        })
          .then((response) => response.json())
          .catch((error) => {
            console.error(`Error fetching ${path}:`, error);
            return { error };
          });

        delete response.user;
        delete response.credits;
        if (typeof response.error === 'object') {
          delete response.error.user;
          delete response.error.credits;
        }

        processedCounter++;
        const elapsed = new Date().getTime() - timestamp.getTime();

        if (response.element?.id && response.status < 400) {
          console.info(
            `Scraped item#${index + 1} ${JSON.stringify(query)}. Elapsed: ${(
              elapsed / 1000
            ).toFixed(2)}s. Progress: ${processedCounter}/${total}`,
          );
          // Save headings to Dataset - a table-like storage.
          await Actor.pushData(response);
        } else {
          console.error(
            `Error scraping item#${index + 1} ${JSON.stringify(query)}: ${JSON.stringify(
              typeof response.error === 'object' ? response.error : response,
              null,
              2,
            )}`,
          );
        }
      },
    ),
  };
}
