/** US mortgage calculator: form reading and display strings (build time and browser). */
import type { UsMortgageConfig, UsMortgageDefaults } from '../../countries/types';
import { summariseByYear } from '../../engines/loan';
import { calculateUsMortgage, validateUsMortgageInput, type UsMortgageInput } from '../../engines/usMortgage';
import type { CalcView, Computed, Reader } from '../../lib/calcUi';
import { stackedBarChart } from '../../lib/charts';
import { addMonths, createFormatters, escapeHtml, formatDuration } from '../../lib/format';
import { currentStartMonth } from '../loan/view';

export interface UsMortgageParams extends UsMortgageConfig {
  locale: string;
  currency: string;
}

export function usMortgageDefaults(d: UsMortgageDefaults): UsMortgageInput {
  return { ...d, hoaPerMonth: 0, extraMonthly: 0 };
}

export function readUsMortgageInput(r: Reader): UsMortgageInput {
  return {
    homePrice: r.num('homePrice'),
    downPayment: r.num('downPayment'),
    ratePercent: r.num('ratePercent'),
    termYears: r.num('termYears'),
    propertyTaxPercent: r.num('propertyTaxPercent', 0),
    insurancePerYear: r.num('insurancePerYear', 0),
    pmiPercent: r.num('pmiPercent', 0),
    hoaPerMonth: r.num('hoaPerMonth', 0),
    extraMonthly: r.num('extraMonthly', 0),
  };
}

export interface UsMortgageView extends CalcView {
  payment: string;
  paymentSub: string;
  principalAndInterest: string;
  propertyTax: string;
  insurance: string;
  pmi: string;
  hoa: string;
  hasHoa: boolean;
  loanAmount: string;
  totalInterest: string;
  totalPmi: string;
  payoffDate: string;
  pmiNote: string;
  extraNote: string;
  hasExtra: boolean;
  chartSvg: string;
  yearRows: string;
  monthRows: string;
}

export function buildUsMortgageView(input: UsMortgageInput, p: UsMortgageParams): Computed<UsMortgageView> {
  const errors = validateUsMortgageInput(input);
  if (errors.length > 0) return { errors, view: null };

  const f = createFormatters(p.locale, p.currency);
  const r = calculateUsMortgage(input, p);
  const start = currentStartMonth();
  const monthOf = (k: number) => {
    const m = addMonths(start.year, start.monthIndex, k);
    return f.monthYear(m.year, m.monthIndex);
  };
  const payoffDate = monthOf(r.payoffMonths);
  const hasPmi = r.pmi > 0;
  // Under 20% down but no PMI rate entered: show $0 rather than "Not needed".
  const pmiExpected = r.loanAmount > p.pmiAboveLtv * input.homePrice;
  const hasExtra = input.extraMonthly > 0 && r.monthsSaved > 0;
  const pct = (x: number) => f.percent(x * 100);

  const parts = ['Principal', 'interest', 'tax', 'insurance', ...(hasPmi ? ['PMI'] : []), ...(r.hoa > 0 ? ['HOA dues'] : [])];
  const paymentSub = `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}${input.extraMonthly > 0 ? `, plus ${f.money(input.extraMonthly)} extra` : ''}`;

  let pmiNote: string;
  if (hasPmi && r.pmiMonths >= r.payoffMonths) {
    pmiNote = `With ${f.percent(r.downPercent)} down, PMI adds ${f.money(r.pmi)} a month until the loan is paid off.`;
  } else if (hasPmi) {
    pmiNote = `With ${f.percent(r.downPercent)} down, PMI adds ${f.money(r.pmi)} a month. It ends automatically after your ${monthOf(r.pmiMonths)} payment, when your payment drops to ${f.money(r.paymentAfterPmi)}.${
      r.pmiRequestMonth > 0 ? ` You can ask your lender to cancel it sooner, from ${monthOf(r.pmiRequestMonth + 1)}, once you owe ${pct(p.pmiRequestLtv)} of the price.` : ''
    }`;
  } else if (pmiExpected) {
    pmiNote = `With less than ${pct(1 - p.pmiAboveLtv)} down, lenders usually require PMI on a conventional loan. Enter your PMI rate to include it.`;
  } else {
    pmiNote = `With ${f.percent(r.downPercent)} down, you don't need PMI.`;
  }

  const extraNote = hasExtra
    ? `Paying ${f.money(input.extraMonthly)} extra each month saves ${f.money(r.interestSaved)} in interest and pays off the loan ${formatDuration(r.monthsSaved)} sooner.`
    : '';

  const years = summariseByYear(r.schedule);
  const chartSvg = stackedBarChart({
    data: years.map((y) => ({
      label: String(y.year),
      values: [y.principal, y.interest],
      tooltip: `Year ${y.year}: principal ${f.money(y.principal)}, interest ${f.money(y.interest)}, ${f.money(y.balance)} left`,
    })),
    seriesClasses: ['chart-s1', 'chart-s2'],
    formatAxis: f.moneyCompact,
    ariaLabel: `Principal and interest paid in each year of a ${f.money(r.loanAmount)} mortgage paid off in ${formatDuration(r.payoffMonths)}. Total interest ${f.money(r.totalInterest)}. Full figures are in the table.`,
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

  const summary = `Borrowing ${f.moneyWhole(r.loanAmount)} at ${f.percent(input.ratePercent)} for ${formatDuration(input.termYears * 12)} costs ${f.money(r.monthlyPayment)} a month with tax${hasPmi ? ', insurance and PMI' : ' and insurance'}, and ${f.money(r.totalInterest)} in interest, so you'd own your home outright in ${payoffDate}.`;

  return {
    errors: [],
    view: {
      payment: f.money(r.monthlyPayment),
      paymentSub,
      principalAndInterest: f.money(r.principalAndInterest),
      propertyTax: f.money(r.propertyTax),
      insurance: f.money(r.insurance),
      pmi: hasPmi || pmiExpected ? f.money(r.pmi) : 'Not needed',
      hoa: f.money(r.hoa),
      hasHoa: r.hoa > 0,
      loanAmount: f.money(r.loanAmount),
      totalInterest: f.money(r.totalInterest),
      totalPmi: hasPmi || pmiExpected ? f.money(r.totalPmi) : 'None',
      payoffDate,
      pmiNote,
      extraNote,
      hasExtra,
      chartSvg,
      yearRows,
      monthRows,
      summary,
    },
  };
}
