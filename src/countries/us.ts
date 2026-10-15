import type { CountryConfig } from './types';

export const us: CountryConfig = {
  code: 'us',
  name: 'United States',
  shortName: 'US',
  adjective: 'US',
  hreflang: 'en-us',
  locale: 'en-US',
  currency: 'USD',
  currencySymbol: '$',
  taxYear: '2026',
  launched: true,
  detect: {
    timezones: [
      'America/New_York',
      'America/Detroit',
      'America/Kentucky/Louisville',
      'America/Kentucky/Monticello',
      'America/Indiana/Indianapolis',
      'America/Chicago',
      'America/Menominee',
      'America/North_Dakota/Center',
      'America/Denver',
      'America/Boise',
      'America/Phoenix',
      'America/Los_Angeles',
      'America/Anchorage',
      'America/Juneau',
      'America/Sitka',
      'America/Nome',
      'Pacific/Honolulu',
      'America/Puerto_Rico',
    ],
    languages: ['en-US'],
  },
  incomeTax: {
    label: 'Federal income tax, single filer',
    // VERIFY: https://www.irs.gov/pub/irs-drop/rp-25-32.pdf (2026). Checked 16 Oct 2026.
    allowance: 16_100,
    allowanceLabel: 'Standard deduction',
    bands: [
      // VERIFY: https://www.irs.gov/pub/irs-drop/rp-25-32.pdf, Rev. Proc. 2025-32 table for single filers (2026). Checked 16 Oct 2026.
      { from: 0, to: 12_400, rate: 0.1 },
      { from: 12_400, to: 50_400, rate: 0.12 },
      { from: 50_400, to: 105_700, rate: 0.22 },
      { from: 105_700, to: 201_775, rate: 0.24 },
      { from: 201_775, to: 256_225, rate: 0.32 },
      { from: 256_225, to: 640_600, rate: 0.35 },
      { from: 640_600, to: null, rate: 0.37 },
    ],
  },
  defaults: {
    loan: { amount: 20_000, aprPercent: 7.5, termYears: 5 },
  },
};
