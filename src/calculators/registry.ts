import { isLaunched, type CountryCode } from '../countries';

export type EngineName =
  | 'loan'
  | 'creditCardPayoff'
  | 'personalLoanPayoff'
  | 'usedCarLoan'
  | 'dti'
  | 'carAffordability'
  | 'debtConsolidation'
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
  /** One line for hub and homepage cards. */
  blurb: string;
  /** Related slugs; only those that exist for the same country are linked. */
  related: string[];
  /** Shown in "Popular calculators" on the homepage. */
  popular?: boolean;
  /** Planned but not built: no page, not linked, not in the sitemap. Remove when the definition of done is met. */
  draft?: boolean;
}

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
    blurb: 'Monthly payment, total interest and payoff date for any fixed-rate loan, with extra payments.',
    related: ['personal-loan-payoff-calculator', 'used-car-loan-calculator', 'credit-card-payoff-calculator', 'car-finance-calculator'],
    popular: true,
  },

  {
    // Launch set #2. Uses the carLoan engine (amount financed) and the loan engine.
    slug: 'used-car-loan-calculator',
    engine: 'usedCarLoan',
    category: 'loans',
    countries: ['us'],
    name: 'Used Car Loan Calculator',
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
    blurb: 'How long it takes to clear a credit card, the interest you pay, or the payment needed to be debt-free by a date.',
    related: ['debt-consolidation-calculator', 'debt-to-income-ratio-calculator', 'debt-snowball-calculator', 'loan-calculator', 'personal-loan-payoff-calculator'],
    popular: true,
  },

  {
    // Launch set #5. Uses the earlyPayoff engine (loan + extra payments).
    slug: 'personal-loan-payoff-calculator',
    engine: 'personalLoanPayoff',
    category: 'loans',
    countries: ['us'],
    name: 'Personal Loan Payoff Calculator',
    blurb: 'How much paying extra each month, or a one-time lump sum, saves on a personal loan you already have.',
    related: ['loan-calculator', 'debt-consolidation-calculator', 'credit-card-payoff-calculator', 'debt-to-income-ratio-calculator'],
  },

  // ---------- Batch 2 (CLAUDE.md section 12) ----------
  {
    slug: 'debt-to-income-ratio-calculator',
    engine: 'dti',
    category: 'debt',
    countries: ['us'],
    name: 'Debt-to-Income Ratio Calculator',
    blurb: 'Front-end and back-end DTI, what lenders look for, and how much debt to cut to reach a target ratio.',
    related: ['debt-consolidation-calculator', 'credit-card-payoff-calculator', 'car-affordability-calculator', 'loan-calculator'],
  },
  {
    // Uses the loan engine in reverse: budget → maximum loan → maximum price.
    slug: 'car-affordability-calculator',
    engine: 'carAffordability',
    category: 'loans',
    countries: ['us'],
    name: 'Car Affordability Calculator',
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
    blurb: 'Compare paying off up to 10 debts as they are with one consolidation loan, including fees and break-even.',
    related: ['credit-card-payoff-calculator', 'debt-snowball-calculator', 'personal-loan-payoff-calculator', 'debt-to-income-ratio-calculator'],
  },
  {
    slug: 'redundancy-pay-calculator',
    engine: 'redundancyPay',
    category: 'tax',
    countries: ['uk'],
    name: 'Redundancy Pay Calculator',
    blurb: 'Statutory redundancy pay from your age, service and weekly pay, for Great Britain or Northern Ireland.',
    related: ['take-home-pay-calculator', 'pension-tax-relief-calculator', 'credit-card-payoff-calculator', 'loan-calculator'],
  },
  {
    slug: 'inheritance-tax-calculator',
    engine: 'inheritanceTax',
    category: 'tax',
    countries: ['uk'],
    name: 'Inheritance Tax Calculator',
    blurb: 'Nil-rate bands, residence allowance after taper, and the tax due on an estate, including the charity rate.',
    related: ['stamp-duty-calculator', 'pension-tax-relief-calculator', 'isa-savings-calculator'],
  },
  {
    slug: 'quarterly-estimated-tax-calculator',
    engine: 'selfEmploymentTax',
    category: 'tax',
    countries: ['us'],
    name: 'Quarterly Estimated Tax Calculator',
    blurb: 'Self-employment tax, federal income tax and your four quarterly payments with due dates.',
    related: ['paycheck-calculator', 'roth-ira-calculator', '401k-match-calculator', 'debt-to-income-ratio-calculator'],
  },
  {
    slug: 'fhsa-calculator',
    engine: 'fhsa',
    category: 'savings',
    countries: ['ca'],
    name: 'FHSA Calculator',
    blurb: 'Project your First Home Savings Account balance, contributions and tax refunds, with limit warnings.',
    related: ['rrsp-vs-tfsa-calculator', 'mortgage-payment-calculator', 'land-transfer-tax-calculator', 'income-tax-calculator'],
  },
  {
    slug: 'novated-lease-calculator',
    engine: 'novatedLease',
    category: 'tax',
    countries: ['au'],
    name: 'Novated Lease Calculator',
    blurb: 'Pre-tax and post-tax deductions, take-home pay change and the true cost against buying outright.',
    related: ['take-home-pay-calculator', 'home-loan-repayment-calculator', 'super-calculator'],
  },
];

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
  return CALCULATORS.filter((c) => !c.draft && c.countries.includes(country));
}

export function relatedFor(calc: CalculatorEntry, country: CountryCode): CalculatorEntry[] {
  return calc.related
    .map((slug) => CALCULATORS.find((c) => c.slug === slug))
    .filter((c): c is CalculatorEntry => c !== undefined && !c.draft && c.countries.includes(country))
    .slice(0, 5);
}

export function calculatorPath(country: CountryCode, slug: string): string {
  return `/${country}/${slug}/`;
}
