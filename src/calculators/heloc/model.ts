/** US HELOC payment calculator: form reading and display strings (build time and browser). */
import type { HelocDefaults } from '../../countries/types';
import { calculateHeloc, validateHelocInput, type DrawPaymentType, type HelocInput } from '../../engines/heloc';
import type { CalcView, Computed, Reader } from '../../lib/calcUi';
import { stackedBarChart } from '../../lib/charts';
import { addMonths, createFormatters, formatDuration } from '../../lib/format';
import { currentStartMonth } from '../loan/view';

export interface HelocParams {
  locale: string;
  currency: string;
}

export function helocDefaults(d: HelocDefaults): HelocInput {
  return { ...d, drawPaymentType: 'interestOnly', extraDrawPayment: 0, rateRisePercent: 2 };
}

export function readHelocInput(r: Reader): HelocInput {
  return {
    balance: r.num('balance'),
    ratePercent: r.num('ratePercent'),
    drawYears: r.num('drawYears'),
    repayYears: r.num('repayYears'),
    drawPaymentType: (r.text('drawPaymentType') === 'principalAndInterest' ? 'principalAndInterest' : 'interestOnly') as DrawPaymentType,
    extraDrawPayment: r.num('extraDrawPayment', 0),
    rateRisePercent: r.num('rateRisePercent', 0),
    homeValue: r.num('homeValue', 0),
    mortgageBalance: r.num('mortgageBalance', 0),
    maxCltvPercent: r.num('maxCltvPercent', 85),
  };
}

export interface HelocView extends CalcView {
  drawPayment: string;
  drawSub: string;
  repayPayment: string;
  increase: string;
  totalInterest: string;
  stressNote: string;
  hasStress: boolean;
  drawLength: string;
  repayLength: string;
  drawInterest: string;
  repayInterest: string;
  creditLine: string;
  creditNote: string;
  hasCredit: boolean;
  warning: string;
  hasWarning: boolean;
  chartSvg: string;
  yearRows: string;
}

export function buildHelocView(input: HelocInput, p: HelocParams): Computed<HelocView> {
  const errors = validateHelocInput(input);
  if (errors.length > 0) return { errors, view: null };

  const f = createFormatters(p.locale, p.currency);
  const r = calculateHeloc(input);
  const start = currentStartMonth();
  // Month of payment k, with the first payment next month.
  const paymentDate = (k: number) => {
    const m = addMonths(start.year, start.monthIndex, k);
    return f.monthYear(m.year, m.monthIndex);
  };
  const paidInDraw = r.balanceAtRepay === 0;
  const changes = Math.abs(r.paymentIncrease) > 0.005;
  const repayStart = paymentDate(r.drawMonths + 1);

  const chartSvg = stackedBarChart({
    data: r.years.map((y) => ({
      label: String(y.year),
      values: [y.principal, y.interest],
      tooltip: `Year ${y.year} (${y.drawMonths === 12 ? 'draw period' : y.drawMonths === 0 ? 'repayment' : 'draw, then repayment'}): principal ${f.money(y.principal)}, interest ${f.money(y.interest)}`,
    })),
    seriesClasses: ['chart-s1', 'chart-s2'],
    formatAxis: f.moneyCompact,
    ariaLabel: `Principal and interest paid in each year of the HELOC. Draw period ${formatDuration(r.drawMonths)}, then repayment over ${formatDuration(r.repayMonths)}. Total interest ${f.money(r.totalInterest)}. Full figures are in the table.`,
    xAxisLabel: 'Year',
  });

  const yearRows = r.years
    .map((y) => {
      const phase = y.drawMonths === 12 ? 'Draw' : y.drawMonths === 0 ? 'Repayment' : 'Draw, then repayment';
      return `<tr><th scope="row">${y.year}</th><td>${phase}</td><td>${f.money(y.paid)}</td><td>${f.money(y.principal)}</td><td>${f.money(y.interest)}</td><td>${f.money(y.balance)}</td></tr>`;
    })
    .join('');

  const io = input.drawPaymentType === 'interestOnly';
  const drawSub = paidInDraw
    ? `Paid off in ${formatDuration(r.months)}, before the draw period ends.`
    : changes
      ? `for ${formatDuration(r.drawMonths)}, then ${f.money(r.repayPayment)} from ${repayStart}`
      : `for the whole ${formatDuration(r.drawMonths + r.repayMonths)}`;

  const creditNote =
    r.creditLine === null
      ? ''
      : `At ${f.percent(input.maxCltvPercent)} of your home's value, less your mortgage. Borrowing ${f.money(input.balance)} brings your combined loan-to-value to ${f.percent(r.cltvPercent!)}.`;
  const warning = r.overCreditLine
    ? `You're borrowing more than the estimated credit line of ${f.money(r.creditLine!)}. A lender may offer less, or ask for more equity.`
    : '';

  const summary = paidInDraw
    ? `Paying ${f.money(r.drawPayment)} a month clears the ${f.money(input.balance)} in ${formatDuration(r.months)}, with ${f.money(r.totalInterest)} of interest.`
    : changes
      ? `You'll pay ${f.money(r.drawPayment)} a month ${io && input.extraDrawPayment === 0 ? '(interest only) ' : ''}for ${formatDuration(r.drawMonths)}, then ${f.money(r.repayPayment)} a month from ${repayStart}, with ${f.money(r.totalInterest)} of interest in total.`
      : `You'll pay ${f.money(r.repayPayment)} a month for ${formatDuration(r.drawMonths + r.repayMonths)}, with ${f.money(r.totalInterest)} of interest in total.`;

  return {
    errors: [],
    view: {
      drawPayment: f.money(r.drawPayment),
      drawSub,
      repayPayment: paidInDraw ? 'None' : f.money(r.repayPayment),
      increase: paidInDraw ? 'None' : !changes ? 'No change' : r.paymentIncrease > 0 ? `+${f.money(r.paymentIncrease)}` : `−${f.money(-r.paymentIncrease)}`,
      totalInterest: f.money(r.totalInterest),
      stressNote: `If the rate rises by ${f.percent(input.rateRisePercent).replace('%', '')} ${input.rateRisePercent === 1 ? 'point' : 'points'} to ${f.percent(input.ratePercent + input.rateRisePercent)}, your repayment payment would be ${f.money(r.stressRepayPayment)} a month.`,
      hasStress: !paidInDraw && input.rateRisePercent > 0,
      drawLength: formatDuration(r.drawMonths),
      repayLength: paidInDraw ? 'None' : formatDuration(Math.min(r.repayMonths, r.months - r.drawMonths)),
      drawInterest: f.money(r.drawInterest),
      repayInterest: paidInDraw ? 'None' : f.money(r.totalInterest - r.drawInterest),
      creditLine: r.creditLine === null ? '' : f.money(r.creditLine),
      creditNote,
      hasCredit: r.creditLine !== null,
      warning,
      hasWarning: warning !== '',
      chartSvg,
      yearRows,
      summary,
    },
  };
}
