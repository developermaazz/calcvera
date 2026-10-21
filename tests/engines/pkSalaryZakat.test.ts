import { describe, expect, it } from 'vitest';
import { requireFigure } from '../../src/countries';
import { pk } from '../../src/countries/pk';
import { calculateLoan } from '../../src/engines/loan';
import { calculatePkSalaryTax, taxOnSchedule, validatePkSalaryInput } from '../../src/engines/pkSalaryTax';
import { calculateZakat, validateZakatInput, type ZakatInput } from '../../src/engines/zakat';
import { taxOnBands } from '../../src/engines/tax';

/*
 * OUTSIDE CHECK (FBR, 21 Oct 2026):
 *   Tax year 2027 (FBR Circular No. 2 of 2026-27 and the Withholding Tax Rates Card 2027): the official base amounts are the tax
 *   at each band's lower limit: Rs 1,200,000 → Rs 6,000; 2,200,000 → 116,000; 3,200,000 → 316,000; 4,100,000 → 541,000;
 *   5,600,000 → 976,000; 7,000,000 → 1,424,000. Our schedule and the marginal bands give exactly these.
 *   Tax year 2026 (FBR Circular No. 01 of 2025-26): bases 6,000; 116,000; 345,000; 615,000; 9% salaried surcharge over Rs 10m.
 * Loan (calculator.net amortization calculator, exact): Rs 1,000,000 at 16% for 3 years → Rs 35,157.03 a month, interest
 *   Rs 265,653.19.
 * Zakat (Zakat and Ushr Ordinance, 1980; Administrator General Zakat nisab Rs 503,529 for 1446-1447 AH): Rs 600,000 of cash →
 *   2.5% = Rs 15,000; Rs 500,000 is below the nisab.
 */

const c = requireFigure(pk.pk, 'pk');
const run = (monthlySalary: number) => calculatePkSalaryTax({ monthlySalary }, c.salaryTax);

describe('salary tax, tax year 2027', () => {
  it.each([
    [1_200_000, 6_000],
    [2_200_000, 116_000],
    [3_200_000, 316_000],
    [4_100_000, 541_000],
    [5_600_000, 976_000],
    [7_000_000, 1_424_000],
  ])('FBR base at Rs %i is Rs %i', (income, base) => {
    expect(taxOnSchedule(income, c.salaryTax.current.bands)).toBeCloseTo(base, 6);
    expect(taxOnBands(income, pk.incomeTax.bands)).toBeCloseTo(base, 6);
  });

  it('Rs 200,000 a month', () => {
    const r = run(200_000);
    expect(r.yearlySalary).toBe(2_400_000);
    expect(r.current.yearlyTax).toBeCloseTo(116_000 + 0.2 * 200_000, 6);
    expect(r.current.monthlyTax).toBeCloseTo(13_000, 6);
    expect(r.previous.yearlyTax).toBeCloseTo(116_000 + 0.23 * 200_000, 6);
    expect(r.yearlySaving).toBeCloseTo(6_000, 6);
    expect(r.current.marginalRate).toBeCloseTo(20, 6);
    expect(r.current.monthlyTakeHome).toBeCloseTo(187_000, 6);
  });

  it('no tax up to Rs 600,000 a year; 1% band', () => {
    expect(run(50_000).current.yearlyTax).toBe(0);
    expect(run(100_000).current.yearlyTax).toBeCloseTo(6_000, 6);
  });

  it('tax year 2026: official bases and the 9% surcharge over Rs 10 million', () => {
    // Exactly Rs 3.2m is in the lower band ("does not exceed"); FBR's Rs 345,000 base applies above it.
    expect(taxOnSchedule(3_200_000, c.salaryTax.previous.bands)).toBeCloseTo(346_000, 6);
    expect(taxOnSchedule(3_200_100, c.salaryTax.previous.bands)).toBeCloseTo(345_030, 6);
    expect(taxOnSchedule(4_100_000, c.salaryTax.previous.bands)).toBeCloseTo(615_000, 6);
    const r = run(1_000_000);
    const base = 615_000 + 0.35 * (12_000_000 - 4_100_000);
    expect(r.previous.yearlyTax).toBeCloseTo(base * 1.09, 6);
    expect(r.previous.surcharge).toBeCloseTo(base * 0.09, 6);
    expect(r.current.surcharge).toBe(0);
    expect(r.current.yearlyTax).toBeCloseTo(1_424_000 + 0.35 * 5_000_000, 6);
  });

  it('validation', () => {
    expect(validatePkSalaryInput({ monthlySalary: -1 }).map((e) => e.field)).toEqual(['monthlySalary']);
    expect(validatePkSalaryInput({ monthlySalary: Number.NaN }).map((e) => e.field)).toEqual(['monthlySalary']);
  });
});

describe('zakat', () => {
  const base: ZakatInput = { cash: 600_000, bank: 0, goldGrams: 0, goldPricePer10g: 0, silverGrams: 0, silverPricePer10g: 0, investments: 0, receivables: 0, debts: 0, nisabBasis: 'official' };
  const z = (x: Partial<ZakatInput>) => calculateZakat({ ...base, ...x }, c.zakat);

  it('official nisab', () => {
    expect(z({}).zakat).toBeCloseTo(15_000, 6);
    expect(z({ cash: 500_000 }).zakat).toBe(0);
    expect(z({ cash: 503_529 }).aboveNisab).toBe(true);
  });

  it('gold and silver values, debts and the silver nisab', () => {
    const r = z({ cash: 100_000, goldGrams: 50, goldPricePer10g: 400_000, silverGrams: 100, silverPricePer10g: 5_000, debts: 50_000, nisabBasis: 'silver' });
    expect(r.goldValue).toBe(2_000_000);
    expect(r.silverValue).toBe(50_000);
    expect(r.netAssets).toBe(2_100_000);
    expect(r.nisab).toBeCloseTo(612.32 * 500, 6);
    expect(r.zakat).toBeCloseTo(52_500, 6);
  });

  it('gold nisab: 87.48 grams; flagged when there are other assets', () => {
    const r = z({ cash: 0, goldGrams: 80, goldPricePer10g: 400_000, nisabBasis: 'gold' });
    expect(r.nisab).toBeCloseTo(87.48 * 40_000, 6);
    expect(r.aboveNisab).toBe(false);
    expect(z({ goldGrams: 100, goldPricePer10g: 400_000, nisabBasis: 'gold' }).goldNisabWithOtherAssets).toBe(true);
  });

  it('validation needs prices when metals are entered', () => {
    expect(validateZakatInput({ ...base, goldGrams: 10 }).map((e) => e.field)).toEqual(['goldPricePer10g']);
    expect(validateZakatInput({ ...base, nisabBasis: 'silver' }).map((e) => e.field)).toEqual(['silverPricePer10g']);
    expect(validateZakatInput({ ...base, debts: -5 }).map((e) => e.field)).toEqual(['debts']);
  });
});

describe('loan (Pakistan defaults)', () => {
  it('outside check', () => {
    const r = calculateLoan({ principal: 1_000_000, aprPercent: 16, termMonths: 36 });
    expect(r.monthlyPayment).toBeCloseTo(35_157.03, 2);
    expect(r.totalInterest).toBeCloseTo(265_653.19, 2);
  });
});
