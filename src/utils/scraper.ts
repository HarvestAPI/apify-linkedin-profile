import { Actor } from 'apify';
import { createConcurrentQueues } from './queue.js';
import { isProfileUrl } from './url-parsers.js';
import { ProfileScraperMode } from '../main.js';

const { actorId, actorRunId, actorBuildId, userId, actorMaxPaidDatasetItems, memoryMbytes } =
  Actor.getEnv();

export async function createHarvestApiScraper({
  concurrency,
  state,
}: {
  concurrency: number;
  state: {
    datasetPushPromise?: Promise<any>;
    profileScraperMode: ProfileScraperMode;
    isPaying: boolean;
    isPayPerEvent?: boolean;
  };
}) {
  let processedCounter = 0;
  let scrapedCounter = 0;

  const client = Actor.newClient();
  const user = userId ? await client.user(userId).get() : null;

  const pushItem = async (item: any, payments: string[]) => {
    if (state.isPayPerEvent) {
      if (state.profileScraperMode === ProfileScraperMode.FULL) {
        state.datasetPushPromise = Actor.pushData(item, 'profile');
      }
      if (state.profileScraperMode === ProfileScraperMode.EMAIL) {
        if (payments.includes('linkedinProfileWithEmail')) {
          state.datasetPushPromise = Actor.pushData(item, 'profile_with_email');
        } else {
          state.datasetPushPromise = Actor.pushData(item, 'profile');
        }
      }
    } else {
      state.datasetPushPromise = Actor.pushData(item);
    }
  };

  return {
    addJob: createConcurrentQueues(
      concurrency,
      async ({
        index,
        query,
        total,
      }: {
        query: Record<string, string>;
        index: number;
        total: number;
      }) => {
        if (actorMaxPaidDatasetItems && scrapedCounter >= actorMaxPaidDatasetItems) {
          console.warn(`Max scraped items reached: ${actorMaxPaidDatasetItems}`);
          return;
        }

        const params = new URLSearchParams({
          ...query,
          findEmail: state.profileScraperMode === ProfileScraperMode.EMAIL ? 'true' : '',
        });

        console.info(`Starting item#${index + 1} ${JSON.stringify(query)}...`);
        const timestamp = new Date();

        let path = 'linkedin/profile';

        if (isProfileUrl(query.query) || isProfileUrl(query.url)) {
          path = 'linkedin/profile';
        } else {
          path = 'linkedin/company';
        }

        const baseUrl = process.env.HARVESTAPI_URL || 'https://api.harvest-api.com';
        const url = `${baseUrl}/${path}?${params.toString()}`;

        const response = await fetch(url, {
          headers: {
            'X-API-Key': process.env.HARVESTAPI_TOKEN!,
            'x-apify-userid': userId!,
            'x-apify-actor-id': actorId!,
            'x-apify-actor-run-id': actorRunId!,
            'x-apify-actor-build-id': actorBuildId!,
            'x-apify-memory-mbytes': String(memoryMbytes),
            'x-apify-actor-max-paid-dataset-items': String(actorMaxPaidDatasetItems) || '0',
            'x-apify-username': user?.username || '',
            'x-apify-user-is-paying': (user as Record<string, any> | null)?.isPaying,
            'x-sub-user': !state.isPaying && user?.username ? user.username : '',
            'x-concurrency': !state.isPaying && user?.username ? '4' : '',
          },
        })
          .then((response) => response.json())
          .catch((error) => {
            console.error(`Error fetching ${path}:`, error);
            return { error };
          });

        const isPaid = !!response.cost;
        const payments: string[] = response.payments || [];

        delete response.user;
        delete response.cost;
        delete response.payments;
        if (typeof response.error === 'object') {
          delete response.error.user;
          delete response.error.cost;
          delete response.error.payments;
        }

        const elapsed = new Date().getTime() - timestamp.getTime();
        processedCounter++;

        if (actorMaxPaidDatasetItems && scrapedCounter >= actorMaxPaidDatasetItems) {
          console.warn(`Max scraped items reached: ${actorMaxPaidDatasetItems}`);
          return;
        }
        if (isPaid) {
          pushItem(response, payments);
        }

        if (response.element?.id) {
          scrapedCounter++;

          console.info(
            `Scraped item#${index + 1} ${JSON.stringify(query)}. Elapsed: ${elapsed}. Progress: ${processedCounter}/${total}`,
          );
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
