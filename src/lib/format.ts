/** Display formatting. Engines never format; pages and views call these. */

export interface Formatters {
  /** Money to 2 decimals: $1,234.56 */
  money: (value: number) => string;
  /** Money to whole units: $1,235 */
  moneyWhole: (value: number) => string;
  /** Compact money for chart axes: $12K */
  moneyCompact: (value: number) => string;
  /** Up to 2 decimals: 7.5% */
  percent: (value: number) => string;
  /** "March 2029" */
  monthYear: (year: number, monthIndex: number) => string;
  /** Plain number with separators: 1,234 */
  number: (value: number) => string;
}

export function createFormatters(locale: string, currency: string): Formatters {
  const money = new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const moneyWhole = new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 });
  const moneyCompact = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  });
  const percent = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  const monthYear = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' });

  // Avoid "-$0.00" from floating-point noise.
  const clean = (v: number) => (Math.abs(v) < 0.005 ? 0 : v);

  return {
    money: (v) => money.format(clean(v)),
    moneyWhole: (v) => moneyWhole.format(clean(v)),
    moneyCompact: (v) => moneyCompact.format(clean(v)),
    percent: (v) => `${percent.format(v)}%`,
    monthYear: (year, monthIndex) => monthYear.format(new Date(Date.UTC(year, monthIndex, 1))),
    number: (v) => number.format(v),
  };
}

/** Parses user input like "20,000", "$20000" or " 7.5 % ". Returns NaN for empty or invalid input. */
export function parseNumber(raw: string): number {
  const cleaned = raw.replace(/[\s,£$€%]/g, '');
  if (cleaned === '' || !/^-?\d*\.?\d*$/.test(cleaned) || cleaned === '.' || cleaned === '-') return Number.NaN;
  return Number(cleaned);
}

/** Adds months to a year/month pair. monthIndex is 0-based (0 = January). */
export function addMonths(year: number, monthIndex: number, months: number): { year: number; monthIndex: number } {
  const total = year * 12 + monthIndex + months;
  return { year: Math.floor(total / 12), monthIndex: total % 12 };
}

/** Escapes text for safe insertion into HTML strings. */
export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);
}
