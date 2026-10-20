import type { CountryConfig, TaxBand } from './types';

// VERIFY: https://www.irs.gov/pub/irs-drop/rp-25-32.pdf (2026). Checked 16 Oct 2026.
const SINGLE_STANDARD_DEDUCTION = 16_100;

// VERIFY: https://www.irs.gov/pub/irs-drop/rp-25-32.pdf, Rev. Proc. 2025-32 table for single filers (2026). Checked 16 Oct 2026.
const SINGLE_BANDS: TaxBand[] = [
  { from: 0, to: 12_400, rate: 0.1 },
  { from: 12_400, to: 50_400, rate: 0.12 },
  { from: 50_400, to: 105_700, rate: 0.22 },
  { from: 105_700, to: 201_775, rate: 0.24 },
  { from: 201_775, to: 256_225, rate: 0.32 },
  { from: 256_225, to: 640_600, rate: 0.35 },
  { from: 640_600, to: null, rate: 0.37 },
];

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
    allowance: SINGLE_STANDARD_DEDUCTION,
    allowanceLabel: 'Standard deduction',
    bands: SINGLE_BANDS,
  },
  defaults: {
    loan: { amount: 20_000, aprPercent: 7.5, termYears: 5 },
    creditCard: { balance: 5_000, aprPercent: 21.99, monthlyPayment: 200, targetMonths: 24 },
    paycheck: { annualSalary: 65_000, hourlyRate: 25, hoursPerWeek: 40, retirementPercent: 5, pretaxBenefits: 75 },
    rentVsBuy: {
      homePrice: 350_000,
      depositPercent: 20,
      mortgageRatePercent: 6.5,
      termYears: 30,
      closingCostsPercent: 3,
      propertyTaxPercent: 1.1,
      insurancePerYear: 1_800,
      maintenancePercent: 1,
      feesPerMonth: 0,
      sellingCostsPercent: 6,
      homeGrowthPercent: 3,
      monthlyRent: 2_000,
      rentGrowthPercent: 3,
      investReturnPercent: 5,
      years: 10,
    },
    compoundInterest: { initialDeposit: 10_000, monthlyDeposit: 200, annualRatePercent: 5, years: 20 },
    savingsGoal: { goal: 20_000, currentSavings: 2_000, ratePercent: 4, years: 3, monthlyDeposit: 400 },
    debtSnowball: {
      debts: [
        { name: 'Medical bill', balance: 900, aprPercent: 0, minimumPayment: 50 },
        { name: 'Store card', balance: 1_800, aprPercent: 29.99, minimumPayment: 55 },
        { name: 'Credit card', balance: 4_500, aprPercent: 24.99, minimumPayment: 120 },
        { name: 'Car loan', balance: 9_000, aprPercent: 7.9, minimumPayment: 285 },
      ],
      extraMonthly: 200,
    },
    personalLoanPayoff: { balance: 12_000, aprPercent: 11.5, monthlyPayment: 350, extraMonthly: 100 },
    autoRefinance: { balance: 18_000, currentAprPercent: 9.9, remainingMonths: 48, newAprPercent: 6.4, newTermMonths: 48, fees: 300 },
    retirementMatch: {
      salary: 75_000,
      contributionPercent: 4,
      matchRatePercent: 50,
      matchCapPercent: 6,
      age: 35,
      currentBalance: 20_000,
      retirementAge: 65,
      returnPercent: 7,
      salaryGrowthPercent: 3,
    },
    usedCarLoan: {
      price: 22_000,
      downPayment: 2_000,
      tradeInValue: 4_000,
      tradeInOwed: 1_500,
      salesTaxPercent: 6,
      fees: 600,
      aprPercent: 9.5,
      termMonths: 60,
    },
  },
  us: {
    federalTax: {
      single: { standardDeduction: SINGLE_STANDARD_DEDUCTION, bands: SINGLE_BANDS },
      // VERIFY: https://www.irs.gov/pub/irs-drop/rp-25-32.pdf, Table 1 and section .14 (2026). Checked 16 Oct 2026.
      marriedJoint: {
        standardDeduction: 32_200,
        bands: [
          { from: 0, to: 24_800, rate: 0.1 },
          { from: 24_800, to: 100_800, rate: 0.12 },
          { from: 100_800, to: 211_400, rate: 0.22 },
          { from: 211_400, to: 403_550, rate: 0.24 },
          { from: 403_550, to: 512_450, rate: 0.32 },
          { from: 512_450, to: 768_700, rate: 0.35 },
          { from: 768_700, to: null, rate: 0.37 },
        ],
      },
      // VERIFY: https://www.irs.gov/pub/irs-drop/rp-25-32.pdf, Table 4 and section .14 (2026). Checked 16 Oct 2026.
      marriedSeparate: {
        standardDeduction: 16_100,
        bands: [
          { from: 0, to: 12_400, rate: 0.1 },
          { from: 12_400, to: 50_400, rate: 0.12 },
          { from: 50_400, to: 105_700, rate: 0.22 },
          { from: 105_700, to: 201_775, rate: 0.24 },
          { from: 201_775, to: 256_225, rate: 0.32 },
          { from: 256_225, to: 384_350, rate: 0.35 },
          { from: 384_350, to: null, rate: 0.37 },
        ],
      },
      // VERIFY: https://www.irs.gov/pub/irs-drop/rp-25-32.pdf, Table 2 and section .14 (2026). Checked 16 Oct 2026.
      headOfHousehold: {
        standardDeduction: 24_150,
        bands: [
          { from: 0, to: 17_700, rate: 0.1 },
          { from: 17_700, to: 67_450, rate: 0.12 },
          { from: 67_450, to: 105_700, rate: 0.22 },
          { from: 105_700, to: 201_750, rate: 0.24 },
          { from: 201_750, to: 256_200, rate: 0.32 },
          { from: 256_200, to: 640_600, rate: 0.35 },
          { from: 640_600, to: null, rate: 0.37 },
        ],
      },
    },
    payroll: {
      // VERIFY: https://www.irs.gov/publications/p15t, Worksheet 1A line 1g (2026: $12,900 married filing jointly, $8,600 otherwise). Checked 20 Oct 2026.
      withholdingAdjustment: { marriedJoint: 12_900, other: 8_600 },
      // VERIFY: https://www.irs.gov/taxtopics/tc751 (employee 6.2% Social Security, 1.45% Medicare; 0.9% Additional Medicare on wages over $200,000 without regard to filing status). Checked 20 Oct 2026.
      socialSecurityRate: 0.062,
      medicareRate: 0.0145,
      additionalMedicareRate: 0.009,
      additionalMedicareWithholdingThreshold: 200_000,
    },
    selfEmployment: {
      // VERIFY: https://www.irs.gov/pub/irs-pdf/f1040sse.pdf, line 4a (92.35%). Checked 16 Oct 2026.
      netEarningsFactor: 0.9235,
      // VERIFY: https://www.irs.gov/businesses/small-businesses-self-employed/self-employment-tax-social-security-and-medicare-taxes (12.4%). Checked 16 Oct 2026.
      socialSecurityRate: 0.124,
      // VERIFY: same IRS page (2.9%). Checked 16 Oct 2026.
      medicareRate: 0.029,
      // VERIFY: https://www.ssa.gov/oact/cola/cbb.html (2026: $184,500). Checked 16 Oct 2026.
      socialSecurityWageBase: 184_500,
      // VERIFY: https://www.irs.gov/taxtopics/tc560 (0.9%). Checked 16 Oct 2026.
      additionalMedicareRate: 0.009,
      // VERIFY: https://www.irs.gov/taxtopics/tc560 (not indexed). Checked 16 Oct 2026.
      additionalMedicareThreshold: { single: 200_000, marriedJoint: 250_000, marriedSeparate: 125_000, headOfHousehold: 200_000 },
      // VERIFY: https://www.irs.gov/pub/irs-pdf/f1040sse.pdf, line 13 (50%). Checked 16 Oct 2026.
      deductibleShare: 0.5,
      // VERIFY: https://www.irs.gov/pub/irs-pdf/i1040sse.pdf, "Who Must File" ($400). Checked 16 Oct 2026.
      minimumNetEarnings: 400,
    },
    // VERIFY: https://www.irs.gov/pub/irs-pdf/f1040es.pdf, "Payment Due Dates" (2026 tax year). Checked 16 Oct 2026.
    estimatedTaxDueDates: ['2026-04-15', '2026-06-15', '2026-09-15', '2027-01-15'],
    qbi: {
      // VERIFY: https://www.irs.gov/newsroom/qualified-business-income-deduction (20%). Checked 16 Oct 2026.
      rate: 0.2,
      // VERIFY: https://www.irs.gov/pub/irs-drop/rp-25-32.pdf, section 2.12 ($400 minimum, $1,000 QBI, 2026). Checked 16 Oct 2026.
      minimumDeduction: 400,
      minimumQbi: 1_000,
      // VERIFY: https://www.irs.gov/pub/irs-drop/rp-25-32.pdf, section 4.26 (2026). Checked 16 Oct 2026.
      threshold: { single: 201_750, marriedJoint: 403_500, marriedSeparate: 201_775, headOfHousehold: 201_750 },
      phaseInEnd: { single: 276_750, marriedJoint: 553_500, marriedSeparate: 276_775, headOfHousehold: 276_750 },
    },
    retirement: {
      // VERIFY: https://www.irs.gov/newsroom/401k-limit-increases-to-24500-for-2026-ira-limit-increases-to-7500
      // and https://www.irs.gov/pub/irs-drop/n-25-67.pdf (Notice 2025-67, 2026). Checked 18 Oct 2026.
      deferralLimit: 24_500,
      catchUp: 8_000,
      catchUpAge60to63: 11_250,
      annualAdditionsLimit: 72_000,
      compensationLimit: 360_000,
    },
    // VERIFY: https://selling-guide.fanniemae.com/sel/b3-6-02/debt-income-ratios (B3-6-02, 04/02/2025). Checked 16 Oct 2026.
    // CFPB notes limits vary by lender and loan type: https://www.consumerfinance.gov/ask-cfpb/what-is-a-debt-to-income-ratio-en-1791/
    dtiReferences: [
      { backEndMax: 0.36, label: 'Fannie Mae’s standard maximum for manually underwritten mortgages' },
      { backEndMax: 0.45, label: 'Fannie Mae’s manual maximum for borrowers who meet its credit score and cash reserve requirements' },
      { backEndMax: 0.5, label: 'Fannie Mae’s maximum for mortgages approved through its automated system' },
    ],
  },
};
