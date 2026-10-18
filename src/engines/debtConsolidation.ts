/**
 * Debt consolidation (US): current debts (debtPayoff engine) against one new loan (loan engine).
 * The origination fee is deducted from the loan proceeds, so the loan is sized to clear every balance:
 * loan = total balances ÷ (1 − fee%). Pure: no formatting, no country lookups.
 */
import { simulatePayoff, type DebtInput, type DebtPayoffResult } from './debtPayoff';
import { calculateLoan } from './loan';
import { checkPercent, checkRange, type FieldError } from './validation';

export const MAX_DEBTS = 10;
/** Per debt. Keeps the largest consolidation loan within the loan engine's limits. */
const MAX_BALANCE = 5_000_000;

export interface DebtConsolidationInput {
  /** Rows with a zero balance are ignored. */
  debts: DebtInput[];
  newAprPercent: number;
  newTermMonths: number;
  originationFeePercent: number;
}

export interface DebtConsolidationResult {
  current: DebtPayoffResult;
  totalBalance: number;
  currentMonthlyPayment: number;
  loanAmount: number;
  originationFee: number;
  newMonthlyPayment: number;
  newInterest: number;
  /** Positive = consolidating saves money; negative = it costs more. Interest and fees only. */
  savings: number;
  /** First month when interest saved has covered the fee, or null if it never does. */
  breakEvenMonth: number | null;
}

/** Field names for debt rows: balance-0, aprPercent-0, monthlyPayment-0, … */
export const debtField = (name: keyof DebtInput, index: number) => `${name}-${index}`;

export function activeDebts(debts: DebtInput[]): DebtInput[] {
  return debts.slice(0, MAX_DEBTS).filter((d) => d.balance > 0);
}

export function validateDebtConsolidationInput(input: DebtConsolidationInput): FieldError[] {
  const errors: FieldError[] = [];
  input.debts.slice(0, MAX_DEBTS).forEach((debt, i) => {
    if (debt.balance === 0) return; // empty row
    checkRange(errors, debtField('balance', i), debt.balance, {
      min: 0,
      max: MAX_BALANCE,
      empty: 'Enter a balance, or leave the row empty.',
      range: 'Enter a balance between 0 and 5,000,000.',
    });
    checkPercent(errors, debtField('aprPercent', i), debt.aprPercent);
    checkRange(errors, debtField('monthlyPayment', i), debt.monthlyPayment, {
      min: 1,
      max: MAX_BALANCE,
      empty: 'Enter the monthly payment.',
      range: 'Enter a monthly payment of at least 1.',
    });
  });
  if (activeDebts(input.debts).length === 0 && !errors.some((e) => e.field.startsWith('balance-'))) {
    errors.push({ field: debtField('balance', 0), message: 'Enter at least one debt balance.' });
  }
  checkPercent(errors, 'newAprPercent', input.newAprPercent);
  checkRange(errors, 'newTermMonths', input.newTermMonths, {
    min: 1,
    max: 360,
    integer: true,
    empty: 'Enter the new loan term.',
    range: 'Enter a term between 1 and 360 months.',
  });
  checkPercent(errors, 'originationFeePercent', input.originationFeePercent, 20);
  return errors;
}

export function calculateDebtConsolidation(input: DebtConsolidationInput): DebtConsolidationResult {
  const errors = validateDebtConsolidationInput(input);
  if (errors.length > 0) throw new RangeError(errors.map((e) => `${e.field}: ${e.message}`).join(' '));

  const debts = activeDebts(input.debts);
  const current = simulatePayoff(debts);
  const totalBalance = debts.reduce((sum, d) => sum + d.balance, 0);
  const currentMonthlyPayment = debts.reduce((sum, d) => sum + d.monthlyPayment, 0);

  const fee = input.originationFeePercent / 100;
  const loanAmount = totalBalance / (1 - fee);
  const originationFee = loanAmount - totalBalance;
  const loan = calculateLoan({ principal: loanAmount, aprPercent: input.newAprPercent, termMonths: input.newTermMonths });

  // Break-even: first month where cumulative interest avoided covers the fee.
  let breakEvenMonth: number | null = null;
  if (current.feasible) {
    let saved = -originationFee;
    const horizon = Math.max(current.monthlyInterest.length, loan.schedule.length);
    for (let m = 0; m < horizon; m++) {
      saved += (current.monthlyInterest[m] ?? 0) - (loan.schedule[m]?.interest ?? 0);
      if (saved >= -1e-9) {
        breakEvenMonth = m + 1;
        break;
      }
    }
  }

  return {
    current,
    totalBalance,
    currentMonthlyPayment,
    loanAmount,
    originationFee,
    newMonthlyPayment: loan.monthlyPayment,
    newInterest: loan.totalInterest,
    savings: current.totalInterest - (loan.totalInterest + originationFee),
    breakEvenMonth,
  };
}
