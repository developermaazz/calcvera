import { describe, expect, it } from 'vitest';
import { caTaxParamsByProvince } from '../../src/calculators/caTax';
import { requireFigure } from '../../src/countries';
import { ca } from '../../src/countries/ca';
import { caIncomeTaxOnly } from '../../src/engines/caTakeHome';
import { calculateRrspVsTfsa, validateRrspVsTfsaInput, type RrspVsTfsaInput } from '../../src/engines/rrspVsTfsa';

/*
 * OUTSIDE CHECK (calculator.net investment calculator, annual deposits at the start of each year, compounded
 * annually; 20 Oct 2026), all exact:
 *   1. $5,000 a year at 6% for 25 years → $290,781.91 (the RRSP)
 *   2. $3,517.50 a year at 6% for 25 years → $204,565.08 (the TFSA: $5,000 less 29.65% tax)
 *   3. $7,000 a year at 7% for 30 years → $707,511.29
 */

const base: RrspVsTfsaInput = { contribution: 5_000, years: 25, returnPercent: 6, rateNow: 0.2965, rateLater: 0.2005 };
const run = (x: Partial<RrspVsTfsaInput>) => calculateRrspVsTfsa({ ...base, ...x });

describe('RRSP vs TFSA', () => {
  it('outside checks 1 and 2', () => {
    const r = run({});
    expect(r.rrspValue).toBeCloseTo(290_781.91, 2);
    expect(r.tfsaDeposit).toBeCloseTo(3_517.5, 6);
    expect(r.tfsaValue).toBeCloseTo(204_565.08, 2);
    expect(r.rrspAfterTax).toBeCloseTo(290_781.91 * (1 - 0.2005), 2);
    expect(r.winner).toBe('rrsp');
  });

  it('outside check 3', () => {
    expect(run({ contribution: 7_000, years: 30, returnPercent: 7 }).rrspValue).toBeCloseTo(707_511.29, 2);
  });

  it('equal tax rates give the same result; a higher rate later favours the TFSA', () => {
    expect(run({ rateLater: 0.2965 }).winner).toBe('same');
    expect(run({ rateLater: 0.2965 }).difference).toBeCloseTo(0, 6);
    expect(run({ rateLater: 0.35 }).winner).toBe('tfsa');
  });

  it('refund and rows', () => {
    const r = run({});
    expect(r.refund).toBeCloseTo(1_482.5, 6);
    expect(r.rows).toHaveLength(25);
    expect(r.rows[0]!.rrspValue).toBeCloseTo(5_300, 6);
  });

  it('0% return just adds deposits', () => {
    expect(run({ returnPercent: 0 }).rrspValue).toBe(125_000);
  });

  it('tax-only helper: no employment credits', () => {
    const on = caTaxParamsByProvince(ca).ON!;
    const { ontarioHealthPremium, ...payroll } = requireFigure(ca.ca, 'ca').payroll;
    const p = { tax: on, payroll, ontarioHealthPremium };
    // $50,000 in Ontario: 14% federal + 5.05% Ontario; the health premium is at its $600 cap ($48,000–$72,000).
    const m = (caIncomeTaxOnly(50_100, p) - caIncomeTaxOnly(50_000, p)) / 100;
    expect(m).toBeCloseTo(0.14 + 0.0505, 8);
  });

  it('validation', () => {
    expect(validateRrspVsTfsaInput({ ...base, contribution: 0, years: 0, returnPercent: 25 }).map((e) => e.field)).toEqual(['contribution', 'years', 'returnPercent']);
    expect(validateRrspVsTfsaInput(base)).toEqual([]);
  });
});
