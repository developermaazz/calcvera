/** Debt snowball calculator: form reading and display strings (build time and browser). */
import {
  MAX_SNOWBALL_DEBTS,
  calculateDebtSnowball,
  snowballField,
  validateSnowballInput,
  type PayoffMethod,
  type PlanResult,
  type SnowballInput,
} from '../../engines/debtSnowball';
import type { DebtSnowballDefaults } from '../../countries/types';
import type { CalcView, Computed, Reader } from '../../lib/calcUi';
import { stackedBarChart } from '../../lib/charts';
import { addMonths, createFormatters, escapeHtml, formatDuration } from '../../lib/format';
import { currentStartMonth } from '../loan/view';

export interface DebtSnowballParams {
  locale: string;
  currency: string;
}

/** Rows shown before "Add another debt". */
export const VISIBLE_SNOWBALL_ROWS = 4;

export function snowballDefaults(d: DebtSnowballDefaults): SnowballInput {
  return { debts: d.debts.map((x) => ({ ...x })), extraMonthly: d.extraMonthly, method: 'snowball' };
}

export function readDebtSnowballInput(r: Reader): SnowballInput {
  const debts = Array.from({ length: MAX_SNOWBALL_DEBTS }, (_, i) => ({
    name: r.text(snowballField('name', i)),
    balance: r.num(snowballField('balance', i), 0),
    aprPercent: r.num(snowballField('aprPercent', i)),
    minimumPayment: r.num(snowballField('minimumPayment', i)),
  }));
  return { debts, extraMonthly: r.num('extraMonthly', 0), method: r.text('method') as PayoffMethod };
}

export interface DebtSnowballView extends CalcView {
  payoffDate: string;
  payoffTime: string;
  monthlyBudget: string;
  totalInterest: string;
  interestSaved: string;
  timeSaved: string;
  snowballTime: string;
  snowballInterest: string;
  avalancheTime: string;
  avalancheInterest: string;
  minimumTime: string;
  minimumInterest: string;
  methodNote: string;
  orderRows: string;
  chartSvg: string;
  yearlyRows: string;
  monthlyRows: string;
}

export function buildDebtSnowballView(input: SnowballInput, p: DebtSnowballParams): Computed<DebtSnowballView> {
  const errors = validateSnowballInput(input);
  if (errors.length > 0) return { errors, view: null };

  const r = calculateDebtSnowball(input);
  if (!r.plan.feasible) {
    return {
      errors: [{ field: 'extraMonthly', message: "These payments don't cover the interest, so the debts would never be paid off. Add more each month." }],
      view: null,
    };
  }

  const f = createFormatters(p.locale, p.currency);
  const start = currentStartMonth();
  const monthLabel = (month: number) => {
    const m = addMonths(start.year, start.monthIndex, month);
    return f.monthYear(m.year, m.monthIndex);
  };
  const time = (plan: PlanResult) => (plan.feasible ? formatDuration(plan.months) : 'Never');
  const interest = (plan: PlanResult) => (plan.feasible ? f.money(plan.totalInterest) : 'Keeps growing');

  const plan = r.plan;
  const methodName = input.method === 'snowball' ? 'snowball' : 'avalanche';
  const other = input.method === 'snowball' ? r.avalanche : r.snowball;
  const otherName = input.method === 'snowball' ? 'avalanche' : 'snowball';
  const diff = other.totalInterest - plan.totalInterest;
  const methodNote =
    Math.abs(diff) < 0.005 && other.months === plan.months
      ? 'Snowball and avalanche come out the same for these debts.'
      : diff < 0
        ? `The ${otherName} order would save ${f.money(-diff)} more interest${other.months < plan.months ? ` and finish ${formatDuration(plan.months - other.months)} sooner` : ''}.`
        : `The ${otherName} order would cost ${f.money(diff)} more interest${other.months > plan.months ? ` and take ${formatDuration(other.months - plan.months)} longer` : ''}.`;

  const orderRows = plan.debts
    .map(
      (d, i) =>
        `<tr><th scope="row">${i + 1}</th><td>${escapeHtml(d.name)}</td><td>${f.money(d.balance)}</td><td>${f.percent(d.aprPercent)}</td><td>${escapeHtml(monthLabel(d.paidOffMonth ?? plan.months))}</td><td>${f.money(d.interest)}</td></tr>`,
    )
    .join('');

  // Group the schedule into payment years.
  const years: { year: number; paid: number; interest: number; balance: number }[] = [];
  for (const m of plan.schedule) {
    const y = Math.ceil(m.month / 12);
    const row = years[y - 1] ?? (years[y - 1] = { year: y, paid: 0, interest: 0, balance: 0 });
    row.paid += m.payment;
    row.interest += m.interest;
    row.balance = m.balance;
  }
  const chartSvg = stackedBarChart({
    data: years.map((y) => ({
      label: String(y.year),
      values: [y.paid - y.interest, y.interest],
      tooltip: `Year ${y.year}: debt paid ${f.money(y.paid - y.interest)}, interest ${f.money(y.interest)}`,
    })),
    seriesClasses: ['chart-s1', 'chart-s2'],
    formatAxis: f.moneyCompact,
    ariaLabel: `Debt and interest paid in each of ${years.length} ${years.length === 1 ? 'year' : 'years'} with the ${methodName} method. Total interest ${f.money(plan.totalInterest)}. Full figures are in the schedule table.`,
  });
  const yearlyRows = years
    .map((y) => `<tr><th scope="row">${y.year}</th><td>${f.money(y.paid - y.interest)}</td><td>${f.money(y.interest)}</td><td>${f.money(y.balance)}</td></tr>`)
    .join('');
  const names = new Map(plan.debts.map((d) => [d.index, d.name]));
  const monthlyRows = plan.schedule
    .map(
      (m) =>
        `<tr><th scope="row">${m.month}</th><td>${escapeHtml(monthLabel(m.month))}</td><td>${f.money(m.payment)}</td><td>${f.money(m.interest)}</td><td>${escapeHtml(m.cleared.map((i) => names.get(i) ?? '').join(', ') || '–')}</td><td>${f.money(m.balance)}</td></tr>`,
    )
    .join('');

  const payoffDate = monthLabel(plan.months);
  const savedText =
    r.interestSaved !== null && r.monthsSaved !== null
      ? ` That's ${f.money(r.interestSaved)} less interest and ${formatDuration(r.monthsSaved)} sooner than paying only the minimums.`
      : ' Paying only the minimums would never clear these debts.';
  const summary = `Paying ${f.money(r.monthlyBudget)} a month with the ${methodName} method, you'll be debt-free in ${formatDuration(plan.months)} (${payoffDate}) and pay ${f.money(plan.totalInterest)} in interest.${savedText}`;

  return {
    errors: [],
    view: {
      payoffDate,
      payoffTime: `in ${formatDuration(plan.months)}`,
      monthlyBudget: f.money(r.monthlyBudget),
      totalInterest: f.money(plan.totalInterest),
      interestSaved: r.interestSaved !== null ? f.money(r.interestSaved) : 'Not comparable',
      timeSaved: r.monthsSaved !== null ? formatDuration(r.monthsSaved) : 'Not comparable',
      snowballTime: time(r.snowball),
      snowballInterest: interest(r.snowball),
      avalancheTime: time(r.avalanche),
      avalancheInterest: interest(r.avalanche),
      minimumTime: time(r.minimumOnly),
      minimumInterest: interest(r.minimumOnly),
      methodNote,
      orderRows,
      chartSvg,
      yearlyRows,
      monthlyRows,
      summary,
    },
  };
}
