import type { CountryConfig } from './types';

// Early start with one calculator; full rollout in Phase 2 (CLAUDE.md section 2).
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
  launched: true,
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
  ca: {
    fhsa: {
      // VERIFY: https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/first-home-savings-account/contributing-your-fhsa.html
      // ($8,000 room in the first year, $40,000 lifetime, carry-forward up to $8,000). Checked 16 Oct 2026.
      annualLimit: 8_000,
      lifetimeLimit: 40_000,
      maxCarryForward: 8_000,
      // VERIFY: https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/first-home-savings-account/closing-your-fhsa.html
      // (15th anniversary of opening, the year you turn 71, or the year after a qualifying withdrawal). Checked 16 Oct 2026.
      maxParticipationYears: 15,
    },
    // Brackets, all except QC: https://www.canada.ca/en/revenue-agency/services/tax/individuals/tax-rates-brackets/current-year.html (2026)
    // Basic personal amounts, all except QC: CRA T4127 (122nd edition, January 2026):
    // https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4127-payroll-deductions-formulas/t4127-jan/t4127-jan-payroll-deductions-formulas-computer-programs.html
    // QC: https://www.revenuquebec.ca/en/citizens/income-tax-return/completing-your-income-tax-return/income-tax-rates/ and
    // https://www.revenuquebec.ca/en/businesses/source-deductions-and-employer-contributions/employers-principal-changes-for-2026/ (BPA $18,952)
    // VERIFY: all values below checked 16 Oct 2026 (2026 tax year).
    provinces: [
      {
        code: 'AB',
        name: 'Alberta',
        basicPersonalAmount: 22_769,
        bands: [
          { from: 0, to: 61_200, rate: 0.08 },
          { from: 61_200, to: 154_259, rate: 0.1 },
          { from: 154_259, to: 185_111, rate: 0.12 },
          { from: 185_111, to: 246_813, rate: 0.13 },
          { from: 246_813, to: 370_220, rate: 0.14 },
          { from: 370_220, to: null, rate: 0.15 },
        ],
      },
      {
        code: 'BC',
        name: 'British Columbia',
        basicPersonalAmount: 13_216,
        bands: [
          { from: 0, to: 50_363, rate: 0.056 },
          { from: 50_363, to: 100_728, rate: 0.077 },
          { from: 100_728, to: 115_648, rate: 0.105 },
          { from: 115_648, to: 140_430, rate: 0.1229 },
          { from: 140_430, to: 190_405, rate: 0.147 },
          { from: 190_405, to: 265_545, rate: 0.168 },
          { from: 265_545, to: null, rate: 0.205 },
        ],
      },
      {
        code: 'MB',
        name: 'Manitoba',
        basicPersonalAmount: 15_780,
        basicPersonalAmountPhaseOut: { start: 200_000, end: 400_000, minimum: 0 },
        bands: [
          { from: 0, to: 47_564, rate: 0.108 },
          { from: 47_564, to: 101_200, rate: 0.1275 },
          { from: 101_200, to: null, rate: 0.174 },
        ],
      },
      {
        code: 'NB',
        name: 'New Brunswick',
        basicPersonalAmount: 13_664,
        bands: [
          { from: 0, to: 52_333, rate: 0.094 },
          { from: 52_333, to: 104_666, rate: 0.14 },
          { from: 104_666, to: 193_861, rate: 0.16 },
          { from: 193_861, to: null, rate: 0.195 },
        ],
      },
      {
        code: 'NL',
        name: 'Newfoundland and Labrador',
        basicPersonalAmount: 11_188,
        bands: [
          { from: 0, to: 44_678, rate: 0.087 },
          { from: 44_678, to: 89_354, rate: 0.145 },
          { from: 89_354, to: 159_528, rate: 0.158 },
          { from: 159_528, to: 223_340, rate: 0.178 },
          { from: 223_340, to: 285_319, rate: 0.198 },
          { from: 285_319, to: 570_638, rate: 0.208 },
          { from: 570_638, to: 1_141_275, rate: 0.213 },
          { from: 1_141_275, to: null, rate: 0.218 },
        ],
      },
      {
        code: 'NS',
        name: 'Nova Scotia',
        basicPersonalAmount: 11_932,
        bands: [
          { from: 0, to: 30_995, rate: 0.0879 },
          { from: 30_995, to: 61_991, rate: 0.1495 },
          { from: 61_991, to: 97_417, rate: 0.1667 },
          { from: 97_417, to: 157_124, rate: 0.175 },
          { from: 157_124, to: null, rate: 0.21 },
        ],
      },
      {
        code: 'NT',
        name: 'Northwest Territories',
        basicPersonalAmount: 18_198,
        bands: [
          { from: 0, to: 53_003, rate: 0.059 },
          { from: 53_003, to: 106_009, rate: 0.086 },
          { from: 106_009, to: 172_346, rate: 0.122 },
          { from: 172_346, to: null, rate: 0.1405 },
        ],
      },
      {
        code: 'NU',
        name: 'Nunavut',
        basicPersonalAmount: 19_659,
        bands: [
          { from: 0, to: 55_801, rate: 0.04 },
          { from: 55_801, to: 111_602, rate: 0.07 },
          { from: 111_602, to: 181_439, rate: 0.09 },
          { from: 181_439, to: null, rate: 0.115 },
        ],
      },
      {
        code: 'ON',
        name: 'Ontario',
        basicPersonalAmount: 12_989,
        bands: [
          { from: 0, to: 53_891, rate: 0.0505 },
          { from: 53_891, to: 107_785, rate: 0.0915 },
          { from: 107_785, to: 150_000, rate: 0.1116 },
          { from: 150_000, to: 220_000, rate: 0.1216 },
          { from: 220_000, to: null, rate: 0.1316 },
        ],
      },
      {
        code: 'PE',
        name: 'Prince Edward Island',
        basicPersonalAmount: 15_000,
        bands: [
          { from: 0, to: 33_928, rate: 0.095 },
          { from: 33_928, to: 65_820, rate: 0.1347 },
          { from: 65_820, to: 106_890, rate: 0.166 },
          { from: 106_890, to: 142_520, rate: 0.1762 },
          { from: 142_520, to: 200_000, rate: 0.19 },
          { from: 200_000, to: null, rate: 0.2 },
        ],
      },
      {
        code: 'QC',
        name: 'Quebec',
        basicPersonalAmount: 18_952,
        bands: [
          { from: 0, to: 54_345, rate: 0.14 },
          { from: 54_345, to: 108_680, rate: 0.19 },
          { from: 108_680, to: 132_245, rate: 0.24 },
          { from: 132_245, to: null, rate: 0.2575 },
        ],
      },
      {
        code: 'SK',
        name: 'Saskatchewan',
        basicPersonalAmount: 20_381,
        bands: [
          { from: 0, to: 54_532, rate: 0.105 },
          { from: 54_532, to: 155_805, rate: 0.125 },
          { from: 155_805, to: null, rate: 0.145 },
        ],
      },
      {
        code: 'YT',
        name: 'Yukon',
        // Yukon's basic personal amount follows the federal amount and phase-out.
        basicPersonalAmount: 16_452,
        basicPersonalAmountPhaseOut: { start: 181_440, end: 258_482, minimum: 14_829 },
        bands: [
          { from: 0, to: 58_523, rate: 0.064 },
          { from: 58_523, to: 117_045, rate: 0.09 },
          { from: 117_045, to: 181_440, rate: 0.109 },
          { from: 181_440, to: 500_000, rate: 0.128 },
          { from: 500_000, to: null, rate: 0.15 },
        ],
      },
    ],
    extras: {
      // VERIFY: CRA T4127 January 2026 (federal BPA minimum $14,829 at net income $258,482+, phase-out from $181,440). Checked 16 Oct 2026.
      basicPersonalAmountMinimum: 14_829,
      // VERIFY: https://www.canada.ca/content/dam/cra-arc/migration/cra-arc/tx/bsnss/tpcs/pyrll/t4032/2026/t4032-qc-1-26e.pdf (16.5%, 2026). Checked 16 Oct 2026.
      quebecAbatement: 0.165,
      // VERIFY: https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4032-payroll-deductions-tables/t4032on-jan/t4032on-january-general-information.html
      // (20% of basic Ontario tax over $5,818, plus 36% over $7,446, 2026). Checked 16 Oct 2026.
      ontarioSurtax: { firstThreshold: 5_818, firstRate: 0.2, secondThreshold: 7_446, secondRate: 0.36 },
    },
  },
};
