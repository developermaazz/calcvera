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

export interface LoanDefaults {
  amount: number;
  aprPercent: number;
  termYears: number;
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
  };
}
