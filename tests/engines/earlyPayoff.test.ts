import { describe, expect, it } from 'vitest';
import { calculateEarlyPayoff, validateEarlyPayoffInput, type EarlyPayoffInput } from '../../src/engines/earlyPayoff';
import { fixedPaymentSchedule } from '../../src/engines/loan';

/*
 * OUTSIDE CHECK (calculator.net credit card calculator, fixed payment, 18 Oct 2026):
 *   1. 42 months, $2,617.95   2. 31 months, $1,923.97   3. $10,000 at $350: 34 months, $1,740.77
 *   Months match exactly; interest within 42 cents (monthly cent rounding there).
 *
 * Expected values from an independent month-by-month script (monthly rate = APR / 12, extra to principal).
 * External cross-checks (calculator.net loan payoff calculator, or Bankrate's early payoff calculator):
 *   1. $12,000 left at 11.5% paying $350 → 42 months, $2,618.25 interest
 *   2. Same loan with $100 extra a month → 31 months, $1,924.08 interest
 *   3. Same loan with a $2,000 lump sum now → 34 months, $1,741.19 interest
 */

const base: EarlyPayoffInput = {
  balance: 12_000,
  aprPercent: 11.5,
  monthlyPayment: 350,
  extraMonthly: 100,
  lumpSum: 0,
  prepaymentPenalty: 0,
};

describe('calculateEarlyPayoff', () => {
  it('$100 extra a month on $12,000 at 11.5%', () => {
    const r = calculateEarlyPayoff(base);
    expect(r.currentMonths).toBe(42);
    expect(r.currentInterest).toBeCloseTo(2_618.25, 2);
    expect(r.newMonths).toBe(31);
    expect(r.newInterest).toBeCloseTo(1_924.08, 2);
    expect(r.monthsSaved).toBe(11);
    expect(r.interestSaved).toBeCloseTo(694.17, 2);
    expect(r.netSavings).toBeCloseTo(694.17, 2);
  });

  it('a $2,000 lump sum now, no extra monthly', () => {
    const r = calculateEarlyPayoff({ ...base, extraMonthly: 0, lumpSum: 2_000 });
    expect(r.newMonths).toBe(34);
    expect(r.newInterest).toBeCloseTo(1_741.19, 2);
    expect(r.interestSaved).toBeCloseTo(877.06, 2);
  });

  it('lump sum and extra monthly together', () => {
    const r = calculateEarlyPayoff({ ...base, lumpSum: 2_000 });
    expect(r.newMonths).toBe(26);
    expect(r.newInterest).toBeCloseTo(1_299.15, 2);
  });

  it('a prepayment penalty comes off the saving', () => {
    const r = calculateEarlyPayoff({ ...base, prepaymentPenalty: 250 });
    expect(r.netSavings).toBeCloseTo(694.17 - 250, 2);
    expect(calculateEarlyPayoff({ ...base, prepaymentPenalty: 1_000 }).netSavings).toBeLessThan(0);
  });

  it('no extra and no lump sum: nothing saved, and no penalty applied', () => {
    const r = calculateEarlyPayoff({ ...base, extraMonthly: 0, prepaymentPenalty: 300 });
    expect(r.monthsSaved).toBe(0);
    expect(r.interestSaved).toBe(0);
    expect(r.netSavings).toBe(0);
  });

  it('a lump sum equal to the balance clears the loan today', () => {
    const r = calculateEarlyPayoff({ ...base, lumpSum: 12_000 });
    expect(r.newMonths).toBe(0);
    expect(r.newInterest).toBe(0);
    expect(r.interestSaved).toBeCloseTo(2_618.25, 2);
  });

  it('0% APR: only time is saved', () => {
    const r = calculateEarlyPayoff({ ...base, balance: 6_000, aprPercent: 0, monthlyPayment: 250, extraMonthly: 50 });
    expect(r.currentMonths).toBe(24);
    expect(r.newMonths).toBe(20);
    expect(r.interestSaved).toBe(0);
  });

  it('the new schedule ends at zero and repays the remaining balance exactly', () => {
    const r = calculateEarlyPayoff({ ...base, balance: 9_876.54, aprPercent: 17.9, monthlyPayment: 301.01, lumpSum: 500 });
    expect(r.schedule.at(-1)?.balance).toBe(0);
    expect(r.schedule.reduce((s, row) => s + row.principal, 0)).toBeCloseTo(9_376.54, 6);
  });
});

describe('fixedPaymentSchedule', () => {
  it('stops at maxMonths', () => {
    expect(fixedPaymentSchedule(10_000, 12, 101, 24)).toHaveLength(24);
  });
});

describe('validateEarlyPayoffInput', () => {
  it('rejects a payment that does not cover interest', () => {
    expect(validateEarlyPayoffInput({ ...base, monthlyPayment: 115 }).map((e) => e.field)).toEqual(['monthlyPayment']);
  });

  it('rejects loans that would take more than 50 years at the current payment', () => {
    // Max balance at 1% APR, paying 1 cent over the monthly interest.
    expect(validateEarlyPayoffInput({ ...base, balance: 10_000_000, aprPercent: 1, monthlyPayment: 8_333.34 }).map((e) => e.field)).toEqual([
      'monthlyPayment',
    ]);
  });

  it('rejects a lump sum bigger than the balance, and empty or negative values', () => {
    expect(validateEarlyPayoffInput({ ...base, lumpSum: 12_001 }).map((e) => e.field)).toEqual(['lumpSum']);
    expect(
      validateEarlyPayoffInput({ ...base, balance: Number.NaN, extraMonthly: -1, prepaymentPenalty: Number.NaN }).map((e) => e.field),
    ).toEqual(['balance', 'extraMonthly', 'prepaymentPenalty']);
  });

  it('throws instead of returning NaN', () => {
    expect(() => calculateEarlyPayoff({ ...base, aprPercent: Number.NaN })).toThrow(RangeError);
  });
});
