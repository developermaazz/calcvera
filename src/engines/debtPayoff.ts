/**
 * Paying off debts at fixed monthly payments: several debts each on its own (no snowball), or one credit
 * card by a fixed payment or a target number of months. Monthly rate = APR / 12; no new spending.
 * Pure: no formatting, no country lookups.
 */
import { calculateLoan, fixedPaymentSchedule, type LoanScheduleRow } from './loan';
import { checkRange, type FieldError } from './validation';

export interface DebtInput {
  balance: number;
  aprPercent: number;
  monthlyPayment: number;
}

export interface DebtPayoffLine {
  months: number;
  interest: number;
  /** False if the payment never clears the balance. */
  feasible: boolean;
}

export interface DebtPayoffResult {
  /** All debts can be paid off at these payments. */
  feasible: boolean;
  /** Months until the last debt is paid off. */
  months: number;
  totalInterest: number;
  /** Interest across all debts in month 1, 2, 3, … (for break-even comparisons). */
  monthlyInterest: number[];
  perDebt: DebtPayoffLine[];
}

/** Safety cap: 100 years. */
export const MAX_PAYOFF_MONTHS = 1200;

export function simulatePayoff(debts: DebtInput[]): DebtPayoffResult {
  const monthlyInterest: number[] = [];
  const perDebt: DebtPayoffLine[] = [];

  for (const debt of debts) {
    const r = debt.aprPercent / 100 / 12;
    let balance = debt.balance;
    let interestTotal = 0;
    let month = 0;
    // A payment at or below the first month's interest never reduces the balance.
    const feasible = debt.balance <= 0 || debt.monthlyPayment > debt.balance * r;

    while (feasible && balance > 1e-9 && month < MAX_PAYOFF_MONTHS) {
      const interest = balance * r;
      const payment = Math.min(debt.monthlyPayment, balance + interest);
      balance = balance + interest - payment;
      interestTotal += interest;
      monthlyInterest[month] = (monthlyInterest[month] ?? 0) + interest;
      month += 1;
    }

    perDebt.push({ months: month, interest: interestTotal, feasible: feasible && balance <= 1e-9 });
  }

  return {
    feasible: perDebt.every((d) => d.feasible),
    months: Math.max(0, ...perDebt.map((d) => d.months)),
    totalInterest: perDebt.reduce((sum, d) => sum + d.interest, 0),
    monthlyInterest: Array.from(monthlyInterest, (v) => v ?? 0),
    perDebt,
  };
}

// ---------- One credit card ----------

export type CardPayoffMode = 'payment' | 'months';

export interface CardPayoffInput {
  balance: number;
  aprPercent: number;
  /** Pay a fixed amount, or clear the card in a set number of months. */
  mode: CardPayoffMode;
  monthlyPayment: number;
  targetMonths: number;
}

export interface CardPayoffResult {
  monthlyPayment: number;
  months: number;
  totalInterest: number;
  totalPaid: number;
  /** Interest charged in the first month: a payment must be above this to reduce the balance. */
  firstMonthInterest: number;
  schedule: LoanScheduleRow[];
}

export const CARD_LIMITS = { balance: 10_000_000, months: 600 } as const;

export function validateCardPayoffInput(input: CardPayoffInput): FieldError[] {
  const errors: FieldError[] = [];
  checkRange(errors, 'balance', input.balance, {
    min: 1,
    max: CARD_LIMITS.balance,
    empty: 'Enter your card balance.',
    range: 'Enter a balance between 1 and 10,000,000.',
  });
  checkRange(errors, 'aprPercent', input.aprPercent, {
    min: 0,
    max: 100,
    empty: 'Enter the interest rate (APR).',
    range: 'Enter an APR between 0% and 100%.',
  });
  if (input.mode === 'months') {
    checkRange(errors, 'targetMonths', input.targetMonths, {
      min: 1,
      max: CARD_LIMITS.months,
      integer: true,
      empty: 'Enter how many months you want to take.',
      range: 'Enter between 1 and 600 months.',
    });
  } else {
    checkRange(errors, 'monthlyPayment', input.monthlyPayment, {
      min: 1,
      max: CARD_LIMITS.balance,
      empty: 'Enter your monthly payment.',
      range: 'Enter a monthly payment of at least 1.',
    });
    const balanceOk = Number.isFinite(input.balance) && input.balance > 0;
    if (balanceOk && Number.isFinite(input.aprPercent) && errors.length === 0) {
      const interest = (input.balance * input.aprPercent) / 1200;
      if (input.monthlyPayment <= interest) {
        errors.push({ field: 'monthlyPayment', message: 'This payment does not cover the monthly interest, so the balance never goes down.' });
      } else if (fixedPaymentMonths(input.balance, input.aprPercent, input.monthlyPayment) > MAX_PAYOFF_MONTHS) {
        errors.push({ field: 'monthlyPayment', message: 'At this payment the card would take more than 100 years to clear.' });
      }
    }
  }
  return errors;
}

/** Months to clear a balance at a fixed payment (closed form), or Infinity if the payment never clears it. */
export function fixedPaymentMonths(balance: number, aprPercent: number, payment: number): number {
  const r = aprPercent / 1200;
  if (r === 0) return Math.ceil(balance / payment - 1e-9);
  if (payment <= balance * r) return Number.POSITIVE_INFINITY;
  return Math.ceil(-Math.log(1 - (balance * r) / payment) / Math.log1p(r) - 1e-9);
}

export function calculateCardPayoff(input: CardPayoffInput): CardPayoffResult {
  const errors = validateCardPayoffInput(input);
  if (errors.length > 0) throw new RangeError(errors.map((e) => e.message).join(' '));

  const r = input.aprPercent / 1200;
  const firstMonthInterest = input.balance * r;

  if (input.mode === 'months') {
    // Same maths as an amortising loan over the target term.
    const loan = calculateLoan({ principal: input.balance, aprPercent: input.aprPercent, termMonths: input.targetMonths });
    return {
      monthlyPayment: loan.monthlyPayment,
      months: loan.payoffMonths,
      totalInterest: loan.totalInterest,
      totalPaid: loan.totalCost,
      firstMonthInterest,
      schedule: loan.schedule,
    };
  }

  const schedule = fixedPaymentSchedule(input.balance, input.aprPercent, input.monthlyPayment, MAX_PAYOFF_MONTHS);
  const totalInterest = schedule.reduce((sum, row) => sum + row.interest, 0);

  return {
    monthlyPayment: input.monthlyPayment,
    months: schedule.length,
    totalInterest,
    totalPaid: input.balance + totalInterest,
    firstMonthInterest,
    schedule,
  };
}
