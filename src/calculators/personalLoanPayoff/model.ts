/** Personal loan payoff calculator (US): form reading and display strings (build time and browser). */
import type { PersonalLoanPayoffDefaults } from '../../countries/types';
import { calculateEarlyPayoff, validateEarlyPayoffInput, type EarlyPayoffInput } from '../../engines/earlyPayoff';
import { summariseByYear } from '../../engines/loan';
import type { CalcView, Computed, Reader } from '../../lib/calcUi';
import { stackedBarChart } from '../../lib/charts';
import { addMonths, createFormatters, escapeHtml, formatDuration } from '../../lib/format';
import { currentStartMonth } from '../loan/view';

export interface PersonalLoanPayoffParams {
  locale: string;
  currency: string;
}

export function payoffDefaults(d: PersonalLoanPayoffDefaults): EarlyPayoffInput {
  return { ...d, lumpSum: 0, prepaymentPenalty: 0 };
}

export function readEarlyPayoffInput(r: Reader): EarlyPayoffInput {
  return {
    balance: r.num('balance'),
    aprPercent: r.num('aprPercent'),
    monthlyPayment: r.num('monthlyPayment'),
    extraMonthly: r.num('extraMonthly', 0),
    lumpSum: r.num('lumpSum', 0),
    prepaymentPenalty: r.num('prepaymentPenalty', 0),
  };
}

export interface PersonalLoanPayoffView extends CalcView {
  headlineLabel: string;
  headline: string;
  currentDate: string;
  newDate: string;
  currentTime: string;
  newTime: string;
  currentInterest: string;
  newInterest: string;
  currentPayment: string;
  newPayment: string;
  penalty: string;
  hasPenalty: boolean;
  costsMore: boolean;
  chartSvg: string;
  yearlyRows: string;
  monthlyRows: string;
}

export function buildPersonalLoanPayoffView(input: EarlyPayoffInput, p: PersonalLoanPayoffParams): Computed<PersonalLoanPayoffView> {
  const f = createFormatters(p.locale, p.currency);
  const errors = validateEarlyPayoffInput(input).map((e) =>
    e.message.startsWith('This payment does not cover')
      ? { ...e, message: `This payment doesn't cover the ${f.money((input.balance * input.aprPercent) / 1200)} monthly interest. Check your payment and balance.` }
      : e,
  );
  if (errors.length > 0) return { errors, view: null };

  const r = calculateEarlyPayoff(input);
  const start = currentStartMonth();
  const dateAfter = (months: number) => {
    const m = addMonths(start.year, start.monthIndex, months);
    return f.monthYear(m.year, m.monthIndex);
  };
  const changed = input.extraMonthly > 0 || input.lumpSum > 0;
  const penalty = changed ? input.prepaymentPenalty : 0;
  const newDate = r.newMonths === 0 ? 'Paid off today' : dateAfter(r.newMonths);

  const chartSvg = stackedBarChart({
    data: [
      {
        label: 'Current plan',
        values: [input.balance, r.currentInterest, 0],
        tooltip: `Current plan: ${f.money(input.balance)} balance + ${f.money(r.currentInterest)} interest`,
      },
      {
        label: 'Paying extra',
        values: [input.balance, r.newInterest, penalty],
        tooltip: `Paying extra: ${f.money(input.balance)} balance + ${f.money(r.newInterest)} interest${penalty > 0 ? ` + ${f.money(penalty)} penalty` : ''}`,
      },
    ],
    seriesClasses: ['chart-s1', 'chart-s2', 'chart-s3'],
    formatAxis: f.moneyCompact,
    ariaLabel: `Total still to pay: ${f.money(input.balance + r.currentInterest)} on the current plan, ${f.money(input.balance + r.newInterest + penalty)} paying extra.`,
  });

  const years = summariseByYear(r.schedule);
  const yearlyRows = years
    .map((y) => `<tr><th scope="row">${y.year}</th><td>${f.money(y.principal)}</td><td>${f.money(y.interest)}</td><td>${f.money(y.balance)}</td></tr>`)
    .join('');
  const monthlyRows = r.schedule
    .map((row) => {
      const m = addMonths(start.year, start.monthIndex, row.month);
      return `<tr><th scope="row">${row.month}</th><td>${escapeHtml(f.monthYear(m.year, m.monthIndex))}</td><td>${f.money(row.payment)}</td><td>${f.money(row.principal)}</td><td>${f.money(row.interest)}</td><td>${f.money(row.balance)}</td></tr>`;
    })
    .join('');

  const parts: string[] = [];
  if (input.lumpSum > 0) parts.push(`${f.moneyWhole(input.lumpSum)} now`);
  if (input.extraMonthly > 0) parts.push(`${f.moneyWhole(input.extraMonthly)} extra a month`);
  const plan = parts.join(' and ');

  let summary: string;
  if (!changed) {
    summary = `At ${f.money(input.monthlyPayment)} a month, you'll repay this loan in ${formatDuration(r.currentMonths)}, by ${dateAfter(r.currentMonths)}, paying ${f.money(r.currentInterest)} in interest. Add an extra payment to see what you'd save.`;
  } else if (r.netSavings < 0) {
    summary = `Paying ${plan} saves ${f.money(r.interestSaved)} in interest, but the ${f.money(penalty)} prepayment penalty means it costs ${f.money(-r.netSavings)} more overall.`;
  } else {
    const when = r.newMonths === 0 ? 'clears the loan today' : `clears the loan ${formatDuration(r.monthsSaved)} sooner, by ${newDate},`;
    summary = `Paying ${plan} ${when} and saves ${f.money(r.netSavings)}${penalty > 0 ? ` after the ${f.money(penalty)} prepayment penalty` : ' in interest'}.`;
  }

  return {
    errors: [],
    view: {
      headlineLabel: r.netSavings < 0 ? 'Paying early costs you' : 'You save',
      headline: f.money(Math.abs(r.netSavings)),
      currentDate: dateAfter(r.currentMonths),
      newDate,
      currentTime: formatDuration(r.currentMonths),
      newTime: r.newMonths === 0 ? 'None' : formatDuration(r.newMonths),
      currentInterest: f.money(r.currentInterest),
      newInterest: f.money(r.newInterest),
      currentPayment: f.money(input.monthlyPayment),
      newPayment: f.money(input.monthlyPayment + input.extraMonthly),
      penalty: f.money(penalty),
      hasPenalty: penalty > 0,
      costsMore: r.netSavings < 0,
      chartSvg,
      yearlyRows,
      monthlyRows,
      summary,
    },
  };
}
