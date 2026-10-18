/**
 * UK car finance: PCP (monthly payments plus an optional final payment) or hire purchase (no final payment).
 * Payment = (financed − final / (1 + r)^n) × r ÷ (1 − (1 + r)^−n), r = APR / 12 (CLAUDE.md section 7).
 * Lenders work from the APR as an annual compound rate, so their figures can differ slightly.
 * Pure: no formatting, no country lookups.
 */
import { checkMoney, checkPercent, checkRange, type FieldError } from './validation';

export interface CarFinanceInput {
  price: number;
  /** Cash deposit plus any part-exchange value. */
  deposit: number;
  termMonths: number;
  aprPercent: number;
  /** PCP optional final payment (balloon). 0 for hire purchase. */
  finalPayment: number;
  /** Option-to-purchase fee paid with the final payment. */
  optionFee: number;
}

export interface CarFinanceResult {
  financed: number;
  monthlyPayment: number;
  /** Deposit + monthly payments + final payment + option fee. */
  totalPayable: number;
  /** Total payable − price: interest and fees. */
  totalCharges: number;
  /** Monthly payment with no final payment (hire purchase), for comparison. */
  hirePurchasePayment: number;
  /** Half the total payable: once paid, you can usually hand the car back with nothing more to pay. */
  voluntaryTerminationPoint: number;
}

export function validateCarFinanceInput(input: CarFinanceInput): FieldError[] {
  const errors: FieldError[] = [];
  checkRange(errors, 'price', input.price, {
    min: 500,
    max: 5_000_000,
    empty: 'Enter the car price.',
    range: 'Enter a price between 500 and 5,000,000.',
  });
  checkMoney(errors, 'deposit', input.deposit, 5_000_000);
  checkRange(errors, 'termMonths', input.termMonths, {
    min: 6,
    max: 72,
    integer: true,
    empty: 'Enter the agreement length.',
    range: 'Enter between 6 and 72 months.',
  });
  checkPercent(errors, 'aprPercent', input.aprPercent, 50);
  checkMoney(errors, 'finalPayment', input.finalPayment, 5_000_000);
  checkMoney(errors, 'optionFee', input.optionFee, 10_000);
  if (errors.length === 0) {
    if (input.deposit >= input.price) {
      errors.push({ field: 'deposit', message: 'The deposit covers the whole price, so there is nothing to finance.' });
    } else if (input.finalPayment >= input.price - input.deposit) {
      errors.push({ field: 'finalPayment', message: 'The final payment must be less than the amount you borrow.' });
    }
  }
  return errors;
}

/** Monthly payment that repays `financed` over n months, leaving `final` due at the end. */
export function balloonPayment(financed: number, aprPercent: number, n: number, final: number): number {
  const r = aprPercent / 1200;
  if (r === 0) return (financed - final) / n;
  return ((financed - final * Math.pow(1 + r, -n)) * r) / -Math.expm1(-n * Math.log1p(r));
}

export function calculateCarFinance(input: CarFinanceInput): CarFinanceResult {
  const errors = validateCarFinanceInput(input);
  if (errors.length > 0) throw new RangeError(errors.map((e) => e.message).join(' '));

  const financed = input.price - input.deposit;
  const monthlyPayment = balloonPayment(financed, input.aprPercent, input.termMonths, input.finalPayment);
  const totalPayable = input.deposit + monthlyPayment * input.termMonths + input.finalPayment + input.optionFee;

  return {
    financed,
    monthlyPayment,
    totalPayable,
    totalCharges: totalPayable - input.price,
    hirePurchasePayment: balloonPayment(financed, input.aprPercent, input.termMonths, 0),
    voluntaryTerminationPoint: totalPayable / 2,
  };
}
