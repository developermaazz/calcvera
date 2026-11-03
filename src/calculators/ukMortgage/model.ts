/** UK mortgage calculator: form reading and display strings (build time and browser). */
import type { UkMortgageDefaults } from '../../countries/types';
import { summariseByYear } from '../../engines/loan';
import { calculateUkMortgage, validateUkMortgageInput, type UkMortgageInput } from '../../engines/ukMortgage';
import type { CalcView, Computed, Reader } from '../../lib/calcUi';
import { stackedBarChart } from '../../lib/charts';
import { addMonths, createFormatters, escapeHtml, formatDuration } from '../../lib/format';
import { currentStartMonth } from '../loan/view';

export interface UkMortgageParams {
  locale: string;
  currency: string;
}

export function ukMortgageDefaults(d: UkMortgageDefaults): UkMortgageInput {
  return { ...d, repaymentType: 'repayment', addFeeToLoan: false };
}

export function readUkMortgageInput(r: Reader): UkMortgageInput {
  return {
    price: r.num('price'),
    deposit: r.num('deposit'),
    termYears: r.num('termYears'),
    repaymentType: r.text('repaymentType') === 'interestOnly' ? 'interestOnly' : 'repayment',
    initialRatePercent: r.num('initialRatePercent'),
    dealYears: r.num('dealYears'),
    followOnRatePercent: r.num('followOnRatePercent'),
    productFee: r.num('productFee', 0),
    addFeeToLoan: r.checked('addFeeToLoan'),
  };
}

export interface UkMortgageView extends CalcView {
  paymentLabel: string;
  payment: string;
  paymentSub: string;
  loan: string;
  ltv: string;
  totalInterest: string;
  totalRepaid: string;
  dealHeading: string;
  dealPaid: string;
  dealInterest: string;
  dealBalance: string;
  dealCost: string;
  hasFollowOn: boolean;
  followOnNote: string;
  interestOnlyNote: string;
  isInterestOnly: boolean;
  feeNote: string;
  hasFeeNote: boolean;
  chartSvg: string;
  yearRows: string;
  monthRows: string;
}

export function buildUkMortgageView(input: UkMortgageInput, p: UkMortgageParams): Computed<UkMortgageView> {
  const errors = validateUkMortgageInput(input);
  if (errors.length > 0) return { errors, view: null };

  const f = createFormatters(p.locale, p.currency);
  const r = calculateUkMortgage(input);
  const start = currentStartMonth();
  const monthOf = (k: number) => {
    const m = addMonths(start.year, start.monthIndex, k);
    return f.monthYear(m.year, m.monthIndex);
  };
  const deal = formatDuration(r.dealMonths);
  const interestOnly = input.repaymentType === 'interestOnly';
  const change = r.followOnPayment - r.initialPayment;
  // Amounts the user typed read better without ".00" when they are whole: "£255,000".
  const typed = (v: number) => (Number.isInteger(v) ? f.moneyWhole(v) : f.money(v));

  const followOnNote = r.hasFollowOn
    ? `When your deal ends in ${monthOf(r.dealMonths)}, your payment would ${change >= 0 ? 'rise' : 'fall'} by ${f.money(Math.abs(change))} to ${f.money(r.followOnPayment)} a month at ${f.percent(input.followOnRatePercent)}, unless you switch to a new deal. You'd owe ${f.money(r.dealBalance)} at that point.`
    : '';
  const interestOnlyNote = interestOnly
    ? `Your payments only cover the interest, so you'd still owe the full ${typed(r.loan)} at the end of the term. You'd need a plan to repay it, such as savings, investments or selling the property.`
    : '';

  // What adding the fee to the loan costs in interest over the term.
  let feeNote = '';
  if (input.addFeeToLoan && input.productFee > 0) {
    const without = calculateUkMortgage({ ...input, addFeeToLoan: false });
    feeNote = `Adding the ${typed(input.productFee)} fee to your mortgage costs ${f.money(r.totalInterest - without.totalInterest)} in interest over the term.`;
  }

  const years = summariseByYear(r.schedule);
  const chartSvg = stackedBarChart({
    data: years.map((y) => ({
      label: String(y.year),
      values: [y.principal, y.interest],
      tooltip: `Year ${y.year}: capital ${f.money(y.principal)}, interest ${f.money(y.interest)}, ${f.money(y.balance)} left`,
    })),
    seriesClasses: ['chart-s1', 'chart-s2'],
    formatAxis: f.moneyCompact,
    ariaLabel: `Capital and interest paid in each year of a ${f.money(r.loan)} ${interestOnly ? 'interest-only' : 'repayment'} mortgage over ${formatDuration(input.termYears * 12)}. Total interest ${f.money(r.totalInterest)}. Full figures are in the table.`,
    xAxisLabel: 'Year',
  });
  const yearRows = years
    .map((y) => `<tr><th scope="row">${y.year}</th><td>${f.money(y.principal)}</td><td>${f.money(y.interest)}</td><td>${f.money(y.balance)}</td></tr>`)
    .join('');
  const monthRows = r.schedule
    .map(
      (row) =>
        `<tr><th scope="row">${row.month}</th><td>${escapeHtml(monthOf(row.month))}</td><td>${f.money(row.payment)}</td><td>${f.money(row.principal + row.extra)}</td><td>${f.money(row.interest)}</td><td>${f.money(row.balance)}</td></tr>`,
    )
    .join('');

  const rates = r.hasFollowOn
    ? `${f.money(r.initialPayment)} a month at ${f.percent(input.initialRatePercent)} for ${deal}, then ${f.money(r.followOnPayment)} at ${f.percent(input.followOnRatePercent)}`
    : `${f.money(r.initialPayment)} a month at ${f.percent(input.initialRatePercent)}`;
  const summary = `Borrowing ${f.moneyWhole(r.loan)} over ${formatDuration(input.termYears * 12)} costs ${rates}, with ${f.money(r.totalInterest)} of interest${
    interestOnly ? ` and the full ${f.moneyWhole(r.loan)} still to repay at the end.` : ' in total.'
  }`;

  return {
    errors: [],
    view: {
      paymentLabel: r.hasFollowOn ? `Monthly payment for ${deal}` : 'Monthly payment',
      payment: f.money(r.initialPayment),
      paymentSub: r.hasFollowOn ? `Then ${f.money(r.followOnPayment)} a month at ${f.percent(input.followOnRatePercent)}` : 'The same rate for the whole term',
      loan: f.money(r.loan),
      ltv: f.percent(Math.round(r.ltvPercent * 100) / 100),
      totalInterest: f.money(r.totalInterest),
      // Whole pounds: the tile is narrow (CLAUDE.md section 7).
      totalRepaid: f.moneyWhole(r.loan + r.totalInterest),
      dealHeading: `During your ${input.dealYears}-year deal`,
      dealPaid: f.money(r.dealPaid),
      dealInterest: f.money(r.dealInterest),
      dealBalance: f.money(r.dealBalance),
      dealCost: f.money(r.dealCost),
      hasFollowOn: r.hasFollowOn,
      followOnNote,
      interestOnlyNote,
      isInterestOnly: interestOnly,
      feeNote,
      hasFeeNote: feeNote !== '',
      chartSvg,
      yearRows,
      monthRows,
      summary,
    },
  };
}
