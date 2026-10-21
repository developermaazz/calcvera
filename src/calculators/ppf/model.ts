/** Indian PPF calculator: form reading and display strings (build time and browser). */
import type { InPpfConfig, InPpfDefaults } from '../../countries/types';
import { calculatePpf, validatePpfInput, type PpfInput, type PpfTiming } from '../../engines/ppf';
import type { CalcView, Computed, Reader } from '../../lib/calcUi';
import { stackedBarChart } from '../../lib/charts';
import { createFormatters, escapeHtml } from '../../lib/format';

export interface PpfPageParams extends InPpfConfig {
  locale: string;
  currency: string;
}

export function ppfDefaults(d: InPpfDefaults, p: InPpfConfig): PpfInput {
  return { yearly: d.yearly, ratePercent: p.ratePercent, years: p.termYears, timing: 'yearStart' };
}

export function readPpfInput(r: Reader): PpfInput {
  return {
    yearly: r.num('yearly'),
    ratePercent: r.num('ratePercent'),
    years: r.num('years'),
    timing: (r.text('timing') === 'monthly' ? 'monthly' : 'yearStart') as PpfTiming,
  };
}

export interface PpfView extends CalcView {
  maturity: string;
  maturitySub: string;
  invested: string;
  interest: string;
  notes: string;
  hasNotes: boolean;
  chartSvg: string;
  yearRows: string;
}

export function buildPpfView(input: PpfInput, p: PpfPageParams): Computed<PpfView> {
  const errors = validatePpfInput(input, p);
  if (errors.length > 0) return { errors, view: null };

  const f = createFormatters(p.locale, p.currency);
  const r = calculatePpf(input, p);
  let paid = 0;
  const chartSvg = stackedBarChart({
    data: r.years.map((y) => {
      paid += y.deposit;
      return { label: String(y.year), values: [paid, Math.max(0, y.balance - paid)], tooltip: `Year ${y.year}: ${f.money(y.balance)} (${f.money(paid)} deposited, ${f.money(y.balance - paid)} interest)` };
    }),
    seriesClasses: ['chart-s1', 'chart-s3'],
    formatAxis: f.moneyCompact,
    ariaLabel: `PPF balance at the end of each year, reaching ${f.money(r.maturity)} after ${input.years} years. Full figures are in the table.`,
    xAxisLabel: 'Year',
  });
  const yearRows = r.years.map((y) => `<tr><th scope="row">${y.year}</th><td>${f.money(y.deposit)}</td><td>${f.money(y.interest)}</td><td>${f.money(y.balance)}</td></tr>`).join('');

  const notes: string[] = [];
  if (r.aboveMaximum) notes.push(`You can deposit at most ${f.moneyWhole(p.maxDeposit)} a year in PPF. Amounts above that don't earn interest.`);
  if (r.belowMinimum) notes.push(`You need to deposit at least ${f.moneyWhole(p.minDeposit)} a year to keep the account active.`);

  return {
    errors: [],
    view: {
      maturity: f.money(r.maturity),
      maturitySub: `after ${input.years} years at ${f.percent(input.ratePercent)}`,
      invested: f.money(r.invested),
      interest: f.money(r.interest),
      notes: notes.map((n) => `<li>${escapeHtml(n)}</li>`).join(''),
      hasNotes: notes.length > 0,
      chartSvg,
      yearRows,
      summary: `Depositing ${f.money(input.yearly)} a year for ${input.years} years at ${f.percent(input.ratePercent)} gives a maturity amount of ${f.money(r.maturity)}: ${f.money(r.invested)} deposited and ${f.money(r.interest)} of tax-free interest.`,
    },
  };
}
