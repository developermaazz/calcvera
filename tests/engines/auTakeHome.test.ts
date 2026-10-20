import { describe, expect, it } from 'vitest';
import { requireFigure } from '../../src/countries';
import { au } from '../../src/countries/au';
import { auTakeHomeParams } from '../../src/calculators/auTakeHome/params';
import { calculateAuTakeHome, helpRepayment, mlsRate, validateAuTakeHomeInput, type AuTakeHomeInput, type AuTakeHomeParams } from '../../src/engines/auTakeHome';

/*
 * OUTSIDE CHECK (ATO worked examples, 2026–27, read 20 Oct 2026), all exact:
 *   HELP repayment income $86,380 → $2,527.80; $137,064 → $10,276.99; $254,780 → $25,478
 *   (study-and-training-support-loans-rates-and-repayment-thresholds, examples 1–3)
 *   Medicare levy surcharge, single, income for MLS purposes $117,000 → Tier 1, 1% → $1,170
 * Tax at $90,000 = $17,520, matching the ATO 2026–27 table formula ($4,020 plus 30c for each $1 over $45,000).
 *
 * Hand checks (2026–27):
 *   $90,000 salary: tax 17,520 + Medicare levy 1,800 → take-home 70,680; super 12% = 10,800
 *   + HELP: 15% × (90,000 − 69,528) = 3,070.80
 *   $10,000 salary sacrifice: taxable 80,000 → tax 4,020 + 30% × 35,000 = 14,520, levy 1,600; HELP income still 90,000
 *   $30,000: tax 1,770 − LITO 700 = 1,070 + reduced levy 10% × (30,000 − 28,011) = 198.90
 */

const c = requireFigure(au.au, 'au');
const p: AuTakeHomeParams = auTakeHomeParams(au);
const base: AuTakeHomeInput = { salary: 90_000, includesSuper: false, salarySacrifice: 0, hasHelpDebt: false, hasPrivateHospitalCover: true };
const run = (x: Partial<AuTakeHomeInput>) => calculateAuTakeHome({ ...base, ...x }, p);

describe('ATO examples', () => {
  it('HELP repayments', () => {
    expect(helpRepayment(86_380, c.help)).toBeCloseTo(2_527.8, 2);
    expect(helpRepayment(137_064, c.help)).toBeCloseTo(10_276.99, 2);
    expect(helpRepayment(254_780, c.help)).toBeCloseTo(25_478, 2);
    expect(helpRepayment(69_528, c.help)).toBe(0);
  });

  it('Medicare levy surcharge tiers', () => {
    expect(mlsRate(117_000, c.mls) * 117_000).toBeCloseTo(1_170, 6);
    expect(mlsRate(105_000, c.mls)).toBe(0);
    expect(mlsRate(105_001, c.mls)).toBe(0.01);
    expect(mlsRate(123_001, c.mls)).toBe(0.0125);
    expect(mlsRate(164_001, c.mls)).toBe(0.015);
  });
});

describe('take-home pay', () => {
  it('$90,000 salary', () => {
    const r = run({});
    expect(r.incomeTax).toBeCloseTo(17_520, 6);
    expect(r.medicareLevy).toBeCloseTo(1_800, 6);
    expect(r.takeHome).toBeCloseTo(70_680, 6);
    expect(r.superGuarantee).toBeCloseTo(10_800, 6);
    expect(r.effectiveTaxRate).toBeCloseTo((19_320 / 90_000) * 100, 8);
  });

  it('a package including super splits out the super guarantee', () => {
    const r = run({ salary: 100_800, includesSuper: true });
    expect(r.baseSalary).toBeCloseTo(90_000, 6);
    expect(r.takeHome).toBeCloseTo(70_680, 6);
  });

  it('HELP repayment comes off take-home pay', () => {
    const r = run({ hasHelpDebt: true });
    expect(r.helpRepayment).toBeCloseTo(3_070.8, 6);
    expect(r.takeHome).toBeCloseTo(70_680 - 3_070.8, 6);
  });

  it('salary sacrifice lowers tax but still counts for HELP', () => {
    const r = run({ salarySacrifice: 10_000, hasHelpDebt: true });
    expect(r.taxableIncome).toBe(80_000);
    expect(r.incomeTax).toBeCloseTo(14_520, 6);
    expect(r.medicareLevy).toBeCloseTo(1_600, 6);
    expect(r.helpRepayment).toBeCloseTo(3_070.8, 6);
    expect(r.totalSuper).toBeCloseTo(20_800, 6);
  });

  it('Medicare levy surcharge without private hospital cover', () => {
    const r = run({ salary: 120_000, hasPrivateHospitalCover: false });
    expect(r.mlsRate).toBe(0.01);
    expect(r.medicareLevySurcharge).toBeCloseTo(1_200, 6);
    expect(run({ salary: 100_000, salarySacrifice: 10_000, hasPrivateHospitalCover: false }).mlsRate).toBe(0);
    expect(run({ salary: 110_000, salarySacrifice: 10_000, hasPrivateHospitalCover: false }).medicareLevySurcharge).toBeCloseTo(1_000, 6);
  });

  it('low income: offset and reduced Medicare levy', () => {
    const r = run({ salary: 30_000 });
    expect(r.lito).toBe(700);
    expect(r.incomeTax + r.medicareLevy).toBeCloseTo(1_268.9, 6);
  });

  it('super guarantee stops at the maximum contribution base; concessional cap warning', () => {
    const r = run({ salary: 400_000 });
    expect(r.superGuarantee).toBeCloseTo(270_830 * 0.12, 6);
    expect(run({ salary: 400_000, includesSuper: true }).baseSalary).toBeCloseTo(400_000 - 270_830 * 0.12, 6);
    expect(run({ salary: 200_000, salarySacrifice: 10_000 }).overConcessionalCap).toBe(true);
    expect(run({ salary: 200_000, salarySacrifice: 8_000 }).overConcessionalCap).toBe(false);
  });

  it('validation', () => {
    expect(validateAuTakeHomeInput({ ...base, salary: 0, salarySacrifice: -1 }).map((e) => e.field)).toEqual(['salary', 'salarySacrifice']);
    expect(validateAuTakeHomeInput(base)).toEqual([]);
    expect(run({ salarySacrifice: 200_000 }).taxableIncome).toBe(0);
  });
});
