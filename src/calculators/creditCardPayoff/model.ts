/** Credit card payoff calculator (US/UK): form reading and display strings (build time and browser). */
import type { CreditCardDefaults } from '../../countries/types';
import {
  calculateCardPayoff,
  fixedPaymentMonths,
  validateCardPayoffInput,
  type CardPayoffInput,
} from '../../engines/debtPayoff';
import { summariseByYear } from '../../engines/loan';
import type { CalcView, Computed, Reader } from '../../lib/calcUi';
import { stackedBarChart } from '../../lib/charts';
import { addMonths, createFormatters, escapeHtml, formatDuration } from '../../lib/format';
import { currentStartMonth } from '../loan/view';

export interface CardPayoffParams {
  locale: string;
  currency: string;
  /** Extra monthly amount used for the "pay a bit more" comparison. */
  comparisonStep: number;
}

/** Comparison step in each currency's units (a round amount, not a financial figure). */
export const COMPARISON_STEP = 50;

export function cardDefaults(d: CreditCardDefaults): CardPayoffInput {
  return { balance: d.balance, aprPercent: d.aprPercent, mode: 'payment', monthlyPayment: d.monthlyPayment, targetMonths: d.targetMonths };
}

export function readCardPayoffInput(r: Reader): CardPayoffInput {
  return {
    balance: r.num('balance'),
    aprPercent: r.num('aprPercent'),
    mode: r.text('mode') === 'months' ? 'months' : 'payment',
    monthlyPayment: r.num('monthlyPayment'),
    targetMonths: r.num('targetMonths'),
  };
}

export interface CardPayoffView extends CalcView {
  headlineLabel: string;
  headline: string;
  monthlyPayment: string;
  payoffTime: string;
  payoffDate: string;
  totalInterest: string;
  totalPaid: string;
  fasterText: string;
  hasFaster: boolean;
  chartSvg: string;
  yearlyRows: string;
  monthlyRows: string;
}

export function buildCardPayoffView(input: CardPayoffInput, p: CardPayoffParams): Computed<CardPayoffView> {
  const f = createFormatters(p.locale, p.currency);
  const errors = validateCardPayoffInput(input).map((e) =>
    e.message.startsWith('This payment does not cover')
      ? { ...e, message: `This payment doesn't cover the ${f.money((input.balance * input.aprPercent) / 1200)} monthly interest. Pay more than that to reduce the balance.` }
      : e,
  );
  if (errors.length > 0) return { errors, view: null };

  const r = calculateCardPayoff(input);
  const start = currentStartMonth();
  const end = addMonths(start.year, start.monthIndex, r.months);
  const payoffDate = f.monthYear(end.year, end.monthIndex);
  const time = formatDuration(r.months);

  // What a little more each month would do.
  const fasterPayment = r.monthlyPayment + p.comparisonStep;
  const fasterMonths = fixedPaymentMonths(input.balance, input.aprPercent, fasterPayment);
  let fasterText = '';
  if (r.months > 1 && Number.isFinite(fasterMonths) && fasterMonths < r.months) {
    const faster = calculateCardPayoff({ ...input, mode: 'payment', monthlyPayment: fasterPayment });
    const saved = r.totalInterest - faster.totalInterest;
    fasterText = `Paying ${f.moneyWhole(p.comparisonStep)} more a month (${f.money(fasterPayment)}) clears the card ${formatDuration(r.months - faster.months)} sooner${
      saved >= 0.005 ? ` and saves ${f.money(saved)} in interest` : ''
    }.`;
  }

  const years = summariseByYear(r.schedule);
  const chartSvg = stackedBarChart({
    data: years.map((y) => ({
      label: String(y.year),
      values: [y.principal, y.interest],
      tooltip: `Year ${y.year}: balance paid ${f.money(y.principal)}, interest ${f.money(y.interest)}`,
    })),
    seriesClasses: ['chart-s1', 'chart-s2'],
    formatAxis: f.moneyCompact,
    ariaLabel: `Balance and interest paid in each of ${years.length} ${years.length === 1 ? 'year' : 'years'}. Total interest ${f.money(r.totalInterest)}. Full figures are in the schedule table.`,
  });
  const yearlyRows = years
    .map((y) => `<tr><th scope="row">${y.year}</th><td>${f.money(y.principal)}</td><td>${f.money(y.interest)}</td><td>${f.money(y.balance)}</td></tr>`)
    .join('');
  const monthlyRows = r.schedule
    .map((row) => {
      const m = addMonths(start.year, start.monthIndex, row.month);
      return `<tr><th scope="row">${row.month}</th><td>${escapeHtml(f.monthYear(m.year, m.monthIndex))}</td><td>${f.money(row.payment)}</td><td>${f.money(row.principal)}</td><td>${f.money(row.interest)}</td><td>${f.money(row.balance)}</td></tr>`;
    })
    .join('');

  const summary =
    input.mode === 'months'
      ? `To clear ${f.money(input.balance)} in ${time}, pay ${f.money(r.monthlyPayment)} a month. You'll pay ${f.money(r.totalInterest)} in interest and be debt-free in ${payoffDate}.`
      : `Paying ${f.money(r.monthlyPayment)} a month clears ${f.money(input.balance)} in ${time}, with ${f.money(r.totalInterest)} in interest, so you'll be debt-free in ${payoffDate}.`;

  return {
    errors: [],
    view: {
      headlineLabel: input.mode === 'months' ? 'Monthly payment needed' : 'Time to pay off',
      headline: input.mode === 'months' ? f.money(r.monthlyPayment) : time,
      monthlyPayment: f.money(r.monthlyPayment),
      payoffTime: time,
      payoffDate,
      totalInterest: f.money(r.totalInterest),
      totalPaid: f.money(r.totalPaid),
      fasterText,
      hasFaster: fasterText !== '',
      chartSvg,
      yearlyRows,
      monthlyRows,
      summary,
    },
  };
}
