import { describe, expect, it } from 'vitest';
import { calculateLoan, monthlyPayment, summariseByYear, validateLoanInput } from '../../src/engines/loan';

/*
 * Expected values come from the standard amortisation formula M = P·r / (1 − (1 + r)^−n), r = APR / 12,
 * and were cross-checked with an independent month-by-month script.
 *
 * External cross-checks (enter these into calculator.net/loan-calculator.html or the Bankrate loan calculator):
 *   1. $10,000, 6% APR, 36 months   → $304.22 / month, $951.90 total interest
 *   2. $20,000, 7.5% APR, 60 months → $400.76 / month, $4,045.54 total interest
 *   3. £5,000, 9.9% APR, 24 months  → £230.49 / month, £531.85 total interest
 * Calculators that round the monthly payment to the cent before building the schedule can differ
 * from these totals by a few cents. Record the date you checked each one here.
 */

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

describe('monthlyPayment', () => {
  it('matches the standard formula for a typical loan', () => {
    expect(monthlyPayment(10_000, 6, 36)).toBeCloseTo(304.2194, 4);
  });

  it('divides evenly at 0% APR', () => {
    expect(monthlyPayment(12_000, 0, 24)).toBe(500);
  });
});

describe('calculateLoan', () => {
  it('$10,000 at 6% over 36 months', () => {
    const r = calculateLoan({ principal: 10_000, aprPercent: 6, termMonths: 36 });
    expect(r.monthlyPayment).toBeCloseTo(304.22, 2);
    expect(r.totalInterest).toBeCloseTo(951.9, 2);
    expect(r.totalCost).toBeCloseTo(10_951.9, 2);
    expect(r.payoffMonths).toBe(36);
    expect(r.interestSaved).toBe(0);
  });

  it('$20,000 at 7.5% over 60 months', () => {
    const r = calculateLoan({ principal: 20_000, aprPercent: 7.5, termMonths: 60 });
    expect(r.monthlyPayment).toBeCloseTo(400.76, 2);
    expect(r.totalInterest).toBeCloseTo(4045.54, 2);
  });

  it('£5,000 at 9.9% over 24 months', () => {
    const r = calculateLoan({ principal: 5_000, aprPercent: 9.9, termMonths: 24 });
    expect(r.monthlyPayment).toBeCloseTo(230.49, 2);
    expect(r.totalInterest).toBeCloseTo(531.85, 2);
  });

  it('0% APR: equal payments and no interest', () => {
    const r = calculateLoan({ principal: 12_000, aprPercent: 0, termMonths: 24 });
    expect(r.monthlyPayment).toBe(500);
    expect(r.totalInterest).toBe(0);
    expect(r.totalCost).toBe(12_000);
    expect(r.schedule.every((row) => row.interest === 0)).toBe(true);
    expect(r.schedule.at(-1)?.balance).toBe(0);
  });

  it('1-month term: one payment of principal plus one month of interest', () => {
    const r = calculateLoan({ principal: 1_000, aprPercent: 12, termMonths: 1 });
    expect(r.monthlyPayment).toBeCloseTo(1_010, 8);
    expect(r.totalInterest).toBeCloseTo(10, 8);
    expect(r.schedule).toHaveLength(1);
    expect(r.schedule[0]?.balance).toBe(0);
  });

  it('an extra $200 a month pays $10,000 at 6% off in 21 months instead of 36', () => {
    const r = calculateLoan({ principal: 10_000, aprPercent: 6, termMonths: 36, extraMonthly: 200 });
    expect(r.monthlyPayment).toBeCloseTo(304.22, 2);
    expect(r.monthlyPaymentWithExtra).toBeCloseTo(504.22, 2);
    expect(r.payoffMonths).toBe(21);
    expect(r.monthsSaved).toBe(15);
    expect(r.totalInterest).toBeCloseTo(557.62, 2);
    expect(r.interestSaved).toBeCloseTo(394.28, 2);
    // The last payment is smaller than the others because only the remaining balance is owed.
    const last = r.schedule.at(-1)!;
    expect(last.balance).toBe(0);
    expect(last.payment).toBeLessThan(504.22);
  });

  it('extra payment at 0% APR: $12,000 over 24 months with $250 extra ends in 16 months', () => {
    const r = calculateLoan({ principal: 12_000, aprPercent: 0, termMonths: 24, extraMonthly: 250 });
    expect(r.payoffMonths).toBe(16);
    expect(r.totalInterest).toBe(0);
  });

  it('extra payment larger than the loan clears it in the first month', () => {
    const r = calculateLoan({ principal: 10_000, aprPercent: 6, termMonths: 36, extraMonthly: 20_000 });
    expect(r.payoffMonths).toBe(1);
    expect(r.totalInterest).toBeCloseTo(50, 8);
    expect(r.schedule[0]?.payment).toBeCloseTo(10_050, 8);
  });

  it('max values stay finite and accurate ($100m, 100% APR, 600 months)', () => {
    const r = calculateLoan({ principal: 100_000_000, aprPercent: 100, termMonths: 600 });
    expect(Number.isFinite(r.totalInterest)).toBe(true);
    expect(r.monthlyPayment).toBeCloseTo(8_333_333.33, 2);
    // No extra payments, so total interest must equal payment × term − principal.
    expect(r.totalInterest / (r.monthlyPayment * 600 - 100_000_000)).toBeCloseTo(1, 10);
    expect(r.schedule.every((row) => row.balance >= 0 && row.principal >= 0)).toBe(true);
  });

  it('schedule balances to exactly zero and repays exactly the principal', () => {
    for (const input of [
      { principal: 25_000, aprPercent: 5, termMonths: 60 },
      { principal: 25_000, aprPercent: 5, termMonths: 60, extraMonthly: 100 },
      { principal: 7_350.5, aprPercent: 19.99, termMonths: 47, extraMonthly: 33.33 },
    ]) {
      const r = calculateLoan(input);
      expect(r.schedule.at(-1)?.balance).toBe(0);
      expect(sum(r.schedule.map((row) => row.principal + row.extra))).toBeCloseTo(input.principal, 6);
      expect(sum(r.schedule.map((row) => row.interest))).toBeCloseTo(r.totalInterest, 6);
      expect(sum(r.schedule.map((row) => row.payment))).toBeCloseTo(r.totalCost, 6);
      expect(r.schedule.every((row) => row.balance >= 0 && row.extra >= 0)).toBe(true);
    }
  });

  it('$25,000 at 5% with $100 extra pays off in 49 months', () => {
    const r = calculateLoan({ principal: 25_000, aprPercent: 5, termMonths: 60, extraMonthly: 100 });
    expect(r.payoffMonths).toBe(49);
    expect(r.totalInterest).toBeCloseTo(2655.84, 2);
  });

  it('throws on invalid input instead of returning NaN', () => {
    expect(() => calculateLoan({ principal: Number.NaN, aprPercent: 5, termMonths: 12 })).toThrow(RangeError);
  });
});

describe('validateLoanInput', () => {
  it('accepts a normal loan', () => {
    expect(validateLoanInput({ principal: 10_000, aprPercent: 6, termMonths: 36, extraMonthly: 0 })).toEqual([]);
  });

  it('flags empty, negative and out-of-range values per field', () => {
    const fields = (input: Parameters<typeof validateLoanInput>[0]) => validateLoanInput(input).map((e) => e.field);
    expect(fields({ principal: Number.NaN, aprPercent: Number.NaN, termMonths: Number.NaN })).toEqual([
      'principal',
      'aprPercent',
      'termMonths',
    ]);
    expect(fields({ principal: -5_000, aprPercent: -1, termMonths: 0, extraMonthly: -10 })).toEqual([
      'principal',
      'aprPercent',
      'termMonths',
      'extraMonthly',
    ]);
    expect(fields({ principal: 1e9, aprPercent: 101, termMonths: 601 })).toEqual([
      'principal',
      'aprPercent',
      'termMonths',
    ]);
    expect(fields({ principal: 1_000, aprPercent: 5, termMonths: 12.5 })).toEqual(['termMonths']);
  });
});

describe('summariseByYear', () => {
  it('groups 30 payments into 3 loan years with matching totals', () => {
    const r = calculateLoan({ principal: 9_000, aprPercent: 8, termMonths: 30 });
    const years = summariseByYear(r.schedule);
    expect(years.map((y) => y.payments)).toEqual([12, 12, 6]);
    expect(sum(years.map((y) => y.principal))).toBeCloseTo(9_000, 6);
    expect(sum(years.map((y) => y.interest))).toBeCloseTo(r.totalInterest, 6);
    expect(years.at(-1)?.balance).toBe(0);
  });
});
