import type { CountryConfig } from './types';

export const uk: CountryConfig = {
  code: 'uk',
  name: 'United Kingdom',
  shortName: 'UK',
  adjective: 'UK',
  hreflang: 'en-gb',
  locale: 'en-GB',
  currency: 'GBP',
  currencySymbol: '£',
  taxYear: '2026/27',
  launched: true,
  detect: {
    timezones: ['Europe/London', 'Europe/Belfast'],
    languages: ['en-GB'],
  },
  incomeTax: {
    label: 'Income Tax, England, Wales and Northern Ireland',
    // VERIFY: https://www.gov.uk/income-tax-rates (2026/27). Allowance tapers by £1 per £2 above £100,000. Checked 16 Oct 2026.
    allowance: 12_570,
    allowanceLabel: 'Personal Allowance',
    bands: [
      // VERIFY: https://www.gov.uk/income-tax-rates (2026/27). Bands are taxable income above the allowance. Checked 16 Oct 2026.
      { from: 0, to: 37_700, rate: 0.2 },
      { from: 37_700, to: 125_140, rate: 0.4 },
      { from: 125_140, to: null, rate: 0.45 },
    ],
  },
  defaults: {
    loan: { amount: 10_000, aprPercent: 6.9, termYears: 5 },
  },
};
