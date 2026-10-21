/** Indian SIP calculator: form reading and display strings (build time and browser). */
import type { InSipDefaults } from '../../countries/types';
import { calculateSip, validateSipInput, type SipInput } from '../../engines/sip';
import type { CalcView, Computed, Reader } from '../../lib/calcUi';
import { stackedBarChart } from '../../lib/charts';
import { createFormatters } from '../../lib/format';

export interface SipParams {
  locale: string;
  currency: string;
}

export function sipDefaults(d: InSipDefaults): SipInput {
  return { ...d, stepUpPercent: 0 };
}

export function readSipInput(r: Reader): SipInput {
  return { monthly: r.num('monthly'), returnPercent: r.num('returnPercent'), years: r.num('years'), stepUpPercent: r.num('stepUpPercent', 0) };
}

export interface SipView extends CalcView {
  value: string;
  valueSub: string;
  invested: string;
  returns: string;
  multiple: string;
  chartSvg: string;
  yearRows: string;
}

export function buildSipView(input: SipInput, p: SipParams): Computed<SipView> {
  const errors = validateSipInput(input);
  if (errors.length > 0) return { errors, view: null };

  const f = createFormatters(p.locale, p.currency);
  const r = calculateSip(input);
  const chartSvg = stackedBarChart({
    data: r.years.map((y) => ({
      label: String(y.year),
      values: [y.invested, Math.max(0, y.value - y.invested)],
      tooltip: `Year ${y.year}: ${f.money(y.value)} (${f.money(y.invested)} invested, ${f.money(y.value - y.invested)} returns)`,
    })),
    seriesClasses: ['chart-s1', 'chart-s3'],
    formatAxis: f.moneyCompact,
    ariaLabel: `SIP value at the end of each year, reaching ${f.money(r.value)} after ${input.years} years. Full figures are in the table.`,
    xAxisLabel: 'Year',
  });
  const yearRows = r.years.map((y) => `<tr><th scope="row">${y.year}</th><td>${f.money(y.invested)}</td><td>${f.money(y.value - y.invested)}</td><td>${f.money(y.value)}</td></tr>`).join('');

  return {
    errors: [],
    view: {
      value: f.money(r.value),
      valueSub: `after ${input.years} ${input.years === 1 ? 'year' : 'years'} at ${f.percent(input.returnPercent)} a year`,
      invested: f.money(r.invested),
      returns: f.money(r.returns),
      multiple: `${(r.value / r.invested).toFixed(2)}×`,
      chartSvg,
      yearRows,
      summary: `Investing ${f.money(input.monthly)} a month${input.stepUpPercent > 0 ? `, rising ${f.percent(input.stepUpPercent)} a year,` : ''} for ${input.years} years at ${f.percent(input.returnPercent)} could grow to ${f.money(r.value)}: ${f.money(r.invested)} invested and ${f.money(r.returns)} of estimated returns.`,
    },
  };
}
