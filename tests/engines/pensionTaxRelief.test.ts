import { describe, expect, it } from 'vitest';
import { requireFigure } from '../../src/countries';
import { uk } from '../../src/countries/uk';
import { calculatePensionRelief, validatePensionReliefInput, type PensionReliefInput, type PensionReliefParams } from '../../src/engines/pensionTaxRelief';

/*
 * OUTSIDE CHECK 1 (GOV.UK, Tax on your private pension: pension tax relief, worked example; checked
 * 20 Oct 2026): earning £60,270 and paying £12,000 into a relief at source scheme, you can claim extra 20%
 * relief on £10,000 (the income taxed at 40%) and no extra on the other £2,000. Ours: £2,400 added at
 * source + £2,000 extra (exact).
 * OUTSIDE CHECK 2 (GOV.UK, same page, Scotland): extra relief of 1% on income taxed at 21%, 22% at 42%, and
 * relief at 20% for income taxed at 19% with nothing to pay back. Ours matches each (cases below).
 * OUTSIDE CHECK 3 (listentotaxman.com, 2026/27, 20 Oct 2026): £40,000 with 5% salary sacrifice: tax
 * £5,084.20 vs £5,484.20 without (−£400) and NI £2,034.40 vs £2,194.40 (−£160). Ours: £400 + £160 (exact).
 * The taper case is hand-checked from the bands.
 */

const c = requireFigure(uk.uk, 'uk');
const t = c.takeHomePay;
const ni = t.nationalInsurance;
const pe = c.pensions;
const P: PensionReliefParams = {
  personalAllowance: uk.incomeTax.allowance,
  taperStart: requireFigure(t.personalAllowanceTaperStart, 'a'),
  taperRate: requireFigure(t.personalAllowanceTaperRate, 'b'),
  bands: { rUK: uk.incomeTax.bands, scotland: requireFigure(t.scotlandBands, 'c') },
  ni: {
    primaryThreshold: requireFigure(ni.primaryThreshold, 'd'),
    upperEarningsLimit: requireFigure(ni.upperEarningsLimit, 'e'),
    mainRate: requireFigure(ni.mainRate, 'f'),
    upperRate: requireFigure(ni.upperRate, 'g'),
  },
  reliefAtSourceRate: requireFigure(t.reliefAtSourceRate, 'h'),
  annualAllowance: requireFigure(pe.annualAllowance, 'i'),
  taperThresholdIncome: requireFigure(pe.taperThresholdIncome, 'j'),
  taperAdjustedIncome: requireFigure(pe.taperAdjustedIncome, 'k'),
  taperMinimum: requireFigure(pe.taperMinimum, 'l'),
  moneyPurchaseAnnualAllowance: requireFigure(pe.moneyPurchaseAnnualAllowance, 'm'),
  nonEarnerGrossLimit: requireFigure(pe.nonEarnerGrossLimit, 'n'),
};

const base: PensionReliefInput = { salary: 60_270, region: 'rUK', method: 'reliefAtSource', contribution: 12_000, employerContribution: 0, flexiblyAccessed: false };
const run = (x: Partial<PensionReliefInput>) => calculatePensionRelief({ ...base, ...x }, P);

describe('relief at source', () => {
  it('outside check 1: the GOV.UK worked example', () => {
    const r = run({}).chosen;
    expect(r.reliefAddedByProvider).toBeCloseTo(2_400, 6);
    expect(r.extraReliefToClaim).toBeCloseTo(2_000, 6);
    expect(r.costToYou).toBeCloseTo(7_600, 6);
  });

  it('basic-rate taxpayer: 20% at source, nothing extra', () => {
    const r = run({ salary: 35_000, contribution: 2_000 }).chosen;
    expect(r.totalRelief).toBeCloseTo(400, 6);
    expect(r.extraReliefToClaim).toBeCloseTo(0, 6);
  });

  it('outside check 2: Scottish rates (21% → 1% extra, 42% → 22% extra, 19% → 20% with no clawback)', () => {
    expect(run({ region: 'scotland', salary: 35_000, contribution: 1_000 }).chosen.extraReliefToClaim).toBeCloseTo(10, 6);
    expect(run({ region: 'scotland', salary: 50_000, contribution: 2_000 }).chosen.extraReliefToClaim).toBeCloseTo(440, 6);
    const starter = run({ region: 'scotland', salary: 15_000, contribution: 1_000 }).chosen;
    expect(starter.totalRelief).toBeCloseTo(200, 6);
    expect(starter.extraReliefToClaim).toBeCloseTo(0, 6);
  });

  it('no earnings: relief on up to £3,600 gross only', () => {
    expect(run({ salary: 0, contribution: 3_600 }).chosen.totalRelief).toBeCloseTo(720, 6);
    const over = run({ salary: 0, contribution: 5_000 }).chosen;
    expect(over.totalRelief).toBeCloseTo(720, 6);
    expect(over.unrelieved).toBe(1_400);
  });
});

describe('net pay and salary sacrifice', () => {
  it('net pay: relief at your own rate, nothing for a non-taxpayer', () => {
    const low = run({ method: 'netPay', salary: 10_000, contribution: 1_000 });
    expect(low.chosen.totalRelief).toBe(0);
    expect(low.all.reliefAtSource.totalRelief).toBeCloseTo(200, 6);
  });

  it('salary sacrifice saves Income Tax and employee NI', () => {
    const r = run({ method: 'salarySacrifice', salary: 40_000, contribution: 2_000 }).chosen;
    expect(r.incomeTaxSaved).toBeCloseTo(400, 6);
    expect(r.niSaved).toBeCloseTo(160, 6);
    expect(r.costToYou).toBeCloseTo(1_440, 6);
  });

  it('£100,000 to £125,140: contributions restore Personal Allowance (60% relief)', () => {
    const r = run({ method: 'netPay', salary: 110_000, contribution: 10_000 });
    expect(r.chosen.incomeTaxSaved).toBeCloseTo(6_000, 6);
    expect(r.all.reliefAtSource.totalRelief).toBeCloseTo(6_000, 6);
    expect(r.marginalRate).toBeCloseTo(0.6, 10);
  });

  it('0 contribution gives 0 relief', () => {
    const r = run({ contribution: 0 });
    for (const m of Object.values(r.all)) expect(m.totalRelief).toBe(0);
  });
});

describe('annual allowance', () => {
  it('tapers by £1 for every £2 of adjusted income over £260,000, down to £10,000', () => {
    const r = run({ method: 'netPay', salary: 300_000, contribution: 40_000, employerContribution: 20_000 });
    expect(r.allowanceTapered).toBe(true);
    expect(r.allowance).toBe(30_000);
    expect(r.overAllowance).toBe(30_000);
    expect(run({ method: 'netPay', salary: 400_000, contribution: 10_000, employerContribution: 0 }).allowance).toBe(10_000);
  });

  it('no taper when threshold income is £200,000 or less; money purchase allowance after flexible access', () => {
    const r = run({ method: 'netPay', salary: 250_000, contribution: 60_000, employerContribution: 20_000 });
    expect(r.allowanceTapered).toBe(false);
    expect(r.allowance).toBe(60_000);
    expect(run({ salary: 50_000, contribution: 12_000, flexiblyAccessed: true }).overAllowance).toBe(2_000);
  });

  it('large values stay finite', () => {
    const r = run({ salary: 10_000_000, contribution: 1_000_000, employerContribution: 1_000_000 });
    expect(Number.isFinite(r.chosen.totalRelief)).toBe(true);
  });
});

describe('validatePensionReliefInput', () => {
  it('flags empty, negative and impossible amounts', () => {
    expect(validatePensionReliefInput({ ...base, salary: Number.NaN, contribution: -1 }).map((e) => e.field)).toEqual(['salary', 'contribution']);
    expect(validatePensionReliefInput({ ...base, method: 'salarySacrifice', salary: 1_000, contribution: 2_000 }).map((e) => e.field)).toEqual(['contribution']);
    expect(validatePensionReliefInput({ ...base, salary: 1_000, contribution: 2_000 })).toEqual([]);
  });
});
