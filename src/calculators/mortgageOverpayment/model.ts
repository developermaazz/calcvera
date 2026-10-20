/** UK mortgage overpayment calculator: form reading and display strings (build time and browser). */
import type { MortgageOverpaymentDefaults } from '../../countries/types';
import {
  calculateMortgageOverpayment,
  validateMortgageOverpaymentInput,
  type MortgageOverpaymentInput,
  type OverpaymentMode,
} from '../../engines/mortgageOverpayment';
import type { CalcView, Computed, Reader } from '../../lib/calcUi';
import { lineChart } from '../../lib/charts';
import { addMonths, createFormatters, formatDuration } from '../../lib/format';
import { currentStartMonth } from '../loan/view';

export interface MortgageOverpaymentParams {
  locale: string;
  currency: string;
}

export function overpaymentDefaults(d: MortgageOverpaymentDefaults): MortgageOverpaymentInput {
  return { ...d, lumpSum: 0, lumpSumMonth: 12, mode: 'shorterTerm' };
}

export function readOverpaymentInput(r: Reader): MortgageOverpaymentInput {
  return {
    balance: r.num('balance'),
    ratePercent: r.num('ratePercent'),
    years: r.num('years'),
    monthlyOverpayment: r.num('monthlyOverpayment', 0),
    lumpSum: r.num('lumpSum', 0),
    lumpSumMonth: r.num('lumpSumMonth', 1),
    mode: (r.text('mode') === 'lowerPayment' ? 'lowerPayment' : 'shorterTerm') as OverpaymentMode,
    allowancePercent: r.num('allowancePercent', 100),
  };
}

export interface OverpaymentView extends CalcView {
  saved: string;
  savedSub: string;
  payment: string;
  secondLabel: string;
  secondValue: string;
  totalInterest: string;
  withoutTime: string;
  withTime: string;
  withoutInterest: string;
  withInterest: string;
  warning: string;
  hasWarning: boolean;
  chartSvg: string;
  yearRows: string;
}

export function buildOverpaymentView(input: MortgageOverpaymentInput, p: MortgageOverpaymentParams): Computed<OverpaymentView> {
  const errors = validateMortgageOverpaymentInput(input);
  if (errors.length > 0) return { errors, view: null };

  const f = createFormatters(p.locale, p.currency);
  const r = calculateMortgageOverpayment(input);
  const start = currentStartMonth();
  const dateAfter = (months: number) => {
    const m = addMonths(start.year, start.monthIndex, months);
    return f.monthYear(m.year, m.monthIndex);
  };
  const shorter = input.mode === 'shorterTerm';
  const overpaying = input.monthlyOverpayment > 0 || input.lumpSum > 0;

  // Chart over the whole original term; the overpaying line sits at 0 once it's paid off.
  const without = r.balanceWithoutByYear;
  const withOver = without.map((_, k) => r.years[k]?.balance ?? 0);
  const chartSvg = lineChart({
    labels: without.map((_, k) => String(k + 1)),
    series: [
      { label: 'Without overpaying', colour: 4, values: without },
      { label: 'With overpayments', colour: 1, values: withOver },
    ],
    formatAxis: f.moneyCompact,
    tooltip: (k) => `Year ${k + 1}: ${f.money(withOver[k] ?? 0)} left, against ${f.money(without[k] ?? 0)} without overpaying`,
    ariaLabel: `Mortgage balance at the end of each year, with and without overpayments. ${shorter ? `Paid off in ${formatDuration(r.months)} instead of ${formatDuration(r.monthsWithout)}.` : ''} Full figures are in the table.`,
    xAxisLabel: 'Years from now',
  });

  const yearRows = r.years
    .map(
      (y) =>
        `<tr${y.overAllowance ? ' class="total-row"' : ''}><th scope="row">${y.year}</th><td>${f.money(y.paid)}</td><td>${f.money(y.overpaid)}</td><td>${f.money(y.interest)}</td><td>${f.money(y.balance)}</td><td>${f.money(y.balanceWithout)}</td></tr>`,
    )
    .join('');

  const over = r.yearsOverAllowance;
  const warning =
    over.length === 0
      ? ''
      : `Your overpayments go over the ${input.allowancePercent}% yearly allowance in ${over.length === 1 ? 'year' : 'years'} ${over.slice(0, 6).join(', ')}${over.length > 6 ? '…' : ''}. Your lender may charge an early repayment charge on the extra, so check your mortgage offer.`;

  const savedSub = !overpaying
    ? 'Add a monthly overpayment or a lump sum.'
    : shorter
      ? `and ${formatDuration(r.monthsSaved)} sooner: mortgage-free by ${dateAfter(r.months)}`
      : `and your payment falls to ${f.money(r.paymentAfter)} a month`;

  const summary = !overpaying
    ? `Without overpayments, you'll pay ${f.money(r.totalInterestWithout)} in interest over ${formatDuration(r.monthsWithout)}.`
    : shorter
      ? `Overpaying saves ${f.money(r.interestSaved)} in interest and clears your mortgage ${formatDuration(r.monthsSaved)} sooner, in ${dateAfter(r.months)} instead of ${dateAfter(r.monthsWithout)}.`
      : `Overpaying saves ${f.money(r.interestSaved)} in interest over the same term, and lowers your monthly payment from ${f.money(r.monthlyPayment)} to ${f.money(r.paymentAfter)}.`;

  return {
    errors: [],
    view: {
      saved: f.money(r.interestSaved),
      savedSub,
      payment: f.money(r.monthlyPayment),
      secondLabel: shorter ? 'Mortgage-free by' : 'New monthly payment',
      secondValue: shorter ? dateAfter(r.months) : f.money(r.paymentAfter),
      totalInterest: f.money(r.totalInterest),
      withoutTime: formatDuration(r.monthsWithout),
      withTime: formatDuration(r.months),
      withoutInterest: f.money(r.totalInterestWithout),
      withInterest: f.money(r.totalInterest),
      warning,
      hasWarning: warning !== '',
      chartSvg,
      yearRows,
      summary,
    },
  };
}
