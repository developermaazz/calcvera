/**
 * Turns a loan result into display strings and markup. Used at build time for the initial HTML
 * and in the browser for live updates, so both always match.
 */
import { summariseByYear, type LoanInput, type LoanResult } from '../../engines/loan';
import { stackedBarChart } from '../../lib/charts';
import { addMonths, escapeHtml, type Formatters } from '../../lib/format';

export interface StartMonth {
  year: number;
  /** 0-based */
  monthIndex: number;
}

export interface LoanView {
  monthlyPayment: string;
  withExtra: string;
  totalInterest: string;
  totalCost: string;
  payoffDate: string;
  interestSaved: string;
  hasExtra: boolean;
  summary: string;
  chartSvg: string;
  yearlyRows: string;
  monthlyRows: string;
}

export function currentStartMonth(now = new Date()): StartMonth {
  return { year: now.getFullYear(), monthIndex: now.getMonth() };
}

/** "4 years 1 month", "11 months" */
export function formatDuration(months: number): string {
  const y = Math.floor(months / 12);
  const m = months % 12;
  const parts: string[] = [];
  if (y > 0) parts.push(`${y} ${y === 1 ? 'year' : 'years'}`);
  if (m > 0 || y === 0) parts.push(`${m} ${m === 1 ? 'month' : 'months'}`);
  return parts.join(' ');
}

/** Month of payment k (1-based), with the first payment one month after the start month. */
function paymentMonth(start: StartMonth, k: number): StartMonth {
  return addMonths(start.year, start.monthIndex, k);
}

export function buildSummary(input: LoanInput, result: LoanResult, f: Formatters, payoffDate: string): string {
  const extra = input.extraMonthly ?? 0;
  // Amounts the user typed read better without ".00" when they are whole: "$20,000".
  const typed = (v: number) => (Number.isInteger(v) ? f.moneyWhole(v) : f.money(v));
  if (result.totalInterest < 0.005 && extra === 0) {
    return `You'll pay ${f.money(result.monthlyPayment)} a month for ${formatDuration(input.termMonths)} with no interest, and be debt-free in ${payoffDate}.`;
  }
  if (extra > 0 && result.monthsSaved > 0) {
    const saved = result.interestSaved >= 0.005 ? ` and saves ${f.money(result.interestSaved)} in interest` : '';
    return `Paying ${typed(extra)} extra each month clears the loan in ${formatDuration(result.payoffMonths)} instead of ${formatDuration(input.termMonths)}${saved}, so you'll be debt-free in ${payoffDate}.`;
  }
  return `You'll pay ${f.money(result.monthlyPayment)} a month for ${formatDuration(input.termMonths)}: ${f.money(result.totalInterest)} in interest on top of the ${typed(input.principal)} you borrow, and be debt-free in ${payoffDate}.`;
}

export function buildLoanView(input: LoanInput, result: LoanResult, f: Formatters, start: StartMonth): LoanView {
  const last = paymentMonth(start, result.payoffMonths);
  const payoffDate = f.monthYear(last.year, last.monthIndex);
  const extra = input.extraMonthly ?? 0;
  const years = summariseByYear(result.schedule);

  const chartSvg = stackedBarChart({
    data: years.map((y) => ({
      label: String(y.year),
      values: [y.principal, y.interest],
      tooltip: `Year ${y.year}: principal ${f.money(y.principal)}, interest ${f.money(y.interest)}`,
    })),
    seriesClasses: ['chart-s1', 'chart-s2'],
    formatAxis: f.moneyCompact,
    ariaLabel: `Principal and interest repaid in each of ${years.length} loan ${years.length === 1 ? 'year' : 'years'}. Total interest ${f.money(result.totalInterest)}. Full figures are in the schedule table.`,
  });

  const yearlyRows = years
    .map(
      (y) =>
        `<tr><th scope="row">${y.year}</th><td>${f.money(y.principal)}</td><td>${f.money(y.interest)}</td><td>${f.money(y.balance)}</td></tr>`,
    )
    .join('');

  const monthlyRows = result.schedule
    .map((row) => {
      const m = paymentMonth(start, row.month);
      const date = escapeHtml(f.monthYear(m.year, m.monthIndex));
      return `<tr><th scope="row">${row.month}</th><td>${date}</td><td>${f.money(row.payment)}</td><td>${f.money(row.principal + row.extra)}</td><td>${f.money(row.interest)}</td><td>${f.money(row.balance)}</td></tr>`;
    })
    .join('');

  return {
    monthlyPayment: f.money(result.monthlyPayment),
    withExtra: f.money(result.monthlyPaymentWithExtra),
    totalInterest: f.money(result.totalInterest),
    totalCost: f.money(result.totalCost),
    payoffDate,
    interestSaved: f.money(result.interestSaved),
    hasExtra: extra > 0,
    summary: buildSummary(input, result, f, payoffDate),
    chartSvg,
    yearlyRows,
    monthlyRows,
  };
}
