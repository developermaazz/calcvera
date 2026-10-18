/** Debt-to-income ratios (US). Pure: monthly amounts in, ratios out. */
import { checkMoney, checkRange, type FieldError } from './validation';

export interface DtiInput {
  grossMonthlyIncome: number;
  /** Rent, or mortgage payment including property tax and insurance. */
  housing: number;
  carLoans: number;
  studentLoans: number;
  /** Minimum payments, not the full balance. */
  creditCards: number;
  otherDebts: number;
  /** Back-end ratio to aim for, e.g. 36 for 36%. */
  targetPercent: number;
}

export interface DtiResult {
  /** Housing ÷ income, as a decimal. */
  frontEnd: number;
  /** All monthly debts ÷ income, as a decimal. */
  backEnd: number;
  totalDebts: number;
  /** Monthly debt payments to cut to reach the target ratio (0 if already at or below it). */
  debtToCut: number;
  /** Gross monthly income needed to reach the target with today's debts. */
  incomeNeeded: number;
}

export function validateDtiInput(input: DtiInput): FieldError[] {
  const errors: FieldError[] = [];
  checkRange(errors, 'grossMonthlyIncome', input.grossMonthlyIncome, {
    min: 1,
    max: 10_000_000,
    empty: 'Enter your gross monthly income.',
    range: 'Enter an income between 1 and 10,000,000.',
  });
  for (const field of ['housing', 'carLoans', 'studentLoans', 'creditCards', 'otherDebts'] as const) {
    checkMoney(errors, field, input[field], 10_000_000);
  }
  checkRange(errors, 'targetPercent', input.targetPercent, {
    min: 1,
    max: 100,
    empty: 'Enter a target ratio.',
    range: 'Enter a target between 1% and 100%.',
  });
  return errors;
}

export function calculateDti(input: DtiInput): DtiResult {
  const errors = validateDtiInput(input);
  if (errors.length > 0) throw new RangeError(errors.map((e) => e.message).join(' '));

  const income = input.grossMonthlyIncome;
  const totalDebts = input.housing + input.carLoans + input.studentLoans + input.creditCards + input.otherDebts;
  const target = input.targetPercent / 100;

  return {
    frontEnd: input.housing / income,
    backEnd: totalDebts / income,
    totalDebts,
    debtToCut: Math.max(0, totalDebts - target * income),
    incomeNeeded: totalDebts / target,
  };
}
