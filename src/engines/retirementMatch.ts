/**
 * 401(k) employer match (US): this year's contributions and match within IRS limits, and a projection to
 * retirement. Match = match rate × your contribution up to the match cap (% of pay). Limits are held at
 * today's values in the projection; contributions are added at the end of each year after growth.
 * Pure: limits are passed in.
 */
import { checkMoney, checkPercent, checkRange, type FieldError } from './validation';

export interface RetirementLimits {
  deferralLimit: number;
  catchUp: number;
  catchUpAge60to63: number;
  annualAdditionsLimit: number;
  compensationLimit: number;
}

export interface RetirementMatchInput {
  salary: number;
  /** Your contribution as % of pay. */
  contributionPercent: number;
  /** Employer pays this % of what you contribute… */
  matchRatePercent: number;
  /** …on contributions up to this % of pay. */
  matchCapPercent: number;
  age: number;
  currentBalance: number;
  retirementAge: number;
  returnPercent: number;
  salaryGrowthPercent: number;
}

export interface MatchYear {
  employee: number;
  match: number;
  /** Match you'd get by contributing up to the cap. */
  maxMatch: number;
  /** Your contribution was cut back to the IRS limit. */
  hitDeferralLimit: boolean;
}

export interface RetirementMatchResult {
  thisYear: MatchYear;
  /** Employer match you miss by contributing less than the cap. */
  missedMatch: number;
  years: number;
  balance: number;
  totalEmployee: number;
  totalMatch: number;
  growth: number;
  /** Balance if you contributed at least up to the match cap. */
  balanceAtFullMatch: number;
  rows: { year: number; age: number; employee: number; match: number; balance: number }[];
}

export function validateRetirementMatchInput(input: RetirementMatchInput): FieldError[] {
  const errors: FieldError[] = [];
  checkRange(errors, 'salary', input.salary, {
    min: 1,
    max: 10_000_000,
    empty: 'Enter your yearly salary.',
    range: 'Enter a salary between 1 and 10,000,000.',
  });
  checkPercent(errors, 'contributionPercent', input.contributionPercent, 100);
  checkPercent(errors, 'matchRatePercent', input.matchRatePercent, 200);
  checkPercent(errors, 'matchCapPercent', input.matchCapPercent, 100);
  checkRange(errors, 'age', input.age, {
    min: 16,
    max: 90,
    integer: true,
    empty: 'Enter your age.',
    range: 'Enter an age between 16 and 90.',
  });
  checkMoney(errors, 'currentBalance', input.currentBalance, 100_000_000);
  checkRange(errors, 'retirementAge', input.retirementAge, {
    min: 17,
    max: 100,
    integer: true,
    empty: 'Enter the age you plan to retire.',
    range: 'Enter a retirement age between 17 and 100.',
  });
  if (Number.isInteger(input.age) && Number.isInteger(input.retirementAge) && input.retirementAge <= input.age) {
    errors.push({ field: 'retirementAge', message: 'Your retirement age must be after your current age.' });
  }
  checkPercent(errors, 'returnPercent', input.returnPercent, 30);
  checkPercent(errors, 'salaryGrowthPercent', input.salaryGrowthPercent, 20);
  return errors;
}

/** Contributions and match for one year at a given salary and age. */
export function matchForYear(
  salary: number,
  contributionPercent: number,
  matchRatePercent: number,
  matchCapPercent: number,
  age: number,
  l: RetirementLimits,
): MatchYear {
  const pay = Math.min(salary, l.compensationLimit);
  const catchUp = age >= 60 && age <= 63 ? l.catchUpAge60to63 : age >= 50 ? l.catchUp : 0;
  const desired = (pay * contributionPercent) / 100;
  const employee = Math.min(desired, l.deferralLimit + catchUp);
  const matchedPercent = Math.min(contributionPercent, matchCapPercent);
  let match = (pay * matchedPercent * matchRatePercent) / 10_000;
  const maxMatch = (pay * matchCapPercent * matchRatePercent) / 10_000;
  // Annual additions (excluding catch-up) can't exceed the 415(c) limit.
  const regular = Math.min(employee, l.deferralLimit);
  match = Math.min(match, Math.max(0, l.annualAdditionsLimit - regular));
  return { employee, match, maxMatch: Math.min(maxMatch, Math.max(0, l.annualAdditionsLimit - regular)), hitDeferralLimit: desired > employee + 1e-9 };
}

function project(input: RetirementMatchInput, l: RetirementLimits, contributionPercent: number) {
  const r = input.returnPercent / 100;
  const g = input.salaryGrowthPercent / 100;
  let balance = input.currentBalance;
  let salary = input.salary;
  let totalEmployee = 0;
  let totalMatch = 0;
  const rows: RetirementMatchResult['rows'] = [];
  const years = input.retirementAge - input.age;
  for (let year = 1; year <= years; year++) {
    const age = input.age + year - 1;
    const y = matchForYear(salary, contributionPercent, input.matchRatePercent, input.matchCapPercent, age, l);
    balance = balance * (1 + r) + y.employee + y.match;
    totalEmployee += y.employee;
    totalMatch += y.match;
    rows.push({ year, age, employee: y.employee, match: y.match, balance });
    salary *= 1 + g;
  }
  return { balance, totalEmployee, totalMatch, rows, years };
}

export function calculateRetirementMatch(input: RetirementMatchInput, l: RetirementLimits): RetirementMatchResult {
  const errors = validateRetirementMatchInput(input);
  if (errors.length > 0) throw new RangeError(errors.map((e) => e.message).join(' '));

  const thisYear = matchForYear(input.salary, input.contributionPercent, input.matchRatePercent, input.matchCapPercent, input.age, l);
  const p = project(input, l, input.contributionPercent);
  const full = project(input, l, Math.max(input.contributionPercent, input.matchCapPercent));

  return {
    thisYear,
    missedMatch: Math.max(0, thisYear.maxMatch - thisYear.match),
    years: p.years,
    balance: p.balance,
    totalEmployee: p.totalEmployee,
    totalMatch: p.totalMatch,
    growth: p.balance - input.currentBalance - p.totalEmployee - p.totalMatch,
    balanceAtFullMatch: full.balance,
    rows: p.rows,
  };
}
