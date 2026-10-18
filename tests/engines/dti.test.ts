import { describe, expect, it } from 'vitest';
import { calculateDti, validateDtiInput, type DtiInput } from '../../src/engines/dti';

/*
 * Expected values are plain division: front-end = housing ÷ income, back-end = all debts ÷ income.
 * Cross-check: CFPB example on consumerfinance.gov (ask-cfpb 1791): $2,000 debts on $6,000 income = 33%.
 */

const base: DtiInput = {
  grossMonthlyIncome: 6_000,
  housing: 1_500,
  carLoans: 400,
  studentLoans: 300,
  creditCards: 150,
  otherDebts: 0,
  targetPercent: 36,
};

describe('calculateDti', () => {
  it('works out front-end and back-end ratios', () => {
    const r = calculateDti(base);
    expect(r.frontEnd).toBeCloseTo(0.25, 10);
    expect(r.backEnd).toBeCloseTo(2_350 / 6_000, 10); // 39.17%
    expect(r.totalDebts).toBe(2_350);
  });

  it('matches the CFPB example: $2,000 of debts on $6,000 income is 33%', () => {
    const r = calculateDti({ ...base, housing: 1_500, carLoans: 100, studentLoans: 400, creditCards: 0 });
    expect(r.backEnd).toBeCloseTo(1 / 3, 10);
  });

  it('shows the debt to cut and the income needed to reach the target', () => {
    const r = calculateDti(base);
    expect(r.debtToCut).toBeCloseTo(2_350 - 0.36 * 6_000, 8); // $190
    expect(r.incomeNeeded).toBeCloseTo(2_350 / 0.36, 8); // $6,527.78
  });

  it('needs no cut when already under the target', () => {
    const r = calculateDti({ ...base, housing: 1_000, carLoans: 0, studentLoans: 0, creditCards: 0 });
    expect(r.debtToCut).toBe(0);
  });

  it('handles no debts at all', () => {
    const r = calculateDti({ ...base, housing: 0, carLoans: 0, studentLoans: 0, creditCards: 0 });
    expect(r.backEnd).toBe(0);
    expect(r.incomeNeeded).toBe(0);
  });

  it('allows a ratio above 100% when debts exceed income', () => {
    expect(calculateDti({ ...base, grossMonthlyIncome: 2_000 }).backEnd).toBeCloseTo(1.175, 10);
  });
});

describe('validateDtiInput', () => {
  it('rejects zero or empty income, negative debts and an out-of-range target', () => {
    const fields = validateDtiInput({ ...base, grossMonthlyIncome: 0, carLoans: -1, otherDebts: Number.NaN, targetPercent: 0 }).map(
      (e) => e.field,
    );
    expect(fields).toEqual(['grossMonthlyIncome', 'carLoans', 'otherDebts', 'targetPercent']);
  });

  it('throws instead of returning NaN', () => {
    expect(() => calculateDti({ ...base, grossMonthlyIncome: Number.NaN })).toThrow(RangeError);
  });
});
