import { describe, expect, it } from 'vitest';
import { requireFigure } from '../../src/countries';
import { india } from '../../src/countries/in';
import { calculateInIncomeTax, surcharge, validateInIncomeTaxInput, type InIncomeTaxInput } from '../../src/engines/inIncomeTax';
import { taxOnBands } from '../../src/engines/tax';

/*
 * OUTSIDE CHECK (Budget 2025-26 speech, Annexure to Part-B, "Tax on slabs" under the new regime; the Finance Bill 2026
 * memorandum confirms the same section 202 rates for tax year 2026-27), all exact:
 *   ₹8 lakh → ₹20,000; ₹9 lakh → ₹30,000; ₹10 lakh → ₹40,000; ₹11 lakh → ₹50,000; ₹12 lakh → ₹60,000 (all removed by the
 *   rebate); ₹16 lakh → ₹1,20,000; ₹20 lakh → ₹2,00,000; ₹24 lakh → ₹3,00,000; ₹50 lakh → ₹10,80,000
 *
 * Hand checks (Income-tax Act, 2025 sections 19, 156, 202; 4% cess):
 *   Salary ₹15,00,000, new regime: taxable ₹14,25,000 → 20,000 + 40,000 + 15% × 2,25,000 = 93,750 + cess 3,750 = ₹97,500
 *   Same salary, old regime, ₹2,00,000 deductions: taxable ₹12,50,000 → 12,500 + 1,00,000 + 75,000 = 1,87,500 + cess = ₹1,95,000
 *   Taxable ₹12,10,000 (new): slab tax 61,500, but marginal relief limits it to the ₹10,000 above ₹12 lakh → ₹10,400 with cess
 *   Taxable ₹50,10,000 (new): slab tax 10,83,000; surcharge limited to 10,80,000 + 10,000 − 10,83,000 = ₹7,000
 */

const p = requireFigure(india.in, 'in').tax;
const base: InIncomeTaxInput = { salary: 1_500_000, otherIncome: 0, ageGroup: 'under60', oldDeductions: 200_000 };
const run = (x: Partial<InIncomeTaxInput>) => calculateInIncomeTax({ ...base, ...x }, p);
// Salary that gives a chosen taxable income under the new regime.
const forTaxable = (t: number) => ({ salary: t + 75_000 });

describe('Budget table: tax on slabs (new regime)', () => {
  it.each([
    [800_000, 20_000],
    [900_000, 30_000],
    [1_000_000, 40_000],
    [1_100_000, 50_000],
    [1_200_000, 60_000],
    [1_600_000, 120_000],
    [2_000_000, 200_000],
    [2_400_000, 300_000],
    [5_000_000, 1_080_000],
  ])('₹%i → %i', (income, tax) => {
    expect(taxOnBands(income, p.newRegime.bands)).toBeCloseTo(tax, 6);
  });

  it('no tax up to ₹12 lakh of taxable income after the rebate', () => {
    expect(run(forTaxable(1_200_000)).newRegime.totalTax).toBe(0);
    expect(run(forTaxable(800_000)).newRegime.totalTax).toBe(0);
  });
});

describe('new vs old regime', () => {
  it('₹15 lakh salary', () => {
    const r = run({});
    expect(r.newRegime.taxableIncome).toBe(1_425_000);
    expect(r.newRegime.totalTax).toBeCloseTo(97_500, 6);
    expect(r.oldRegime.taxableIncome).toBe(1_250_000);
    expect(r.oldRegime.totalTax).toBeCloseTo(195_000, 6);
    expect(r.better).toBe('new');
    expect(r.saving).toBeCloseTo(97_500, 6);
    expect(r.newRegime.takeHome).toBeCloseTo(1_402_500, 6);
  });

  it('marginal relief just above ₹12 lakh', () => {
    const r = run(forTaxable(1_210_000));
    expect(r.newRegime.slabTax).toBeCloseTo(61_500, 6);
    expect(r.newRegime.rebate).toBeCloseTo(51_500, 6);
    expect(r.newRegime.totalTax).toBeCloseTo(10_400, 6);
  });

  it('surcharge with marginal relief over ₹50 lakh', () => {
    const r = run(forTaxable(5_010_000));
    expect(r.newRegime.slabTax).toBeCloseTo(1_083_000, 6);
    expect(r.newRegime.surcharge).toBeCloseTo(7_000, 6);
    expect(r.newRegime.totalTax).toBeCloseTo(1_090_000 * 1.04, 6);
    expect(surcharge(6_000_000, 1_380_000, p.newRegime.surcharge, p.newRegime.bands)).toBeCloseTo(138_000, 6);
  });

  it('old regime: ages, rebate and large deductions', () => {
    expect(run({ salary: 550_000, oldDeductions: 0 }).oldRegime.totalTax).toBe(0);
    const senior = run({ salary: 800_000, oldDeductions: 150_000, ageGroup: 'from60' });
    expect(senior.oldRegime.taxableIncome).toBe(600_000);
    expect(senior.oldRegime.totalTax).toBeCloseTo((10_000 + 20_000) * 1.04, 6);
    const superSenior = run({ salary: 800_000, oldDeductions: 150_000, ageGroup: 'from80' });
    expect(superSenior.oldRegime.totalTax).toBeCloseTo(20_000 * 1.04, 6);
    expect(run({ salary: 1_500_000, oldDeductions: 900_000 }).better).toBe('old');
  });

  it('other income has no standard deduction; validation', () => {
    expect(run({ salary: 0, otherIncome: 1_000_000 }).newRegime.taxableIncome).toBe(1_000_000);
    expect(validateInIncomeTaxInput({ ...base, salary: 0, otherIncome: 0 }).map((e) => e.field)).toEqual(['salary']);
    expect(validateInIncomeTaxInput({ ...base, oldDeductions: -1 }).map((e) => e.field)).toEqual(['oldDeductions']);
  });
});
