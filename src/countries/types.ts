export type CountryCode = 'us' | 'uk' | 'ca' | 'au' | 'in' | 'pk';

export interface TaxBand {
  /** Lower bound of taxable income for this band (inclusive). */
  from: number;
  /** Upper bound, or null for the top band. */
  to: number | null;
  /** Rate as a decimal, e.g. 0.2 for 20%. */
  rate: number;
}

export interface IncomeTaxConfig {
  /** What these bands cover, e.g. "Federal income tax, single filer". */
  label: string;
  /** Tax-free amount before the bands apply (standard deduction, personal allowance, etc.). */
  allowance: number;
  allowanceLabel: string;
  bands: TaxBand[];
}

export interface CreditCardDefaults {
  balance: number;
  aprPercent: number;
  monthlyPayment: number;
  targetMonths: number;
}

export interface AutoRefinanceDefaults {
  balance: number;
  currentAprPercent: number;
  remainingMonths: number;
  newAprPercent: number;
  newTermMonths: number;
  fees: number;
}

export interface RetirementMatchDefaults {
  salary: number;
  contributionPercent: number;
  matchRatePercent: number;
  matchCapPercent: number;
  age: number;
  currentBalance: number;
  retirementAge: number;
  returnPercent: number;
  salaryGrowthPercent: number;
}

export interface StudentLoanDefaults {
  balance: number;
  salary: number;
  salaryGrowthPercent: number;
}

export interface CarFinanceDefaults {
  price: number;
  deposit: number;
  termMonths: number;
  aprPercent: number;
  finalPayment: number;
  optionFee: number;
}

export interface StampDutyDefaults {
  price: number;
}

export interface TakeHomePayDefaults {
  grossSalary: number;
  pensionPercent: number;
}

export interface UsedCarLoanDefaults {
  price: number;
  downPayment: number;
  tradeInValue: number;
  tradeInOwed: number;
  salesTaxPercent: number;
  fees: number;
  aprPercent: number;
  termMonths: number;
}

export interface PersonalLoanPayoffDefaults {
  balance: number;
  aprPercent: number;
  monthlyPayment: number;
  extraMonthly: number;
}

export interface LoanDefaults {
  amount: number;
  aprPercent: number;
  termYears: number;
}

/**
 * A figure that must be filled in from the official source named in its VERIFY comment.
 * null means "not filled in yet": read it with requireFigure(), which fails the build, so a page
 * can never ship with a missing tax figure.
 */
export type Pending<T> = T | null;

// ---------- United States ----------

export type UsFilingStatus = 'single' | 'marriedJoint' | 'marriedSeparate' | 'headOfHousehold';

export interface UsFilingStatusTax {
  standardDeduction: Pending<number>;
  bands: Pending<TaxBand[]>;
}

export interface UsSelfEmploymentConfig {
  /** Share of net profit subject to SE tax (Schedule SE). */
  netEarningsFactor: Pending<number>;
  /** Social Security part of SE tax, as a decimal. */
  socialSecurityRate: Pending<number>;
  /** Medicare part of SE tax, as a decimal. */
  medicareRate: Pending<number>;
  /** Maximum earnings subject to the Social Security part. */
  socialSecurityWageBase: Pending<number>;
  additionalMedicareRate: Pending<number>;
  additionalMedicareThreshold: Record<UsFilingStatus, Pending<number>>;
  /** Share of SE tax deductible when working out income tax. */
  deductibleShare: Pending<number>;
  /** No SE tax when net earnings (after the factor) are below this. */
  minimumNetEarnings: Pending<number>;
}

export interface UsDtiReference {
  /** Back-end DTI (all monthly debts ÷ gross monthly income) this reference allows, as a decimal. */
  backEndMax: number;
  /** Plain-English description of who uses this limit. */
  label: string;
}

export interface UsRetirementLimits {
  /** 401(k) elective deferral limit. */
  deferralLimit: Pending<number>;
  /** Catch-up for ages 50 and over. */
  catchUp: Pending<number>;
  /** Higher catch-up for ages 60 to 63. */
  catchUpAge60to63: Pending<number>;
  /** Section 415(c) limit on total annual additions (excluding catch-up). */
  annualAdditionsLimit: Pending<number>;
  /** Most compensation that can be used for contributions. */
  compensationLimit: Pending<number>;
}

export interface UsQbiConfig {
  /** Deduction as a share of qualified business income. */
  rate: Pending<number>;
  /** Minimum deduction for taxpayers with at least minimumQbi of active QBI. */
  minimumDeduction: Pending<number>;
  minimumQbi: Pending<number>;
  /** Taxable income where the phase-in of the wage/property limit starts. */
  threshold: Record<UsFilingStatus, Pending<number>>;
  /** Taxable income where the phase-in range ends. */
  phaseInEnd: Record<UsFilingStatus, Pending<number>>;
}

// ---------- United Kingdom ----------

export interface UkRedundancyConfig {
  /** Redundancies on or after this date use these caps (ISO date). */
  effectiveFrom: Pending<string>;
  weeklyPayCap: { greatBritain: Pending<number>; northernIreland: Pending<number> };
  minYearsService: Pending<number>;
  maxYearsCounted: Pending<number>;
  /** Weeks of pay per full year of service, by the employee's age during that year. */
  ageBands: Pending<{ fromAge: number; weeksPerYear: number }[]>;
  /** Statutory redundancy pay up to this amount is not taxable. */
  taxFreeLimit: Pending<number>;
}

export interface UkStudentLoanPlan {
  /** Yearly repayment threshold. */
  threshold: number;
  /** Share of income over the threshold, as a decimal. */
  rate: number;
}

export interface UkTakeHomePayConfig {
  /** Adjusted net income where the Personal Allowance starts to fall. */
  personalAllowanceTaperStart: Pending<number>;
  /** Allowance lost per £1 over the taper start (0.5 = £1 for every £2). */
  personalAllowanceTaperRate: Pending<number>;
  /** Scottish bands, as taxable income above the Personal Allowance. */
  scotlandBands: Pending<TaxBand[]>;
  nationalInsurance: {
    primaryThreshold: Pending<number>;
    upperEarningsLimit: Pending<number>;
    mainRate: Pending<number>;
    upperRate: Pending<number>;
  };
  studentLoans: Record<'plan1' | 'plan2' | 'plan4' | 'plan5' | 'postgraduate', Pending<UkStudentLoanPlan>>;
  /** Basic-rate relief added by the provider under relief at source. */
  reliefAtSourceRate: Pending<number>;
}

export type UkStudentLoanPlanCode = 'plan1' | 'plan2' | 'plan4' | 'plan5' | 'postgraduate';

export interface UkStudentLoanInterestConfig {
  /** Fixed yearly interest rate for plans that don't vary with income. */
  rates: Record<Exclude<UkStudentLoanPlanCode, 'plan2'>, Pending<number>>;
  /** Plan 2 after study: minRate up to lowerIncome, rising to maxRate at upperIncome. */
  plan2: { minRate: Pending<number>; maxRate: Pending<number>; lowerIncome: Pending<number>; upperIncome: Pending<number> };
  /** Years after the April you were first due to repay when the loan is written off. */
  writeOffYears: Record<UkStudentLoanPlanCode, Pending<number>>;
}

export interface UkStampDutyConfig {
  /** Residential bands for a single property, by price. */
  standardBands: Pending<TaxBand[]>;
  firstTimeBuyerBands: Pending<TaxBand[]>;
  /** No first-time buyer relief above this price. */
  firstTimeBuyerMaxPrice: Pending<number>;
  /** Added to every band when buying an additional property. */
  additionalPropertySurcharge: Pending<number>;
  /** Higher rates don't apply below this price. */
  additionalPropertyMinPrice: Pending<number>;
  /** Added to every band for non-UK resident buyers. */
  nonResidentSurcharge: Pending<number>;
  nonResidentMinPrice: Pending<number>;
}

export interface UkInheritanceTaxConfig {
  nilRateBand: Pending<number>;
  residenceNilRateBand: Pending<number>;
  /** Estates above this lose residence nil-rate band. */
  taperThreshold: Pending<number>;
  /** Residence nil-rate band lost per £1 over the threshold (0.5 = £1 for every £2). */
  taperRate: Pending<number>;
  standardRate: Pending<number>;
  /** Reduced rate when enough of the estate goes to charity. */
  charityReducedRate: Pending<number>;
  /** Share of the baseline amount that must go to charity for the reduced rate. */
  charityQualifyingShare: Pending<number>;
  /** Most of a late spouse's unused band that can be transferred (1 = 100%). */
  maxTransferableShare: Pending<number>;
}

// ---------- Canada ----------

export type CaProvinceCode = 'AB' | 'BC' | 'MB' | 'NB' | 'NL' | 'NS' | 'NT' | 'NU' | 'ON' | 'PE' | 'QC' | 'SK' | 'YT';

export interface CaProvinceTax {
  code: CaProvinceCode;
  name: string;
  bands: Pending<TaxBand[]>;
  basicPersonalAmount: Pending<number>;
  /** Where the basic personal amount falls with income (Manitoba, Yukon). */
  basicPersonalAmountPhaseOut?: { start: number; end: number; minimum: number };
}

export interface CaFhsaConfig {
  annualLimit: Pending<number>;
  lifetimeLimit: Pending<number>;
  /** Most unused participation room that can be carried into a year. */
  maxCarryForward: Pending<number>;
  /** Years an FHSA can stay open. */
  maxParticipationYears: Pending<number>;
}

export interface CaTaxExtras {
  /** Federal basic personal amount at the highest incomes (the max is incomeTax.allowance). */
  basicPersonalAmountMinimum: Pending<number>;
  /** Refundable Quebec abatement of basic federal tax, as a decimal. */
  quebecAbatement: Pending<number>;
  ontarioSurtax: {
    firstThreshold: Pending<number>;
    firstRate: Pending<number>;
    secondThreshold: Pending<number>;
    secondRate: Pending<number>;
  };
}

// ---------- Australia ----------

export interface AuMedicareLevyConfig {
  rate: Pending<number>;
  /** Income year the low-income thresholds were published for (may lag the tax year). */
  thresholdsIncomeYear: Pending<string>;
  /** Single, no dependants: no levy at or below this taxable income. */
  lowIncomeThreshold: Pending<number>;
  /** Full levy applies above this; it phases in between the two. */
  lowIncomeUpperThreshold: Pending<number>;
  /** Between the thresholds the levy is this share of income above the lower threshold. */
  shadeInRate: Pending<number>;
}

export interface AuLowIncomeTaxOffset {
  maxOffset: Pending<number>;
  firstTaperStart: Pending<number>;
  firstTaperRate: Pending<number>;
  secondTaperStart: Pending<number>;
  secondTaperRate: Pending<number>;
  cutOut: Pending<number>;
}

export interface AuFbtConfig {
  /** FBT year these figures apply to, e.g. "year ending 31 March 2027". */
  fbtYear: Pending<string>;
  rate: Pending<number>;
  /** Statutory formula fraction for car benefits. */
  statutoryFraction: Pending<number>;
  /** EVs priced at or below this are FBT-exempt (luxury car tax threshold for fuel-efficient cars). */
  evExemptionPriceThreshold: Pending<number>;
  /** Date the current EV exemption ends or changes (ISO date). */
  evExemptionChangesOn: Pending<string>;
}

export interface AuNovatedLeaseConfig {
  /** ATO minimum residual as a share of cost, by lease term in whole years (1–5). */
  minimumResidualByTermYears: Record<1 | 2 | 3 | 4 | 5, Pending<number>>;
  /** Car limit: caps GST credits and depreciation. */
  carCostLimit: Pending<number>;
  gstRate: Pending<number>;
}

export interface CountryConfig {
  code: CountryCode;
  /** "United States" */
  name: string;
  /** "US", used in page titles. */
  shortName: string;
  /** Adjective for copy, e.g. "UK". */
  adjective: string;
  /** hreflang value, e.g. "en-us". */
  hreflang: string;
  /** BCP 47 locale for Intl formatting and <html lang>, e.g. "en-US". */
  locale: string;
  /** ISO 4217 code, e.g. "USD". */
  currency: string;
  currencySymbol: string;
  /** Tax year the config's tax figures apply to, e.g. "2026" or "2026/27". */
  taxYear: string;
  /** Live on the site: hub page, country picker, banner suggestions. */
  launched: boolean;
  /** Hints for CountryBanner. Timezones are matched exactly; languages by region subtag. */
  detect: {
    timezones: string[];
    languages: string[];
  };
  incomeTax: IncomeTaxConfig;
  defaults: {
    loan?: LoanDefaults;
    creditCard?: CreditCardDefaults;
    personalLoanPayoff?: PersonalLoanPayoffDefaults;
    usedCarLoan?: UsedCarLoanDefaults;
    takeHomePay?: TakeHomePayDefaults;
    stampDuty?: StampDutyDefaults;
    autoRefinance?: AutoRefinanceDefaults;
    retirementMatch?: RetirementMatchDefaults;
    studentLoan?: StudentLoanDefaults;
    carFinance?: CarFinanceDefaults;
  };

  // Country-specific figures, present only on the country that needs them.
  us?: {
    federalTax: Record<UsFilingStatus, UsFilingStatusTax>;
    selfEmployment: UsSelfEmploymentConfig;
    /** The four estimated tax due dates for the tax year (ISO dates). */
    estimatedTaxDueDates: Pending<[string, string, string, string]>;
    qbi: UsQbiConfig;
    retirement: UsRetirementLimits;
    /** Published lender limits shown next to the result, lowest first. */
    dtiReferences: Pending<UsDtiReference[]>;
  };
  uk?: {
    redundancy: UkRedundancyConfig;
    takeHomePay: UkTakeHomePayConfig;
    stampDuty: UkStampDutyConfig;
    studentLoanInterest: UkStudentLoanInterestConfig;
    inheritanceTax: UkInheritanceTaxConfig;
  };
  ca?: {
    fhsa: CaFhsaConfig;
    provinces: CaProvinceTax[];
    extras: CaTaxExtras;
  };
  au?: {
    medicareLevy: AuMedicareLevyConfig;
    lowIncomeTaxOffset: AuLowIncomeTaxOffset;
    fbt: AuFbtConfig;
    novatedLease: AuNovatedLeaseConfig;
  };
}
