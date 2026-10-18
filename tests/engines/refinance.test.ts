import { describe, expect, it } from 'vitest';
import { calculateRefinance, validateRefinanceInput, type RefinanceInput } from '../../src/engines/refinance';

/*
 * Expected values from an independent script (standard amortisation, month-by-month interest for break-even).
 * External cross-checks to run (calculator.net auto loan refinance or Bankrate's auto refinance calculator):
 *   1. $18,000 at 9.9% with 48 months left → $455.66/month, $3,871.80 interest
 *   2. Refinanced to 6.4% over 48 months → $426.04/month, $2,449.89 interest
 *   3. With $300 fees paid up front → total saving $1,121.91
 * Record the check date here.
 */

const base: RefinanceInput = {
  balance: 18_000,
  currentAprPercent: 9.9,
  remainingMonths: 48,
  newAprPercent: 6.4,
  newTermMonths: 48,
  fees: 300,
  feesInLoan: false,
};

describe('calculateRefinance', () => {
  it('9.9% to 6.4% over the same 48 months with $300 fees up front', () => {
    const r = calculateRefinance(base);
    expect(r.currentPayment).toBeCloseTo(455.66, 2);
    expect(r.currentInterest).toBeCloseTo(3_871.8, 2);
    expect(r.newPayment).toBeCloseTo(426.04, 2);
    expect(r.newInterest).toBeCloseTo(2_449.89, 2);
    expect(r.monthlySaving).toBeCloseTo(29.62, 2);
    expect(r.totalSaving).toBeCloseTo(1_121.91, 2);
    expect(r.breakEvenMonth).toBe(6);
  });

  it('fees added to the loan raise the payment and cost interest', () => {
    const r = calculateRefinance({ ...base, feesInLoan: true });
    expect(r.newLoanAmount).toBe(18_300);
    expect(r.newPayment).toBeCloseTo(433.14, 2);
    expect(r.totalSaving).toBeCloseTo(1_081.08, 2);
    expect(r.breakEvenMonth).toBe(7);
  });

  it('a longer new term lowers the payment but shrinks the saving', () => {
    const r = calculateRefinance({ ...base, newTermMonths: 60 });
    expect(r.newPayment).toBeCloseTo(351.35, 2);
    expect(r.totalSaving).toBeCloseTo(490.91, 2);
  });

  it('a worse deal shows a negative saving and no break-even', () => {
    const r = calculateRefinance({ ...base, currentAprPercent: 6.9, remainingMonths: 24, newAprPercent: 7.5, newTermMonths: 60 });
    expect(r.monthlySaving).toBeGreaterThan(0);
    expect(r.totalSaving).toBeCloseTo(-2_618.81, 2);
    expect(r.breakEvenMonth).toBeNull();
  });

  it('no fees and a lower rate break even in month 1', () => {
    expect(calculateRefinance({ ...base, fees: 0 }).breakEvenMonth).toBe(1);
  });

  it('0% new rate: payment is balance ÷ months', () => {
    const r = calculateRefinance({ ...base, newAprPercent: 0, fees: 0 });
    expect(r.newPayment).toBeCloseTo(375, 8);
    expect(r.newInterest).toBe(0);
  });

  it('validates every field', () => {
    const fields = validateRefinanceInput({ ...base, balance: 50, currentAprPercent: -1, remainingMonths: 0, newTermMonths: 12.5, fees: Number.NaN }).map(
      (e) => e.field,
    );
    expect(fields).toEqual(['balance', 'currentAprPercent', 'remainingMonths', 'newTermMonths', 'fees']);
    expect(() => calculateRefinance({ ...base, balance: Number.NaN })).toThrow(RangeError);
  });
});
