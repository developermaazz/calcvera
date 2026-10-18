import { describe, expect, it } from 'vitest';
import { requireFigure } from '../../src/countries';
import { uk } from '../../src/countries/uk';
import { calculateTakeHomePay, validateTakeHomePayInput, type TakeHomePayInput, type TakeHomePayParams } from '../../src/engines/takeHomePay';

/*
 * Hand checks with 2026/27 figures (GOV.UK income tax rates, Scottish income tax, HMRC employer rates):
 *   £35,000, rest of UK: tax 20% × 22,430 = £4,486; NI 8% × 22,430 = £1,794.40 → take-home £28,719.60
 *   £60,000: tax 7,540 + 40% × 9,730 = £11,432; NI 3,016 + 2% × 9,730 = £3,210.60
 *   £35,000 Scotland: 19% × 3,967 + 20% × 12,989 + 21% × 5,474 = £4,501.07
 * External cross-checks to run (GOV.UK "Estimate your Income Tax" or a payroll calculator such as
 * listentotaxman / thesalarycalculator): the three cases above. Record the check date here.
 */

const t = requireFigure(uk.uk, 'uk').takeHomePay;
const ni = t.nationalInsurance;
const sl = t.studentLoans;
const params: TakeHomePayParams = {
  personalAllowance: uk.incomeTax.allowance,
  taperStart: requireFigure(t.personalAllowanceTaperStart, 'taper'),
  taperRate: requireFigure(t.personalAllowanceTaperRate, 'taperRate'),
  bands: { rUK: uk.incomeTax.bands, scotland: requireFigure(t.scotlandBands, 'scotland') },
  ni: {
    primaryThreshold: requireFigure(ni.primaryThreshold, 'pt'),
    upperEarningsLimit: requireFigure(ni.upperEarningsLimit, 'uel'),
    mainRate: requireFigure(ni.mainRate, 'main'),
    upperRate: requireFigure(ni.upperRate, 'upper'),
  },
  studentLoans: {
    plan1: requireFigure(sl.plan1, 'p1'),
    plan2: requireFigure(sl.plan2, 'p2'),
    plan4: requireFigure(sl.plan4, 'p4'),
    plan5: requireFigure(sl.plan5, 'p5'),
    postgraduate: requireFigure(sl.postgraduate, 'pg'),
  },
  reliefAtSourceRate: requireFigure(t.reliefAtSourceRate, 'ras'),
};

const base: TakeHomePayInput = {
  grossSalary: 35_000,
  region: 'rUK',
  pensionPercent: 0,
  pensionMethod: 'salarySacrifice',
  undergraduatePlan: 'none',
  postgraduateLoan: false,
};
const run = (input: Partial<TakeHomePayInput>) => calculateTakeHomePay({ ...base, ...input }, params);

describe('calculateTakeHomePay', () => {
  it('£35,000 in England: tax £4,486, NI £1,794.40', () => {
    const r = run({});
    expect(r.incomeTax).toBeCloseTo(4_486, 6);
    expect(r.nationalInsurance).toBeCloseTo(1_794.4, 6);
    expect(r.takeHome).toBeCloseTo(28_719.6, 6);
  });

  it('£60,000: higher rate and 2% NI above the upper earnings limit', () => {
    const r = run({ grossSalary: 60_000 });
    expect(r.incomeTax).toBeCloseTo(11_432, 6);
    expect(r.nationalInsurance).toBeCloseTo(3_210.6, 6);
  });

  it('£110,000: Personal Allowance tapered to £7,570', () => {
    const r = run({ grossSalary: 110_000 });
    expect(r.personalAllowance).toBe(7_570);
    expect(r.incomeTax).toBeCloseTo(33_432, 6);
  });

  it('£130,000: no Personal Allowance and 45% above £125,140', () => {
    const r = run({ grossSalary: 130_000 });
    expect(r.personalAllowance).toBe(0);
    expect(r.incomeTax).toBeCloseTo(44_703, 6);
  });

  it('Scotland: £35,000 pays £4,501.07 and £60,000 pays £13,182.05', () => {
    expect(run({ region: 'scotland' }).incomeTax).toBeCloseTo(4_501.07, 2);
    expect(run({ region: 'scotland', grossSalary: 60_000 }).incomeTax).toBeCloseTo(13_182.05, 2);
  });

  it('student loans: Plan 2 and a Postgraduate Loan together', () => {
    expect(run({ undergraduatePlan: 'plan2' }).studentLoan).toBeCloseTo(505.35, 6);
    expect(run({ undergraduatePlan: 'plan2', postgraduateLoan: true }).studentLoan).toBeCloseTo(1_345.35, 6);
    expect(run({ grossSalary: 20_000, undergraduatePlan: 'plan5' }).studentLoan).toBe(0);
  });

  it('pension methods: salary sacrifice saves NI; net pay and relief at source match for a basic-rate taxpayer', () => {
    const ss = run({ pensionPercent: 5, pensionMethod: 'salarySacrifice' });
    const np = run({ pensionPercent: 5, pensionMethod: 'netPay' });
    const ras = run({ pensionPercent: 5, pensionMethod: 'reliefAtSource' });
    expect(ss.takeHome).toBeCloseTo(27_459.6, 6);
    expect(np.takeHome).toBeCloseTo(27_319.6, 6);
    expect(ras.takeHome).toBeCloseTo(27_319.6, 6);
    expect(ras.pensionFromPay).toBeCloseTo(1_400, 6);
    expect(ras.pensionTotal).toBeCloseTo(1_750, 6);
  });

  it('pension contributions restore the Personal Allowance at £110,000', () => {
    const r = run({ grossSalary: 110_000, pensionPercent: 10, pensionMethod: 'salarySacrifice' });
    expect(r.personalAllowance).toBe(12_570);
    expect(r.takeHome).toBeCloseTo(67_977.4, 6);
    expect(run({ grossSalary: 110_000, pensionPercent: 10, pensionMethod: 'reliefAtSource' }).incomeTax).toBeCloseTo(31_432, 6);
  });

  it('nothing is due below the Personal Allowance and primary threshold', () => {
    const r = run({ grossSalary: 12_000 });
    expect(r.incomeTax).toBe(0);
    expect(r.nationalInsurance).toBe(0);
    expect(r.takeHome).toBe(12_000);
  });

  it('validates salary and pension percentage', () => {
    expect(validateTakeHomePayInput({ ...base, grossSalary: Number.NaN, pensionPercent: 101 }).map((e) => e.field)).toEqual([
      'grossSalary',
      'pensionPercent',
    ]);
    expect(() => run({ grossSalary: -1 })).toThrow(RangeError);
  });
});
