import type { CountryConfig } from './types';

// Phase 2 (month 4–6). Not launched: no pages are generated until `launched` is true.
export const au: CountryConfig = {
  code: 'au',
  name: 'Australia',
  shortName: 'Australia',
  adjective: 'Australian',
  hreflang: 'en-au',
  locale: 'en-AU',
  currency: 'AUD',
  currencySymbol: '$',
  taxYear: '2026–27',
  launched: false,
  detect: {
    timezones: [
      'Australia/Sydney',
      'Australia/Melbourne',
      'Australia/Brisbane',
      'Australia/Adelaide',
      'Australia/Perth',
      'Australia/Hobart',
      'Australia/Darwin',
      'Australia/Canberra',
    ],
    languages: ['en-AU'],
  },
  incomeTax: {
    label: 'Resident income tax',
    // VERIFY: https://www.ato.gov.au/tax-rates-and-codes/tax-rates-australian-residents (2026–27). Excludes 2% Medicare levy. Checked 16 Oct 2026.
    allowance: 18_200,
    allowanceLabel: 'Tax-free threshold',
    bands: [
      // VERIFY: same ATO page (2026–27). 16% rate falls to 15% from 1 July 2026, then 14% from 1 July 2027. Checked 16 Oct 2026.
      // Bands are expressed as taxable income above the tax-free threshold.
      { from: 0, to: 26_800, rate: 0.15 },
      { from: 26_800, to: 116_800, rate: 0.3 },
      { from: 116_800, to: 171_800, rate: 0.37 },
      { from: 171_800, to: null, rate: 0.45 },
    ],
  },
  defaults: {},
};
