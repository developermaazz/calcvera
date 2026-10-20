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
    mortgageOverpayment: { balance: 200_000, ratePercent: 4.5, years: 25, monthlyOverpayment: 200, allowancePercent: 10 },
    isa: { startingBalance: 5_000, monthlyDeposit: 300, ratePercent: 4, years: 10 },
    pensionRelief: { salary: 60_000, contributionPercent: 5, contributionMonthly: 250, employerPercent: 3 },
    rentVsBuy: {
      homePrice: 300_000,
      depositPercent: 15,
      mortgageRatePercent: 4.5,
      termYears: 25,
      otherBuyingCosts: 2_500,
      insurancePerYear: 350,
      maintenancePercent: 1,
      feesPerMonth: 0,
      sellingCostsPercent: 2,
      homeGrowthPercent: 3,
      monthlyRent: 1_300,
      rentGrowthPercent: 3,
      investReturnPercent: 4,
      years: 10,
    },
    compoundInterest: { initialDeposit: 5_000, monthlyDeposit: 150, annualRatePercent: 4.5, years: 15 },
    savingsGoal: { goal: 15_000, currentSavings: 1_000, ratePercent: 4, years: 3, monthlyDeposit: 300 },
    debtSnowball: {
      debts: [
        { name: 'Buy now pay later', balance: 300, aprPercent: 0, minimumPayment: 50 },
        { name: 'Store card', balance: 900, aprPercent: 29.9, minimumPayment: 30 },
        { name: 'Credit card', balance: 3_200, aprPercent: 24.9, minimumPayment: 96 },
        { name: 'Car finance', balance: 6_500, aprPercent: 9.9, minimumPayment: 210 },
      ],
      extraMonthly: 150,
    },
    takeHomePay: { grossSalary: 35_000, pensionPercent: 5 },
    stampDuty: { price: 295_000 },
    studentLoan: { balance: 45_000, salary: 35_000, salaryGrowthPercent: 3 },
    carFinance: { price: 25_000, deposit: 3_000, termMonths: 48, aprPercent: 9.9, finalPayment: 9_000, optionFee: 10 },
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
    takeHomePay: {
      // VERIFY: https://www.gov.uk/income-tax-rates (Personal Allowance falls by £1 for every £2 over £100,000, 2026/27). Checked 16 Oct 2026.
      personalAllowanceTaperStart: 100_000,
      personalAllowanceTaperRate: 0.5,
      // VERIFY: https://www.gov.uk/scottish-income-tax (2026/27). Starter £12,571–£16,537 19%, basic to £29,526 20%,
      // intermediate to £43,662 21%, higher to £75,000 42%, advanced to £125,140 45%, top 48%. Expressed here as
      // taxable income above the £12,570 allowance. Checked 18 Oct 2026.
      scotlandBands: [
        { from: 0, to: 3_967, rate: 0.19 },
        { from: 3_967, to: 16_956, rate: 0.2 },
        { from: 16_956, to: 31_092, rate: 0.21 },
        { from: 31_092, to: 62_430, rate: 0.42 },
        { from: 62_430, to: 125_140, rate: 0.45 },
        { from: 125_140, to: null, rate: 0.48 },
      ],
      // VERIFY: https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027 (primary threshold £12,570,
      // UEL £50,270 a year) and https://www.gov.uk/national-insurance-rates-letters (category A: 8%, 2%). Checked 18 Oct 2026.
      nationalInsurance: { primaryThreshold: 12_570, upperEarningsLimit: 50_270, mainRate: 0.08, upperRate: 0.02 },
      // VERIFY: https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027 (2026/27 thresholds; 9%, postgraduate 6%)
      // and https://www.gov.uk/repaying-your-student-loan/what-you-pay. Checked 18 Oct 2026.
      studentLoans: {
        plan1: { threshold: 26_900, rate: 0.09 },
        plan2: { threshold: 29_385, rate: 0.09 },
        plan4: { threshold: 33_795, rate: 0.09 },
        plan5: { threshold: 25_000, rate: 0.09 },
        postgraduate: { threshold: 21_000, rate: 0.06 },
      },
      // VERIFY: https://www.gov.uk/tax-on-your-private-pension/pension-tax-relief (provider claims relief at the basic 20% rate). Checked 18 Oct 2026.
      reliefAtSourceRate: 0.2,
    },
    savings: {
      // VERIFY: https://www.gov.uk/individual-savings-accounts ("In the 2026 to 2027 tax year, the maximum you can save in ISAs is £20,000"). Checked 20 Oct 2026.
      isaAllowance: 20_000,
      // VERIFY: https://www.gov.uk/apply-tax-free-interest-on-savings/how-much-is-tax-free (£1,000 basic, £500 higher, £0 additional; starting rate up to £5,000). Checked 20 Oct 2026.
      personalSavingsAllowance: { basic: 1_000, higher: 500, additional: 0 },
      // VERIFY: https://www.gov.uk/apply-tax-free-interest-on-savings/how-you-pay-tax-on-savings-interest ("at your usual rate of Income Tax")
      // and https://www.gov.uk/income-tax-rates (20% basic, 40% higher, 45% additional). Checked 20 Oct 2026.
      savingsTaxRate: { basic: 0.2, higher: 0.4, additional: 0.45 },
      startingRateLimit: 5_000,
    },
    pensions: {
      // VERIFY: https://www.gov.uk/government/publications/rates-and-allowances-pension-schemes/pension-schemes-rates (2026 to 2027: £60,000). Checked 20 Oct 2026.
      annualAllowance: 60_000,
      // VERIFY: same page (threshold income £200,000, adjusted income £260,000, minimum £10,000) and https://www.gov.uk/guidance/pension-schemes-work-out-your-tapered-annual-allowance (£1 for every £2). Checked 20 Oct 2026.
      taperThresholdIncome: 200_000,
      taperAdjustedIncome: 260_000,
      taperMinimum: 10_000,
      // VERIFY: same rates page (money purchase annual allowance 2026 to 2027: £10,000). Checked 20 Oct 2026.
      moneyPurchaseAnnualAllowance: 10_000,
      // VERIFY: https://www.gov.uk/tax-on-your-private-pension/pension-tax-relief (£2,880 net = £3,600 gross with no earnings). Checked 20 Oct 2026.
      nonEarnerGrossLimit: 3_600,
    },
    stampDuty: {
      // VERIFY: https://www.gov.uk/stamp-duty-land-tax/residential-property-rates (England and Northern Ireland). Checked 18 Oct 2026.
      standardBands: [
        { from: 0, to: 125_000, rate: 0 },
        { from: 125_000, to: 250_000, rate: 0.02 },
        { from: 250_000, to: 925_000, rate: 0.05 },
        { from: 925_000, to: 1_500_000, rate: 0.1 },
        { from: 1_500_000, to: null, rate: 0.12 },
      ],
      // VERIFY: same page (no SDLT up to £300,000, 5% to £500,000; no relief above £500,000). Checked 18 Oct 2026.
      firstTimeBuyerBands: [
        { from: 0, to: 300_000, rate: 0 },
        { from: 300_000, to: 500_000, rate: 0.05 },
      ],
      firstTimeBuyerMaxPrice: 500_000,
      // VERIFY: https://www.gov.uk/guidance/stamp-duty-land-tax-buying-an-additional-residential-property
      // (5% on top of each band; not on purchases under £40,000). Checked 18 Oct 2026.
      additionalPropertySurcharge: 0.05,
      additionalPropertyMinPrice: 40_000,
      // VERIFY: https://www.gov.uk/guidance/rates-of-stamp-duty-land-tax-for-non-uk-residents
      // (2 percentage points on top of all residential rates, purchases of £40,000 or more). Checked 18 Oct 2026.
      nonResidentSurcharge: 0.02,
      nonResidentMinPrice: 40_000,
    },
    studentLoanInterest: {
      // VERIFY: https://www.gov.uk/repaying-your-student-loan/what-you-pay ("currently" 4.1% Plans 1, 4, 5; 6% Postgraduate).
      // Rates change in September (and can change in March); recheck then. Checked 18 Oct 2026.
      rates: { plan1: 0.041, plan4: 0.041, plan5: 0.041, postgraduate: 0.06 },
      // VERIFY: same page (Plan 2 after study: 4.1% up to £29,385, plus up to 1.9% to £52,884, 6% from £52,885). Checked 18 Oct 2026.
      plan2: { minRate: 0.041, maxRate: 0.06, lowerIncome: 29_385, upperIncome: 52_885 },
      // VERIFY: https://www.gov.uk/repaying-your-student-loan/when-your-student-loan-gets-written-off-or-cancelled
      // (Plan 1 from Sept 2006: 25 years; Plan 2: 30; Plan 4 from Aug 2007: 30; Plan 5: 40; Postgraduate: 30). Checked 18 Oct 2026.
      writeOffYears: { plan1: 25, plan2: 30, plan4: 30, plan5: 40, postgraduate: 30 },
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
