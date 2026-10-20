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
  defaults: {
    caIncomeTax: { income: 80_000 },
    caRrspTfsa: { income: 80_000, retirementIncome: 50_000, contribution: 5_000, years: 25, returnPercent: 6 },
    caCpp: { pensionAt65: 858.34, startAge: 65, lifeExpectancy: 87 },
    caLandTransfer: { price: 700_000 },
    caMortgage: { price: 600_000, downPayment: 60_000, ratePercent: 4.5, amortizationYears: 25, termYears: 5 },
  },
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
    mortgage: {
      // VERIFY: https://www.canada.ca/en/financial-consumer-agency/services/mortgages/down-payment.html (5% of the first $500,000,
      // 10% of the rest; 20% at $1.5 million or more; insurance needed below 20% down). Checked 20 Oct 2026.
      minDownPayment: { firstTierTop: 500_000, firstRate: 0.05, secondRate: 0.1, uninsuredRate: 0.2 },
      insuranceRequiredBelow: 0.2,
      // VERIFY: https://www.canada.ca/en/department-finance/news/2024/12/boldest-mortgage-reforms-in-decades-come-into-force-today.html
      // (insured price cap $1.5 million; 30-year insured amortizations for all first-time buyers and buyers of new builds, from
      // 15 December 2024; otherwise 25 years). Checked 20 Oct 2026.
      insuredPriceCap: 1_500_000,
      maxInsuredAmortizationYears: 25,
      maxInsuredAmortizationYearsFirstTime: 30,
      // VERIFY: https://www.cmhc-schl.gc.ca/professionals/project-funding-and-mortgage-financing/mortgage-loan-insurance/mortgage-loan-insurance-homeownership-programs/premium-information-for-homeowner-and-small-rental-loans
      // (homeowner premiums on the total loan: 80.01–85% 2.80%, 85.01–90% 3.10%, 90.01–95% 4.00%; "An amortization period beyond
      // 25 years is subject to a 0.20% surcharge"). The site blocks automated access; read from the web.archive.org copy of
      // 26 Aug 2026. Checked 20 Oct 2026.
      premiums: [
        { maxLtv: 0.85, rate: 0.028 },
        { maxLtv: 0.9, rate: 0.031 },
        { maxLtv: 0.95, rate: 0.04 },
      ],
      longAmortizationSurcharge: 0.002,
    },
    payroll: {
      // VERIFY: CRA T4127 January 2026, tables 8.3–8.7 and 8.2:
      // https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4127-payroll-deductions-formulas/t4127-jan/t4127-jan-payroll-deductions-formulas-computer-programs.html
      // (CPP: basic exemption $3,500, YMPE $74,600, YAMPE $85,000, base 4.95%, first additional 1%, second additional 4%;
      // EI outside Quebec: $68,900 maximum insurable earnings, 1.63%; Canada employment amount $1,501). Checked 20 Oct 2026.
      cpp: { basicExemption: 3_500, ympe: 74_600, yampe: 85_000, baseRate: 0.0495, firstAdditionalRate: 0.01, secondAdditionalRate: 0.04 },
      ei: { maxInsurableEarnings: 68_900, rate: 0.0163 },
      canadaEmploymentAmount: 1_501,
      // VERIFY: same T4127 page, Ontario Health Premium (V2) formula. Checked 20 Oct 2026.
      ontarioHealthPremium: [
        { from: 20_000, base: 0, rate: 0.06, cap: 300 },
        { from: 36_000, base: 300, rate: 0.06, cap: 450 },
        { from: 48_000, base: 450, rate: 0.25, cap: 600 },
        { from: 72_000, base: 600, rate: 0.25, cap: 750 },
        { from: 200_000, base: 750, rate: 0.25, cap: 900 },
      ],
    },
    registered: {
      // VERIFY: https://www.canada.ca/en/revenue-agency/services/tax/registered-plans-administrators/pspa/mp-rrsp-dpsp-tfsa-limits-ympe.html
      // (2026: TFSA dollar limit $7,000; RRSP dollar limit $33,810). Checked 20 Oct 2026.
      tfsaLimit: 7_000,
      rrspDollarLimit: 33_810,
      // VERIFY: https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/rrsps-related-plans/contributing-a-rrsp-prpp/contributions-affect-your-rrsp-prpp-deduction-limit.html
      // (18% of earned income in the previous year, up to the yearly limit). Checked 20 Oct 2026.
      rrspIncomeRate: 0.18,
    },
    cpp: {
      // VERIFY: https://www.canada.ca/en/services/benefits/publicpensions/cpp/cpp-benefit/amount.html
      // (maximum at 65 in January 2026 $1,507.65 a month; average for new recipients at 65, July 2026, $858.34). Checked 20 Oct 2026.
      maxMonthlyAt65: 1_507.65,
      averageMonthlyAt65: 858.34,
      averageAsOf: 'July 2026',
      // VERIFY: https://www.canada.ca/en/services/benefits/publicpensions/cpp/when-start.html
      // (decrease by 0.6% each month, up to 36% at 60; increase by 0.7% each month, up to 42% at 70; start at 60 to 70).
      // Checked 20 Oct 2026.
      earlyReductionPerMonth: 0.006,
      lateIncreasePerMonth: 0.007,
      earliestAge: 60,
      latestAge: 70,
    },
    landTransfer: {
      ontario: {
        // VERIFY: https://www.ontario.ca/document/land-transfer-tax/calculating-land-transfer-tax (0.5% to $55,000; 1% to $250,000;
        // 1.5% to $400,000; 2% over $400,000; 2.5% over $2,000,000 for one or two single family residences). Checked 20 Oct 2026.
        bands: [
          { from: 0, to: 55_000, rate: 0.005 },
          { from: 55_000, to: 250_000, rate: 0.01 },
          { from: 250_000, to: 400_000, rate: 0.015 },
          { from: 400_000, to: 2_000_000, rate: 0.02 },
          { from: 2_000_000, to: null, rate: 0.025 },
        ],
        // VERIFY: https://www.ontario.ca/document/land-transfer-tax/land-transfer-tax-refunds-first-time-homebuyers ($4,000). Checked 20 Oct 2026.
        firstTimeRefundMax: 4_000,
      },
      toronto: {
        // VERIFY: https://www.toronto.ca/services-payments/property-taxes-utilities/municipal-land-transfer-tax-mltt/municipal-land-transfer-tax-mltt-rates-and-fees/
        // (one or two single-family residences; luxury tiers as of April 1, 2026). Checked 20 Oct 2026.
        bands: [
          { from: 0, to: 55_000, rate: 0.005 },
          { from: 55_000, to: 250_000, rate: 0.01 },
          { from: 250_000, to: 400_000, rate: 0.015 },
          { from: 400_000, to: 2_000_000, rate: 0.02 },
          { from: 2_000_000, to: 3_000_000, rate: 0.025 },
          { from: 3_000_000, to: 4_000_000, rate: 0.044 },
          { from: 4_000_000, to: 5_000_000, rate: 0.0545 },
          { from: 5_000_000, to: 10_000_000, rate: 0.065 },
          { from: 10_000_000, to: 20_000_000, rate: 0.0755 },
          { from: 20_000_000, to: null, rate: 0.086 },
        ],
        // VERIFY: https://www.toronto.ca/services-payments/property-taxes-utilities/municipal-land-transfer-tax-mltt/municipal-land-transfer-tax-mltt-rebate-opportunities/
        // ("a rebate of up to $4,475.00"). Checked 20 Oct 2026.
        firstTimeRebateMax: 4_475,
      },
      bc: {
        // VERIFY: https://www2.gov.bc.ca/gov/content/taxes/property-taxes/property-transfer-tax (1% to $200,000; 2% to $2,000,000;
        // 3% over $2,000,000; further 2% on residential value over $3,000,000). Checked 20 Oct 2026.
        bands: [
          { from: 0, to: 200_000, rate: 0.01 },
          { from: 200_000, to: 2_000_000, rate: 0.02 },
          { from: 2_000_000, to: null, rate: 0.03 },
        ],
        furtherRate: 0.02,
        furtherThreshold: 3_000_000,
        // VERIFY: https://www2.gov.bc.ca/gov/content/taxes/property-taxes/property-transfer-tax/exemptions/first-time-home-buyers/current-amount
        // (full tax exempt at $500,000 or less; $8,000 up to $835,000; reduced to nil at $860,000, e.g. $850,000 gives $3,200).
        // Checked 20 Oct 2026.
        firstTime: { fullExemptionValue: 500_000, exemptionAmount: 8_000, flatUpTo: 835_000, phaseOutTo: 860_000 },
        // VERIFY: https://www2.gov.bc.ca/gov/content/taxes/property-taxes/property-transfer-tax/exemptions/newly-built-home-exemption/exemption-amounts
        // (full exemption below $1,100,000; PTT x ((1,100,000 + 50,000 - FMV) / 50,000) up to $1,150,000). Checked 20 Oct 2026.
        newBuild: { fullExemptionBelow: 1_100_000, phaseOutTo: 1_150_000 },
      },
      manitoba: {
        // VERIFY: https://www.gov.mb.ca/finance/other/landtransfertax.html (0% to $30,000; 0.5% to $90,000; 1% to $150,000;
        // 1.5% to $200,000; 2% over $200,000). Checked 20 Oct 2026.
        bands: [
          { from: 0, to: 30_000, rate: 0 },
          { from: 30_000, to: 90_000, rate: 0.005 },
          { from: 90_000, to: 150_000, rate: 0.01 },
          { from: 150_000, to: 200_000, rate: 0.015 },
          { from: 200_000, to: null, rate: 0.02 },
        ],
      },
      quebec: {
        // VERIFY: https://www.quebec.ca/gouvernement/gestion-municipale/finances-fiscalite-municipales/fiscalite/droits-mutations-immobilieres
        // (2026: 0.5% to $62,900; 1% to $315,000; 1.5% over $315,000; municipalities may set a higher rate over $500,000).
        // Checked 20 Oct 2026.
        year: '2026',
        bands: [
          { from: 0, to: 62_900, rate: 0.005 },
          { from: 62_900, to: 315_000, rate: 0.01 },
          { from: 315_000, to: null, rate: 0.015 },
        ],
      },
      montreal: {
        // VERIFY: https://montreal.ca/en/articles/how-property-transfer-duties-are-calculated-9279 (2026 brackets). Checked 20 Oct 2026.
        year: '2026',
        bands: [
          { from: 0, to: 62_900, rate: 0.005 },
          { from: 62_900, to: 315_000, rate: 0.01 },
          { from: 315_000, to: 552_300, rate: 0.015 },
          { from: 552_300, to: 1_104_700, rate: 0.02 },
          { from: 1_104_700, to: 2_136_500, rate: 0.025 },
          { from: 2_136_500, to: 3_113_000, rate: 0.035 },
          { from: 3_113_000, to: null, rate: 0.04 },
        ],
      },
      // VERIFY: https://laws.gnb.ca/en/document/cs/R-2.1 (s. 2(1.03): 1% of the greater of the consideration and the assessed value,
      // from April 1, 2016). Read from the web.archive.org copy of 1 Oct 2026. Checked 20 Oct 2026.
      newBrunswick: { rate: 0.01 },
      // VERIFY: https://www.halifax.ca/home-property/property-taxes/taxes-halifax (deed transfer tax 1.5% of the purchase price in
      // the Halifax Regional Municipality; each municipality sets its own rate). Checked 20 Oct 2026.
      novaScotia: { defaultMunicipalRate: 0.015, defaultMunicipality: 'Halifax' },
      // VERIFY: https://www.princeedwardisland.ca/sites/default/files/legislation/r-05-1-real_property_transfer_tax_act.pdf (current to
      // May 29, 2026: s. 3(1) 1% of the greater of consideration and assessed value; s. 4(2) none if $30,000 or less; s. 5(2)
      // first-time home buyers exempt). Checked 20 Oct 2026.
      pei: { rate: 0.01, lowValueExemptUpTo: 30_000 },
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
