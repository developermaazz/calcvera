import { describe, expect, it } from 'vitest';
import { calculateDebtConsolidation, validateDebtConsolidationInput, type DebtConsolidationInput } from '../../src/engines/debtConsolidation';
import { simulatePayoff } from '../../src/engines/debtPayoff';

/*
 * OUTSIDE CHECK (calculator.net, 18 Oct 2026):
 *   Each debt on its own (credit card calculator): 46 months $3,011.67; 49 months $2,344.28; 39 months
 *   $1,599.91 → $6,955.86 total vs our $6,956.53 (cent rounding). New loan (loan calculator): $594.31, $2,974.07 exact.
 *   calculator.net's debt consolidation calculator differs by design: it rolls freed payments into the
 *   remaining debts and treats the fee as cash up front. Ours keeps each payment on its own debt and
 *   takes the fee from the loan, as the page explains.
 *
 * Expected values from an independent month-by-month script (scratch reference).
 * External cross-check: the new loan alone ($18,421.05, 9.99%, 36 months) gives $594.31/month and
 * $2,974.07 interest in any standard loan calculator.
 */

const base: DebtConsolidationInput = {
  debts: [
    { balance: 6_000, aprPercent: 22.99, monthlyPayment: 200 },
    { balance: 3_500, aprPercent: 27.49, monthlyPayment: 120 },
    { balance: 8_000, aprPercent: 11.5, monthlyPayment: 250 },
  ],
  newAprPercent: 9.99,
  newTermMonths: 36,
  originationFeePercent: 5,
};

describe('simulatePayoff', () => {
  it('pays a single debt off and counts interest', () => {
    const r = simulatePayoff([{ balance: 1_000, aprPercent: 12, monthlyPayment: 1_010 }]);
    expect(r.months).toBe(1);
    expect(r.totalInterest).toBeCloseTo(10, 8);
  });

  it('marks a payment that does not cover interest as never paying off', () => {
    const r = simulatePayoff([{ balance: 10_000, aprPercent: 24, monthlyPayment: 200 }]);
    expect(r.feasible).toBe(false);
  });

  it('0% debts take balance ÷ payment months', () => {
    const r = simulatePayoff([{ balance: 1_200, aprPercent: 0, monthlyPayment: 100 }]);
    expect(r.months).toBe(12);
    expect(r.totalInterest).toBe(0);
  });
});

describe('calculateDebtConsolidation', () => {
  it('compares three debts with a 9.99% loan and a 5% fee', () => {
    const r = calculateDebtConsolidation(base);
    expect(r.totalBalance).toBe(17_500);
    expect(r.current.totalInterest).toBeCloseTo(6_956.53, 1);
    expect(r.current.months).toBe(49);
    expect(r.loanAmount).toBeCloseTo(18_421.05, 1);
    expect(r.originationFee).toBeCloseTo(921.05, 1);
    expect(r.newMonthlyPayment).toBeCloseTo(594.31, 2);
    expect(r.newInterest).toBeCloseTo(2_974.07, 1);
    expect(r.savings).toBeCloseTo(3_061.41, 1);
    expect(r.breakEvenMonth).toBe(8);
  });

  it('ignores empty rows', () => {
    const withEmpty = { ...base, debts: [...base.debts, { balance: 0, aprPercent: Number.NaN, monthlyPayment: Number.NaN }] };
    expect(validateDebtConsolidationInput(withEmpty)).toEqual([]);
    expect(calculateDebtConsolidation(withEmpty).totalBalance).toBe(17_500);
  });

  it('shows extra cost (negative savings) when the new loan is worse', () => {
    const r = calculateDebtConsolidation({ ...base, newAprPercent: 25, newTermMonths: 84, originationFeePercent: 8 });
    expect(r.savings).toBeLessThan(0);
    expect(r.breakEvenMonth).toBeNull();
  });

  it('with no fee and a lower rate, breaks even in month 1', () => {
    const r = calculateDebtConsolidation({ ...base, originationFeePercent: 0 });
    expect(r.originationFee).toBe(0);
    expect(r.breakEvenMonth).toBe(1);
  });

  it('has no break-even when a current payment never clears its debt', () => {
    const r = calculateDebtConsolidation({ ...base, debts: [{ balance: 10_000, aprPercent: 24, monthlyPayment: 150 }] });
    expect(r.current.feasible).toBe(false);
    expect(r.breakEvenMonth).toBeNull();
  });

  it('validates rows and loan terms', () => {
    const errors = validateDebtConsolidationInput({
      debts: [{ balance: 5_000, aprPercent: -2, monthlyPayment: 0 }],
      newAprPercent: 9,
      newTermMonths: 0,
      originationFeePercent: 25,
    }).map((e) => e.field);
    expect(errors).toEqual(['aprPercent-0', 'monthlyPayment-0', 'newTermMonths', 'originationFeePercent']);
    expect(validateDebtConsolidationInput({ ...base, debts: [] }).map((e) => e.field)).toEqual(['balance-0']);
  });
});
