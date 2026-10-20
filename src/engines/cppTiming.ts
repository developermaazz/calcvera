/**
 * CPP retirement pension by start age (Canada). Starting before 65 lowers the monthly pension by
 * earlyReductionPerMonth for each month before 65; starting after 65 raises it by lateIncreasePerMonth for each
 * month after 65. Amounts are in today's dollars (CPP is indexed to inflation). Pure: figures are passed in.
 */
import type { CaCppConfig } from '../countries/types';
import { checkRange, type FieldError } from './validation';

export interface CppTimingInput {
  /** Monthly pension at 65 (from your Statement of Contributions, or an estimate). */
  pensionAt65: number;
  startAge: number;
  /** Age to total payments up to. */
  lifeExpectancy: number;
}

export type CppParams = Pick<CaCppConfig, 'earlyReductionPerMonth' | 'lateIncreasePerMonth' | 'earliestAge' | 'latestAge' | 'maxMonthlyAt65'>;

export interface CppAgeRow {
  age: number;
  monthly: number;
  /** Change from the pension at 65, as a decimal (−0.36 at 60). */
  adjustment: number;
  totalByLifeExpectancy: number;
}

export interface CppTimingResult {
  monthly: number;
  yearly: number;
  adjustment: number;
  /** Age when total payments from startAge catch up with (or fall behind) starting at 65; null at 65. */
  breakEvenVs65: number | null;
  totalByLifeExpectancy: number;
  totalAt65ByLifeExpectancy: number;
  rows: CppAgeRow[];
}

export function cppAdjustment(age: number, p: CppParams): number {
  const months = Math.round((age - 65) * 12);
  return months < 0 ? months * p.earlyReductionPerMonth : months * p.lateIncreasePerMonth;
}

export function validateCppTimingInput(input: CppTimingInput, p: CppParams): FieldError[] {
  const errors: FieldError[] = [];
  checkRange(errors, 'pensionAt65', input.pensionAt65, {
    min: 1,
    max: p.maxMonthlyAt65,
    empty: 'Enter your estimated monthly pension at 65.',
    range: 'Enter an amount up to the maximum pension at 65.',
  });
  checkRange(errors, 'startAge', input.startAge, {
    min: p.earliestAge,
    max: p.latestAge,
    integer: true,
    empty: 'Enter the age you’ll start your pension.',
    range: `Enter an age from ${p.earliestAge} to ${p.latestAge}.`,
  });
  checkRange(errors, 'lifeExpectancy', input.lifeExpectancy, {
    min: p.earliestAge + 1,
    max: 110,
    integer: true,
    empty: 'Enter an age to compare totals at.',
    range: `Enter an age from ${p.earliestAge + 1} to 110.`,
  });
  return errors;
}

const total = (monthly: number, start: number, until: number) => monthly * Math.max(0, until - start) * 12;

export function calculateCppTiming(input: CppTimingInput, p: CppParams): CppTimingResult {
  const errors = validateCppTimingInput(input, p);
  if (errors.length > 0) throw new RangeError(errors.map((e) => `${e.field}: ${e.message}`).join(' '));
  const at = (age: number) => input.pensionAt65 * (1 + cppAdjustment(age, p));
  const monthly = at(input.startAge);
  const m65 = input.pensionAt65;
  // m × (x − a) = m65 × (x − 65)  →  x = (m × a − m65 × 65) ÷ (m − m65)
  const breakEvenVs65 = input.startAge === 65 ? null : (monthly * input.startAge - m65 * 65) / (monthly - m65);
  const rows: CppAgeRow[] = [];
  for (let age = p.earliestAge; age <= p.latestAge; age++) {
    rows.push({ age, monthly: at(age), adjustment: cppAdjustment(age, p), totalByLifeExpectancy: total(at(age), age, input.lifeExpectancy) });
  }
  return {
    monthly,
    yearly: monthly * 12,
    adjustment: cppAdjustment(input.startAge, p),
    breakEvenVs65,
    totalByLifeExpectancy: total(monthly, input.startAge, input.lifeExpectancy),
    totalAt65ByLifeExpectancy: total(m65, 65, input.lifeExpectancy),
    rows,
  };
}
