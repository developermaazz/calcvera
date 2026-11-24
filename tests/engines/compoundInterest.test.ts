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

describe('guide figures (src/content/guides/uk/compound-interest-calculator.md)', () => {
  const uk: CompoundInterestInput = { initialDeposit: 5_000, monthlyDeposit: 150, annualRatePercent: 4.5, compounding: 'monthly', years: 15, timing: 'end' };
  const run = (x: Partial<CompoundInterestInput>) => calculateCompoundInterest({ ...uk, ...x });
  const child = (years: number) => run({ initialDeposit: 0, monthlyDeposit: 50, years });

  it('matches the example table and the rates', () => {
    const rows: [number, number, number, number][] = [
      [5, 14_000, 2_330.81, 16_330.81],
      [10, 23_000, 7_514.67, 30_514.67],
      [15, 32_000, 16_269.98, 48_269.98],
      [25, 50_000, 48_318.41, 98_318.41],
    ];
    const r = run({ years: 25 }).years;
    for (const [year, paidIn, interest, balance] of rows) {
      const row = r[year - 1]!;
      expect(row.totalDeposits, `year ${year}`).toBe(paidIn);
      expect(row.totalInterest, `year ${year}`).toBeCloseTo(interest, 2);
      expect(row.balance, `year ${year}`).toBeCloseTo(balance, 2);
    }
    expect(r[24]!.totalInterest - r[14]!.totalInterest).toBeCloseTo(32_048.44, 2);
    expect(run({ annualRatePercent: 3.5 }).finalBalance).toBeCloseTo(43_888.74, 2);
    expect(run({ annualRatePercent: 5.5 }).finalBalance).toBeCloseTo(53_199.75, 2);
    expect(run({ monthlyDeposit: 250 }).finalBalance).toBeCloseTo(73_911.44, 2);
    expect(r[0]!.interest).toBeCloseTo(267.29, 2);
    expect(r[14]!.interest).toBeCloseTo(2_077, 2);
  });

  it('the interest passes the £500 allowance in year 4 and the £1,000 allowance in year 8', () => {
    const interest = run({ years: 10 }).years.map((y) => y.interest);
    expect(interest.findIndex((v) => v > 500) + 1).toBe(4);
    expect(interest.findIndex((v) => v > 1_000) + 1).toBe(8);
    expect(interest[3]).toBeCloseTo(565.49, 2);
    expect(interest[7]).toBeCloseTo(1_031.06, 2);
  });

  it('matches the FAQs and the child and inflation figures', () => {
    expect(run({ initialDeposit: 20_000, monthlyDeposit: 0, years: 1 }).totalInterest).toBeCloseTo(918.8, 2);
    expect(run({ initialDeposit: 20_000, monthlyDeposit: 0, years: 1, compounding: 'annually' }).totalInterest).toBeCloseTo(900, 2);
    expect(run({}).effectiveAnnualRate).toBeCloseTo(0.04594, 4);
    expect(12 * (Math.pow(1.045, 1 / 12) - 1) * 100).toBeCloseTo(4.41, 2);
    expect(run({ compounding: 'daily' }).finalBalance - run({}).finalBalance).toBeCloseTo(37.96, 2);
    expect(run({}).finalBalance - run({ compounding: 'annually' }).finalBalance).toBeCloseTo(416.79, 2);
    expect(Math.log(2) / (12 * Math.log(1 + 0.045 / 12))).toBeCloseTo(15.4, 1);
    expect(child(18).finalBalance).toBeCloseTo(16_593.4, 2);
    expect(child(18).totalInterest).toBeCloseTo(5_793.4, 2);
    expect(child(9).finalBalance).toBeCloseTo(6_642.23, 2);
    expect(child(18).finalBalance - child(9).finalBalance).toBeCloseTo(9_951.17, 2);
    expect(run({}).finalBalance / Math.pow(1.02, 15)).toBeCloseTo(35_865.3, 2);
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
