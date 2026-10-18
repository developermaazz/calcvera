/** Used car loan calculator (US): form reading and display strings (build time and browser). */
import type { UsedCarLoanDefaults } from '../../countries/types';
import { calculateCarLoan, validateCarLoanInput, type CarLoanInput } from '../../engines/carLoan';
import type { CalcView, Computed, Reader } from '../../lib/calcUi';
import { createFormatters, formatDuration } from '../../lib/format';
import { buildLoanView, currentStartMonth } from '../loan/view';

export interface UsedCarLoanParams {
  locale: string;
  currency: string;
}

export const USED_CAR_TERMS = [24, 36, 48, 60, 72, 84];

export function usedCarDefaults(d: UsedCarLoanDefaults): CarLoanInput {
  return { ...d, taxAfterTradeIn: true };
}

export function readCarLoanInput(r: Reader): CarLoanInput {
  return {
    price: r.num('price'),
    downPayment: r.num('downPayment', 0),
    tradeInValue: r.num('tradeInValue', 0),
    tradeInOwed: r.num('tradeInOwed', 0),
    salesTaxPercent: r.num('salesTaxPercent', 0),
    fees: r.num('fees', 0),
    aprPercent: r.num('aprPercent'),
    termMonths: r.num('termMonths'),
    taxAfterTradeIn: r.checked('taxAfterTradeIn'),
  };
}

export interface UsedCarLoanView extends CalcView {
  headlineLabel: string;
  headline: string;
  loanAmount: string;
  salesTax: string;
  totalInterest: string;
  totalCost: string;
  payoffDate: string;
  financedHtml: string;
  hasLoan: boolean;
  chartSvg: string;
  yearlyRows: string;
  monthlyRows: string;
}

const EMPTY_CHART = '<svg class="chart-svg" viewBox="0 0 640 260" role="img" aria-label="No loan needed"></svg>';

export function buildUsedCarLoanView(input: CarLoanInput, p: UsedCarLoanParams): Computed<UsedCarLoanView> {
  const errors = validateCarLoanInput(input);
  if (errors.length > 0) return { errors, view: null };

  const f = createFormatters(p.locale, p.currency);
  const r = calculateCarLoan(input);

  const rows: [string, string][] = [
    ['Car price', f.money(input.price)],
    ['Down payment', `− ${f.money(input.downPayment)}`],
    r.tradeInEquity >= 0
      ? ['Trade-in equity (value − amount owed)', `− ${f.money(r.tradeInEquity)}`]
      : ['Negative equity rolled into the loan', `+ ${f.money(-r.tradeInEquity)}`],
    [`Sales tax (${f.percent(input.salesTaxPercent)}${input.taxAfterTradeIn ? ', after trade-in' : ''})`, `+ ${f.money(r.salesTax)}`],
    ['Fees', `+ ${f.money(input.fees)}`],
    ['Amount financed', f.money(r.loanAmount)],
  ];
  const financedHtml = rows.map(([label, value]) => `<tr><th scope="row">${label}</th><td>${value}</td></tr>`).join('');

  if (!r.loan) {
    return {
      errors: [],
      view: {
        headlineLabel: 'Monthly payment',
        headline: 'No loan needed',
        loanAmount: f.money(0),
        salesTax: f.money(r.salesTax),
        totalInterest: f.money(0),
        totalCost: f.money(r.totalCost),
        payoffDate: 'Paid in full',
        financedHtml,
        hasLoan: false,
        chartSvg: EMPTY_CHART,
        yearlyRows: '',
        monthlyRows: '',
        summary: `Your down payment and trade-in cover the ${f.money(input.price)} price, tax and fees, so you don't need a loan.`,
      },
    };
  }

  const loanView = buildLoanView(
    { principal: r.loanAmount, aprPercent: input.aprPercent, termMonths: input.termMonths },
    r.loan,
    f,
    currentStartMonth(),
  );

  return {
    errors: [],
    view: {
      headlineLabel: 'Monthly payment',
      headline: f.money(r.loan.monthlyPayment),
      loanAmount: f.money(r.loanAmount),
      salesTax: f.money(r.salesTax),
      totalInterest: f.money(r.totalInterest),
      totalCost: f.money(r.totalCost),
      payoffDate: loanView.payoffDate,
      financedHtml,
      hasLoan: true,
      chartSvg: loanView.chartSvg,
      yearlyRows: loanView.yearlyRows,
      monthlyRows: loanView.monthlyRows,
      summary: `You'd borrow ${f.money(r.loanAmount)} and pay ${f.money(r.loan.monthlyPayment)} a month for ${formatDuration(input.termMonths)}, with ${f.money(r.totalInterest)} in interest, and own the car outright in ${loanView.payoffDate}.`,
    },
  };
}
