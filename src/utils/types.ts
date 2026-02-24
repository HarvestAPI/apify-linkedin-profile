import { ActorPricingInfo } from 'apify';

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
  isPaying: boolean;
  isPayPerEvent?: boolean;
  scrapedProfiles: string[];
  maxItems: number;
  pricingInfo: ActorPricingInfo;
};
