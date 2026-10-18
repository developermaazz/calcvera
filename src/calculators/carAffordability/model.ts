/** Car affordability calculator: defaults, form reading and display strings (build time and browser). */
import {
  calculateCarAffordability,
  validateCarAffordabilityInput,
  type CarAffordabilityInput,
} from '../../engines/carAffordability';
import type { CalcView, Computed, Reader } from '../../lib/calcUi';
import { splitBar } from '../../lib/charts';
import { createFormatters, formatDuration } from '../../lib/format';

export interface CarAffordabilityParams {
  locale: string;
  currency: string;
}

export const CAR_TERMS = [36, 48, 60, 72, 84];

export const CAR_DEFAULTS: CarAffordabilityInput = {
  monthlyBudget: 500,
  downPayment: 3_000,
  tradeInValue: 5_000,
  tradeInOwed: 2_000,
  aprPercent: 7,
  termMonths: 60,
  salesTaxPercent: 6,
  fees: 800,
  taxAfterTradeIn: true,
};

export function readCarAffordabilityInput(r: Reader): CarAffordabilityInput {
  return {
    monthlyBudget: r.num('monthlyBudget'),
    downPayment: r.num('downPayment', 0),
    tradeInValue: r.num('tradeInValue', 0),
    tradeInOwed: r.num('tradeInOwed', 0),
    aprPercent: r.num('aprPercent'),
    termMonths: r.num('termMonths'),
    salesTaxPercent: r.num('salesTaxPercent', 0),
    fees: r.num('fees', 0),
    taxAfterTradeIn: r.checked('taxAfterTradeIn'),
  };
}

export interface CarAffordabilityView extends CalcView {
  maxPrice: string;
  loanAmount: string;
  salesTax: string;
  fees: string;
  tradeInEquity: string;
  totalInterest: string;
  totalCost: string;
  notAffordable: boolean;
  chartSvg: string;
}

export function buildCarAffordabilityView(input: CarAffordabilityInput, p: CarAffordabilityParams): Computed<CarAffordabilityView> {
  const errors = validateCarAffordabilityInput(input);
  if (errors.length > 0) return { errors, view: null };

  const f = createFormatters(p.locale, p.currency);
  const r = calculateCarAffordability(input);
  const term = formatDuration(input.termMonths);

  const chartSvg = splitBar(
    [
      { value: r.maxPrice, className: 'chart-s1', tooltip: `Car price: ${f.money(r.maxPrice)}` },
      { value: r.salesTax + input.fees, className: 'chart-s3', tooltip: `Sales tax and fees: ${f.money(r.salesTax + input.fees)}` },
      { value: r.totalInterest, className: 'chart-s2', tooltip: `Interest: ${f.money(r.totalInterest)}` },
    ],
    `Total cost ${f.money(r.totalCost)}: car ${f.money(r.maxPrice)}, tax and fees ${f.money(r.salesTax + input.fees)}, interest ${f.money(r.totalInterest)}.`,
  );

  const summary = r.affordable
    ? `With ${f.moneyWhole(input.monthlyBudget)} a month for ${term} at ${f.percent(input.aprPercent)} APR, you can afford a car priced up to about ${f.moneyWhole(r.maxPrice)}, borrowing ${f.moneyWhole(r.loanAmount)} and paying ${f.moneyWhole(r.totalInterest)} in interest.`
    : `This budget can't cover the fees${r.tradeInEquity < 0 ? ' and what you still owe on your trade-in' : ''}. Try a higher monthly budget, a bigger down payment or a longer term.`;

  return {
    errors: [],
    view: {
      maxPrice: f.moneyWhole(r.maxPrice),
      loanAmount: f.money(r.loanAmount),
      salesTax: f.money(r.salesTax),
      fees: f.money(input.fees),
      tradeInEquity: f.money(r.tradeInEquity),
      totalInterest: f.money(r.totalInterest),
      totalCost: f.money(r.totalCost),
      notAffordable: !r.affordable,
      chartSvg,
      summary,
    },
  };
}
