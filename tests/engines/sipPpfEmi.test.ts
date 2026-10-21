import { describe, expect, it } from 'vitest';
import { requireFigure } from '../../src/countries';
import { india } from '../../src/countries/in';
import { calculateLoan } from '../../src/engines/loan';
import { calculatePpf, validatePpfInput, type PpfInput } from '../../src/engines/ppf';
import { calculateSip, validateSipInput } from '../../src/engines/sip';

/*
 * OUTSIDE CHECK (calculator.net, 21 Oct 2026), all exact:
 *   EMI (amortization calculator): ₹25,00,000 at 8.5% for 20 years → ₹21,695.58 a month, interest ₹27,06,939.40;
 *     ₹10,00,000 at 10.5% for 5 years → ₹21,493.90, interest ₹2,89,634.02; ₹50,00,000 at 7.9% for 30 years → ₹36,340.27,
 *     interest ₹80,82,497.29
 *   SIP (investment calculator, monthly compounding, deposits at the start of each month): ₹10,000 a month at 12% for 10 years
 *     → ₹23,23,390.76; for 15 years → ₹50,45,760.00
 *   PPF (investment calculator, yearly compounding, deposits at the start of each year): ₹1,50,000 a year at 7.1% for 15 years
 *     → ₹40,68,209.22; ₹1,00,000 a year for 20 years → ₹44,38,858.78
 */

const ppfCfg = requireFigure(india.in, 'in').ppf;

describe('EMI (loan engine)', () => {
  it.each([
    [2_500_000, 8.5, 240, 21_695.58, 2_706_939.4],
    [1_000_000, 10.5, 60, 21_493.9, 289_634.02],
    [5_000_000, 7.9, 360, 36_340.27, 8_082_497.29],
  ])('₹%i at %f%% for %i months', (principal, apr, months, emi, interest) => {
    const r = calculateLoan({ principal, aprPercent: apr, termMonths: months });
    expect(r.monthlyPayment).toBeCloseTo(emi, 2);
    expect(r.totalInterest).toBeCloseTo(interest, 2);
  });
});

describe('SIP', () => {
  it('outside checks', () => {
    const r = calculateSip({ monthly: 10_000, returnPercent: 12, years: 10, stepUpPercent: 0 });
    expect(r.value).toBeCloseTo(2_323_390.76, 2);
    expect(r.invested).toBe(1_200_000);
    expect(calculateSip({ monthly: 10_000, returnPercent: 12, years: 15, stepUpPercent: 0 }).value).toBeCloseTo(5_045_760, 2);
  });

  it('step-up raises each year’s amount; 0% just adds deposits', () => {
    const r = calculateSip({ monthly: 10_000, returnPercent: 12, years: 2, stepUpPercent: 10 });
    expect(r.invested).toBeCloseTo(120_000 + 132_000, 6);
    expect(calculateSip({ monthly: 5_000, returnPercent: 0, years: 3, stepUpPercent: 0 }).value).toBe(180_000);
  });

  it('validation', () => {
    expect(validateSipInput({ monthly: 0, returnPercent: 60, years: 0, stepUpPercent: 0 }).map((e) => e.field)).toEqual(['monthly', 'returnPercent', 'years']);
  });
});

describe('PPF', () => {
  const run = (x: Partial<PpfInput>) => calculatePpf({ yearly: 150_000, ratePercent: 7.1, years: 15, timing: 'yearStart', ...x }, ppfCfg);

  it('outside checks', () => {
    const r = run({});
    expect(r.maturity).toBeCloseTo(4_068_209.22, 2);
    expect(r.invested).toBe(2_250_000);
    expect(run({ yearly: 100_000, years: 20 }).maturity).toBeCloseTo(4_438_858.78, 2);
  });

  it('monthly deposits earn less than one deposit by 5 April', () => {
    const m = run({ timing: 'monthly' });
    expect(m.years[0]!.interest).toBeCloseTo(0.071 / 12 * (150_000 / 12) * 78, 6);
    expect(m.maturity).toBeLessThan(4_068_209.22);
  });

  it('limits and extensions', () => {
    expect(run({ yearly: 200_000 }).aboveMaximum).toBe(true);
    expect(run({ yearly: 400 }).belowMinimum).toBe(true);
    expect(validatePpfInput({ yearly: 1_000, ratePercent: 7.1, years: 16, timing: 'yearStart' }, ppfCfg).map((e) => e.field)).toEqual(['years']);
    expect(validatePpfInput({ yearly: 1_000, ratePercent: 7.1, years: 20, timing: 'yearStart' }, ppfCfg)).toEqual([]);
    expect(validatePpfInput({ yearly: 1_000, ratePercent: 7.1, years: 10, timing: 'yearStart' }, ppfCfg).map((e) => e.field)).toEqual(['years']);
  });
});
