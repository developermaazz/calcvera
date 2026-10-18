/**
 * UK statutory redundancy pay. Counts back from the redundancy date: each full year of service earns
 * weeks of pay by the employee's age at the start of that year (Employment Rights Act 1996 s162,
 * NI equivalent), up to maxYearsCounted, with weekly pay capped. Pure: figures are passed in.
 */
import { checkMoney, checkRange, type FieldError } from './validation';

export interface RedundancyParams {
  weeklyPayCap: number;
  minYearsService: number;
  maxYearsCounted: number;
  /** Sorted by fromAge. */
  ageBands: { fromAge: number; weeksPerYear: number }[];
  taxFreeLimit: number;
}

export interface RedundancyInput {
  /** Age at the redundancy date, in whole years. */
  age: number;
  /** Full years of continuous service. */
  yearsOfService: number;
  /** Weekly pay before tax. */
  weeklyPay: number;
}

export interface RedundancyYear {
  /** 1 = the most recent year of service. */
  yearsBack: number;
  ageAtStart: number;
  weeks: number;
}

export interface RedundancyResult {
  eligible: boolean;
  yearsCounted: number;
  weeks: number;
  weeklyPayUsed: number;
  weeklyPayCapped: boolean;
  amount: number;
  /** Part of the statutory payment that is tax-free. */
  taxFree: number;
  rows: RedundancyYear[];
}

export function validateRedundancyInput(input: RedundancyInput): FieldError[] {
  const errors: FieldError[] = [];
  checkRange(errors, 'age', input.age, {
    min: 16,
    max: 100,
    integer: true,
    empty: 'Enter your age.',
    range: 'Enter an age between 16 and 100.',
  });
  checkRange(errors, 'yearsOfService', input.yearsOfService, {
    min: 0,
    max: 84,
    integer: true,
    empty: 'Enter your full years of service.',
    range: 'Enter full years of service of 0 or more.',
  });
  if (Number.isInteger(input.age) && Number.isInteger(input.yearsOfService) && input.yearsOfService >= input.age) {
    errors.push({ field: 'yearsOfService', message: 'Years of service must be less than your age.' });
  }
  checkMoney(errors, 'weeklyPay', input.weeklyPay, 1_000_000);
  return errors;
}

export function weeksForAge(ageAtStart: number, bands: RedundancyParams['ageBands']): number {
  let weeks = 0;
  for (const band of bands) if (ageAtStart >= band.fromAge) weeks = band.weeksPerYear;
  return weeks;
}

export function calculateRedundancyPay(input: RedundancyInput, params: RedundancyParams): RedundancyResult {
  const errors = validateRedundancyInput(input);
  if (errors.length > 0) throw new RangeError(errors.map((e) => e.message).join(' '));

  const eligible = input.yearsOfService >= params.minYearsService;
  const yearsCounted = eligible ? Math.min(input.yearsOfService, params.maxYearsCounted) : 0;
  const rows: RedundancyYear[] = [];
  for (let k = 1; k <= yearsCounted; k++) {
    const ageAtStart = input.age - k;
    rows.push({ yearsBack: k, ageAtStart, weeks: weeksForAge(ageAtStart, params.ageBands) });
  }

  const weeks = rows.reduce((sum, r) => sum + r.weeks, 0);
  const weeklyPayUsed = Math.min(input.weeklyPay, params.weeklyPayCap);
  const amount = weeks * weeklyPayUsed;

  return {
    eligible,
    yearsCounted,
    weeks,
    weeklyPayUsed,
    weeklyPayCapped: input.weeklyPay > params.weeklyPayCap,
    amount,
    taxFree: Math.min(amount, params.taxFreeLimit),
    rows,
  };
}
