import { describe, expect, it } from 'vitest';
import { requireFigure } from '../../src/countries';
import { au } from '../../src/countries/au';
import { calculateAuSuper, validateAuSuperInput, type AuSuperInput } from '../../src/engines/auSuper';

/*
 * OUTSIDE CHECK (calculator.net investment calculator, compounded annually, monthly end-of-month contributions
 * = our method with no salary growth or fees; 20 Oct 2026), all exact:
 *   1. $50,000 + $680 a month at 7% for 30 years → $1,175,840.52
 *      ($80,000 salary: 12% super guarantee $9,600 less 15% contributions tax = $8,160 a year)
 *   2. $120,000 + $1,020 a month at 6% for 25 years → $1,204,839.23 ($120,000 salary → $12,240 a year)
 *   3. $10,000 + $510 a month at 8% for 40 years → $1,859,995.68 ($60,000 salary → $6,120 a year)
 */

const p = requireFigure(au.au, 'au').super;
const base: AuSuperInput = {
  age: 30,
  retirementAge: 60,
  balance: 50_000,
  salary: 80_000,
  salaryGrowthPercent: 0,
  salarySacrifice: 0,
  afterTaxContributions: 0,
  returnPercent: 7,
  feesPerYear: 0,
  inflationPercent: 2.5,
};
const run = (x: Partial<AuSuperInput>) => calculateAuSuper({ ...base, ...x }, p);

describe('outside checks', () => {
  it('1: $80,000 salary, 30 years at 7%', () => {
    const r = run({});
    expect(r.finalBalance).toBeCloseTo(1_175_840.52, 2);
    expect(r.totalContributions).toBeCloseTo(244_800, 6);
    expect(r.contributionsTax).toBeCloseTo(43_200, 6);
    expect(r.totalEarnings).toBeCloseTo(881_040.52, 2);
  });

  it('2: $120,000 salary, 25 years at 6%', () => {
    expect(run({ age: 40, retirementAge: 65, balance: 120_000, salary: 120_000, returnPercent: 6 }).finalBalance).toBeCloseTo(1_204_839.23, 2);
  });

  it('3: $60,000 salary, 40 years at 8%', () => {
    expect(run({ age: 25, retirementAge: 65, balance: 10_000, salary: 60_000, returnPercent: 8 }).finalBalance).toBeCloseTo(1_859_995.68, 2);
  });
});

describe('contributions, fees and inflation', () => {
  it('salary growth raises contributions each year', () => {
    const r = run({ salaryGrowthPercent: 3 });
    expect(r.rows[1]!.contributions).toBeCloseTo(8_160 * 1.03, 6);
    expect(r.finalBalance).toBeGreaterThan(1_175_840.52);
  });

  it('salary sacrifice and after-tax contributions add to the balance', () => {
    const r = run({ salarySacrifice: 5_000, afterTaxContributions: 2_000 });
    expect(r.rows[0]!.contributions).toBeCloseTo((9_600 + 5_000) * 0.85 + 2_000, 6);
    expect(r.balanceWithoutExtras).toBeCloseTo(1_175_840.52, 2);
    expect(r.finalBalance).toBeGreaterThan(r.balanceWithoutExtras);
  });

  it('fees reduce the balance; today’s dollars use inflation', () => {
    const r = run({ feesPerYear: 300 });
    expect(r.totalFees).toBeCloseTo(9_000, 6);
    expect(r.finalBalance).toBeLessThan(1_175_840.52);
    expect(r.todaysDollars).toBeCloseTo(r.finalBalance / Math.pow(1.025, 30), 6);
  });

  it('caps: super guarantee stops at the maximum contribution base', () => {
    const r = run({ salary: 400_000 });
    expect(r.firstYearConcessional).toBeCloseTo(270_830 * 0.12, 6);
    expect(r.overConcessionalCap).toBe(false);
    expect(run({ salary: 400_000, salarySacrifice: 100 }).overConcessionalCap).toBe(true);
    expect(run({ afterTaxContributions: 140_000 }).overNonConcessionalCap).toBe(true);
  });

  it('0% return just adds contributions; large values stay finite', () => {
    const r = run({ returnPercent: 0, balance: 0 });
    expect(r.finalBalance).toBeCloseTo(244_800, 6);
    const big = run({ balance: 100_000_000, salary: 10_000_000, returnPercent: 15, age: 15, retirementAge: 75 });
    expect(Number.isFinite(big.finalBalance)).toBe(true);
  });

  it('validation', () => {
    expect(validateAuSuperInput({ ...base, retirementAge: 30 }).map((e) => e.field)).toEqual(['retirementAge']);
    expect(validateAuSuperInput({ ...base, age: Number.NaN, salary: -1, returnPercent: 20 }).map((e) => e.field)).toEqual(['age', 'salary', 'returnPercent']);
    expect(validateAuSuperInput(base)).toEqual([]);
  });
});
