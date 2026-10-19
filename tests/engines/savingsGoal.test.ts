import { describe, expect, it } from 'vitest';
import { calculateSavingsGoal, goalUnreachable, monthsToGoal, validateSavingsGoalInput, type SavingsGoalInput } from '../../src/engines/savingsGoal';

/*
 * OUTSIDE CHECK (calculator.net investment calculator, rate compounded annually with end-of-month
 * contributions, which is the same as our APY/AER method; 20 Oct 2026):
 *   1. Goal $25,000, have $5,000, 4.5%, 3 years → $502.26 a month; contributions $18,081.44; interest
 *      $1,918.56 (all exact)
 *   2. Goal $10,000, have $0, 5%, 2 years → $397.48 a month; interest $460.59 (exact)
 *   3. Goal $50,000, have $2,000, $500 a month, 4% → 6.889 years, i.e. month 83 (exact). They make a smaller
 *      final deposit to land on $50,000; we show the full 83rd deposit, so our end balance is $50,219.88.
 */

const deposit: SavingsGoalInput = { goal: 25_000, currentSavings: 5_000, ratePercent: 4.5, mode: 'deposit', years: 3, monthlyDeposit: 0 };
const time: SavingsGoalInput = { goal: 50_000, currentSavings: 2_000, ratePercent: 4, mode: 'time', years: 0, monthlyDeposit: 500 };

describe('deposit needed', () => {
  it('outside check 1', () => {
    const r = calculateSavingsGoal(deposit);
    expect(r.monthlyDeposit).toBeCloseTo(502.26, 2);
    expect(r.totalDeposits).toBeCloseTo(18_081.44, 2);
    expect(r.interest).toBeCloseTo(1_918.56, 2);
    expect(r.finalBalance).toBeCloseTo(25_000, 6);
    expect(r.months).toBe(36);
  });

  it('outside check 2: starting from zero', () => {
    const r = calculateSavingsGoal({ ...deposit, goal: 10_000, currentSavings: 0, ratePercent: 5, years: 2 });
    expect(r.monthlyDeposit).toBeCloseTo(397.48, 2);
    expect(r.interest).toBeCloseTo(460.59, 2);
  });

  it('0% rate: the shortfall split evenly over the months', () => {
    const r = calculateSavingsGoal({ ...deposit, ratePercent: 0 });
    expect(r.monthlyDeposit).toBeCloseTo(20_000 / 36, 10);
    expect(r.interest).toBe(0);
  });

  it('one month minimum; decimals in years round to whole months', () => {
    expect(calculateSavingsGoal({ ...deposit, years: 1 / 12 }).months).toBe(1);
    expect(calculateSavingsGoal({ ...deposit, years: 2.5 }).months).toBe(30);
  });

  it('current savings that grow past the goal need no deposit', () => {
    const r = calculateSavingsGoal({ ...deposit, goal: 5_500, years: 5 });
    expect(r.noDepositNeeded).toBe(true);
    expect(r.monthlyDeposit).toBe(0);
    expect(r.months).toBe(monthsToGoal(5_500, 5_000, 0, Math.pow(1.045, 1 / 12) - 1));
    expect(r.finalBalance).toBeGreaterThanOrEqual(5_500);
  });

  it('a goal already covered needs nothing', () => {
    const r = calculateSavingsGoal({ ...deposit, currentSavings: 30_000 });
    expect(r.alreadyThere).toBe(true);
    expect(r.months).toBe(0);
  });
});

describe('time to reach the goal', () => {
  it('outside check 3: month 83', () => {
    const r = calculateSavingsGoal(time);
    expect(r.months).toBe(83);
    expect(r.totalDeposits).toBe(41_500);
    expect(r.finalBalance).toBeCloseTo(50_219.88, 2);
    expect(r.finalBalance).toBeGreaterThanOrEqual(50_000);
  });

  it('0% rate rounds up to whole months', () => {
    expect(calculateSavingsGoal({ ...time, ratePercent: 0 }).months).toBe(96);
  });

  it('no deposits: interest alone, or never', () => {
    const alone = calculateSavingsGoal({ ...time, monthlyDeposit: 0, currentSavings: 40_000 });
    expect(alone.months).toBe(monthsToGoal(50_000, 40_000, 0, Math.pow(1.04, 1 / 12) - 1));
    expect(alone.finalBalance).toBeGreaterThanOrEqual(50_000);
    expect(goalUnreachable({ ...time, monthlyDeposit: 0, currentSavings: 0 })).toBe(true);
    expect(goalUnreachable({ ...time, monthlyDeposit: 0, ratePercent: 0 })).toBe(true);
    expect(goalUnreachable(time)).toBe(false);
    expect(() => calculateSavingsGoal({ ...time, monthlyDeposit: 0, ratePercent: 0 })).toThrow(RangeError);
  });

  it('large values stay finite', () => {
    const r = calculateSavingsGoal({ ...time, goal: 100_000_000, monthlyDeposit: 10_000_000, ratePercent: 30 });
    expect(Number.isFinite(r.finalBalance)).toBe(true);
  });
});

describe('validateSavingsGoalInput', () => {
  it('checks only the fields the chosen mode uses', () => {
    expect(validateSavingsGoalInput({ ...deposit, monthlyDeposit: Number.NaN })).toEqual([]);
    expect(validateSavingsGoalInput({ ...time, years: Number.NaN })).toEqual([]);
    const fields = validateSavingsGoalInput({ ...deposit, goal: 0, currentSavings: -1, ratePercent: 40, years: 0 }).map((e) => e.field);
    expect(fields).toEqual(['goal', 'currentSavings', 'ratePercent', 'years']);
    expect(validateSavingsGoalInput({ ...time, monthlyDeposit: Number.NaN }).map((e) => e.field)).toEqual(['monthlyDeposit']);
  });
});
