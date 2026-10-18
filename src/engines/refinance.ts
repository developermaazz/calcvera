/**
 * Auto loan refinance (US): the rest of the current loan against a new loan for the same balance, with fees
 * paid up front or added to the new loan. Monthly rate = APR / 12. Pure: no formatting, no country lookups.
 */
import { calculateLoan, monthlyPayment } from './loan';
import { checkMoney, checkPercent, checkRange, type FieldError } from './validation';

export interface RefinanceInput {
  /** Payoff balance on the current loan. */
  balance: number;
  currentAprPercent: number;
  /** Payments left on the current loan. */
  remainingMonths: number;
  newAprPercent: number;
  newTermMonths: number;
  /** Lender, title and registration fees for the new loan. */
  fees: number;
  /** True if the fees are added to the new loan instead of paid up front. */
  feesInLoan: boolean;
}

export interface RefinanceResult {
  currentPayment: number;
  currentInterest: number;
  newLoanAmount: number;
  newPayment: number;
  newInterest: number;
  /** Current payment − new payment (negative = the new payment is higher). */
  monthlySaving: number;
  /** Total still to pay now − total with the new loan (including fees). Negative = refinancing costs more. */
  totalSaving: number;
  /** First month when interest saved covers the fees, or null if it never does. */
  breakEvenMonth: number | null;
}

export function validateRefinanceInput(input: RefinanceInput): FieldError[] {
  const errors: FieldError[] = [];
  checkRange(errors, 'balance', input.balance, {
    min: 100,
    max: 5_000_000,
    empty: 'Enter the payoff balance on your current loan.',
    range: 'Enter a balance between 100 and 5,000,000.',
  });
  checkPercent(errors, 'currentAprPercent', input.currentAprPercent);
  checkRange(errors, 'remainingMonths', input.remainingMonths, {
    min: 1,
    max: 120,
    integer: true,
    empty: 'Enter how many payments are left.',
    range: 'Enter between 1 and 120 months.',
  });
  checkPercent(errors, 'newAprPercent', input.newAprPercent);
  checkRange(errors, 'newTermMonths', input.newTermMonths, {
    min: 1,
    max: 120,
    integer: true,
    empty: 'Enter the new loan term.',
    range: 'Enter between 1 and 120 months.',
  });
  checkMoney(errors, 'fees', input.fees, 1_000_000);
  return errors;
}

export function calculateRefinance(input: RefinanceInput): RefinanceResult {
  const errors = validateRefinanceInput(input);
  if (errors.length > 0) throw new RangeError(errors.map((e) => e.message).join(' '));

  const current = calculateLoan({ principal: input.balance, aprPercent: input.currentAprPercent, termMonths: input.remainingMonths });
  const newLoanAmount = input.balance + (input.feesInLoan ? input.fees : 0);
  const next = calculateLoan({ principal: newLoanAmount, aprPercent: input.newAprPercent, termMonths: input.newTermMonths });
  const upfront = input.feesInLoan ? 0 : input.fees;

  // Break-even: cumulative interest avoided minus the fees (rolled-in fees are already in the new interest).
  let breakEvenMonth: number | null = null;
  let saved = -upfront - (input.feesInLoan ? input.fees : 0);
  const horizon = Math.max(current.schedule.length, next.schedule.length);
  for (let m = 0; m < horizon; m++) {
    saved += (current.schedule[m]?.interest ?? 0) - (next.schedule[m]?.interest ?? 0);
    if (saved >= -1e-9) {
      breakEvenMonth = m + 1;
      break;
    }
  }

  return {
    currentPayment: monthlyPayment(input.balance, input.currentAprPercent, input.remainingMonths),
    currentInterest: current.totalInterest,
    newLoanAmount,
    newPayment: next.monthlyPayment,
    newInterest: next.totalInterest,
    monthlySaving: current.monthlyPayment - next.monthlyPayment,
    totalSaving: current.totalCost - (next.totalCost + upfront),
    breakEvenMonth,
  };
}
