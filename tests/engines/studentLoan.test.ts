import { describe, expect, it } from 'vitest';
import { requireFigure } from '../../src/countries';
import { uk } from '../../src/countries/uk';
import { calculateStudentLoan, studentLoanRate, validateStudentLoanInput, type StudentLoanInput, type StudentLoanParams } from '../../src/engines/studentLoan';

/*
 * OUTSIDE CHECK (listentotaxman.com, 18 Oct 2026): yearly repayments at £35,000 match exactly
 *   (Plan 2 £505.35, Postgraduate £840). No outside calculator takes the projection inputs by URL, so the
 *   multi-year projection is checked against the independent script only.
 *
 * Figures: GOV.UK repaying your student loan (thresholds, rates, write-off periods), checked 18 Oct 2026.
 * Hand checks: Plan 2 at £35,000 repays 9% × (35,000 − 29,385) ÷ 12 = £42.11 a month;
 *   Plan 2 interest at £35,000 = 4.1% + 1.9% × 5,615 ÷ 23,500 = 4.554%.
 * Projections from an independent month-by-month script (salary +3% a year, thresholds and rates held).
 */

const u = requireFigure(uk.uk, 'uk');
const sl = u.takeHomePay.studentLoans;
const li = u.studentLoanInterest;
const params: StudentLoanParams = {
  thresholds: {
    plan1: requireFigure(sl.plan1, 'p1'),
    plan2: requireFigure(sl.plan2, 'p2'),
    plan4: requireFigure(sl.plan4, 'p4'),
    plan5: requireFigure(sl.plan5, 'p5'),
    postgraduate: requireFigure(sl.postgraduate, 'pg'),
  },
  interest: {
    plan1: requireFigure(li.rates.plan1, 'r1'),
    plan4: requireFigure(li.rates.plan4, 'r4'),
    plan5: requireFigure(li.rates.plan5, 'r5'),
    postgraduate: requireFigure(li.rates.postgraduate, 'rpg'),
  },
  plan2: {
    minRate: requireFigure(li.plan2.minRate, 'min'),
    maxRate: requireFigure(li.plan2.maxRate, 'max'),
    lowerIncome: requireFigure(li.plan2.lowerIncome, 'lo'),
    upperIncome: requireFigure(li.plan2.upperIncome, 'hi'),
  },
  writeOffYears: {
    plan1: requireFigure(li.writeOffYears.plan1, 'w1'),
    plan2: requireFigure(li.writeOffYears.plan2, 'w2'),
    plan4: requireFigure(li.writeOffYears.plan4, 'w4'),
    plan5: requireFigure(li.writeOffYears.plan5, 'w5'),
    postgraduate: requireFigure(li.writeOffYears.postgraduate, 'wpg'),
  },
};
const run = (input: Partial<StudentLoanInput>) =>
  calculateStudentLoan({ plan: 'plan2', balance: 45_000, salary: 35_000, salaryGrowthPercent: 3, yearsRepaid: 0, ...input }, params);

describe('studentLoanRate', () => {
  it('Plan 2 rises from 4.1% to 6% with income', () => {
    expect(studentLoanRate('plan2', 29_385, params)).toBeCloseTo(0.041, 12);
    expect(studentLoanRate('plan2', 35_000, params)).toBeCloseTo(0.041 + (0.019 * 5_615) / 23_500, 12);
    expect(studentLoanRate('plan2', 60_000, params)).toBe(0.06);
    expect(studentLoanRate('postgraduate', 10_000, params)).toBe(0.06);
  });
});

describe('calculateStudentLoan', () => {
  it('Plan 2 at £35,000: £42.11 a month and written off after 30 years', () => {
    const r = run({});
    expect(r.monthlyRepayment).toBeCloseTo(42.11, 2);
    expect(r.paidOff).toBe(false);
    expect(r.years).toBe(30);
    expect(r.totalRepaid).toBeCloseTo(70_523.06, 1);
    expect(r.writtenOff).toBeCloseTo(97_647.82, 1);
  });

  it('Plan 2 at £60,000: repaid in 19 years', () => {
    const r = run({ salary: 60_000 });
    expect(r.paidOff).toBe(true);
    expect(r.years).toBe(19);
    expect(r.totalRepaid).toBeCloseTo(80_070.75, 1);
    expect(r.writtenOff).toBe(0);
  });

  it('Plan 1 after 5 years of repaying: cleared in 18 more years', () => {
    const r = run({ plan: 'plan1', balance: 15_000, salary: 32_000, yearsRepaid: 5 });
    expect(r.monthlyRepayment).toBeCloseTo(38.25, 2);
    expect(r.years).toBe(18);
    expect(r.totalRepaid).toBeCloseTo(23_166.26, 1);
  });

  it('Postgraduate Loan: 6% over £21,000', () => {
    const r = run({ plan: 'postgraduate', balance: 12_000, salary: 40_000 });
    expect(r.monthlyRepayment).toBeCloseTo(95, 8);
    expect(r.years).toBe(12);
  });

  it('income below the threshold repays nothing and the loan is written off', () => {
    const r = run({ plan: 'plan5', balance: 10_000, salary: 20_000, salaryGrowthPercent: 0 });
    expect(r.monthlyRepayment).toBe(0);
    expect(r.totalRepaid).toBe(0);
    expect(r.years).toBe(40);
    expect(r.writtenOff).toBeGreaterThan(10_000);
  });

  it('validates years repaid against the write-off period', () => {
    expect(validateStudentLoanInput({ plan: 'plan1', balance: 1_000, salary: 30_000, salaryGrowthPercent: 2, yearsRepaid: 25 }, params).map((e) => e.field)).toEqual(['yearsRepaid']);
    expect(() => run({ balance: 0 })).toThrow(RangeError);
  });
});
