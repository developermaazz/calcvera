import type { CountryConfig } from './types';

// Phase 2 (month 4–6). Not launched: no pages are generated until `launched` is true.
export const ca: CountryConfig = {
  code: 'ca',
  name: 'Canada',
  shortName: 'Canada',
  adjective: 'Canadian',
  hreflang: 'en-ca',
  locale: 'en-CA',
  currency: 'CAD',
  currencySymbol: '$',
  taxYear: '2026',
  launched: false,
  detect: {
    timezones: [
      'America/Toronto',
      'America/Montreal',
      'America/Vancouver',
      'America/Edmonton',
      'America/Winnipeg',
      'America/Regina',
      'America/Halifax',
      'America/St_Johns',
      'America/Moncton',
      'America/Whitehorse',
      'America/Yellowknife',
      'America/Iqaluit',
    ],
    languages: ['en-CA', 'fr-CA'],
  },
  incomeTax: {
    label: 'Federal income tax',
    // VERIFY: https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/payroll-deductions-contributions/income-tax/reducing-remuneration-subject-income-tax.html (2026). Maximum BPA; it phases down to $14,829 between $181,440 and $258,482. Checked 16 Oct 2026.
    allowance: 16_452,
    allowanceLabel: 'Basic personal amount',
    bands: [
      // VERIFY: same CRA page (2026). Lowest rate is 14% for 2026 onwards (14.5% blended for 2025). Checked 16 Oct 2026.
      { from: 0, to: 58_523, rate: 0.14 },
      { from: 58_523, to: 117_045, rate: 0.205 },
      { from: 117_045, to: 181_440, rate: 0.26 },
      { from: 181_440, to: 258_482, rate: 0.29 },
      { from: 258_482, to: null, rate: 0.33 },
    ],
  },
  defaults: {},
};
