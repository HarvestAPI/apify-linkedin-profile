import { Actor } from 'apify';
import { createConcurrentQueues } from './queue.js';

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
        const params = new URLSearchParams({ ...query });

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

        if (response.element?.id && response.status < 400) {
          // Save headings to Dataset - a table-like storage.
          console.info(
            `Scraped item#${index} ${JSON.stringify(query)}. Progress: ${processedCounter}/${total}`,
          );
          await Actor.pushData(response);
        } else {
          console.error(
            `Error scraping ${JSON.stringify(query)}: ${JSON.stringify(response, null, 2)}`,
          );
        }
      },
    ),
  };
}
