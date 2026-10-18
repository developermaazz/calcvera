/** Debt consolidation calculator: defaults, form reading and display strings (build time and browser). */
import {
  MAX_DEBTS,
  activeDebts,
  calculateDebtConsolidation,
  debtField,
  validateDebtConsolidationInput,
  type DebtConsolidationInput,
} from '../../engines/debtConsolidation';
import type { CalcView, Computed, Reader } from '../../lib/calcUi';
import { stackedBarChart } from '../../lib/charts';
import { createFormatters, formatDuration } from '../../lib/format';

export interface DebtConsolidationParams {
  locale: string;
  currency: string;
}

export const CONSOLIDATION_TERMS = [24, 36, 48, 60, 72, 84];
/** Rows shown before "Add another debt". */
export const VISIBLE_DEBT_ROWS = 3;

export const CONSOLIDATION_DEFAULTS: DebtConsolidationInput = {
  debts: [
    { balance: 6_000, aprPercent: 22.99, monthlyPayment: 200 },
    { balance: 3_500, aprPercent: 27.49, monthlyPayment: 120 },
    { balance: 8_000, aprPercent: 11.5, monthlyPayment: 250 },
  ],
  newAprPercent: 9.99,
  newTermMonths: 36,
  originationFeePercent: 5,
};

export function readDebtConsolidationInput(r: Reader): DebtConsolidationInput {
  const debts = Array.from({ length: MAX_DEBTS }, (_, i) => ({
    balance: r.num(debtField('balance', i), 0),
    aprPercent: r.num(debtField('aprPercent', i)),
    monthlyPayment: r.num(debtField('monthlyPayment', i)),
  }));
  return {
    debts,
    newAprPercent: r.num('newAprPercent'),
    newTermMonths: r.num('newTermMonths'),
    originationFeePercent: r.num('originationFeePercent', 0),
  };
}

export interface DebtConsolidationView extends CalcView {
  verdictLabel: string;
  verdictAmount: string;
  currentPayment: string;
  currentTime: string;
  currentInterest: string;
  newTime: string;
  newPayment: string;
  newInterest: string;
  fee: string;
  breakEven: string;
  infeasible: boolean;
  infeasibleText: string;
  chartSvg: string;
}

export function buildDebtConsolidationView(input: DebtConsolidationInput, p: DebtConsolidationParams): Computed<DebtConsolidationView> {
  const errors = validateDebtConsolidationInput(input);
  if (errors.length > 0) return { errors, view: null };

  const f = createFormatters(p.locale, p.currency);
  const r = calculateDebtConsolidation(input);
  const debts = activeDebts(input.debts);

  const stuck = r.current.perDebt.map((d, i) => (d.feasible ? -1 : i)).filter((i) => i >= 0);
  const infeasible = stuck.length > 0;
  const infeasibleText = infeasible
    ? `At its current payment, debt ${stuck.map((i) => i + 1).join(', ')} never gets paid off: the payment doesn't cover the monthly interest. Consolidating would replace it with a fixed payoff date.`
    : '';

  const saves = r.savings >= 0;
  const breakEven =
    r.breakEvenMonth === null ? (infeasible ? 'Not applicable' : 'Never') : r.breakEvenMonth === 1 ? 'Month 1' : `Month ${r.breakEvenMonth}`;

  const chartSvg = stackedBarChart({
    data: [
      {
        label: 'Current debts',
        values: [r.current.totalInterest, 0],
        tooltip: `Current debts: ${f.money(r.current.totalInterest)} interest`,
      },
      {
        label: 'Consolidation loan',
        values: [r.newInterest, r.originationFee],
        tooltip: `Consolidation loan: ${f.money(r.newInterest)} interest + ${f.money(r.originationFee)} fee`,
      },
    ],
    seriesClasses: ['chart-s2', 'chart-s3'],
    formatAxis: f.moneyCompact,
    ariaLabel: `Interest on current debts ${f.money(r.current.totalInterest)} compared with ${f.money(r.newInterest)} interest and a ${f.money(r.originationFee)} fee on the consolidation loan.`,
  });

  const paymentChange = r.newMonthlyPayment - r.currentMonthlyPayment;
  const paymentText =
    Math.abs(paymentChange) < 0.005
      ? `your monthly payment stays at ${f.money(r.newMonthlyPayment)}`
      : `your monthly payment ${paymentChange > 0 ? 'rises' : 'falls'} from ${f.money(r.currentMonthlyPayment)} to ${f.money(r.newMonthlyPayment)}`;
  const summary = infeasible
    ? `A ${f.moneyWhole(r.loanAmount)} consolidation loan would cost ${f.money(r.newMonthlyPayment)} a month and clear these ${debts.length === 1 ? 'debt' : 'debts'} in ${formatDuration(input.newTermMonths)}, which your current payments never do.`
    : saves
      ? `Consolidating saves ${f.money(r.savings)} in interest and fees, and ${paymentText}.${r.breakEvenMonth ? ` The fee is paid back by month ${r.breakEvenMonth}.` : ''}`
      : `Consolidating costs ${f.money(-r.savings)} more in interest and fees than paying your debts as you are, and ${paymentText}.`;

  return {
    errors: [],
    view: {
      verdictLabel: infeasible ? 'New monthly payment' : saves ? 'You save' : 'Extra cost',
      verdictAmount: infeasible ? f.money(r.newMonthlyPayment) : f.money(Math.abs(r.savings)),
      currentPayment: f.money(r.currentMonthlyPayment),
      currentTime: infeasible ? 'Never paid off' : formatDuration(r.current.months),
      currentInterest: infeasible ? 'Keeps growing' : f.money(r.current.totalInterest),
      newPayment: f.money(r.newMonthlyPayment),
      newTime: formatDuration(input.newTermMonths),
      newInterest: f.money(r.newInterest),
      fee: f.money(r.originationFee),
      breakEven,
      infeasible,
      infeasibleText,
      chartSvg,
      summary,
    },
  };
}
