/**
 * Car affordability (US): the loan engine in reverse. Monthly budget → largest loan → largest car price
 * once the down payment, trade-in equity, sales tax and fees are taken into account.
 * Fees are assumed to be added to the loan. Pure: no formatting, no country lookups.
 */
import { maxPrincipalForPayment } from './loan';
import { checkMoney, checkPercent, checkRange, type FieldError } from './validation';

export interface CarAffordabilityInput {
  monthlyBudget: number;
  downPayment: number;
  tradeInValue: number;
  tradeInOwed: number;
  aprPercent: number;
  termMonths: number;
  salesTaxPercent: number;
  /** Dealer, title and registration fees added to the loan. */
  fees: number;
  /** True if sales tax is charged on the price after subtracting the trade-in value (varies by state). */
  taxAfterTradeIn: boolean;
}

export interface CarAffordabilityResult {
  /** Highest car price the budget supports (0 if it supports none). */
  maxPrice: number;
  loanAmount: number;
  salesTax: number;
  /** Trade-in value minus the amount still owed on it (negative = negative equity). */
  tradeInEquity: number;
  totalInterest: number;
  /** Everything paid: price + sales tax + fees + interest. */
  totalCost: number;
  /** False when the down payment, equity and loan can't cover the fees and any negative equity. */
  affordable: boolean;
}

export function validateCarAffordabilityInput(input: CarAffordabilityInput): FieldError[] {
  const errors: FieldError[] = [];
  checkRange(errors, 'monthlyBudget', input.monthlyBudget, {
    min: 1,
    max: 1_000_000,
    empty: 'Enter your monthly budget for the car payment.',
    range: 'Enter a monthly budget between 1 and 1,000,000.',
  });
  for (const field of ['downPayment', 'tradeInValue', 'tradeInOwed', 'fees'] as const) {
    checkMoney(errors, field, input[field], 10_000_000);
  }
  checkPercent(errors, 'aprPercent', input.aprPercent);
  checkRange(errors, 'termMonths', input.termMonths, {
    min: 1,
    max: 120,
    integer: true,
    empty: 'Enter the loan term.',
    range: 'Enter a term between 1 and 120 months.',
  });
  checkPercent(errors, 'salesTaxPercent', input.salesTaxPercent, 25);
  return errors;
}

export function calculateCarAffordability(input: CarAffordabilityInput): CarAffordabilityResult {
  const errors = validateCarAffordabilityInput(input);
  if (errors.length > 0) throw new RangeError(errors.map((e) => e.message).join(' '));

  const loanAmount = maxPrincipalForPayment(input.monthlyBudget, input.aprPercent, input.termMonths);
  const tradeInEquity = input.tradeInValue - input.tradeInOwed;
  const t = input.salesTaxPercent / 100;
  // Money available for price + sales tax.
  const available = loanAmount - input.fees + input.downPayment + tradeInEquity;

  let price: number;
  if (input.taxAfterTradeIn) {
    // available = price + t × (price − tradeIn), while price is above the trade-in value.
    price = (available + t * input.tradeInValue) / (1 + t);
    if (price < input.tradeInValue) price = available; // nothing taxable below the trade-in value
  } else {
    price = available / (1 + t);
  }

  const affordable = price > 0;
  const maxPrice = Math.max(0, price);
  const taxable = input.taxAfterTradeIn ? Math.max(0, maxPrice - input.tradeInValue) : maxPrice;
  const salesTax = taxable * t;
  const totalInterest = Math.max(0, input.monthlyBudget * input.termMonths - loanAmount);

  return {
    maxPrice,
    loanAmount,
    salesTax,
    tradeInEquity,
    totalInterest,
    totalCost: maxPrice + salesTax + input.fees + totalInterest,
    affordable,
  };
}
