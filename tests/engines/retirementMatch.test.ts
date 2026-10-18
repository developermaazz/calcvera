import { describe, expect, it } from 'vitest';
import { requireFigure } from '../../src/countries';
import { us } from '../../src/countries/us';
import { calculateRetirementMatch, matchForYear, validateRetirementMatchInput, type RetirementLimits, type RetirementMatchInput } from '../../src/engines/retirementMatch';

/*
 * 2026 IRS limits (Notice 2025-67): $24,500 deferral, $8,000 catch-up (50+), $11,250 (ages 60–63),
 * $72,000 annual additions, $360,000 compensation.
 * Hand checks: $75,000 salary, 4% contribution, 50% match up to 6% → you $3,000, employer $1,500,
 * full match at 6% → you $4,500, employer $2,250. Projection values from an independent script.
 */

const c = requireFigure(us.us, 'us').retirement;
const limits: RetirementLimits = {
  deferralLimit: requireFigure(c.deferralLimit, 'def'),
  catchUp: requireFigure(c.catchUp, 'cu'),
  catchUpAge60to63: requireFigure(c.catchUpAge60to63, 'cu6063'),
  annualAdditionsLimit: requireFigure(c.annualAdditionsLimit, 'add'),
  compensationLimit: requireFigure(c.compensationLimit, 'comp'),
};

const base: RetirementMatchInput = {
  salary: 75_000,
  contributionPercent: 4,
  matchRatePercent: 50,
  matchCapPercent: 6,
  age: 35,
  currentBalance: 20_000,
  retirementAge: 65,
  returnPercent: 7,
  salaryGrowthPercent: 3,
};

describe('matchForYear', () => {
  it('4% with a 50% match up to 6% leaves $750 of match unclaimed', () => {
    const y = matchForYear(75_000, 4, 50, 6, 35, limits);
    expect(y.employee).toBe(3_000);
    expect(y.match).toBe(1_500);
    expect(y.maxMatch).toBe(2_250);
  });

  it('caps contributions at the deferral limit and adds catch-up from 50', () => {
    expect(matchForYear(300_000, 20, 50, 6, 45, limits).employee).toBe(24_500);
    expect(matchForYear(300_000, 20, 50, 6, 55, limits).employee).toBe(32_500);
    expect(matchForYear(300_000, 20, 50, 6, 64, limits).hitDeferralLimit).toBe(true);
  });

  it('ages 60–63 get the higher catch-up; pay is capped at the compensation limit', () => {
    const y = matchForYear(400_000, 10, 100, 5, 61, limits);
    expect(y.employee).toBe(35_750);
    expect(y.match).toBe(18_000);
  });

  it('match is limited so annual additions stay within $72,000', () => {
    const y = matchForYear(360_000, 10, 200, 10, 40, limits);
    expect(y.employee).toBe(24_500);
    expect(y.match).toBe(72_000 - 24_500);
  });
});

describe('calculateRetirementMatch', () => {
  it('projects to 65 and shows the value of contributing up to the match', () => {
    const r = calculateRetirementMatch(base, limits);
    expect(r.years).toBe(30);
    expect(r.missedMatch).toBe(750);
    expect(r.balance).toBeCloseTo(735_556.77, 1);
    expect(r.totalEmployee).toBeCloseTo(142_726.25, 1);
    expect(r.totalMatch).toBeCloseTo(71_363.12, 1);
    expect(r.balanceAtFullMatch).toBeCloseTo(1_027_212.6, 0);
  });

  it('0% return: balance is the sum of contributions', () => {
    const r = calculateRetirementMatch({ ...base, returnPercent: 0, salaryGrowthPercent: 0, retirementAge: 36 }, limits);
    expect(r.balance).toBe(20_000 + 3_000 + 1_500);
  });

  it('validates inputs', () => {
    const fields = validateRetirementMatchInput({ ...base, salary: 0, contributionPercent: 120, age: 40, retirementAge: 40 }).map((e) => e.field);
    expect(fields).toEqual(['salary', 'contributionPercent', 'retirementAge']);
    expect(() => calculateRetirementMatch({ ...base, age: Number.NaN }, limits)).toThrow(RangeError);
  });
});
