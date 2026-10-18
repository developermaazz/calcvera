import { describe, expect, it } from 'vitest';
import { requireFigure } from '../../src/countries';
import { au } from '../../src/countries/au';
import { auIncomeTax, lowIncomeTaxOffset, medicareLevy, type AuTaxParams } from '../../src/engines/auIncomeTax';
import { calculateNovatedLease, validateNovatedLeaseInput, type NovatedLeaseInput, type NovatedLeaseParams } from '../../src/engines/novatedLease';

/*
 * OUTSIDE CHECK (18 Oct 2026): lease payment via calculator.net finance calculator (PV $50,000, FV $23,440,
 *   36 months, 8%) = $988.56 (exact). Tax at $90,000 = $17,520, matching the ATO 2026–27 table formula
 *   ($4,020 plus 30c for each $1 over $45,000). talent.com's AU calculator still uses 2023–24 rates, so it
 *   wasn't used.
 *
 * Hand checks (2026–27 ATO rates):
 *   $90,000: 15% × 26,800 + 30% × 45,000 = 17,520 tax, no LITO, Medicare levy 2% = 1,800 → 19,320
 *   $40,000: 15% × 21,800 = 3,270 − LITO 575 = 2,695 + levy 800 → 3,495
 *   $30,000: 1,770 − 700 = 1,070 + reduced levy 10% × (30,000 − 28,011) = 198.90 → 1,268.90
 * Lease figures from an independent script (scratch reference).
 */

const c = requireFigure(au.au, 'au');
const tax: AuTaxParams = {
  taxFreeThreshold: au.incomeTax.allowance,
  bands: au.incomeTax.bands,
  lito: {
    maxOffset: requireFigure(c.lowIncomeTaxOffset.maxOffset, 'lito'),
    firstTaperStart: requireFigure(c.lowIncomeTaxOffset.firstTaperStart, 'a'),
    firstTaperRate: requireFigure(c.lowIncomeTaxOffset.firstTaperRate, 'b'),
    secondTaperStart: requireFigure(c.lowIncomeTaxOffset.secondTaperStart, 'c'),
    secondTaperRate: requireFigure(c.lowIncomeTaxOffset.secondTaperRate, 'd'),
    cutOut: requireFigure(c.lowIncomeTaxOffset.cutOut, 'e'),
  },
  medicare: {
    rate: requireFigure(c.medicareLevy.rate, 'ml'),
    lowIncomeThreshold: requireFigure(c.medicareLevy.lowIncomeThreshold, 'low'),
    lowIncomeUpperThreshold: requireFigure(c.medicareLevy.lowIncomeUpperThreshold, 'up'),
    shadeInRate: requireFigure(c.medicareLevy.shadeInRate, 'shade'),
  },
};
const r = c.novatedLease.minimumResidualByTermYears;
const params: NovatedLeaseParams = {
  tax,
  minimumResidualByTermYears: {
    1: requireFigure(r[1], 'r1'),
    2: requireFigure(r[2], 'r2'),
    3: requireFigure(r[3], 'r3'),
    4: requireFigure(r[4], 'r4'),
    5: requireFigure(r[5], 'r5'),
  },
  carCostLimit: requireFigure(c.novatedLease.carCostLimit, 'limit'),
  gstRate: requireFigure(c.novatedLease.gstRate, 'gst'),
  statutoryFraction: requireFigure(c.fbt.statutoryFraction, 'fbt'),
  evExemptionPriceThreshold: requireFigure(c.fbt.evExemptionPriceThreshold, 'ev'),
};

const base: NovatedLeaseInput = {
  salary: 90_000,
  carPrice: 55_000,
  termYears: 3,
  interestRatePercent: 8,
  runningCostsAnnual: 4_000,
  isElectric: false,
};

describe('auIncomeTax', () => {
  it('works out tax, LITO and Medicare levy', () => {
    expect(auIncomeTax(90_000, tax).total).toBeCloseTo(19_320, 6);
    expect(auIncomeTax(40_000, tax).total).toBeCloseTo(3_495, 6);
    expect(auIncomeTax(30_000, tax).total).toBeCloseTo(1_268.9, 6);
  });

  it('LITO tapers from $700 to zero at $66,667', () => {
    expect(lowIncomeTaxOffset(37_500, tax.lito)).toBe(700);
    expect(lowIncomeTaxOffset(45_000, tax.lito)).toBeCloseTo(325, 8);
    expect(lowIncomeTaxOffset(66_667, tax.lito)).toBe(0);
  });

  it('no Medicare levy at or below the low-income threshold; full 2% above the upper one', () => {
    expect(medicareLevy(28_011, tax.medicare)).toBe(0);
    expect(medicareLevy(36_000, tax.medicare)).toBeCloseTo(720, 8);
  });
});

describe('calculateNovatedLease', () => {
  it('petrol car under the employee contribution method', () => {
    const res = calculateNovatedLease(base, params);
    expect(res.financedAmount).toBeCloseTo(50_000, 6);
    expect(res.residual).toBeCloseTo(23_440, 6);
    expect(res.monthlyLeasePayment).toBeCloseTo(988.56, 2);
    expect(res.postTaxDeduction).toBeCloseTo(11_000, 6);
    expect(res.preTaxDeduction).toBeCloseTo(5_499.09, 2);
    expect(res.takeHomeReduction).toBeCloseTo(14_739.38, 2);
    expect(res.savings).toBeCloseTo(-3_002.14, 2);
  });

  it('eligible EV is FBT-exempt: all pre-tax, much cheaper than buying', () => {
    const res = calculateNovatedLease({ ...base, isElectric: true }, params);
    expect(res.fbtExempt).toBe(true);
    expect(res.postTaxDeduction).toBe(0);
    expect(res.preTaxDeduction).toBeCloseTo(15_499.09, 2);
    expect(res.savings).toBeCloseTo(9_597.86, 2);
  });

  it('EV above the luxury car tax threshold is not exempt', () => {
    const res = calculateNovatedLease({ ...base, isElectric: true, carPrice: 95_000 }, params);
    expect(res.fbtExempt).toBe(false);
    expect(res.postTaxDeduction).toBeCloseTo(19_000, 6);
  });

  it('GST credit is capped at the car limit ÷ 11', () => {
    const res = calculateNovatedLease({ ...base, carPrice: 88_000 }, params);
    expect(res.gstCredit).toBeCloseTo(69_883 / 11, 6);
  });

  it('uses the ATO minimum residual for each term', () => {
    expect(calculateNovatedLease({ ...base, termYears: 1 }, params).residualPercent).toBe(0.6563);
    expect(calculateNovatedLease({ ...base, termYears: 5 }, params).residualPercent).toBe(0.2813);
  });

  it('0% interest: payments cover the financed amount minus the residual exactly', () => {
    const res = calculateNovatedLease({ ...base, interestRatePercent: 0 }, params);
    expect(res.monthlyLeasePayment * 36 + res.residual).toBeCloseTo(res.financedAmount, 6);
  });

  it('validates inputs', () => {
    const fields = validateNovatedLeaseInput({ ...base, salary: 0, carPrice: 500, termYears: 6, interestRatePercent: -1 }).map((e) => e.field);
    expect(fields).toEqual(['salary', 'carPrice', 'termYears', 'interestRatePercent']);
  });
});
