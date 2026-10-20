/**
 * Roth IRA (US): how much you can contribute this year and what it could grow to by retirement.
 *   Limit = the yearly limit (+ catch-up from age 50), but no more than your taxable compensation, reduced
 *   by modified AGI with IRS Publication 590-A Worksheet 2-2: reduction = limit × (MAGI − start) ÷ width;
 *   the reduced limit is rounded up to the next $10 and is at least $200; nothing at the top of the range.
 *   Projection: the contribution you choose (capped at each year's limit, with catch-up once you reach 50)
 *   goes in monthly; the balance grows at the monthly equivalent of the yearly return. Limits, income and
 *   the return are held at today's values. Growth in a Roth IRA is tax-free if withdrawn under the rules.
 * Pure: limits are passed in.
 */
import { checkMoney, checkPercent, checkRange, type FieldError } from './validation';

export type RothFilingStatus = 'single' | 'headOfHousehold' | 'marriedJoint' | 'marriedSeparate';

export interface RothParams {
  contributionLimit: number;
  catchUp: number;
  catchUpAge: number;
  phaseOut: Record<'single' | 'marriedJoint' | 'marriedSeparate', { start: number; width: number }>;
  roundTo: number;
  reducedMinimum: number;
}

export interface RothInput {
  age: number;
  retirementAge: number;
  currentBalance: number;
  /** What you'd like to put in each year. */
  plannedContribution: number;
  status: RothFilingStatus;
  /** Modified AGI for Roth IRA purposes. */
  magi: number;
  /** Taxable compensation (wages, self-employment income). */
  compensation: number;
  returnPercent: number;
}

export interface RothYear {
  year: number;
  age: number;
  contribution: number;
  balance: number;
}

export interface RothResult {
  /** Your limit this year after the income phase-out. */
  allowedThisYear: number;
  /** Before the phase-out: yearly limit (+ catch-up), capped at compensation. */
  fullLimit: number;
  /** The phase-out reduced your limit. */
  reduced: boolean;
  /** What you'll actually contribute this year. */
  contributionThisYear: number;
  years: number;
  balance: number;
  totalContributions: number;
  /** Balance − starting balance − contributions. */
  growth: number;
  rows: RothYear[];
}

export function validateRothInput(input: RothInput): FieldError[] {
  const errors: FieldError[] = [];
  checkRange(errors, 'age', input.age, { min: 18, max: 90, integer: true, empty: 'Enter your age.', range: 'Enter an age between 18 and 90.' });
  checkRange(errors, 'retirementAge', input.retirementAge, { min: 19, max: 100, integer: true, empty: 'Enter the age you plan to retire.', range: 'Enter a retirement age between 19 and 100.' });
  if (Number.isInteger(input.age) && Number.isInteger(input.retirementAge) && input.retirementAge <= input.age) {
    errors.push({ field: 'retirementAge', message: 'Your retirement age must be after your current age.' });
  }
  checkMoney(errors, 'currentBalance', input.currentBalance, 100_000_000);
  checkMoney(errors, 'plannedContribution', input.plannedContribution, 1_000_000);
  if (!['single', 'headOfHousehold', 'marriedJoint', 'marriedSeparate'].includes(input.status)) errors.push({ field: 'status', message: 'Choose your filing status.' });
  checkMoney(errors, 'magi', input.magi, 100_000_000);
  checkMoney(errors, 'compensation', input.compensation, 100_000_000);
  checkPercent(errors, 'returnPercent', input.returnPercent, 30);
  return errors;
}

/** Roth IRA limit for one year (Pub 590-A Worksheet 2-2, with no other IRA contributions). */
export function rothLimit(age: number, status: RothFilingStatus, magi: number, compensation: number, p: RothParams): { allowed: number; full: number; reduced: boolean } {
  const full = Math.min(p.contributionLimit + (age >= p.catchUpAge ? p.catchUp : 0), compensation);
  const range = p.phaseOut[status === 'headOfHousehold' ? 'single' : status];
  const share = Math.min(1, Math.max(0, (magi - range.start) / range.width));
  if (share <= 0) return { allowed: full, full, reduced: false };
  if (share >= 1) return { allowed: 0, full, reduced: true };
  // Worksheet line 5 rounds the share to three places, line 8 rounds up to $10 with a $200 floor.
  const share3 = Math.round(share * 1000) / 1000;
  const reducedLimit = Math.max(p.reducedMinimum, Math.ceil((full - full * share3) / p.roundTo - 1e-9) * p.roundTo);
  return { allowed: Math.min(full, reducedLimit), full, reduced: true };
}

export function calculateRothIra(input: RothInput, p: RothParams): RothResult {
  const errors = validateRothInput(input);
  if (errors.length > 0) throw new RangeError(errors.map((e) => `${e.field}: ${e.message}`).join(' '));

  const now = rothLimit(input.age, input.status, input.magi, input.compensation, p);
  const monthlyRate = input.returnPercent === 0 ? 0 : Math.expm1(Math.log1p(input.returnPercent / 100) / 12);
  const years = input.retirementAge - input.age;
  let balance = input.currentBalance;
  let total = 0;
  const rows: RothYear[] = [];
  for (let y = 1; y <= years; y++) {
    const age = input.age + y - 1;
    const limit = rothLimit(age, input.status, input.magi, input.compensation, p).allowed;
    const contribution = Math.min(input.plannedContribution, limit);
    for (let m = 0; m < 12; m++) balance = balance * (1 + monthlyRate) + contribution / 12;
    total += contribution;
    rows.push({ year: y, age, contribution, balance });
  }

  return {
    allowedThisYear: now.allowed,
    fullLimit: now.full,
    reduced: now.reduced,
    contributionThisYear: Math.min(input.plannedContribution, now.allowed),
    years,
    balance,
    totalContributions: total,
    growth: balance - input.currentBalance - total,
    rows,
  };
}
