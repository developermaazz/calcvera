/**
 * Car loan amount (US): price − down payment − trade-in equity + sales tax + fees, then the standard loan
 * engine for the payment and schedule. Fees are assumed to be added to the loan. Pure: no formatting,
 * no country lookups.
 */
import { calculateLoan, type LoanResult } from './loan';
import { checkMoney, checkPercent, checkRange, type FieldError } from './validation';

export interface CarLoanInput {
  price: number;
  downPayment: number;
  tradeInValue: number;
  tradeInOwed: number;
  salesTaxPercent: number;
  /** Dealer, title and registration fees added to the loan. */
  fees: number;
  aprPercent: number;
  termMonths: number;
  /** True if sales tax is charged on the price after subtracting the trade-in value (varies by state). */
  taxAfterTradeIn: boolean;
}

export interface CarLoanResult {
  tradeInEquity: number;
  salesTax: number;
  /** Amount borrowed. 0 when the down payment and trade-in cover everything. */
  loanAmount: number;
  needsLoan: boolean;
  /** Present only when a loan is needed. */
  loan: LoanResult | null;
  totalInterest: number;
  /** Price + sales tax + fees + interest. */
  totalCost: number;
}

export function validateCarLoanInput(input: CarLoanInput): FieldError[] {
  const errors: FieldError[] = [];
  checkRange(errors, 'price', input.price, {
    min: 100,
    max: 10_000_000,
    empty: 'Enter the car price.',
    range: 'Enter a price between 100 and 10,000,000.',
  });
  for (const field of ['downPayment', 'tradeInValue', 'tradeInOwed', 'fees'] as const) {
    checkMoney(errors, field, input[field], 10_000_000);
  }
  checkPercent(errors, 'salesTaxPercent', input.salesTaxPercent, 25);
  checkPercent(errors, 'aprPercent', input.aprPercent);
  checkRange(errors, 'termMonths', input.termMonths, {
    min: 1,
    max: 120,
    integer: true,
    empty: 'Enter the loan term.',
    range: 'Enter a term between 1 and 120 months.',
  });
  return errors;
}

/** Sales tax on the price, after the trade-in value where the state allows it. */
export function carSalesTax(price: number, tradeInValue: number, salesTaxPercent: number, taxAfterTradeIn: boolean): number {
  const taxable = taxAfterTradeIn ? Math.max(0, price - tradeInValue) : price;
  return (taxable * salesTaxPercent) / 100;
}

export function calculateCarLoan(input: CarLoanInput): CarLoanResult {
  const errors = validateCarLoanInput(input);
  if (errors.length > 0) throw new RangeError(errors.map((e) => e.message).join(' '));

  const tradeInEquity = input.tradeInValue - input.tradeInOwed;
  const salesTax = carSalesTax(input.price, input.tradeInValue, input.salesTaxPercent, input.taxAfterTradeIn);
  const loanAmount = Math.max(0, input.price + salesTax + input.fees - input.downPayment - tradeInEquity);
  // The loan engine needs at least 1 unit; smaller amounts would be paid in cash.
  const needsLoan = loanAmount >= 1;
  const loan = needsLoan ? calculateLoan({ principal: loanAmount, aprPercent: input.aprPercent, termMonths: input.termMonths }) : null;
  const totalInterest = loan?.totalInterest ?? 0;

  return {
    tradeInEquity,
    salesTax,
    loanAmount: needsLoan ? loanAmount : 0,
    needsLoan,
    loan,
    totalInterest,
    totalCost: input.price + salesTax + input.fees + totalInterest,
  };
}
