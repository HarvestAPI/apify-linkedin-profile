import { Input, ProfileScraperMode, ScraperState } from './types.js';

const profileScraperModeInputMap1: Record<string, ProfileScraperMode> = {
  'Profile details no email ($4 per 1k)': ProfileScraperMode.FULL,
  'Profile details + email search ($10 per 1k)': ProfileScraperMode.EMAIL,
};
const profileScraperModeInputMap2: Record<string, ProfileScraperMode> = {
  '2': ProfileScraperMode.FULL,
  '3': ProfileScraperMode.EMAIL,
};
type ProfileQuery = {
  url?: string;
  publicIdentifier?: string;
  profileId?: string;
  query?: string;
};

export function handleInputProfileScraperMode(input: Input) {
  return {
    profileScraperMode:
      profileScraperModeInputMap1[input.profileScraperMode] ??
      profileScraperModeInputMap2[input.profileScraperMode] ??
      ProfileScraperMode.FULL,
  };
}

export function handleInputProfiles(input: Input, state: ScraperState) {
  const parseInputArray = (arr: string[] | undefined) => {
    if (!Array.isArray(arr)) return [];
    return [...new Set(arr.map((s) => (typeof s === 'string' ? s.trim() : '')).filter(Boolean))];
  };

  const profiles = [
    ...parseInputArray(input.urls).map((url): ProfileQuery => ({ url })),
    ...parseInputArray(input.publicIdentifiers).map(
      (publicIdentifier): ProfileQuery => ({ publicIdentifier }),
    ),
    ...parseInputArray(input.profileIds).map((profileId): ProfileQuery => ({ profileId })),
    ...parseInputArray(input.queries).map((query): ProfileQuery => ({ query })),
  ].filter((item) => {
    if (
      state.scrapedProfiles.includes(
        item.query || item.url || item.publicIdentifier || item.profileId || '',
      )
    ) {
      return false;
    }
    return true;
  });

  return {
    profiles,
  };
}
