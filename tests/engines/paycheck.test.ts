import { describe, expect, it } from 'vitest';
import { requireFigure } from '../../src/countries';
import { us } from '../../src/countries/us';
import {
  calculatePaycheck,
  tentativeAnnualWithholding,
  validatePaycheckInput,
  withholdingSchedule,
  type PaycheckInput,
  type PaycheckParams,
  type W4Status,
} from '../../src/engines/paycheck';

/*
 * OUTSIDE CHECK 1 (IRS Pub 15-T 2026, Annual Percentage Method Tables, checked 20 Oct 2026): the schedules
 * built from the 2026 brackets, standard deductions and the Worksheet 1A adjustments reproduce every
 * published row (start of each bracket and tentative amount), for all three statuses, standard and Step 2.
 * OUTSIDE CHECK 2 (IRS Pub 15-T 2026, Wage Bracket Method Tables, monthly and semimonthly, 2020-or-later
 * W-4s): the IRS builds each row with the percentage method at the row's midpoint, rounded to the dollar.
 * Ours, rounded the same way, matches all 30 published amounts below.
 * FICA: 6.2% to the $184,500 wage base, 1.45% Medicare, 0.9% Additional Medicare over $200,000 (Topic 751).
 */

const fed = requireFigure(us.us, 'us').federalTax;
const pay = requireFigure(us.us, 'us').payroll;
const se = requireFigure(us.us, 'us').selfEmployment;
const statuses: W4Status[] = ['single', 'marriedJoint', 'headOfHousehold'];
const P: PaycheckParams = {
  bands: Object.fromEntries(statuses.map((s) => [s, requireFigure(fed[s].bands, s)])) as PaycheckParams['bands'],
  standardDeduction: Object.fromEntries(statuses.map((s) => [s, requireFigure(fed[s].standardDeduction, s)])) as PaycheckParams['standardDeduction'],
  withholdingAdjustment: { marriedJoint: requireFigure(pay.withholdingAdjustment.marriedJoint, 'a'), other: requireFigure(pay.withholdingAdjustment.other, 'b') },
  socialSecurityRate: requireFigure(pay.socialSecurityRate, 'c'),
  socialSecurityWageBase: requireFigure(se.socialSecurityWageBase, 'd'),
  medicareRate: requireFigure(pay.medicareRate, 'e'),
  additionalMedicareRate: requireFigure(pay.additionalMedicareRate, 'f'),
  additionalMedicareThreshold: requireFigure(pay.additionalMedicareWithholdingThreshold, 'g'),
};

const base: PaycheckInput = {
  payType: 'salary',
  annualSalary: 65_000,
  hourlyRate: 0,
  hoursPerWeek: 40,
  frequency: 'biweekly',
  status: 'single',
  multipleJobs: false,
  dependentsCredit: 0,
  otherIncome: 0,
  deductions: 0,
  extraWithholding: 0,
  retirementPercent: 0,
  pretaxBenefits: 0,
  stateTaxPercent: 0,
};

describe('withholding schedules (Pub 15-T 2026 annual tables)', () => {
  // [status, step2, rowStart, tentativeAmount] for each published bracket row.
  const rows: [W4Status, boolean, number, number][] = [
    ['marriedJoint', false, 19_300, 0], ['marriedJoint', false, 44_100, 2_480], ['marriedJoint', false, 120_100, 11_600], ['marriedJoint', false, 230_700, 35_932], ['marriedJoint', false, 422_850, 82_048], ['marriedJoint', false, 531_750, 116_896], ['marriedJoint', false, 788_000, 206_583.5],
    ['single', false, 7_500, 0], ['single', false, 19_900, 1_240], ['single', false, 57_900, 5_800], ['single', false, 113_200, 17_966], ['single', false, 209_275, 41_024], ['single', false, 263_725, 58_448], ['single', false, 648_100, 192_979.25],
    ['headOfHousehold', false, 15_550, 0], ['headOfHousehold', false, 33_250, 1_770], ['headOfHousehold', false, 83_000, 7_740], ['headOfHousehold', false, 121_250, 16_155], ['headOfHousehold', false, 217_300, 39_207], ['headOfHousehold', false, 271_750, 56_631], ['headOfHousehold', false, 656_150, 191_171],
    ['marriedJoint', true, 16_100, 0], ['marriedJoint', true, 28_500, 1_240], ['marriedJoint', true, 66_500, 5_800], ['marriedJoint', true, 121_800, 17_966], ['marriedJoint', true, 217_875, 41_024], ['marriedJoint', true, 272_325, 58_448], ['marriedJoint', true, 400_450, 103_291.75],
    ['single', true, 8_050, 0], ['single', true, 14_250, 620], ['single', true, 33_250, 2_900], ['single', true, 60_900, 8_983], ['single', true, 108_937.5, 20_512], ['single', true, 136_162.5, 29_224], ['single', true, 328_350, 96_489.63],
    ['headOfHousehold', true, 12_075, 0], ['headOfHousehold', true, 20_925, 885], ['headOfHousehold', true, 45_800, 3_870], ['headOfHousehold', true, 64_925, 8_077.5], ['headOfHousehold', true, 112_950, 19_603.5], ['headOfHousehold', true, 140_175, 28_315.5], ['headOfHousehold', true, 332_375, 95_585.5],
  ];

  it('outside check 1: every published row', () => {
    for (const [status, step2, start, amount] of rows) {
      expect(tentativeAnnualWithholding(start, status, step2, P), `${status} ${step2} ${start}`).toBeCloseTo(amount, 1);
    }
    expect(withholdingSchedule('single', false, P).start).toBe(7_500);
    expect(withholdingSchedule('marriedJoint', true, P).start).toBe(16_100);
  });
});

describe('outside check 2: Pub 15-T 2026 wage bracket tables', () => {
  // [frequency, row midpoint, MFJ std, MFJ step2, HoH std, HoH step2, single std, single step2]
  const table: [PaycheckInput['frequency'], number, number, number, number, number, number, number][] = [
    ['monthly', 3_005, 32, 179, 99, 225, 179, 293],
    ['monthly', 5_005, 237, 419, 330, 584, 419, 733],
    ['monthly', 7_030, 480, 811, 573, 1_062, 811, 1_218],
    ['semimonthly', 2_010, 67, 150, 106, 184, 150, 258],
    ['semimonthly', 3_012.5, 180, 295, 226, 410, 295, 488],
  ];
  it('matches all 30 amounts', () => {
    for (const [frequency, wage, ...amounts] of table) {
      const periods = frequency === 'monthly' ? 12 : 24;
      const cases: [W4Status, boolean][] = [['marriedJoint', false], ['marriedJoint', true], ['headOfHousehold', false], ['headOfHousehold', true], ['single', false], ['single', true]];
      cases.forEach(([status, multipleJobs], i) => {
        const r = calculatePaycheck({ ...base, annualSalary: wage * periods, frequency, status, multipleJobs }, P);
        expect(Math.round(r.perPaycheck.federalIncomeTax), `${frequency} ${wage} ${status} ${multipleJobs}`).toBe(amounts[i]);
      });
    }
  });
});

describe('calculatePaycheck', () => {
  it('$65,000 single, biweekly: withholding, FICA and take-home add up', () => {
    const r = calculatePaycheck(base, P);
    // Adjusted annual wage 65,000 − 8,600 = 56,400 → 1,240 + 12% × (56,400 − 19,900) = 5,620 → ÷ 26.
    expect(r.perPaycheck.gross).toBeCloseTo(2_500, 10);
    expect(r.perPaycheck.federalIncomeTax).toBeCloseTo(5_620 / 26, 10);
    expect(r.perPaycheck.socialSecurity).toBeCloseTo(155, 10);
    expect(r.perPaycheck.medicare).toBeCloseTo(36.25, 10);
    expect(r.perPaycheck.takeHome).toBeCloseTo(2_500 - 5_620 / 26 - 155 - 36.25, 10);
    expect(r.annual.federalIncomeTax).toBeCloseTo(5_620, 8);
  });

  it('pre-tax 401(k) cuts income tax only; Section 125 benefits cut FICA too', () => {
    const r = calculatePaycheck({ ...base, retirementPercent: 10, pretaxBenefits: 100 }, P);
    const taxable = 2_500 - 250 - 100;
    expect(r.perPaycheck.federalIncomeTax).toBeCloseTo((1_240 + 0.12 * (taxable * 26 - 8_600 - 19_900)) / 26, 10);
    expect(r.perPaycheck.socialSecurity).toBeCloseTo((2_500 - 100) * 0.062, 10);
  });

  it('W-4 Step 3 credits and Step 4 entries', () => {
    const r = calculatePaycheck({ ...base, dependentsCredit: 2_200, extraWithholding: 20, otherIncome: 5_000, deductions: 1_000 }, P);
    // Adjusted annual wage 65,000 + 5,000 − 1,000 − 8,600 = 60,400: in the 22% row from 57,900.
    const tentative = (5_800 + 0.22 * (60_400 - 57_900)) / 26;
    expect(r.perPaycheck.federalIncomeTax).toBeCloseTo(tentative - 2_200 / 26 + 20, 10);
    // Credits can't take withholding below zero (Step 4(c) is still added).
    expect(calculatePaycheck({ ...base, annualSalary: 20_000, dependentsCredit: 10_000, extraWithholding: 10 }, P).perPaycheck.federalIncomeTax).toBe(10);
  });

  it('hourly pay; low pay owes no withholding', () => {
    const r = calculatePaycheck({ ...base, payType: 'hourly', hourlyRate: 20, hoursPerWeek: 40, frequency: 'weekly' }, P);
    expect(r.perPaycheck.gross).toBe(800);
    expect(calculatePaycheck({ ...base, annualSalary: 7_000 }, P).perPaycheck.federalIncomeTax).toBe(0);
  });

  it('Social Security stops at the wage base; Additional Medicare over $200,000', () => {
    const r = calculatePaycheck({ ...base, annualSalary: 300_000 }, P);
    expect(r.socialSecurityCapped).toBe(true);
    expect(r.additionalMedicare).toBe(true);
    expect(r.annual.socialSecurity).toBeCloseTo(184_500 * 0.062, 6);
    expect(r.annual.medicare).toBeCloseTo(300_000 * 0.0145 + 100_000 * 0.009, 6);
    expect(r.perPaycheck.socialSecurity).toBeCloseTo((300_000 / 26) * 0.062, 6);
  });

  it('state rate applies to taxable wages; large values stay finite', () => {
    expect(calculatePaycheck({ ...base, stateTaxPercent: 5 }, P).perPaycheck.stateTax).toBeCloseTo(125, 10);
    expect(Number.isFinite(calculatePaycheck({ ...base, annualSalary: 10_000_000 }, P).annual.takeHome)).toBe(true);
  });
});

describe('validatePaycheckInput', () => {
  it('flags bad values', () => {
    expect(validatePaycheckInput({ ...base, annualSalary: 0, retirementPercent: 120 }).map((e) => e.field)).toEqual(['annualSalary', 'retirementPercent']);
    expect(validatePaycheckInput({ ...base, payType: 'hourly', hourlyRate: Number.NaN }).map((e) => e.field)).toEqual(['hourlyRate']);
    expect(validatePaycheckInput({ ...base, retirementPercent: 90, pretaxBenefits: 500 }).map((e) => e.field)).toEqual(['pretaxBenefits']);
  });
});
