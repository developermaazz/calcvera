import { describe, expect, it } from 'vitest';
import { requireFigure } from '../../src/countries';
import { uk } from '../../src/countries/uk';
import { calculateIsaSavings, validateIsaInput, type IsaInput, type IsaParams } from '../../src/engines/isaSavings';

/*
 * OUTSIDE CHECK (calculator.net investment calculator, rate compounded annually with monthly end-of-month
 * contributions = our AER method; 20 Oct 2026): 10,000 + 500 a month at 4.5% for 10 years → 90,767.53,
 * interest 20,767.53, year 1 interest 572.77 (all exact).
 * Tax outside an ISA follows GOV.UK: interest over the Personal Savings Allowance (£1,000 / £500 / £0) is
 * taxed at your usual rate. Year 1 above: higher rate (572.77 − 500) × 40% = 29.11; additional 572.77 × 45%.
 */

const s = requireFigure(uk.uk, 'uk').savings;
const P: IsaParams = {
  isaAllowance: requireFigure(s.isaAllowance, 'a'),
  personalSavingsAllowance: { basic: requireFigure(s.personalSavingsAllowance.basic, 'b'), higher: requireFigure(s.personalSavingsAllowance.higher, 'c'), additional: requireFigure(s.personalSavingsAllowance.additional, 'd') },
  savingsTaxRate: { basic: requireFigure(s.savingsTaxRate.basic, 'e'), higher: requireFigure(s.savingsTaxRate.higher, 'f'), additional: requireFigure(s.savingsTaxRate.additional, 'g') },
};
const base: IsaInput = { startingBalance: 10_000, monthlyDeposit: 500, ratePercent: 4.5, years: 10, taxBand: 'higher' };
const run = (x: Partial<IsaInput>) => calculateIsaSavings({ ...base, ...x }, P);

describe('calculateIsaSavings', () => {
  it('outside check: growth matches calculator.net', () => {
    const r = run({});
    expect(r.finalBalance).toBeCloseTo(90_767.53, 2);
    expect(r.totalInterest).toBeCloseTo(20_767.53, 2);
    expect(r.years[0]!.interest).toBeCloseTo(572.77, 2);
    expect(r.totalDeposits).toBe(70_000);
  });

  it('tax outside an ISA by band', () => {
    expect(run({}).years[0]!.taxDue).toBeCloseTo((572.7637 - 500) * 0.4, 2);
    expect(run({ taxBand: 'additional' }).years[0]!.taxDue).toBeCloseTo(572.7637 * 0.45, 2);
    expect(run({ taxBand: 'basic' }).years[0]!.taxDue).toBe(0);
    expect(run({ taxBand: 'basic' }).totalTax).toBeCloseTo(2_219.6, 1);
  });

  it('the ISA advantage is the tax plus the growth it would have earned', () => {
    const r = run({});
    expect(r.isaAdvantage).toBeCloseTo(r.finalBalance - r.taxableFinalBalance, 8);
    expect(r.isaAdvantage).toBeGreaterThan(r.totalTax);
  });

  it('0% rate: balance is deposits, no tax', () => {
    const r = run({ ratePercent: 0 });
    expect(r.finalBalance).toBe(70_000);
    expect(r.totalTax).toBe(0);
  });

  it('checks yearly deposits against the £20,000 allowance', () => {
    expect(run({ monthlyDeposit: 1_666 }).overAllowance).toBe(0);
    expect(run({ monthlyDeposit: 2_000 }).overAllowance).toBe(4_000);
  });

  it('1 year minimum and big values stay finite', () => {
    expect(run({ years: 1 }).years).toHaveLength(1);
    expect(Number.isFinite(run({ startingBalance: 100_000_000, monthlyDeposit: 1_000_000, ratePercent: 30, years: 60 }).finalBalance)).toBe(true);
  });
});

describe('validateIsaInput', () => {
  it('flags bad values', () => {
    expect(validateIsaInput({ ...base, monthlyDeposit: -1, years: 0 }).map((e) => e.field)).toEqual(['monthlyDeposit', 'years']);
    expect(validateIsaInput({ ...base, startingBalance: 0, monthlyDeposit: 0 }).map((e) => e.field)).toEqual(['monthlyDeposit']);
  });
});
