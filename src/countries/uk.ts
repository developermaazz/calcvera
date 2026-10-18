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
    creditCard: { balance: 3_000, aprPercent: 24.9, monthlyPayment: 150, targetMonths: 24 },
  },
  uk: {
    redundancy: {
      // VERIFY: https://www.gov.uk/redundant-your-rights/redundancy-pay (redundancies on or after 6 April 2026). Checked 16 Oct 2026.
      effectiveFrom: '2026-04-06',
      weeklyPayCap: {
        // VERIFY: https://www.gov.uk/redundant-your-rights/redundancy-pay (£751, maximum £22,530). Checked 16 Oct 2026.
        greatBritain: 751,
        // VERIFY: https://www.nidirect.gov.uk/articles/redundancy-pay (£783 "current maximum", maximum £23,490). Checked 16 Oct 2026.
        northernIreland: 783,
      },
      // VERIFY: https://www.gov.uk/redundant-your-rights/redundancy-pay (2 years). Checked 16 Oct 2026.
      minYearsService: 2,
      // VERIFY: https://www.gov.uk/redundant-your-rights/redundancy-pay (capped at 20 years). Checked 16 Oct 2026.
      maxYearsCounted: 20,
      // VERIFY: https://www.gov.uk/redundant-your-rights/redundancy-pay and nidirect (same bands). Checked 16 Oct 2026.
      ageBands: [
        { fromAge: 0, weeksPerYear: 0.5 },
        { fromAge: 22, weeksPerYear: 1 },
        { fromAge: 41, weeksPerYear: 1.5 },
      ],
      // VERIFY: https://www.gov.uk/redundancy-your-rights/tax-and-national-insurance ("under £30,000 is not taxable"). Checked 16 Oct 2026.
      taxFreeLimit: 30_000,
    },
    inheritanceTax: {
      // VERIFY: https://www.gov.uk/inheritance-tax (£325,000). Fixed to 5 April 2031:
      // https://www.gov.uk/government/publications/rates-and-allowances-inheritance-tax-thresholds-and-interest-rates. Checked 16 Oct 2026.
      nilRateBand: 325_000,
      // VERIFY: same thresholds page (£175,000, fixed to 5 April 2031). Checked 16 Oct 2026.
      residenceNilRateBand: 175_000,
      // VERIFY: https://www.gov.uk/guidance/inheritance-tax-residence-nil-rate-band (£2 million). Checked 16 Oct 2026.
      taperThreshold: 2_000_000,
      // VERIFY: same page (£1 for every £2 over the threshold). Checked 16 Oct 2026.
      taperRate: 0.5,
      // VERIFY: https://www.gov.uk/inheritance-tax (40%). Checked 16 Oct 2026.
      standardRate: 0.4,
      // VERIFY: https://www.gov.uk/inheritance-tax/leaving-money-to-charity (36%). Checked 16 Oct 2026.
      charityReducedRate: 0.36,
      // VERIFY: https://www.gov.uk/hmrc-internal-manuals/inheritance-tax-manual/ihtm45002 (10% of the baseline amount). Checked 16 Oct 2026.
      charityQualifyingShare: 0.1,
      // VERIFY: https://www.gov.uk/government/publications/rates-and-allowances-inheritance-tax-thresholds-and-interest-rates
      // (unused bands transfer to the survivor; combined maximum £1 million). Checked 16 Oct 2026.
      maxTransferableShare: 1,
    },
  },
};
