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

export interface RentVsBuyDefaults {
  homePrice: number;
  depositPercent: number;
  mortgageRatePercent: number;
  termYears: number;
  /** US: closing costs as a % of the price. */
  closingCostsPercent?: number;
  /** UK: legal, survey and mortgage fees (stamp duty is worked out separately). */
  otherBuyingCosts?: number;
  /** US only. */
  propertyTaxPercent?: number;
  insurancePerYear: number;
  maintenancePercent: number;
  feesPerMonth: number;
  sellingCostsPercent: number;
  homeGrowthPercent: number;
  monthlyRent: number;
  rentGrowthPercent: number;
  investReturnPercent: number;
  years: number;
}

export interface MortgageOverpaymentDefaults {
  balance: number;
  ratePercent: number;
  years: number;
  monthlyOverpayment: number;
  allowancePercent: number;
}

export interface IsaDefaults {
  startingBalance: number;
  monthlyDeposit: number;
  ratePercent: number;
  years: number;
}

export interface RothIraDefaults {
  age: number;
  retirementAge: number;
  currentBalance: number;
  plannedContribution: number;
  magi: number;
  returnPercent: number;
}

export interface HelocDefaults {
  balance: number;
  ratePercent: number;
  drawYears: number;
  repayYears: number;
  homeValue: number;
  mortgageBalance: number;
  maxCltvPercent: number;
}

export interface CaMortgageDefaults {
  price: number;
  downPayment: number;
  ratePercent: number;
  amortizationYears: number;
  termYears: number;
}

export interface CaRrspTfsaDefaults {
  income: number;
  retirementIncome: number;
  contribution: number;
  years: number;
  returnPercent: number;
}

export interface CaCppDefaults {
  pensionAt65: number;
  startAge: number;
  lifeExpectancy: number;
}

export interface CaLandTransferDefaults {
  price: number;
}

export interface CaIncomeTaxDefaults {
  income: number;
}

export interface AuSuperDefaults {
  age: number;
  retirementAge: number;
  balance: number;
  salary: number;
  salaryGrowthPercent: number;
  returnPercent: number;
  feesPerYear: number;
  inflationPercent: number;
}

export interface AuStampDutyDefaults {
  value: number;
}

export interface AuHomeLoanDefaults {
  amount: number;
  ratePercent: number;
  termYears: number;
}

export interface AuHelpDefaults {
  balance: number;
  income: number;
  incomeGrowthPercent: number;
}

export interface AuTakeHomeDefaults {
  salary: number;
}

export interface PaycheckDefaults {
  annualSalary: number;
  hourlyRate: number;
  hoursPerWeek: number;
  retirementPercent: number;
  pretaxBenefits: number;
}

export interface PensionReliefDefaults {
  salary: number;
  contributionPercent: number;
  contributionMonthly: number;
  employerPercent: number;
}

export interface CompoundInterestDefaults {
  initialDeposit: number;
  monthlyDeposit: number;
  annualRatePercent: number;
  years: number;
}

export interface SavingsGoalDefaults {
  goal: number;
  currentSavings: number;
  ratePercent: number;
  years: number;
  monthlyDeposit: number;
}

export interface DebtSnowballDefaults {
  debts: { name: string; balance: number; aprPercent: number; minimumPayment: number }[];
  extraMonthly: number;
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

export interface UsRothIraConfig {
  contributionLimit: Pending<number>;
  /** Extra allowed from age 50. */
  catchUp: Pending<number>;
  catchUpAge: Pending<number>;
  /** Modified AGI where the limit starts to shrink, and the width of the phase-out range. */
  phaseOut: Record<'single' | 'marriedJoint' | 'marriedSeparate', { start: Pending<number>; width: Pending<number> }>;
  /** Pub 590-A Worksheet 2-2: a reduced limit is rounded up to this multiple and is at least the minimum. */
  roundTo: Pending<number>;
  reducedMinimum: Pending<number>;
}

export interface UsPayrollConfig {
  /** Pub 15-T Worksheet 1A line 1g: subtracted when the Form W-4 Step 2 box isn't checked. */
  withholdingAdjustment: { marriedJoint: Pending<number>; other: Pending<number> };
  /** Employee shares of FICA, as decimals. */
  socialSecurityRate: Pending<number>;
  medicareRate: Pending<number>;
  additionalMedicareRate: Pending<number>;
  /** Employers withhold Additional Medicare Tax on wages over this, whatever the filing status. */
  additionalMedicareWithholdingThreshold: Pending<number>;
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

export interface UkSavingsConfig {
  /** Total you can pay into ISAs in the tax year. */
  isaAllowance: Pending<number>;
  /** Personal Savings Allowance by Income Tax band. */
  personalSavingsAllowance: Record<'basic' | 'higher' | 'additional', Pending<number>>;
  /** Tax rate on savings interest over the allowance, by band (the main Income Tax rates). */
  savingsTaxRate: Record<'basic' | 'higher' | 'additional', Pending<number>>;
  /** Starting rate for savings: up to this much interest is tax-free when other income is low. */
  startingRateLimit: Pending<number>;
}

export interface UkPensionConfig {
  annualAllowance: Pending<number>;
  /** Tapered annual allowance: applies only when threshold income is over this… */
  taperThresholdIncome: Pending<number>;
  /** …and adjusted income is over this; the allowance falls £1 for every £2 above it. */
  taperAdjustedIncome: Pending<number>;
  taperMinimum: Pending<number>;
  /** Allowance after flexibly accessing a pension. */
  moneyPurchaseAnnualAllowance: Pending<number>;
  /** Relief at source: gross contributions that get relief with no (or low) earnings. */
  nonEarnerGrossLimit: Pending<number>;
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

export interface CaMortgageConfig {
  /** Minimum down payment: firstRate on the price up to firstTierTop, secondRate on the rest, up to insuredPriceCap. */
  minDownPayment: { firstTierTop: number; firstRate: number; secondRate: number; uninsuredRate: number };
  /** Below this down payment share, mortgage loan insurance is required. */
  insuranceRequiredBelow: number;
  /** Purchase price at or above which insurance isn't available (20% down needed). */
  insuredPriceCap: number;
  maxInsuredAmortizationYears: number;
  /** First-time buyers and buyers of new builds. */
  maxInsuredAmortizationYearsFirstTime: number;
  /** Premium on the total loan by loan-to-value, ascending. */
  premiums: { maxLtv: number; rate: number }[];
  /** Added to the premium rate when the amortization is over maxInsuredAmortizationYears. */
  longAmortizationSurcharge: number;
}

export interface CaPayrollConfig {
  cpp: { basicExemption: number; ympe: number; yampe: number; baseRate: number; firstAdditionalRate: number; secondAdditionalRate: number };
  ei: { maxInsurableEarnings: number; rate: number };
  canadaEmploymentAmount: number;
  /** Ontario Health Premium: in the highest band with taxable income over "from", min(cap, base + rate × (income − from)). */
  ontarioHealthPremium: { from: number; base: number; rate: number; cap: number }[];
}

/** Marginal bands: rate applies to the part of the value between from and to (null = no top). */
export interface RateBand {
  from: number;
  to: number | null;
  rate: number;
}

export type CaLandTransferProvince = 'ON' | 'BC' | 'MB' | 'QC' | 'NB' | 'NS' | 'PE';

export interface CaLandTransferConfig {
  ontario: { bands: RateBand[]; firstTimeRefundMax: number };
  toronto: { bands: RateBand[]; firstTimeRebateMax: number };
  bc: {
    bands: RateBand[];
    /** Further tax on residential value over a threshold. */
    furtherRate: number;
    furtherThreshold: number;
    firstTime: { fullExemptionValue: number; exemptionAmount: number; flatUpTo: number; phaseOutTo: number };
    newBuild: { fullExemptionBelow: number; phaseOutTo: number };
  };
  manitoba: { bands: RateBand[] };
  quebec: { bands: RateBand[]; year: string };
  montreal: { bands: RateBand[]; year: string };
  newBrunswick: { rate: number };
  novaScotia: { defaultMunicipalRate: number; defaultMunicipality: string };
  pei: { rate: number; lowValueExemptUpTo: number };
}

export interface CaRegisteredConfig {
  tfsaLimit: number;
  rrspDollarLimit: number;
  /** RRSP room as a share of the previous year's earned income. */
  rrspIncomeRate: number;
}

export interface CaCppConfig {
  maxMonthlyAt65: number;
  averageMonthlyAt65: number;
  averageAsOf: string;
  earlyReductionPerMonth: number;
  lateIncreasePerMonth: number;
  earliestAge: number;
  latestAge: number;
}

export interface AuSuperConfig {
  guaranteeRate: number;
  /** Annual earnings above which super guarantee isn't required. */
  maxContributionBase: number;
  concessionalCap: number;
  nonConcessionalCap: number;
  /** Tax on concessional contributions in the fund. */
  contributionsTaxRate: number;
  /** Preservation age for people born from 1 July 1964. */
  preservationAge: number;
}

export interface AuHelpConfig {
  /** Nil up to firstThreshold; firstRate on income above it; secondBase + secondRate above secondThreshold. */
  firstThreshold: number;
  firstRate: number;
  secondThreshold: number;
  secondBase: number;
  secondRate: number;
  /** From this repayment income, flatRate × total repayment income. */
  flatThreshold: number;
  flatRate: number;
  /** Indexation applied on 1 June (latest published year). */
  indexationRate: number;
  indexationYear: string;
}

/**
 * Duty band: from "from" upwards, duty = base + rate × (value − from); or, if flat, rate × the whole value.
 * Rates are per dollar (4.5% = 0.045).
 */
export interface DutyBand {
  from: number;
  base: number;
  rate: number;
  flat?: boolean;
}

export type AuState = 'NSW' | 'VIC' | 'QLD' | 'WA' | 'SA' | 'TAS' | 'ACT' | 'NT';

export interface AuStampDutyConfig {
  year: string;
  nsw: { bands: DutyBand[]; minimum: number; firstHome: { exemptUpTo: number; concessionBelow: number } };
  vic: { bands: DutyBand[]; pprBands: DutyBand[]; pprUpTo: number; firstHome: { exemptUpTo: number; concessionUpTo: number } };
  qld: { bands: DutyBand[]; homeBands: DutyBand[]; firstHomeConcession: { below: number; amount: number }[] };
  wa: { bands: DutyBand[]; concessionalBands: DutyBand[]; concessionalUpTo: number; firstHome: { exemptUpTo: number; upTo: number; rate: number } };
  sa: { bands: DutyBand[] };
  tas: { bands: DutyBand[] };
  act: { ownerBands: DutyBand[]; investorBands: DutyBand[] };
  nt: { formulaUpTo: number; a: number; b: number; bands: DutyBand[] };
  /** States where duty is charged per $100 "or part of $100" (the excess is rounded up to the next $100). */
  roundUpTo100: AuState[];
}

export interface AuMlsConfig {
  /** Single tiers, ascending: income for MLS purposes above "from" pays "rate" × taxable income. */
  singleTiers: { from: number; rate: number }[];
}

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
    debtSnowball?: DebtSnowballDefaults;
    compoundInterest?: CompoundInterestDefaults;
    savingsGoal?: SavingsGoalDefaults;
    rentVsBuy?: RentVsBuyDefaults;
    paycheck?: PaycheckDefaults;
    pensionRelief?: PensionReliefDefaults;
    mortgageOverpayment?: MortgageOverpaymentDefaults;
    isa?: IsaDefaults;
    rothIra?: RothIraDefaults;
    heloc?: HelocDefaults;
    caMortgage?: CaMortgageDefaults;
    auTakeHome?: AuTakeHomeDefaults;
    caIncomeTax?: CaIncomeTaxDefaults;
    caRrspTfsa?: CaRrspTfsaDefaults;
    caCpp?: CaCppDefaults;
    caLandTransfer?: CaLandTransferDefaults;
    auSuper?: AuSuperDefaults;
    auHomeLoan?: AuHomeLoanDefaults;
    auStampDuty?: AuStampDutyDefaults;
    auHelp?: AuHelpDefaults;
  };

  // Country-specific figures, present only on the country that needs them.
  us?: {
    federalTax: Record<UsFilingStatus, UsFilingStatusTax>;
    selfEmployment: UsSelfEmploymentConfig;
    payroll: UsPayrollConfig;
    rothIra: UsRothIraConfig;
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
    pensions: UkPensionConfig;
    savings: UkSavingsConfig;
  };
  ca?: {
    fhsa: CaFhsaConfig;
    mortgage: CaMortgageConfig;
    payroll: CaPayrollConfig;
    landTransfer: CaLandTransferConfig;
    registered: CaRegisteredConfig;
    cpp: CaCppConfig;
    provinces: CaProvinceTax[];
    extras: CaTaxExtras;
  };
  au?: {
    medicareLevy: AuMedicareLevyConfig;
    lowIncomeTaxOffset: AuLowIncomeTaxOffset;
    fbt: AuFbtConfig;
    novatedLease: AuNovatedLeaseConfig;
    super: AuSuperConfig;
    help: AuHelpConfig;
    mls: AuMlsConfig;
    stampDuty: AuStampDutyConfig;
  };
}
