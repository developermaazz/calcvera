import type { CountryConfig } from './types';

// Early start with one calculator; full rollout in Phase 2 (CLAUDE.md section 2).
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
  launched: true,
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
  defaults: {
    auTakeHome: { salary: 90_000 },
  },
  au: {
    medicareLevy: {
      // VERIFY: https://www.ato.gov.au/individuals-and-families/medicare-and-private-health-insurance/medicare-levy/what-is-the-medicare-levy (2%). Checked 16 Oct 2026.
      rate: 0.02,
      // VERIFY: https://www.ato.gov.au/individuals-and-families/medicare-and-private-health-insurance/medicare-levy/medicare-levy-reduction/medicare-levy-reduction-for-low-income-earners
      // Latest published single thresholds are for 2025–26 ($28,011 / $35,013). Update when the ATO publishes 2026–27. Checked 16 Oct 2026.
      thresholdsIncomeYear: '2025–26',
      lowIncomeThreshold: 28_011,
      lowIncomeUpperThreshold: 35_013,
      // VERIFY: https://www.ato.gov.au/tax-rates-and-codes/payg-withholding-schedule-1-statement-of-formulas-for-calculating-amounts-to-be-withheld/medicare-levy-adjustment
      // ("shaded in at the rate of 10% of the excess"). Checked 16 Oct 2026.
      shadeInRate: 0.1,
    },
    // VERIFY: https://www.ato.gov.au/individuals-and-families/income-deductions-offsets-and-records/tax-offsets/low-income-tax-offset
    // ($700 up to $37,500; less 5c per $1 to $45,000; less 1.5c per $1 to $66,667). Checked 16 Oct 2026.
    lowIncomeTaxOffset: {
      maxOffset: 700,
      firstTaperStart: 37_500,
      firstTaperRate: 0.05,
      secondTaperStart: 45_000,
      secondTaperRate: 0.015,
      cutOut: 66_667,
    },
    // Working Australians tax offset starts in 2027–28, so it doesn't apply to 2026–27:
    // https://www.ato.gov.au/about-ato/new-legislation/in-detail/individuals/working-australians-tax-offset
    fbt: {
      // VERIFY: https://www.ato.gov.au/tax-rates-and-codes/fringe-benefits-tax-rates-and-thresholds (47% for FBT years to 31 March 2027). Checked 16 Oct 2026.
      fbtYear: 'year ending 31 March 2027',
      rate: 0.47,
      // VERIFY: same ATO page (flat 20% statutory rate for car benefits). Checked 16 Oct 2026.
      statutoryFraction: 0.2,
      // VERIFY: https://www.ato.gov.au/tax-rates-and-codes/luxury-car-tax-rate-and-thresholds (fuel-efficient threshold $91,661, 2026–27). Checked 16 Oct 2026.
      evExemptionPriceThreshold: 91_661,
      // VERIFY: https://www.ato.gov.au/about-ato/new-legislation/in-detail/businesses/electric-car-discount-more-sustainable-fbt-treatment-of-electric-cars
      // (full exemption to 31 March 2027; existing leases not affected by the announced change). Checked 16 Oct 2026.
      evExemptionChangesOn: '2027-04-01',
    },
    novatedLease: {
      // VERIFY: https://www.ato.gov.au/law/view/document?docid=aid%2Faid20021004%2F00001 (ATO ID 2002/1004, cars, 8-year effective life)
      // and https://www.ato.gov.au/law/view/document?DocID=TXD%2FTD93142%2FNAT%2FATO%2F00001 (TD 93/142). Checked 16 Oct 2026.
      minimumResidualByTermYears: { 1: 0.6563, 2: 0.5625, 3: 0.4688, 4: 0.375, 5: 0.2813 },
      // VERIFY: https://www.ato.gov.au/tax-rates-and-codes/luxury-car-tax-rate-and-thresholds (car limit $69,883, 2026–27). Checked 16 Oct 2026.
      carCostLimit: 69_883,
      // VERIFY: https://www.ato.gov.au/businesses-and-organisations/gst-excise-and-indirect-taxes/gst/in-detail/your-industry/motor-vehicle-and-transport/gst-and-motor-vehicles/purchasing-a-motor-vehicle
      // (GST 10%; credit capped at one-eleventh of the car limit). Checked 16 Oct 2026.
      gstRate: 0.1,
    },
    // The ATO site blocks automated access; the figures below were read from web.archive.org copies of the ATO pages.
    super: {
      // VERIFY: https://www.ato.gov.au/tax-rates-and-codes/key-superannuation-rates-and-thresholds/super-guarantee
      // (12% from 1 July 2025; maximum contribution base $270,830 a year for 2026–27). Archive copy 7 Oct 2026. Checked 20 Oct 2026.
      guaranteeRate: 0.12,
      maxContributionBase: 270_830,
      // VERIFY: https://www.ato.gov.au/tax-rates-and-codes/key-superannuation-rates-and-thresholds/contributions-caps
      // ($32,500 for 2026–27). Archive copy 17 Sep 2026. Checked 20 Oct 2026.
      concessionalCap: 32_500,
    },
    help: {
      // VERIFY: https://www.ato.gov.au/tax-rates-and-codes/study-and-training-support-loans-rates-and-repayment-thresholds
      // (2026–27: nil to $69,528; 15c per $1 over $69,528; $9,028 plus 17c per $1 over $129,717; 10% of total repayment income
      // from $186,051). Archive copy 12 Oct 2026. Checked 20 Oct 2026.
      firstThreshold: 69_528,
      firstRate: 0.15,
      secondThreshold: 129_717,
      secondBase: 9_028,
      secondRate: 0.17,
      flatThreshold: 186_051,
      flatRate: 0.1,
    },
    mls: {
      // VERIFY: https://www.ato.gov.au/individuals-and-families/medicare-and-private-health-insurance/medicare-levy-surcharge/medicare-levy-surcharge-income-thresholds-and-rates
      // (2026–27 singles: $105,000 or less 0%; $105,001–$123,000 1%; $123,001–$164,000 1.25%; $164,001 or more 1.5%).
      // Archive copy 5 Oct 2026. Checked 20 Oct 2026.
      singleTiers: [
        { from: 105_000, rate: 0.01 },
        { from: 123_000, rate: 0.0125 },
        { from: 164_000, rate: 0.015 },
      ],
    },
  },
};
