import { describe, expect, it } from 'vitest';
import { requireFigure } from '../../src/countries';
import { us } from '../../src/countries/us';
import { calculateRothIra, rothLimit, validateRothInput, type RothInput, type RothParams } from '../../src/engines/rothIra';

/*
 * OUTSIDE CHECK 1 (IRS Pub 590-A, Worksheet 2-2, with the 2026 limits from IR-2025-111; 20 Oct 2026),
 * worked line by line: single, MAGI $155,000 → $7,500 × 0.133 = $997.50 → $6,502.50 → $6,510;
 * $160,000 → 0.467 → $4,000; $167,500 → 0.967 → $250 (above the $200 floor); $168,000+ → $0;
 * joint, age 55, MAGI $245,000 → $8,600 × 0.3 → $6,020.
 * OUTSIDE CHECK 2 (calculator.net Roth IRA calculator, 20 Oct 2026): $30,000 start, $7,500 a year, 6%,
 * age 30 to 65 → $1,066,343 with contributions at the end of each year. The same formula here gives
 * $1,066,343.45 (calculator.net rounds to $1,066,343). We pay contributions monthly through the year, which gives $1,089,085.09 (2.1% more,
 * because money goes in earlier), the same timing as our 401(k) calculator.
 */

const c = requireFigure(us.us, 'us').rothIra;
const P: RothParams = {
  contributionLimit: requireFigure(c.contributionLimit, 'a'),
  catchUp: requireFigure(c.catchUp, 'b'),
  catchUpAge: requireFigure(c.catchUpAge, 'c'),
  phaseOut: {
    single: { start: requireFigure(c.phaseOut.single.start, 'd'), width: requireFigure(c.phaseOut.single.width, 'e') },
    marriedJoint: { start: requireFigure(c.phaseOut.marriedJoint.start, 'f'), width: requireFigure(c.phaseOut.marriedJoint.width, 'g') },
    marriedSeparate: { start: requireFigure(c.phaseOut.marriedSeparate.start, 'h'), width: requireFigure(c.phaseOut.marriedSeparate.width, 'i') },
  },
  roundTo: requireFigure(c.roundTo, 'j'),
  reducedMinimum: requireFigure(c.reducedMinimum, 'k'),
};
const base: RothInput = { age: 30, retirementAge: 65, currentBalance: 5_000, plannedContribution: 7_500, status: 'single', magi: 75_000, compensation: 75_000, returnPercent: 7 };

describe('rothLimit (Worksheet 2-2)', () => {
  it('outside check 1: phase-out cases', () => {
    expect(rothLimit(35, 'single', 75_000, 200_000, P).allowed).toBe(7_500);
    expect(rothLimit(35, 'single', 155_000, 200_000, P).allowed).toBe(6_510);
    expect(rothLimit(35, 'headOfHousehold', 160_000, 200_000, P).allowed).toBe(4_000);
    expect(rothLimit(35, 'single', 167_500, 200_000, P).allowed).toBe(250);
    expect(rothLimit(35, 'single', 168_000, 200_000, P).allowed).toBe(0);
    expect(rothLimit(55, 'marriedJoint', 245_000, 300_000, P).allowed).toBe(6_020);
  });

  it('catch-up from 50, capped at compensation, $200 floor, married filing separately', () => {
    expect(rothLimit(50, 'single', 50_000, 50_000, P).allowed).toBe(8_600);
    expect(rothLimit(30, 'single', 4_000, 4_000, P).allowed).toBe(4_000);
    expect(rothLimit(30, 'single', 167_900, 200_000, P).allowed).toBe(200);
    expect(rothLimit(30, 'marriedSeparate', 5_000, 50_000, P).allowed).toBe(3_750);
    expect(rothLimit(30, 'marriedSeparate', 10_000, 50_000, P).allowed).toBe(0);
  });
});

describe('calculateRothIra', () => {
  it('outside check 2: projection to 65 (monthly contributions)', () => {
    const r = calculateRothIra({ ...base, currentBalance: 30_000, returnPercent: 6 }, P);
    expect(r.balance).toBeCloseTo(1_089_085.09, 1);
    expect(r.totalContributions).toBe(262_500);
    // calculator.net's end-of-year method for comparison.
    const endOfYear = 30_000 * 1.06 ** 35 + 7_500 * ((1.06 ** 35 - 1) / 0.06);
    expect(endOfYear).toBeCloseTo(1_066_343.45, 1);
  });

  it('contributions above the limit are capped; catch-up starts at 50', () => {
    const r = calculateRothIra({ ...base, age: 48, retirementAge: 52, plannedContribution: 10_000, returnPercent: 0, currentBalance: 0 }, P);
    expect(r.rows.map((y) => y.contribution)).toEqual([7_500, 7_500, 8_600, 8_600]);
    expect(r.balance).toBeCloseTo(32_200, 8);
  });

  it('income over the limit: nothing goes in, the balance still grows', () => {
    const r = calculateRothIra({ ...base, magi: 200_000, compensation: 200_000 }, P);
    expect(r.allowedThisYear).toBe(0);
    expect(r.totalContributions).toBe(0);
    expect(r.balance).toBeCloseTo(5_000 * 1.07 ** 35, 4);
  });

  it('0% return; big values stay finite', () => {
    const r = calculateRothIra({ ...base, returnPercent: 0, retirementAge: 31 }, P);
    expect(r.balance).toBe(12_500);
    expect(Number.isFinite(calculateRothIra({ ...base, currentBalance: 100_000_000, returnPercent: 30, age: 18, retirementAge: 100 }, P).balance)).toBe(true);
  });
});

describe('validateRothInput', () => {
  it('flags bad values', () => {
    expect(validateRothInput({ ...base, age: 40, retirementAge: 40, magi: -1 }).map((e) => e.field)).toEqual(['retirementAge', 'magi']);
    expect(() => calculateRothIra({ ...base, age: Number.NaN }, P)).toThrow(RangeError);
  });
});
