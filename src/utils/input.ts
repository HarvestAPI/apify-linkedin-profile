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
  const profiles = [
    ...(input.urls || [])
      .map((s) => s.trim())
      .filter(Boolean)
      .map((url): ProfileQuery => ({ url })),
    ...(input.publicIdentifiers || [])
      .map((s) => s.trim())
      .filter(Boolean)
      .map((publicIdentifier): ProfileQuery => ({ publicIdentifier })),
    ...(input.profileIds || [])
      .map((s) => s.trim())
      .filter(Boolean)
      .map((profileId): ProfileQuery => ({ profileId })),
    ...(input.queries || [])
      .map((s) => s.trim())
      .filter(Boolean)
      .map((query): ProfileQuery => ({ query })),
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
