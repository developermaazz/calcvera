import { describe, expect, it } from 'vitest';
import { calculateCompoundInterest, equivalentMonthlyRate, validateCompoundInterestInput, type CompoundInterestInput } from '../../src/engines/compoundInterest';

/*
 * OUTSIDE CHECK (calculator.net investment calculator, monthly contributions, 20 Oct 2026), all exact:
 *   1. $10,000 + $200/month (end), 5% compounded monthly, 20 years → $109,333.14; interest $51,333.14;
 *      year 1 interest $567.39
 *   2. $5,000 + $150/month (start), 4.5% compounded annually, 10 years → $30,419.14; year 1 interest $268.58
 *   3. $2,500 + $100/month (end), 6% compounded daily, 15 years → $35,266.47; interest $14,766.47
 */

const base: CompoundInterestInput = {
  initialDeposit: 10_000,
  monthlyDeposit: 200,
  annualRatePercent: 5,
  compounding: 'monthly',
  years: 20,
  timing: 'end',
};

describe('calculateCompoundInterest', () => {
  it('outside check 1: monthly compounding, deposits at month end', () => {
    const r = calculateCompoundInterest(base);
    expect(r.finalBalance).toBeCloseTo(109_333.14, 2);
    expect(r.totalDeposits).toBe(58_000);
    expect(r.totalInterest).toBeCloseTo(51_333.14, 2);
    expect(r.years[0]!.interest).toBeCloseTo(567.39, 2);
    expect(r.effectiveAnnualRate).toBeCloseTo(0.051162, 6);
  });

  it('outside check 2: annual compounding, deposits at month start', () => {
    const r = calculateCompoundInterest({ initialDeposit: 5_000, monthlyDeposit: 150, annualRatePercent: 4.5, compounding: 'annually', years: 10, timing: 'start' });
    expect(r.finalBalance).toBeCloseTo(30_419.14, 2);
    expect(r.years[0]!.interest).toBeCloseTo(268.58, 2);
    expect(r.effectiveAnnualRate).toBeCloseTo(0.045, 12);
  });

  it('outside check 3: daily compounding', () => {
    const r = calculateCompoundInterest({ initialDeposit: 2_500, monthlyDeposit: 100, annualRatePercent: 6, compounding: 'daily', years: 15, timing: 'end' });
    expect(r.finalBalance).toBeCloseTo(35_266.47, 2);
    expect(r.totalInterest).toBeCloseTo(14_766.47, 2);
  });

  it('lump sum only matches P(1 + r/n)^(nt)', () => {
    const r = calculateCompoundInterest({ ...base, monthlyDeposit: 0, compounding: 'quarterly', years: 10 });
    expect(r.finalBalance).toBeCloseTo(10_000 * Math.pow(1 + 0.05 / 4, 40), 6);
  });

  it('0% rate: balance is the sum of deposits', () => {
    const r = calculateCompoundInterest({ ...base, annualRatePercent: 0 });
    expect(r.finalBalance).toBe(58_000);
    expect(r.totalInterest).toBe(0);
    expect(r.effectiveAnnualRate).toBe(0);
  });

  it('start-of-month deposits earn one extra month of interest each', () => {
    const lump = 10_000 * Math.pow(1 + 0.05 / 12, 240);
    const end = calculateCompoundInterest(base).finalBalance;
    const start = calculateCompoundInterest({ ...base, timing: 'start' }).finalBalance;
    expect(start).toBeGreaterThan(end);
    expect(start - lump).toBeCloseTo((end - lump) * (1 + 0.05 / 12), 6);
  });

  it('1 year minimum and 100-year maximum stay finite; yearly rows add up', () => {
    expect(calculateCompoundInterest({ ...base, years: 1 }).years).toHaveLength(1);
    const big = calculateCompoundInterest({ initialDeposit: 100_000_000, monthlyDeposit: 10_000_000, annualRatePercent: 50, compounding: 'daily', years: 100, timing: 'start' });
    expect(Number.isFinite(big.finalBalance)).toBe(true);
    const r = calculateCompoundInterest(base);
    expect(r.years.reduce((s, y) => s + y.interest, 0)).toBeCloseTo(r.totalInterest, 6);
    expect(r.years.at(-1)!.balance).toBe(r.finalBalance);
    expect(r.years.at(-1)!.totalDeposits).toBe(r.totalDeposits);
  });

  it('the equivalent monthly rate reproduces the yearly growth of each compounding choice', () => {
    for (const n of [1, 2, 4, 12, 365]) {
      expect(Math.pow(1 + equivalentMonthlyRate(6, n), 12)).toBeCloseTo(Math.pow(1 + 0.06 / n, n), 12);
    }
  });
});

describe('validateCompoundInterestInput', () => {
  it('flags empty, out-of-range and all-zero inputs', () => {
    const fields = (x: Partial<CompoundInterestInput>) => validateCompoundInterestInput({ ...base, ...x }).map((e) => e.field);
    expect(fields({ initialDeposit: Number.NaN, annualRatePercent: 60, years: 0 })).toEqual(['initialDeposit', 'annualRatePercent', 'years']);
    expect(fields({ years: 2.5 })).toEqual(['years']);
    expect(fields({ initialDeposit: 0, monthlyDeposit: 0 })).toEqual(['initialDeposit']);
    expect(() => calculateCompoundInterest({ ...base, monthlyDeposit: -1 })).toThrow(RangeError);
  });
});
