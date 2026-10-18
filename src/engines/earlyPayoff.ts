/**
 * Paying off an existing loan early (US personal loans): compares the current payment with the same
 * payment plus a monthly extra and/or a one-time lump sum paid now, net of any prepayment penalty.
 * Monthly rate = APR / 12; extra money goes straight to principal. Pure: no formatting, no country lookups.
 */
import { fixedPaymentMonths } from './debtPayoff';
import { fixedPaymentSchedule, type LoanScheduleRow } from './loan';
import { checkMoney, checkRange, type FieldError } from './validation';

export interface EarlyPayoffInput {
  /** Amount still owed today. */
  balance: number;
  aprPercent: number;
  /** Your required monthly payment. */
  monthlyPayment: number;
  /** Extra paid on top of the required payment each month. */
  extraMonthly: number;
  /** One-time extra payment made now. */
  lumpSum: number;
  /** Fee charged for paying early, if your loan has one. */
  prepaymentPenalty: number;
}

export interface EarlyPayoffResult {
  currentMonths: number;
  currentInterest: number;
  newMonths: number;
  newInterest: number;
  monthsSaved: number;
  interestSaved: number;
  /** Interest saved minus the prepayment penalty. Negative = paying early costs more. */
  netSavings: number;
  firstMonthInterest: number;
  /** Payments under the new plan (empty if the lump sum clears the loan). */
  schedule: LoanScheduleRow[];
}

const MAX_MONTHS = 600;
const sumInterest = (rows: LoanScheduleRow[]) => rows.reduce((s, r) => s + r.interest, 0);

export function validateEarlyPayoffInput(input: EarlyPayoffInput): FieldError[] {
  const errors: FieldError[] = [];
  checkRange(errors, 'balance', input.balance, {
    min: 1,
    max: 10_000_000,
    empty: 'Enter how much you still owe.',
    range: 'Enter a balance between 1 and 10,000,000.',
  });
  checkRange(errors, 'aprPercent', input.aprPercent, {
    min: 0,
    max: 100,
    empty: 'Enter the interest rate (APR).',
    range: 'Enter an APR between 0% and 100%.',
  });
  checkRange(errors, 'monthlyPayment', input.monthlyPayment, {
    min: 1,
    max: 10_000_000,
    empty: 'Enter your monthly payment.',
    range: 'Enter a monthly payment of at least 1.',
  });
  checkMoney(errors, 'extraMonthly', input.extraMonthly, 10_000_000);
  checkMoney(errors, 'lumpSum', input.lumpSum, 10_000_000);
  checkMoney(errors, 'prepaymentPenalty', input.prepaymentPenalty, 1_000_000);

  if (errors.length === 0) {
    if (input.lumpSum > input.balance) {
      errors.push({ field: 'lumpSum', message: 'The one-time payment is more than you owe.' });
    }
    if (input.monthlyPayment <= (input.balance * input.aprPercent) / 1200) {
      errors.push({ field: 'monthlyPayment', message: 'This payment does not cover the monthly interest, so the balance never goes down.' });
    } else if (fixedPaymentMonths(input.balance, input.aprPercent, input.monthlyPayment) > MAX_MONTHS) {
      errors.push({ field: 'monthlyPayment', message: 'At this payment the loan would take more than 50 years to repay. Check the payment and balance.' });
    }
  }
  return errors;
}

export function calculateEarlyPayoff(input: EarlyPayoffInput): EarlyPayoffResult {
  const errors = validateEarlyPayoffInput(input);
  if (errors.length > 0) throw new RangeError(errors.map((e) => e.message).join(' '));

  const current = fixedPaymentSchedule(input.balance, input.aprPercent, input.monthlyPayment, MAX_MONTHS);
  const remaining = input.balance - input.lumpSum;
  const schedule =
    remaining > 1e-9 ? fixedPaymentSchedule(remaining, input.aprPercent, input.monthlyPayment + input.extraMonthly, MAX_MONTHS) : [];

  const currentInterest = sumInterest(current);
  const newInterest = sumInterest(schedule);
  const interestSaved = currentInterest - newInterest;
  const changed = input.extraMonthly > 0 || input.lumpSum > 0;

  return {
    currentMonths: current.length,
    currentInterest,
    newMonths: schedule.length,
    newInterest,
    monthsSaved: current.length - schedule.length,
    interestSaved,
    netSavings: interestSaved - (changed ? input.prepaymentPenalty : 0),
    firstMonthInterest: (input.balance * input.aprPercent) / 1200,
    schedule,
  };
}
