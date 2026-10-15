import { isLaunched, type CountryCode } from '../countries';

export type EngineName = 'loan';

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
];

export function getCalculator(slug: string): CalculatorEntry {
  const calc = CALCULATORS.find((c) => c.slug === slug);
  if (!calc) throw new Error(`Unknown calculator: ${slug}`);
  return calc;
}

/** Launched countries this calculator has a page in. */
export function liveCountries(calc: CalculatorEntry): CountryCode[] {
  return calc.countries.filter(isLaunched);
}

export function calculatorsFor(country: CountryCode): CalculatorEntry[] {
  return CALCULATORS.filter((c) => c.countries.includes(country));
}

export function relatedFor(calc: CalculatorEntry, country: CountryCode): CalculatorEntry[] {
  return calc.related
    .map((slug) => CALCULATORS.find((c) => c.slug === slug))
    .filter((c): c is CalculatorEntry => c !== undefined && c.countries.includes(country))
    .slice(0, 5);
}

export function calculatorPath(country: CountryCode, slug: string): string {
  return `/${country}/${slug}/`;
}
