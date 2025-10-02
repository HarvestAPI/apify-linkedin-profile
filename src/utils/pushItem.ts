import { Actor, ChargeResult } from 'apify';
import { preserveState } from './state.js';
import { ProfileScraperMode, ScraperState } from './types.js';

export async function pushItem(
  state: ScraperState,
  item: any,
  payments: string[],
  query: Record<string, string>,
) {
  let pushResult: ChargeResult | undefined;

  if (item?.element) {
    item = {
      ...item.element,
      ...item,
    };
    item.element = {
      _deprecationInfo:
        '`element` property is deprecated to simplify output of this actor. All profile properties are now top-level. Please update your integrations accordingly. ',
      ...item.element,
    };
  }

  if (state.profileScraperMode === ProfileScraperMode.FULL) {
    pushResult = await Actor.pushData(item, 'profile');
  }
  if (state.profileScraperMode === ProfileScraperMode.EMAIL) {
    if (payments.includes('linkedinProfileWithEmail')) {
      pushResult = await Actor.pushData(item, 'profile_with_email');
    } else {
      pushResult = await Actor.pushData(item, 'profile');
    }
  }

  if (pushResult?.eventChargeLimitReached) {
    await Actor.exit({
      statusMessage: 'max charge reached',
    });
  }

  state.scrapedProfiles.push(query.query || query.url || query.publicIdentifier || query.profileId);
  void preserveState(state);
}
