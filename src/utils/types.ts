import { User } from 'apify-client';

export type Input = {
  profileScraperMode: string;
  urls?: string[];
  publicIdentifiers?: string[];
  profileIds?: string[];
  queries?: string[];
};

export enum ProfileScraperMode {
  FULL = 'FULL',
  EMAIL = 'EMAIL',
}

export type ScraperState = {
  profileScraperMode: ProfileScraperMode;
  user: User | null;
  isPaying: boolean;
  isPayPerEvent?: boolean;
};
