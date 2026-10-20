import { describe, expect, it } from 'vitest';
import { requireFigure } from '../../src/countries';
import { au } from '../../src/countries/au';
import { helpRepayment } from '../../src/engines/auTakeHome';
import { MAX_YEARS, calculateHelpDebt, validateHelpDebtInput, type HelpDebtInput } from '../../src/engines/helpDebt';

/*
 * OUTSIDE CHECK (ATO worked examples, 2026–27): the compulsory repayment uses helpRepayment, checked in
 * auTakeHome.test.ts against the ATO's three examples ($86,380 → $2,527.80; $137,064 → $10,276.99;
 * $254,780 → $25,478). Indexation 2.8% (1 June 2026) from the ATO indexation rates page.
 *
 * Hand check, $25,000 balance, $85,000 income (no growth), 2.8% indexation:
 *   Year 1: 25,000 + 700 indexation − 15% × (85,000 − 69,528) = 2,320.80 → 23,379.20
 *   Year 2: thresholds × 1.028; repayment = 1.028 × 15% × (85,000 ÷ 1.028 − 69,528) = 2,028.78;
 *           23,379.20 × 1.028 − 2,028.78 = 22,005.04
 */

const h = requireFigure(au.au, 'au').help;
const base: HelpDebtInput = { balance: 25_000, income: 85_000, incomeGrowthPercent: 0, indexationPercent: 2.8, voluntaryPerYear: 0 };
const run = (x: Partial<HelpDebtInput>) => calculateHelpDebt({ ...base, ...x }, h);

describe('HELP payoff', () => {
  it('first two years by hand', () => {
    const r = run({});
    expect(r.firstYearRepayment).toBeCloseTo(2_320.8, 6);
    expect(r.rows[0]!.indexation).toBeCloseTo(700, 6);
    expect(r.rows[0]!.balance).toBeCloseTo(23_379.2, 6);
    expect(r.rows[1]!.compulsory).toBeCloseTo(1.028 * 0.15 * (85_000 / 1.028 - 69_528), 6);
    expect(r.rows[1]!.balance).toBeCloseTo(23_379.2 * 1.028 - 1.028 * 0.15 * (85_000 / 1.028 - 69_528), 6);
  });

  it('balance ends at 0 and totals add up', () => {
    const r = run({ incomeGrowthPercent: 3 });
    expect(r.yearsToRepay).not.toBeNull();
    expect(r.rows.at(-1)!.balance).toBe(0);
    expect(r.totalCompulsory + r.totalVoluntary).toBeCloseTo(25_000 + r.totalIndexation, 6);
  });

  it('voluntary repayments shorten the time to repay', () => {
    const r = run({ voluntaryPerYear: 3_000, incomeGrowthPercent: 3 });
    expect(r.yearsWithoutVoluntary).not.toBeNull();
    expect(r.yearsToRepay!).toBeLessThan(r.yearsWithoutVoluntary!);
    expect(r.totalIndexation).toBeLessThan(run({ incomeGrowthPercent: 3 }).totalIndexation);
    // With no pay rises while thresholds rise, repayments shrink and the debt is never cleared.
    expect(run({}).yearsToRepay).toBeNull();
  });

  it('below the threshold the debt only grows with indexation', () => {
    const r = run({ income: 50_000 });
    expect(r.firstYearRepayment).toBe(0);
    expect(r.yearsToRepay).toBeNull();
    expect(r.rows).toHaveLength(MAX_YEARS);
    expect(r.rows.at(-1)!.balance).toBeCloseTo(25_000 * Math.pow(1.028, MAX_YEARS), 4);
  });

  it('high incomes repay 10% of all repayment income; 0% indexation', () => {
    expect(run({ income: 200_000 }).firstYearRepayment).toBeCloseTo(20_000, 6);
    expect(helpRepayment(200_000, h)).toBeCloseTo(20_000, 6);
    const r = run({ indexationPercent: 0, income: 100_000, balance: 9_000 });
    expect(r.totalIndexation).toBe(0);
    expect(r.yearsToRepay).toBe(2);
  });

  it('validation', () => {
    expect(validateHelpDebtInput({ ...base, balance: 0, income: -1, indexationPercent: 20 }).map((e) => e.field)).toEqual(['balance', 'income', 'indexationPercent']);
    expect(validateHelpDebtInput(base)).toEqual([]);
  });
});
