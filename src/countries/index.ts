import { au } from './au';
import { ca } from './ca';
import { india } from './in';
import { pk } from './pk';
import type { CountryCode, CountryConfig } from './types';
import { uk } from './uk';
import { us } from './us';

export const COUNTRIES: Partial<Record<CountryCode, CountryConfig>> = { us, uk, ca, au, in: india, pk };

/** Countries in display order: launched first, then coming soon. */
export const ALL_COUNTRIES: CountryConfig[] = [us, uk, ca, au, india, pk];

export const LAUNCHED_COUNTRIES: CountryConfig[] = ALL_COUNTRIES.filter((c) => c.launched);

export function getCountry(code: string): CountryConfig {
  const country = COUNTRIES[code as CountryCode];
  if (!country) throw new Error(`Unknown country code: ${code}`);
  return country;
}

export function isLaunched(code: CountryCode): boolean {
  return COUNTRIES[code]?.launched === true;
}

/**
 * Reads a Pending figure. Throws during the build if it hasn't been filled in from its official source,
 * so a calculator page can never ship with a missing tax figure.
 */
export function requireFigure<T>(value: T | null | undefined, name: string): T {
  if (value === null || value === undefined) {
    throw new Error(`Missing official figure: ${name}. Fill it in from the source in its VERIFY comment.`);
  }
  return value;
}

export type { CountryCode, CountryConfig } from './types';
