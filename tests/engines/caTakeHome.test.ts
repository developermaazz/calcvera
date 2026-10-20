import { describe, expect, it } from 'vitest';
import { caTaxParamsByProvince } from '../../src/calculators/caTax';
import { requireFigure } from '../../src/countries';
import { ca } from '../../src/countries/ca';
import { calculateCaTakeHome, ontarioHealthPremium, validateCaTakeHomeInput, type CaTakeHomeParams } from '../../src/engines/caTakeHome';

/*
 * OUTSIDE CHECK (TaxTips.ca Canadian Income Tax Calculator, 2026, single, employment income only, 20 Oct 2026),
 * all match to the dollar:
 *   Ontario $80,000: taxable $79,073, federal $9,243, Ontario $4,885 (incl. $750 health premium), total with CPP/EI $19,697
 *   BC $60,000: taxable $59,435, federal $5,338, BC $2,567, total with CPP/EI $12,245
 *   Alberta $120,000: taxable $118,873, federal $17,502, Alberta $8,470, total with CPP/EI $31,742
 *   Nova Scotia $45,000: taxable $44,585, federal $3,338, NS $3,462, total with CPP/EI $10,003
 *
 * Hand check, Ontario $80,000 (CRA T4127 January 2026 figures):
 *   CPP base 4.95% × 71,100 = 3,519.45; enhanced 1% × 71,100 = 711; CPP2 4% × 5,400 = 216; EI 1.63% × 68,900 = 1,123.07
 *   Taxable 80,000 − 711 − 216 = 79,073
 *   Federal 14% × 58,523 + 20.5% × 20,550 − 14% × (16,452 + 1,501 + 3,519.45 + 1,123.07) = 9,242.60
 *   Ontario 5.05% × 53,891 + 9.15% × 25,182 − 5.05% × (12,989 + 3,519.45 + 1,123.07) = 4,135.26, + health premium 750
 */

const c = requireFigure(ca.ca, 'ca');
const byProv = caTaxParamsByProvince(ca);
const { ontarioHealthPremium: ohp, ...payroll } = c.payroll;
const params = (code: string): CaTakeHomeParams => ({ tax: byProv[code]!, payroll, ontarioHealthPremium: code === 'ON' ? ohp : undefined });
const run = (code: string, income: number, rrspDeduction = 0) => calculateCaTakeHome({ income, rrspDeduction }, params(code));
const dollars = (x: number) => Math.round(x);

describe('TaxTips outside checks', () => {
  it('Ontario $80,000', () => {
    const r = run('ON', 80_000);
    expect(r.taxableIncome).toBeCloseTo(79_073, 6);
    expect(r.federalTax).toBeCloseTo(9_242.6, 2);
    expect(r.provincialTax).toBeCloseTo(4_885.26, 2);
    expect(r.ontarioHealthPremium).toBe(750);
    expect(dollars(r.incomeTax + r.cppTotal + r.ei)).toBe(19_697);
  });

  it('BC $60,000', () => {
    const r = run('BC', 60_000);
    expect(r.taxableIncome).toBeCloseTo(59_435, 6);
    expect(dollars(r.federalTax)).toBe(5_338);
    expect(dollars(r.provincialTax)).toBe(2_567);
    expect(dollars(r.incomeTax + r.cppTotal + r.ei)).toBe(12_245);
  });

  it('Alberta $120,000', () => {
    const r = run('AB', 120_000);
    expect(r.taxableIncome).toBeCloseTo(118_873, 6);
    expect(dollars(r.federalTax)).toBe(17_502);
    expect(dollars(r.provincialTax)).toBe(8_470);
    expect(dollars(r.incomeTax + r.cppTotal + r.ei)).toBe(31_742);
  });

  it('Nova Scotia $45,000', () => {
    const r = run('NS', 45_000);
    expect(r.taxableIncome).toBeCloseTo(44_585, 6);
    expect(dollars(r.federalTax)).toBe(3_338);
    expect(dollars(r.provincialTax)).toBe(3_462);
    expect(dollars(r.incomeTax + r.cppTotal + r.ei)).toBe(10_003);
  });
});

describe('CPP, EI and rates', () => {
  it('CPP and EI stop at their maximums', () => {
    const r = run('ON', 100_000);
    expect(r.cppBase).toBeCloseTo(3_519.45, 6);
    expect(r.cppEnhanced).toBeCloseTo(711, 6);
    expect(r.cpp2).toBeCloseTo(416, 6);
    expect(r.ei).toBeCloseTo(1_123.07, 6);
  });

  it('take-home, average and marginal rates', () => {
    const r = run('ON', 80_000);
    expect(r.takeHome).toBeCloseTo(80_000 - r.incomeTax - r.cppTotal - r.ei, 8);
    expect(r.averageRate).toBeCloseTo((r.incomeTax / 80_000) * 100, 8);
    expect(r.marginalRate).toBeCloseTo(29.65, 6);
  });

  it('an RRSP deduction saves tax at the marginal rate, plus a lower health premium', () => {
    const saved = run('ON', 80_000).incomeTax - run('ON', 80_000, 10_000).incomeTax;
    expect(saved).toBeCloseTo(10_000 * 0.2965 + 150, 6);
  });

  it('Ontario surtax applies on higher incomes', () => {
    const r = run('ON', 150_000);
    expect(r.ontarioSurtax).toBeGreaterThan(0);
    expect(run('BC', 150_000).ontarioSurtax).toBe(0);
  });

  it('zero income pays nothing', () => {
    const r = run('AB', 0);
    expect(r.incomeTax).toBe(0);
    expect(r.cppTotal).toBe(0);
    expect(r.takeHome).toBe(0);
  });
});

describe('Ontario Health Premium and validation', () => {
  it('health premium bands', () => {
    expect(ontarioHealthPremium(20_000, ohp)).toBe(0);
    expect(ontarioHealthPremium(21_000, ohp)).toBeCloseTo(60, 8);
    expect(ontarioHealthPremium(30_000, ohp)).toBe(300);
    expect(ontarioHealthPremium(40_000, ohp)).toBe(450);
    expect(ontarioHealthPremium(50_000, ohp)).toBe(600);
    expect(ontarioHealthPremium(250_000, ohp)).toBe(900);
  });

  it('flags bad values', () => {
    expect(validateCaTakeHomeInput({ income: Number.NaN, rrspDeduction: -1 }).map((e) => e.field)).toEqual(['income', 'rrspDeduction']);
    expect(validateCaTakeHomeInput({ income: 10_000, rrspDeduction: 20_000 }).map((e) => e.field)).toEqual(['rrspDeduction']);
    expect(validateCaTakeHomeInput({ income: 80_000, rrspDeduction: 0 })).toEqual([]);
  });
});
