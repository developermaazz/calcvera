/** Indian EMI calculator: form reading and display strings (build time and browser). */
import type { InEmiDefaults } from '../../countries/types';
import { calculateLoan, summariseByYear, validateLoanInput, type LoanInput } from '../../engines/loan';
import type { FieldError } from '../../engines/validation';
import type { CalcView, Computed, Reader } from '../../lib/calcUi';
import { splitBar, stackedBarChart } from '../../lib/charts';
import { addMonths, createFormatters, formatDuration } from '../../lib/format';
import { currentStartMonth } from '../loan/view';

export interface EmiParams {
  locale: string;
  currency: string;
}

export interface EmiInput {
  amount: number;
  ratePercent: number;
  years: number;
}

export function emiDefaults(d: InEmiDefaults): EmiInput {
  return { ...d };
}

export function readEmiInput(r: Reader): EmiInput {
  return { amount: r.num('amount'), ratePercent: r.num('ratePercent'), years: r.num('years') };
}

export interface EmiView extends CalcView {
  emi: string;
  emiSub: string;
  totalInterest: string;
  totalPayment: string;
  interestShare: string;
  splitSvg: string;
  chartSvg: string;
  yearRows: string;
}

const FIELD: Record<string, string> = { principal: 'amount', aprPercent: 'ratePercent', termMonths: 'years' };

export function buildEmiView(input: EmiInput, p: EmiParams): Computed<EmiView> {
  const months = Math.round(input.years * 12);
  const loan: LoanInput = { principal: input.amount, aprPercent: input.ratePercent, termMonths: months };
  const errors: FieldError[] = Number.isFinite(input.years) && input.years > 0 && input.years <= 40
    ? validateLoanInput(loan).map((e) => ({ field: FIELD[e.field] ?? e.field, message: e.message }))
    : [{ field: 'years', message: 'Enter a tenure between 1 month and 40 years.' }];
  if (!Number.isFinite(input.ratePercent) || input.ratePercent > 30) {
    if (!errors.some((e) => e.field === 'ratePercent')) errors.push({ field: 'ratePercent', message: 'Enter a rate between 0 and 30%.' });
  }
  if (errors.length > 0) return { errors, view: null };

  const f = createFormatters(p.locale, p.currency);
  const r = calculateLoan(loan);
  const years = summariseByYear(r.schedule);
  const start = currentStartMonth();
  const end = addMonths(start.year, start.monthIndex, r.payoffMonths);
  const share = r.totalCost > 0 ? (r.totalInterest / r.totalCost) * 100 : 0;

  const splitSvg = splitBar(
    [
      { value: input.amount, className: 'chart-s1', tooltip: `Principal: ${f.money(input.amount)}` },
      { value: r.totalInterest, className: 'chart-s2', tooltip: `Interest: ${f.money(r.totalInterest)}` },
    ],
    `Total payment ${f.money(r.totalCost)}: principal ${f.money(input.amount)} and interest ${f.money(r.totalInterest)}.`,
  );
  const chartSvg = stackedBarChart({
    data: years.map((y) => ({
      label: String(y.year),
      values: [y.principal, y.interest],
      tooltip: `Year ${y.year}: principal ${f.money(y.principal)}, interest ${f.money(y.interest)}, ${f.money(y.balance)} left`,
    })),
    seriesClasses: ['chart-s1', 'chart-s2'],
    formatAxis: f.moneyCompact,
    ariaLabel: `Principal and interest paid in each year of the loan. Total interest ${f.money(r.totalInterest)}. Full figures are in the table.`,
    xAxisLabel: 'Year',
  });
  const yearRows = years
    .map((y) => `<tr><th scope="row">${y.year}</th><td>${f.money(y.principal + y.interest)}</td><td>${f.money(y.principal)}</td><td>${f.money(y.interest)}</td><td>${f.money(y.balance)}</td></tr>`)
    .join('');

  return {
    errors: [],
    view: {
      emi: f.money(r.monthlyPayment),
      emiSub: `for ${formatDuration(months)}, ending ${f.monthYear(end.year, end.monthIndex)}`,
      // Whole rupees: the tiles are narrow (CLAUDE.md section 7).
      totalInterest: f.moneyWhole(r.totalInterest),
      totalPayment: f.moneyWhole(r.totalCost),
      interestShare: f.percent(Math.round(share * 100) / 100),
      splitSvg,
      chartSvg,
      yearRows,
      summary: `An EMI of ${f.money(r.monthlyPayment)} repays ${f.money(input.amount)} at ${f.percent(input.ratePercent)} over ${formatDuration(months)}, with ${f.money(r.totalInterest)} of interest: ${f.money(r.totalCost)} in total.`,
    },
  };
}
