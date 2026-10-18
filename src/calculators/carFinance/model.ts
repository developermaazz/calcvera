/** UK car finance (PCP / HP) calculator: form reading and display strings (build time and browser). */
import type { CarFinanceDefaults } from '../../countries/types';
import { calculateCarFinance, validateCarFinanceInput, type CarFinanceInput } from '../../engines/carFinance';
import type { CalcView, Computed, Reader } from '../../lib/calcUi';
import { splitBar } from '../../lib/charts';
import { createFormatters, formatDuration } from '../../lib/format';

export interface CarFinanceParams {
  locale: string;
  currency: string;
}

export const CAR_FINANCE_TERMS = [24, 36, 48, 60];

export function carFinanceDefaults(d: CarFinanceDefaults): CarFinanceInput {
  return { ...d };
}

export function readCarFinanceInput(r: Reader): CarFinanceInput {
  return {
    price: r.num('price'),
    deposit: r.num('deposit', 0),
    termMonths: r.num('termMonths'),
    aprPercent: r.num('aprPercent'),
    finalPayment: r.num('finalPayment', 0),
    optionFee: r.num('optionFee', 0),
  };
}

export interface CarFinanceView extends CalcView {
  monthly: string;
  financed: string;
  finalPayment: string;
  totalPayable: string;
  totalCharges: string;
  hpPayment: string;
  isPcp: boolean;
  vtPoint: string;
  chartSvg: string;
}

export function buildCarFinanceView(input: CarFinanceInput, p: CarFinanceParams): Computed<CarFinanceView> {
  const errors = validateCarFinanceInput(input);
  if (errors.length > 0) return { errors, view: null };

  const f = createFormatters(p.locale, p.currency);
  const r = calculateCarFinance(input);
  const isPcp = input.finalPayment > 0;
  const monthlyTotal = r.monthlyPayment * input.termMonths;

  const chartSvg = splitBar(
    [
      { value: input.deposit, className: 'chart-s1', tooltip: `Deposit: ${f.money(input.deposit)}` },
      { value: monthlyTotal, className: 'chart-s2', tooltip: `Monthly payments: ${f.money(monthlyTotal)}` },
      { value: input.finalPayment + input.optionFee, className: 'chart-s3', tooltip: `Final payment and fee: ${f.money(input.finalPayment + input.optionFee)}` },
    ],
    `Total payable ${f.money(r.totalPayable)}: deposit ${f.money(input.deposit)}, monthly payments ${f.money(monthlyTotal)}, final payment and fee ${f.money(input.finalPayment + input.optionFee)}.`,
  );

  const term = formatDuration(input.termMonths);
  const summary = isPcp
    ? `You'd pay ${f.money(r.monthlyPayment)} a month for ${term}, then ${f.money(input.finalPayment)} if you want to keep the car. In total you'd pay ${f.money(r.totalPayable)}, ${f.money(r.totalCharges)} more than the car's price.`
    : `You'd pay ${f.money(r.monthlyPayment)} a month for ${term} and own the car at the end, paying ${f.money(r.totalPayable)} in total, ${f.money(r.totalCharges)} more than the car's price.`;

  return {
    errors: [],
    view: {
      monthly: f.money(r.monthlyPayment),
      financed: f.money(r.financed),
      finalPayment: f.money(input.finalPayment),
      totalPayable: f.money(r.totalPayable),
      totalCharges: f.money(r.totalCharges),
      hpPayment: f.money(r.hirePurchasePayment),
      isPcp,
      vtPoint: f.money(r.voluntaryTerminationPoint),
      chartSvg,
      summary,
    },
  };
}
