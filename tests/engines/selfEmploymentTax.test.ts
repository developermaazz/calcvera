import { describe, expect, it } from 'vitest';
import { requireFigure } from '../../src/countries';
import type { UsFilingStatus } from '../../src/countries/types';
import { us } from '../../src/countries/us';
import {
  calculateSelfEmploymentTax,
  validateSelfEmploymentTaxInput,
  type SelfEmploymentTaxInput,
  type SelfEmploymentTaxParams,
} from '../../src/engines/selfEmploymentTax';

/*
 * Expected values from an independent script following Schedule SE lines 4a–13, Form 8959 Part II and
 * the 2026 Rev. Proc. 2025-32 tables (scratch reference). Hand check for $60,000:
 *   net earnings 60,000 × 92.35% = 55,410; SE tax = 15.3% × 55,410 = 8,477.73
 */

const c = requireFigure(us.us, 'us');
const params = (status: UsFilingStatus): SelfEmploymentTaxParams => ({
  bands: requireFigure(c.federalTax[status].bands, 'bands'),
  standardDeduction: requireFigure(c.federalTax[status].standardDeduction, 'std'),
  netEarningsFactor: requireFigure(c.selfEmployment.netEarningsFactor, 'factor'),
  socialSecurityRate: requireFigure(c.selfEmployment.socialSecurityRate, 'ss'),
  medicareRate: requireFigure(c.selfEmployment.medicareRate, 'med'),
  socialSecurityWageBase: requireFigure(c.selfEmployment.socialSecurityWageBase, 'base'),
  additionalMedicareRate: requireFigure(c.selfEmployment.additionalMedicareRate, 'addl'),
  additionalMedicareThreshold: requireFigure(c.selfEmployment.additionalMedicareThreshold[status], 'addlThreshold'),
  deductibleShare: requireFigure(c.selfEmployment.deductibleShare, 'half'),
  minimumNetEarnings: requireFigure(c.selfEmployment.minimumNetEarnings, 'min'),
  qbi: {
    rate: requireFigure(c.qbi.rate, 'qbi'),
    minimumDeduction: requireFigure(c.qbi.minimumDeduction, 'qbiMin'),
    minimumQbi: requireFigure(c.qbi.minimumQbi, 'qbiMinQbi'),
    threshold: requireFigure(c.qbi.threshold[status], 'qbiThreshold'),
    phaseInEnd: requireFigure(c.qbi.phaseInEnd[status], 'qbiEnd'),
  },
});

const base: SelfEmploymentTaxInput = {
  netSelfEmployment: 60_000,
  filingStatus: 'single',
  wages: 0,
  otherIncome: 0,
  deduction: 'standard',
  itemizedAmount: 0,
  taxWithheld: 0,
};

describe('calculateSelfEmploymentTax', () => {
  it('single, $60,000 of self-employment income', () => {
    const r = calculateSelfEmploymentTax(base, params('single'));
    expect(r.netEarnings).toBeCloseTo(55_410, 6);
    expect(r.selfEmploymentTax).toBeCloseTo(8_477.73, 2);
    expect(r.adjustedGrossIncome).toBeCloseTo(55_761.14, 2);
    expect(r.qbiDeduction).toBeCloseTo(7_932.23, 2); // limited to 20% of taxable income
    expect(r.taxableIncome).toBeCloseTo(31_728.91, 2);
    expect(r.incomeTax).toBeCloseTo(3_559.47, 2);
    expect(r.totalTax).toBeCloseTo(12_037.2, 2);
    expect(r.quarterlyPayment).toBeCloseTo(3_009.3, 2);
  });

  it('single, $250,000: Additional Medicare Tax and a partly phased-out QBI deduction', () => {
    const r = calculateSelfEmploymentTax({ ...base, netSelfEmployment: 250_000 }, params('single'));
    expect(r.selfEmploymentTax).toBeCloseTo(29_573.375, 6);
    expect(r.additionalMedicareTax).toBeCloseTo(277.88, 2);
    expect(r.qbiLimited).toBe(true);
    expect(r.qbiDeduction).toBeCloseTo(33_677.24, 2);
    expect(r.totalTax).toBeCloseTo(66_953.91, 2);
  });

  it('married filing jointly with $100,000 of wages: wages use up the Social Security wage base', () => {
    const r = calculateSelfEmploymentTax(
      { ...base, netSelfEmployment: 120_000, filingStatus: 'marriedJoint', wages: 100_000 },
      params('marriedJoint'),
    );
    expect(r.socialSecurityTax).toBeCloseTo(0.124 * (184_500 - 100_000), 6);
    expect(r.selfEmploymentTax).toBeCloseTo(13_691.78, 2);
    expect(r.incomeTax).toBeCloseTo(24_255.12, 2);
    expect(r.totalTax).toBeCloseTo(37_946.9, 2);
  });

  it('no SE tax when net earnings are under $400', () => {
    const r = calculateSelfEmploymentTax({ ...base, netSelfEmployment: 300 }, params('single'));
    expect(r.selfEmploymentTax).toBe(0);
    expect(r.totalTax).toBe(0);
  });

  it('withholding reduces the quarterly payments, never below zero', () => {
    const r = calculateSelfEmploymentTax({ ...base, taxWithheld: 4_000 }, params('single'));
    expect(r.quarterlyPayment).toBeCloseTo((12_037.2 - 4_000) / 4, 2);
    expect(calculateSelfEmploymentTax({ ...base, taxWithheld: 50_000 }, params('single')).quarterlyPayment).toBe(0);
  });

  it('itemized deductions replace the standard deduction', () => {
    const r = calculateSelfEmploymentTax({ ...base, deduction: 'itemized', itemizedAmount: 30_000 }, params('single'));
    expect(r.deductionUsed).toBe(30_000);
    expect(r.taxableIncome).toBeLessThan(calculateSelfEmploymentTax(base, params('single')).taxableIncome);
  });

  it('the $400 minimum QBI deduction applies with at least $1,000 of QBI', () => {
    // $1,500 of profit and $20,000 of other income: 20% of QBI would be under $400.
    const r = calculateSelfEmploymentTax({ ...base, netSelfEmployment: 1_500, otherIncome: 20_000 }, params('single'));
    expect(r.qbiDeduction).toBe(400);
  });

  it('validates amounts', () => {
    const fields = validateSelfEmploymentTaxInput({ ...base, netSelfEmployment: -1, wages: Number.NaN, deduction: 'itemized', itemizedAmount: -5 }).map(
      (e) => e.field,
    );
    expect(fields).toEqual(['netSelfEmployment', 'wages', 'itemizedAmount']);
  });
});
