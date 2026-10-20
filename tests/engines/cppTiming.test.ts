import { describe, expect, it } from 'vitest';
import { requireFigure } from '../../src/countries';
import { ca } from '../../src/countries/ca';
import { calculateCppTiming, cppAdjustment, validateCppTimingInput, type CppTimingInput } from '../../src/engines/cppTiming';

/*
 * OUTSIDE CHECK (canada.ca "When to start your retirement pension", read 20 Oct 2026): payments decrease 0.6% a
 * month before 65, "a maximum reduction of 36% if you start at age 60", and increase 0.7% a month, "up to 42% at
 * age 70". Both limits are tested below.
 *
 * Hand check, $1,000 a month at 65:
 *   at 60: $640; at 70: $1,420. Break-even 70 vs 65: 1,420 (x − 70) = 1,000 (x − 65) → x = (99,400 − 65,000) ÷ 420 = 81.905
 *   Break-even 60 vs 65: 640 (x − 60) = 1,000 (x − 65) → x = (65,000 − 38,400) ÷ 360 = 73.889
 */

const p = requireFigure(ca.ca, 'ca').cpp;
const base: CppTimingInput = { pensionAt65: 1_000, startAge: 65, lifeExpectancy: 87 };
const run = (x: Partial<CppTimingInput>) => calculateCppTiming({ ...base, ...x }, p);

describe('CPP start age', () => {
  it('canada.ca limits: −36% at 60, +42% at 70', () => {
    expect(cppAdjustment(60, p)).toBeCloseTo(-0.36, 10);
    expect(cppAdjustment(70, p)).toBeCloseTo(0.42, 10);
    expect(cppAdjustment(65, p)).toBe(0);
    expect(cppAdjustment(63, p)).toBeCloseTo(-0.144, 10);
  });

  it('monthly amounts and totals', () => {
    expect(run({ startAge: 60 }).monthly).toBeCloseTo(640, 8);
    const r = run({ startAge: 70 });
    expect(r.monthly).toBeCloseTo(1_420, 8);
    expect(r.yearly).toBeCloseTo(17_040, 8);
    expect(r.totalByLifeExpectancy).toBeCloseTo(1_420 * 17 * 12, 6);
    expect(r.totalAt65ByLifeExpectancy).toBeCloseTo(1_000 * 22 * 12, 6);
  });

  it('break-even ages', () => {
    expect(run({ startAge: 70 }).breakEvenVs65).toBeCloseTo(81.905, 3);
    expect(run({ startAge: 60 }).breakEvenVs65).toBeCloseTo(73.889, 3);
    expect(run({}).breakEvenVs65).toBeNull();
  });

  it('table covers 60 to 70; no payments after the comparison age', () => {
    const r = run({ lifeExpectancy: 68 });
    expect(r.rows.map((x) => x.age)).toEqual([60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70]);
    expect(r.rows.at(-1)!.totalByLifeExpectancy).toBe(0);
  });

  it('validation', () => {
    expect(validateCppTimingInput({ pensionAt65: 2_000, startAge: 59, lifeExpectancy: 60 }, p).map((e) => e.field)).toEqual(['pensionAt65', 'startAge', 'lifeExpectancy']);
    expect(validateCppTimingInput({ ...base, startAge: 65.5 }, p).map((e) => e.field)).toEqual(['startAge']);
    expect(validateCppTimingInput(base, p)).toEqual([]);
  });

  it('maximum pension is accepted', () => {
    expect(run({ pensionAt65: p.maxMonthlyAt65, startAge: 70 }).monthly).toBeCloseTo(1_507.65 * 1.42, 6);
  });
});
