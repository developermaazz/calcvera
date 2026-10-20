/** Canadian mortgage payment calculator: form reading and display strings (build time and browser). */
import type { CaMortgageConfig, CaMortgageDefaults } from '../../countries/types';
import {
  BELOW_MINIMUM,
  PAYMENTS_PER_YEAR,
  calculateCaMortgage,
  minimumDownPayment,
  validateCaMortgageInput,
  type CaMortgageInput,
  type PaymentFrequency,
} from '../../engines/caMortgage';
import type { CalcView, Computed, Reader } from '../../lib/calcUi';
import { stackedBarChart } from '../../lib/charts';
import { createFormatters, formatDuration } from '../../lib/format';

export interface CaMortgagePageParams extends CaMortgageConfig {
  locale: string;
  currency: string;
}

export const FREQUENCIES: { value: PaymentFrequency; label: string; noun: string }[] = [
  { value: 'monthly', label: 'Monthly', noun: 'Monthly payment' },
  { value: 'semiMonthly', label: 'Semi-monthly (24 a year)', noun: 'Semi-monthly payment' },
  { value: 'biWeekly', label: 'Bi-weekly (26 a year)', noun: 'Bi-weekly payment' },
  { value: 'accelBiWeekly', label: 'Accelerated bi-weekly', noun: 'Accelerated bi-weekly payment' },
  { value: 'weekly', label: 'Weekly (52 a year)', noun: 'Weekly payment' },
  { value: 'accelWeekly', label: 'Accelerated weekly', noun: 'Accelerated weekly payment' },
];

export function caMortgageDefaults(d: CaMortgageDefaults): CaMortgageInput {
  return { ...d, rateType: 'fixed', frequency: 'monthly', firstTimeOrNewBuild: false };
}

export function readCaMortgageInput(r: Reader): CaMortgageInput {
  const freq = r.text('frequency') as PaymentFrequency;
  return {
    price: r.num('price'),
    downPayment: r.num('downPayment'),
    ratePercent: r.num('ratePercent'),
    rateType: r.text('rateType') === 'variable' ? 'variable' : 'fixed',
    amortizationYears: r.num('amortizationYears'),
    frequency: freq in PAYMENTS_PER_YEAR ? freq : 'monthly',
    termYears: r.num('termYears'),
    firstTimeOrNewBuild: r.checked('firstTimeOrNewBuild'),
  };
}

export interface CaMortgageView extends CalcView {
  paymentLabel: string;
  payment: string;
  paymentSub: string;
  mortgage: string;
  premium: string;
  totalInterest: string;
  termHeading: string;
  termBalance: string;
  termInterest: string;
  termPrincipal: string;
  insuranceNote: string;
  accelNote: string;
  hasAccel: boolean;
  chartSvg: string;
  yearRows: string;
}

export function buildCaMortgageView(input: CaMortgageInput, p: CaMortgagePageParams): Computed<CaMortgageView> {
  const f = createFormatters(p.locale, p.currency);
  const errors = validateCaMortgageInput(input, p).map((e) => {
    if (e.message !== BELOW_MINIMUM) return e;
    const min = minimumDownPayment(input.price, p);
    return {
      ...e,
      message:
        input.price >= p.insuredPriceCap
          ? `Homes of ${f.moneyWhole(p.insuredPriceCap)} or more need at least ${f.percent(p.minDownPayment.uninsuredRate * 100)} down: ${f.moneyWhole(Math.ceil(min))}.`
          : `The minimum down payment for this price is ${f.moneyWhole(Math.ceil(min))}.`,
    };
  });
  if (errors.length > 0) return { errors, view: null };

  const r = calculateCaMortgage(input, p);
  const freq = FREQUENCIES.find((x) => x.value === input.frequency)!;
  const accelerated = input.frequency === 'accelBiWeekly' || input.frequency === 'accelWeekly';
  const payoff = formatDuration(Math.round(r.payoffYears * 12));

  const chartSvg = stackedBarChart({
    data: r.years.map((y) => ({
      label: String(y.year),
      values: [y.principal, y.interest],
      tooltip: `Year ${y.year}: principal ${f.money(y.principal)}, interest ${f.money(y.interest)}, ${f.money(y.balance)} left`,
    })),
    seriesClasses: ['chart-s1', 'chart-s2'],
    formatAxis: f.moneyCompact,
    ariaLabel: `Principal and interest paid in each year of a ${f.money(r.mortgage)} mortgage paid off in ${payoff}. Total interest ${f.money(r.totalInterest)}. Full figures are in the table.`,
    xAxisLabel: 'Year',
  });

  const yearRows = r.years
    .map(
      (y) =>
        `<tr${y.year === input.termYears ? ' class="total-row"' : ''}><th scope="row">${y.year}</th><td>${f.money(y.paid)}</td><td>${f.money(y.principal)}</td><td>${f.money(y.interest)}</td><td>${f.money(y.balance)}</td></tr>`,
    )
    .join('');

  const insuranceNote =
    r.insured
      ? `Your down payment is ${f.percent(r.downPercent)} of the price, so you need mortgage loan insurance. The premium is ${f.percent(r.premiumRate * 100)} of the loan (${f.money(r.premium)}), added to your mortgage. In Ontario, Quebec and Saskatchewan, provincial sales tax on the premium is paid at closing and can't be added to the mortgage.`
      : `Your down payment is ${f.percent(r.downPercent)} of the price, so you don't need mortgage loan insurance.`;
  const hasAccel = accelerated && r.interestSavedVsMonthly > 0.005;
  const accelNote = hasAccel
    ? `Accelerated payments clear the mortgage in ${payoff} instead of ${formatDuration(input.amortizationYears * 12)}, saving ${f.money(r.interestSavedVsMonthly)} in interest compared with monthly payments.`
    : '';

  const termShort = r.termBalance === 0 && input.termYears * r.paymentsPerYear >= r.payments;
  const summary = `${freq.noun}s of ${f.money(r.payment)} pay off a ${f.money(r.mortgage)} mortgage in ${payoff}, with ${f.money(r.totalInterest)} of interest${
    termShort ? '.' : `. After your ${input.termYears}-year term, you'd still owe ${f.money(r.termBalance)}.`
  }`;

  return {
    errors: [],
    view: {
      paymentLabel: freq.noun,
      payment: f.money(r.payment),
      paymentSub: `${r.paymentsPerYear} payments a year, paid off in ${payoff}`,
      mortgage: f.money(r.mortgage),
      premium: r.insured ? f.money(r.premium) : 'Not needed',
      totalInterest: f.money(r.totalInterest),
      termHeading: `After your ${input.termYears}-year term`,
      termBalance: f.money(r.termBalance),
      termInterest: f.money(r.termInterest),
      termPrincipal: f.money(r.termPrincipal),
      insuranceNote,
      accelNote,
      hasAccel,
      chartSvg,
      yearRows,
      summary,
    },
  };
}
