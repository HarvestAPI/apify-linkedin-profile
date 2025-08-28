import { Input, ProfileScraperMode } from './types.js';

const profileScraperModeInputMap1: Record<string, ProfileScraperMode> = {
  'Profile details no email ($4 per 1k)': ProfileScraperMode.FULL,
  'Profile details + email search ($10 per 1k)': ProfileScraperMode.EMAIL,
};
const profileScraperModeInputMap2: Record<string, ProfileScraperMode> = {
  '2': ProfileScraperMode.FULL,
  '3': ProfileScraperMode.EMAIL,
};

export function handleInput(input: Input) {
  const profiles = [
    ...(input.urls || [])
      .map((s) => s.trim())
      .filter(Boolean)
      .map((url) => ({ url })),
    ...(input.publicIdentifiers || [])
      .map((s) => s.trim())
      .filter(Boolean)
      .map((publicIdentifier) => ({ publicIdentifier })),
    ...(input.profileIds || [])
      .map((s) => s.trim())
      .filter(Boolean)
      .map((profileId) => ({ profileId })),
    ...(input.queries || [])
      .map((s) => s.trim())
      .filter(Boolean)
      .map((query) => ({ query })),
  ];

  return {
    profiles,
    profileScraperMode:
      profileScraperModeInputMap1[input.profileScraperMode] ??
      profileScraperModeInputMap2[input.profileScraperMode] ??
      ProfileScraperMode.FULL,
  };
}
