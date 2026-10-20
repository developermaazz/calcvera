import { describe, expect, it } from 'vitest';
import { calculateMortgageOverpayment, validateMortgageOverpaymentInput, type MortgageOverpaymentInput } from '../../src/engines/mortgageOverpayment';

/*
 * OUTSIDE CHECK (calculator.net amortization calculator with extra payments, 20 Oct 2026), all exact:
 *   1. 200,000 at 4.5% over 25 years, +200 a month: 1,111.66 a month, 227 payments, interest 97,219.09,
 *      saved 36,280.39
 *   2. 150,000 at 5% over 20 years, 10,000 lump sum with the first payment: 989.93, 215 payments, interest
 *      71,945.60, saved 15,638.47
 *   3. 250,000 at 3.9% over 30 years, +100 a month and 5,000 in month 13: 1,179.17, 301 payments, interest
 *      139,574.32, saved 34,927.07
 */

const base: MortgageOverpaymentInput = { balance: 200_000, ratePercent: 4.5, years: 25, monthlyOverpayment: 200, lumpSum: 0, lumpSumMonth: 1, mode: 'shorterTerm', allowancePercent: 10 };
const run = (x: Partial<MortgageOverpaymentInput>) => calculateMortgageOverpayment({ ...base, ...x });

describe('pay off sooner', () => {
  it('outside check 1: monthly overpayment', () => {
    const r = run({});
    expect(r.monthlyPayment).toBeCloseTo(1_111.66, 2);
    expect(r.months).toBe(227);
    expect(r.monthsSaved).toBe(73);
    expect(r.totalInterest).toBeCloseTo(97_219.09, 2);
    expect(r.interestSaved).toBeCloseTo(36_280.39, 2);
  });

  it('outside check 2: lump sum', () => {
    const r = run({ balance: 150_000, ratePercent: 5, years: 20, monthlyOverpayment: 0, lumpSum: 10_000, lumpSumMonth: 1 });
    expect(r.monthlyPayment).toBeCloseTo(989.93, 2);
    expect(r.months).toBe(215);
    expect(r.totalInterest).toBeCloseTo(71_945.6, 2);
    expect(r.interestSaved).toBeCloseTo(15_638.47, 2);
  });

  it('outside check 3: both', () => {
    const r = run({ balance: 250_000, ratePercent: 3.9, years: 30, monthlyOverpayment: 100, lumpSum: 5_000, lumpSumMonth: 13 });
    expect(r.months).toBe(301);
    expect(r.totalInterest).toBeCloseTo(139_574.32, 2);
    expect(r.interestSaved).toBeCloseTo(34_927.07, 2);
  });

  it('no overpayment: same as the normal mortgage; 0% rate repays evenly', () => {
    const r = run({ monthlyOverpayment: 0 });
    expect(r.months).toBe(300);
    expect(r.interestSaved).toBeCloseTo(0, 6);
    const zero = run({ ratePercent: 0, monthlyOverpayment: 0, years: 10, balance: 120_000 });
    expect(zero.monthlyPayment).toBe(1_000);
    expect(zero.totalInterest).toBe(0);
  });

  it('a lump sum bigger than the balance clears it at once', () => {
    const r = run({ lumpSum: 1_000_000, monthlyOverpayment: 0 });
    expect(r.months).toBe(1);
    expect(r.years[0]!.balance).toBe(0);
  });
});

describe('lower payments', () => {
  it('keeps the term and lowers the payment after a lump sum', () => {
    const r = run({ balance: 150_000, ratePercent: 5, years: 20, monthlyOverpayment: 0, lumpSum: 10_000, lumpSumMonth: 1, mode: 'lowerPayment' });
    expect(r.months).toBe(240);
    expect(r.paymentAfter).toBeLessThan(r.monthlyPayment);
    expect(r.paymentAfter).toBeCloseTo(923.78, 2);
    expect(r.interestSaved).toBeCloseTo(5_811.41, 2);
    // Saves less interest than paying off sooner with the same lump sum.
    expect(r.interestSaved).toBeLessThan(15_638.47);
  });
});

describe('overpayment allowance', () => {
  it('flags years where overpayments exceed the % of the balance', () => {
    expect(run({ monthlyOverpayment: 2_000, allowancePercent: 10 }).yearsOverAllowance[0]).toBe(1);
    expect(run({}).yearsOverAllowance).toEqual([19]);
    expect(run({ allowancePercent: 100 }).yearsOverAllowance).toEqual([]);
  });

  it('large values stay finite; balances end at 0', () => {
    const r = run({ balance: 100_000_000, ratePercent: 25, years: 40, monthlyOverpayment: 1_000_000 });
    expect(Number.isFinite(r.totalInterest)).toBe(true);
    expect(r.years.at(-1)!.balance).toBe(0);
  });
});

describe('validateMortgageOverpaymentInput', () => {
  it('flags bad values', () => {
    expect(validateMortgageOverpaymentInput({ ...base, balance: 0, ratePercent: 30, years: 0 }).map((e) => e.field)).toEqual(['balance', 'ratePercent', 'years']);
    expect(validateMortgageOverpaymentInput({ ...base, lumpSum: 5_000, lumpSumMonth: 0 }).map((e) => e.field)).toEqual(['lumpSumMonth']);
    expect(validateMortgageOverpaymentInput({ ...base, monthlyOverpayment: -1 }).map((e) => e.field)).toEqual(['monthlyOverpayment']);
  });
});
