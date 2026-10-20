import { describe, expect, it } from 'vitest';
import { calculateAuHomeLoan, validateAuHomeLoanInput, type AuHomeLoanInput } from '../../src/engines/auHomeLoan';

/*
 * OUTSIDE CHECK (calculator.net mortgage and amortization calculators, monthly, 20 Oct 2026), all exact:
 *   1. $600,000 at 5.8% over 30 years: $3,520.52 a month, interest $667,386.56
 *   2. $450,000 at 6.24% over 25 years: $2,965.73 a month, interest $439,719.36
 *   3. $800,000 at 5.5% over 30 years + $500 a month extra: $4,542.31 a month, 285 repayments, interest
 *      $632,291.75, interest saved $202,940.58
 */

const base: AuHomeLoanInput = { amount: 600_000, ratePercent: 5.8, termYears: 30, frequency: 'monthly', interestOnlyYears: 0, extraRepayment: 0, offsetBalance: 0 };
const run = (x: Partial<AuHomeLoanInput>) => calculateAuHomeLoan({ ...base, ...x });

describe('outside checks', () => {
  it('1: $600,000 at 5.8%', () => {
    const r = run({});
    expect(r.repayment).toBeCloseTo(3_520.52, 2);
    expect(r.totalInterest).toBeCloseTo(667_386.56, 2);
    expect(r.repayments).toBe(360);
    expect(r.years.at(-1)!.balance).toBe(0);
  });

  it('2: $450,000 at 6.24% over 25 years', () => {
    const r = run({ amount: 450_000, ratePercent: 6.24, termYears: 25 });
    expect(r.repayment).toBeCloseTo(2_965.73, 2);
    expect(r.totalInterest).toBeCloseTo(439_719.36, 2);
  });

  it('3: extra $500 a month', () => {
    const r = run({ amount: 800_000, ratePercent: 5.5, extraRepayment: 500 });
    expect(r.repayment).toBeCloseTo(4_542.31, 2);
    expect(r.repayments).toBe(285);
    expect(r.totalInterest).toBeCloseTo(632_291.75, 2);
    expect(r.interestSaved).toBeCloseTo(202_940.58, 2);
  });
});

describe('frequency, interest-only and offset', () => {
  it('fortnightly and weekly use the rate per period over the same term', () => {
    const f = run({ frequency: 'fortnightly' });
    const i = 0.058 / 26;
    expect(f.repayment).toBeCloseTo((600_000 * i) / (1 - Math.pow(1 + i, -780)), 8);
    expect(f.repayments).toBe(780);
    expect(run({ frequency: 'weekly' }).repayments).toBe(1_560);
  });

  it('half the monthly repayment every fortnight pays the loan off sooner', () => {
    const r = run({ frequency: 'halfMonthly' });
    expect(r.repayment).toBeCloseTo(3_520.52 / 2, 2);
    expect(r.payoffYears).toBeLessThan(27);
    expect(r.totalInterest).toBeLessThan(667_386.56);
  });

  it('interest-only period, then principal and interest over the rest of the term', () => {
    const r = run({ interestOnlyYears: 5 });
    expect(r.interestOnlyRepayment).toBeCloseTo(600_000 * (0.058 / 12), 8);
    const i = 0.058 / 12;
    expect(r.repayment).toBeCloseTo((600_000 * i) / (1 - Math.pow(1 + i, -300)), 8);
    expect(r.years[4]!.balance).toBeCloseTo(600_000, 6);
    expect(r.totalInterest).toBeGreaterThan(667_386.56);
  });

  it('an offset balance cuts interest; a full offset means no interest', () => {
    const r = run({ offsetBalance: 50_000 });
    expect(r.interestSaved).toBeGreaterThan(0);
    expect(r.payoffYears).toBeLessThan(30);
    expect(r.baseTotalInterest).toBeCloseTo(667_386.56, 2);
    expect(run({ offsetBalance: 600_000 }).totalInterest).toBe(0);
  });

  it('0% rate repays evenly; large values stay finite', () => {
    expect(run({ ratePercent: 0 }).repayment).toBeCloseTo(600_000 / 360, 8);
    const big = run({ amount: 100_000_000, ratePercent: 25, termYears: 40, frequency: 'weekly', extraRepayment: 1_000_000 });
    expect(Number.isFinite(big.totalInterest)).toBe(true);
    expect(big.years.at(-1)!.balance).toBe(0);
  });

  it('validation', () => {
    expect(validateAuHomeLoanInput({ ...base, amount: 0, ratePercent: 30, termYears: 41 }).map((e) => e.field)).toEqual(['amount', 'ratePercent', 'termYears']);
    expect(validateAuHomeLoanInput({ ...base, termYears: 5, interestOnlyYears: 5 }).map((e) => e.field)).toEqual(['interestOnlyYears']);
    expect(validateAuHomeLoanInput({ ...base, offsetBalance: -1 }).map((e) => e.field)).toEqual(['offsetBalance']);
    expect(validateAuHomeLoanInput(base)).toEqual([]);
  });
});
