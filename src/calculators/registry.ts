import { isLaunched, type CountryCode } from '../countries';

export type EngineName =
  | 'loan'
  | 'creditCardPayoff'
  | 'personalLoanPayoff'
  | 'usedCarLoan'
  | 'takeHomePay'
  | 'stampDuty'
  | 'autoRefinance'
  | 'retirementMatch'
  | 'studentLoan'
  | 'carFinance'
  | 'dti'
  | 'carAffordability'
  | 'debtConsolidation'
  | 'debtSnowball'
  | 'compoundInterest'
  | 'savingsGoal'
  | 'rentVsBuy'
  | 'paycheck'
  | 'pensionTaxRelief'
  | 'mortgageOverpayment'
  | 'isaSavings'
  | 'rothIra'
  | 'heloc'
  | 'caMortgage'
  | 'auTakeHome'
  | 'caTakeHome'
  | 'auSuper'
  | 'auHomeLoan'
  | 'helpDebt'
  | 'redundancyPay'
  | 'inheritanceTax'
  | 'selfEmploymentTax'
  | 'fhsa'
  | 'novatedLease';

export type Category = 'loans' | 'debt' | 'tax' | 'savings' | 'retirement' | 'property';

export const CATEGORY_LABELS: Record<Category, string> = {
  loans: 'Loans',
  debt: 'Debt',
  tax: 'Tax and pay',
  savings: 'Savings',
  retirement: 'Retirement',
  property: 'Property',
};

export interface CalculatorEntry {
  /** URL slug, ends in -calculator. Never change once published. */
  slug: string;
  /** Which engine and UI the page uses. */
  engine: EngineName;
  category: Category;
  /** Countries that get a page. A page also needs content/guides/[country]/[slug].md. */
  countries: CountryCode[];
  /** Base name used in titles, e.g. "Loan Calculator". */
  name: string;
  /** What the page gives you, after the name in the <title>: "Monthly Payment & Interest". See calculatorTitle(). */
  titleHook: string;
  /** One line for hub and homepage cards. */
  blurb: string;
  /** Related slugs; only those that exist for the same country are linked. */
  related: string[];
  /** Shown in "Popular calculators" on the homepage. */
  popular?: boolean;
  /** Uses tax figures: the page shows "Updated for the [tax year] tax year" (CLAUDE.md section 8). */
  usesTaxYear?: boolean;
  /** Planned but not built: no page, not linked, not in the sitemap. Remove when the definition of done is met. */
  draft?: boolean;
  /** Per-country changes when one slug needs a different engine or wording in a country. See forCountry(). */
  overrides?: Partial<Record<CountryCode, CountryOverride>>;
}

export type CountryOverride = Partial<Pick<CalculatorEntry, 'engine' | 'titleHook' | 'blurb' | 'related' | 'popular'>>;

/**
 * Every calculator on the site. A page exists only if it is listed here for that country.
 * Build order: CLAUDE.md section 12.
 */
export const CALCULATORS: CalculatorEntry[] = [
  {
    slug: 'loan-calculator',
    engine: 'loan',
    category: 'loans',
    countries: ['us', 'uk'],
    name: 'Loan Calculator',
    titleHook: 'Monthly Payment & Interest',
    blurb: 'Monthly payment, total interest and payoff date for any fixed-rate loan, with extra payments.',
    related: ['personal-loan-payoff-calculator', 'used-car-loan-calculator', 'credit-card-payoff-calculator', 'debt-snowball-calculator', 'car-finance-calculator'],
    popular: true,
  },

  {
    // Launch set #2. Uses the carLoan engine (amount financed) and the loan engine.
    slug: 'used-car-loan-calculator',
    engine: 'usedCarLoan',
    category: 'loans',
    countries: ['us'],
    name: 'Used Car Loan Calculator',
    titleHook: 'Payment With Trade-In & Tax',
    blurb: 'Monthly payment and total cost for a used car loan, with trade-in, sales tax and fees included.',
    related: ['car-affordability-calculator', 'auto-loan-refinance-calculator', 'loan-calculator', 'debt-to-income-ratio-calculator'],
    popular: true,
  },
  {
    // Launch set #4. Uses the debtPayoff engine (one card, fixed payment or target date).
    slug: 'credit-card-payoff-calculator',
    engine: 'creditCardPayoff',
    category: 'debt',
    countries: ['us', 'uk'],
    name: 'Credit Card Payoff Calculator',
    titleHook: 'Payoff Date & Interest',
    blurb: 'How long it takes to clear a credit card, the interest you pay, or the payment needed to be debt-free by a date.',
    related: ['debt-consolidation-calculator', 'debt-to-income-ratio-calculator', 'debt-snowball-calculator', 'loan-calculator', 'personal-loan-payoff-calculator'],
    popular: true,
  },

  {
    // Phase 1 continued. Uses the debtSnowball engine (rollover of freed payments; snowball or avalanche order).
    slug: 'debt-snowball-calculator',
    engine: 'debtSnowball',
    category: 'debt',
    countries: ['us', 'uk'],
    name: 'Debt Snowball Calculator',
    titleHook: 'Payoff Date & Order',
    blurb: 'Your debt-free date with the snowball or avalanche method, the payoff order, and the interest you save.',
    related: ['credit-card-payoff-calculator', 'debt-consolidation-calculator', 'debt-to-income-ratio-calculator', 'personal-loan-payoff-calculator', 'loan-calculator'],
  },

  {
    // Phase 1 continued. Uses the compoundInterest engine (equivalent monthly rate for any compounding).
    slug: 'compound-interest-calculator',
    engine: 'compoundInterest',
    category: 'savings',
    countries: ['us', 'uk'],
    name: 'Compound Interest Calculator',
    titleHook: 'Growth Year by Year',
    blurb: 'How a lump sum and regular monthly deposits grow with compound interest, year by year.',
    related: ['savings-goal-calculator', 'isa-savings-calculator', 'roth-ira-calculator', '401k-match-calculator', 'take-home-pay-calculator', 'debt-snowball-calculator', 'credit-card-payoff-calculator'],
    popular: true,
  },

  {
    // Phase 1 continued. Uses the savingsGoal engine (deposit needed, or time to reach a goal).
    slug: 'savings-goal-calculator',
    engine: 'savingsGoal',
    category: 'savings',
    countries: ['us', 'uk'],
    name: 'Savings Goal Calculator',
    titleHook: 'Monthly Savings Needed',
    blurb: 'How much to save each month to reach a goal by a date, or how long your monthly savings take to get there.',
    related: ['compound-interest-calculator', 'isa-savings-calculator', 'roth-ira-calculator', 'rent-vs-buy-calculator', 'take-home-pay-calculator', '401k-match-calculator', 'debt-snowball-calculator'],
  },

  {
    // Phase 1 continued. Uses the rentVsBuy engine (net worth: home equity vs investing); UK adds stamp duty.
    slug: 'rent-vs-buy-calculator',
    engine: 'rentVsBuy',
    category: 'property',
    countries: ['us', 'uk'],
    name: 'Rent vs Buy Calculator',
    titleHook: 'Which Leaves You Better Off',
    blurb: 'Whether buying or renting leaves you better off, the year buying pulls ahead, and every cost of owning.',
    related: ['stamp-duty-calculator', 'mortgage-overpayment-calculator', 'heloc-payment-calculator', 'savings-goal-calculator', 'compound-interest-calculator', 'debt-to-income-ratio-calculator', 'loan-calculator'],
  },

  {
    // Phase 1 continued. Uses the paycheck engine (IRS Pub 15-T percentage method, FICA).
    slug: 'paycheck-calculator',
    engine: 'paycheck',
    category: 'tax',
    countries: ['us'],
    name: 'Paycheck Calculator',
    titleHook: 'Take-Home Pay Per Paycheck',
    blurb: 'Your take-home pay per paycheck after federal withholding, Social Security, Medicare and pre-tax deductions.',
    related: ['quarterly-estimated-tax-calculator', '401k-match-calculator', 'savings-goal-calculator', 'debt-to-income-ratio-calculator', 'compound-interest-calculator'],
    popular: true,
    usesTaxYear: true,
  },

  {
    // Phase 1 continued. Uses the pensionTaxRelief engine (relief at source, net pay, salary sacrifice).
    slug: 'pension-tax-relief-calculator',
    engine: 'pensionTaxRelief',
    category: 'retirement',
    countries: ['uk'],
    name: 'Pension Tax Relief Calculator',
    titleHook: 'Your Tax Relief',
    blurb: 'The tax relief on your pension contributions, what they really cost you, and extra relief to claim back.',
    related: ['take-home-pay-calculator', 'compound-interest-calculator', 'savings-goal-calculator', 'student-loan-repayment-calculator', 'redundancy-pay-calculator'],
    popular: true,
    usesTaxYear: true,
  },

  {
    // Phase 1 continued. Uses the mortgageOverpayment engine (monthly overpayments and lump sums).
    slug: 'mortgage-overpayment-calculator',
    engine: 'mortgageOverpayment',
    category: 'property',
    countries: ['uk'],
    name: 'Mortgage Overpayment Calculator',
    titleHook: 'Interest & Time Saved',
    blurb: 'How much interest and time you save by overpaying your mortgage each month or with a lump sum.',
    related: ['stamp-duty-calculator', 'rent-vs-buy-calculator', 'savings-goal-calculator', 'isa-savings-calculator', 'loan-calculator'],
    popular: true,
  },

  {
    // Phase 1 continued. Uses the isaSavings engine (growth, allowance check, tax saved vs a savings account).
    slug: 'isa-savings-calculator',
    engine: 'isaSavings',
    category: 'savings',
    countries: ['uk'],
    name: 'ISA Savings Calculator',
    titleHook: 'Growth & Tax Saved',
    blurb: 'How your ISA grows, how much of your allowance you use, and the tax you save against a normal savings account.',
    related: ['compound-interest-calculator', 'savings-goal-calculator', 'pension-tax-relief-calculator', 'take-home-pay-calculator', 'mortgage-overpayment-calculator'],
    usesTaxYear: true,
  },

  {
    // Phase 1 continued. Uses the rothIra engine (Pub 590-A Worksheet 2-2 phase-out, projection).
    slug: 'roth-ira-calculator',
    engine: 'rothIra',
    category: 'retirement',
    countries: ['us'],
    name: 'Roth IRA Calculator',
    titleHook: 'Contribution Limit & Growth',
    blurb: 'How much you can put in a Roth IRA this year based on your income, and what it could grow to tax-free.',
    related: ['401k-match-calculator', 'compound-interest-calculator', 'paycheck-calculator', 'savings-goal-calculator', 'quarterly-estimated-tax-calculator'],
    popular: true,
    usesTaxYear: true,
  },

  {
    // Phase 1 continued. Uses the heloc engine (interest-only or P&I draw period, then amortised repayment).
    slug: 'heloc-payment-calculator',
    engine: 'heloc',
    category: 'property',
    countries: ['us'],
    name: 'HELOC Payment Calculator',
    titleHook: 'Interest-Only & Repayment',
    blurb: 'Your HELOC payment in the draw period and the repayment period, the jump between them, and your credit line.',
    related: ['debt-consolidation-calculator', 'rent-vs-buy-calculator', 'debt-to-income-ratio-calculator', 'loan-calculator', 'credit-card-payoff-calculator'],
  },

  {
    // Phase 2. Uses the caMortgage engine (semi-annual compounding, accelerated payments, CMHC insurance).
    slug: 'mortgage-payment-calculator',
    engine: 'caMortgage',
    category: 'property',
    countries: ['ca'],
    name: 'Mortgage Payment Calculator',
    titleHook: 'With CMHC Insurance',
    blurb: 'Your mortgage payment for any frequency, CMHC insurance, minimum down payment and balance at renewal.',
    related: ['fhsa-calculator', 'land-transfer-tax-calculator', 'rrsp-vs-tfsa-calculator', 'income-tax-calculator', 'cpp-calculator'],
    popular: true,
  },

  {
    // Phase 2. Uses the caTakeHome engine (federal + provincial tax, CPP, EI; all provinces except Quebec).
    slug: 'income-tax-calculator',
    engine: 'caTakeHome',
    category: 'tax',
    countries: ['ca'],
    name: 'Income Tax Calculator',
    titleHook: 'Take-Home Pay & Tax',
    blurb: 'Your federal and provincial income tax, CPP and EI, take-home pay and marginal rate for your province.',
    related: ['mortgage-payment-calculator', 'fhsa-calculator', 'rrsp-vs-tfsa-calculator', 'cpp-calculator', 'land-transfer-tax-calculator'],
    popular: true,
    usesTaxYear: true,
  },

  {
    // Phase 2. Uses the auSuper engine (super guarantee, contributions tax, salary sacrifice, fees).
    slug: 'super-calculator',
    engine: 'auSuper',
    category: 'retirement',
    countries: ['au'],
    name: 'Super Calculator',
    titleHook: 'Retirement Balance',
    blurb: 'How much super you could have at retirement, in today’s dollars, and what extra contributions add.',
    related: ['take-home-pay-calculator', 'novated-lease-calculator', 'home-loan-repayment-calculator', 'hecs-help-repayment-calculator'],
    popular: true,
    usesTaxYear: true,
  },

  {
    // Phase 2. Uses the auHomeLoan engine (frequencies, interest-only period, offset, extra repayments).
    slug: 'home-loan-repayment-calculator',
    engine: 'auHomeLoan',
    category: 'property',
    countries: ['au'],
    name: 'Home Loan Repayment Calculator',
    titleHook: 'Offset & Extras',
    blurb: 'Your home loan repayments weekly, fortnightly or monthly, with an offset account, extra repayments or interest-only.',
    related: ['take-home-pay-calculator', 'stamp-duty-calculator', 'super-calculator', 'hecs-help-repayment-calculator'],
    popular: true,
  },

  {
    // Phase 2. Uses the helpDebt engine (marginal repayment system, 1 June indexation, voluntary repayments).
    slug: 'hecs-help-repayment-calculator',
    engine: 'helpDebt',
    category: 'debt',
    countries: ['au'],
    name: 'HECS-HELP Repayment Calculator',
    titleHook: 'Payoff Time',
    blurb: 'Your compulsory HELP repayment this year, how long your debt takes to repay, and what voluntary repayments save.',
    related: ['take-home-pay-calculator', 'super-calculator', 'home-loan-repayment-calculator', 'novated-lease-calculator'],
    usesTaxYear: true,
  },

  {
    // Launch set #5. Uses the earlyPayoff engine (loan + extra payments).
    slug: 'personal-loan-payoff-calculator',
    engine: 'personalLoanPayoff',
    category: 'loans',
    countries: ['us'],
    name: 'Personal Loan Payoff Calculator',
    titleHook: 'Extra Payment Savings',
    blurb: 'How much paying extra each month, or a one-time lump sum, saves on a personal loan you already have.',
    related: ['loan-calculator', 'debt-snowball-calculator', 'debt-consolidation-calculator', 'credit-card-payoff-calculator', 'debt-to-income-ratio-calculator'],
  },

  {
    // Launch set #7.
    slug: 'take-home-pay-calculator',
    engine: 'takeHomePay',
    usesTaxYear: true,
    category: 'tax',
    countries: ['uk', 'au'],
    name: 'Take-Home Pay Calculator',
    titleHook: 'Salary After Tax',
    blurb: 'Your monthly pay after Income Tax, National Insurance, student loan and pension, for England, Wales, NI or Scotland.',
    related: ['redundancy-pay-calculator', 'student-loan-repayment-calculator', 'pension-tax-relief-calculator', 'savings-goal-calculator', 'credit-card-payoff-calculator', 'loan-calculator'],
    popular: true,
    overrides: {
      // Phase 2. Uses the auTakeHome engine (ATO rates, Medicare levy and surcharge, HELP, super guarantee).
      au: {
        engine: 'auTakeHome',
        titleHook: 'Pay After Tax',
        blurb: 'Your pay after income tax, the Medicare levy and HELP repayments, weekly, fortnightly or monthly, plus your super.',
        related: ['novated-lease-calculator', 'super-calculator', 'hecs-help-repayment-calculator', 'home-loan-repayment-calculator', 'stamp-duty-calculator'],
      },
    },
  },

  {
    // Launch set #8. Uses the propertyTax engine (SDLT, England and Northern Ireland).
    slug: 'stamp-duty-calculator',
    engine: 'stampDuty',
    usesTaxYear: true,
    category: 'property',
    countries: ['uk'],
    name: 'Stamp Duty Calculator',
    titleHook: 'SDLT for Any Buyer',
    blurb: 'Stamp Duty Land Tax on a home in England or Northern Ireland, for first-time buyers, movers and additional properties.',
    related: ['rent-vs-buy-calculator', 'take-home-pay-calculator', 'inheritance-tax-calculator', 'mortgage-overpayment-calculator', 'loan-calculator'],
    popular: true,
  },

  {
    // Launch set #3. Uses the refinance engine (loan engine for both loans).
    slug: 'auto-loan-refinance-calculator',
    engine: 'autoRefinance',
    category: 'loans',
    countries: ['us'],
    name: 'Auto Loan Refinance Calculator',
    titleHook: 'Savings & Break-Even',
    blurb: 'Whether refinancing your car loan saves money, your new payment, and when the fees pay for themselves.',
    related: ['used-car-loan-calculator', 'car-affordability-calculator', 'loan-calculator', 'debt-consolidation-calculator'],
  },
  {
    // Launch set #6.
    slug: '401k-match-calculator',
    engine: 'retirementMatch',
    usesTaxYear: true,
    category: 'retirement',
    countries: ['us'],
    name: '401(k) Match Calculator',
    titleHook: 'Employer Match & Growth',
    blurb: 'How much your employer adds to your 401(k), the match you might be missing, and what it could grow to.',
    related: ['compound-interest-calculator', 'roth-ira-calculator', 'savings-goal-calculator', 'quarterly-estimated-tax-calculator', 'debt-to-income-ratio-calculator', 'paycheck-calculator'],
    popular: true,
  },
  {
    // Launch set #9.
    slug: 'student-loan-repayment-calculator',
    engine: 'studentLoan',
    usesTaxYear: true,
    category: 'debt',
    countries: ['uk'],
    name: 'Student Loan Repayment Calculator',
    titleHook: 'All Plans',
    blurb: 'Your monthly student loan repayment, how long it takes, and how much may be written off, for every plan.',
    related: ['take-home-pay-calculator', 'credit-card-payoff-calculator', 'loan-calculator', 'redundancy-pay-calculator'],
  },
  {
    // Launch set #10. Uses the carFinance engine (loan + balloon).
    slug: 'car-finance-calculator',
    engine: 'carFinance',
    category: 'loans',
    countries: ['uk'],
    name: 'Car Finance Calculator',
    titleHook: 'PCP & HP Payments',
    blurb: 'Monthly PCP or hire purchase payments, the final payment, and the total you pay for the car.',
    related: ['loan-calculator', 'take-home-pay-calculator', 'credit-card-payoff-calculator'],
  },

  // ---------- Batch 2 (CLAUDE.md section 12) ----------
  {
    slug: 'debt-to-income-ratio-calculator',
    engine: 'dti',
    category: 'debt',
    countries: ['us'],
    name: 'Debt-to-Income Ratio Calculator',
    titleHook: 'Front & Back-End DTI',
    blurb: 'Front-end and back-end DTI, what lenders look for, and how much debt to cut to reach a target ratio.',
    related: ['debt-consolidation-calculator', 'debt-snowball-calculator', 'heloc-payment-calculator', 'credit-card-payoff-calculator', 'car-affordability-calculator', 'loan-calculator'],
  },
  {
    // Uses the loan engine in reverse: budget → maximum loan → maximum price.
    slug: 'car-affordability-calculator',
    engine: 'carAffordability',
    category: 'loans',
    countries: ['us'],
    name: 'Car Affordability Calculator',
    titleHook: 'How Much Car Can I Afford',
    blurb: 'The most car you can afford from a monthly budget, with trade-in, sales tax and fees included.',
    related: ['used-car-loan-calculator', 'auto-loan-refinance-calculator', 'loan-calculator', 'debt-to-income-ratio-calculator'],
  },
  {
    // Uses the debtPayoff engine for current debts and the loan engine for the new loan.
    slug: 'debt-consolidation-calculator',
    engine: 'debtConsolidation',
    category: 'debt',
    countries: ['us'],
    name: 'Debt Consolidation Calculator',
    titleHook: 'Savings & Break-Even',
    blurb: 'Compare paying off up to 10 debts as they are with one consolidation loan, including fees and break-even.',
    related: ['credit-card-payoff-calculator', 'debt-snowball-calculator', 'heloc-payment-calculator', 'personal-loan-payoff-calculator', 'debt-to-income-ratio-calculator'],
  },
  {
    slug: 'redundancy-pay-calculator',
    engine: 'redundancyPay',
    usesTaxYear: true,
    category: 'tax',
    countries: ['uk'],
    name: 'Redundancy Pay Calculator',
    titleHook: 'Statutory Pay',
    blurb: 'Statutory redundancy pay from your age, service and weekly pay, for Great Britain or Northern Ireland.',
    related: ['take-home-pay-calculator', 'pension-tax-relief-calculator', 'credit-card-payoff-calculator', 'loan-calculator'],
  },
  {
    slug: 'inheritance-tax-calculator',
    engine: 'inheritanceTax',
    usesTaxYear: true,
    category: 'tax',
    countries: ['uk'],
    name: 'Inheritance Tax Calculator',
    titleHook: 'Tax on an Estate',
    blurb: 'Nil-rate bands, residence allowance after taper, and the tax due on an estate, including the charity rate.',
    related: ['stamp-duty-calculator', 'pension-tax-relief-calculator', 'isa-savings-calculator'],
  },
  {
    slug: 'quarterly-estimated-tax-calculator',
    engine: 'selfEmploymentTax',
    usesTaxYear: true,
    category: 'tax',
    countries: ['us'],
    name: 'Quarterly Estimated Tax Calculator',
    titleHook: 'Due Dates',
    blurb: 'Self-employment tax, federal income tax and your four quarterly payments with due dates.',
    related: ['paycheck-calculator', 'roth-ira-calculator', '401k-match-calculator', 'debt-to-income-ratio-calculator'],
  },
  {
    slug: 'fhsa-calculator',
    engine: 'fhsa',
    usesTaxYear: true,
    category: 'savings',
    countries: ['ca'],
    name: 'FHSA Calculator',
    titleHook: 'Balance & Tax Refunds',
    blurb: 'Project your First Home Savings Account balance, contributions and tax refunds, with limit warnings.',
    related: ['rrsp-vs-tfsa-calculator', 'mortgage-payment-calculator', 'land-transfer-tax-calculator', 'income-tax-calculator'],
    popular: true,
  },
  {
    slug: 'novated-lease-calculator',
    engine: 'novatedLease',
    usesTaxYear: true,
    category: 'tax',
    countries: ['au'],
    name: 'Novated Lease Calculator',
    titleHook: 'EV Savings',
    blurb: 'Pre-tax and post-tax deductions, take-home pay change and the true cost against buying outright.',
    related: ['take-home-pay-calculator', 'home-loan-repayment-calculator', 'super-calculator'],
    popular: true,
  },
];

/** The entry as it applies in one country, with that country's overrides. */
export function forCountry(calc: CalculatorEntry, country: CountryCode): CalculatorEntry {
  const o = calc.overrides?.[country];
  return o ? { ...calc, ...o } : calc;
}

export function getCalculator(slug: string): CalculatorEntry {
  const calc = CALCULATORS.find((c) => c.slug === slug);
  if (!calc) throw new Error(`Unknown calculator: ${slug}`);
  return calc;
}

/** Launched countries this calculator has a page in. Drafts have none. */
export function liveCountries(calc: CalculatorEntry): CountryCode[] {
  return calc.draft ? [] : calc.countries.filter(isLaunched);
}

/** Published (non-draft) calculators for a country. */
export function calculatorsFor(country: CountryCode): CalculatorEntry[] {
  return CALCULATORS.filter((c) => !c.draft && c.countries.includes(country)).map((c) => forCountry(c, country));
}

export function relatedFor(calc: CalculatorEntry, country: CountryCode): CalculatorEntry[] {
  return calc.related
    .map((slug) => CALCULATORS.find((c) => c.slug === slug))
    .filter((c): c is CalculatorEntry => c !== undefined && !c.draft && c.countries.includes(country))
    .slice(0, 5)
    .map((c) => forCountry(c, country));
}

export function calculatorPath(country: CountryCode, slug: string): string {
  return `/${country}/${slug}/`;
}

/** Google shows about 60 characters of a title (CLAUDE.md section 10). */
export const MAX_TITLE_LENGTH = 60;

/**
 * <title> for a calculator page, most useful first: "UK Take-Home Pay Calculator 2026/27: Salary After Tax".
 * Adds " | {brand}" when it still fits; drops the hook (then the brand) if the title would be too long.
 */
export function calculatorTitle(calc: CalculatorEntry, adjective: string, taxYear: string, brand: string): string {
  const base = `${adjective} ${calc.name}${calc.usesTaxYear ? ` ${taxYear}` : ''}`;
  const full = `${base}: ${calc.titleHook}`;
  for (const candidate of [`${full} | ${brand}`, full, `${base} | ${brand}`, base]) {
    if (candidate.length <= MAX_TITLE_LENGTH) return candidate;
  }
  return base;
}
