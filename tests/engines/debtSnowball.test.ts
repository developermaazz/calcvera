import { describe, expect, it } from 'vitest';
import { calculateDebtSnowball, payoffOrder, simulatePlan, validateSnowballInput, type SnowballInput } from '../../src/engines/debtSnowball';

/*
 * OUTSIDE CHECK (calculator.net debt payoff calculator, "fixed total payment" on, 19 Oct 2026). It uses the
 * avalanche order, so these cases run with method: 'avalanche':
 *   A. $1,200 @ 27.99% ($40), $4,500 @ 22.99% ($120), $8,000 @ 11.5% ($260), +$200: 27 months, total paid
 *      $16,185.24 (exact); debts cleared in months 6 / 20 / 27 (exact).
 *   B. $9,000 @ 6.9% ($280), $2,500 @ 24.99% ($75), $6,000 @ 18.99% ($150), $800 @ 0% ($50), +$150: 31 months,
 *      $21,427.08 (exact); cleared in months 13 / 28 / 31 / 16 (exact).
 *   C. £800 @ 29.9% (£25), £3,200 @ 24.9% (£96), £6,500 @ 9.9% (£210), +£150: 26 months, £12,219.18 (exact);
 *      cleared in months 5 / 18 / 26 (exact).
 *   Total interest there differs by up to 5 cents: it rounds each month's interest to the cent. Ours is
 *   total paid − starting balances at full precision (CLAUDE.md section 7).
 */

const caseA: SnowballInput = {
  debts: [
    { name: 'Store card', balance: 1_200, aprPercent: 27.99, minimumPayment: 40 },
    { name: 'Credit card', balance: 4_500, aprPercent: 22.99, minimumPayment: 120 },
    { name: 'Personal loan', balance: 8_000, aprPercent: 11.5, minimumPayment: 260 },
  ],
  extraMonthly: 200,
  method: 'avalanche',
};

const caseB: SnowballInput = {
  debts: [
    { name: 'Car loan', balance: 9_000, aprPercent: 6.9, minimumPayment: 280 },
    { name: 'Card 1', balance: 2_500, aprPercent: 24.99, minimumPayment: 75 },
    { name: 'Card 2', balance: 6_000, aprPercent: 18.99, minimumPayment: 150 },
    { name: 'Medical', balance: 800, aprPercent: 0, minimumPayment: 50 },
  ],
  extraMonthly: 150,
  method: 'avalanche',
};

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
const paidOff = (r: ReturnType<typeof calculateDebtSnowball>) => Object.fromEntries(r.plan.debts.map((d) => [d.name, d.paidOffMonth]));

describe('calculateDebtSnowball: outside checks (avalanche)', () => {
  it('case A matches calculator.net', () => {
    const r = calculateDebtSnowball(caseA);
    expect(r.monthlyBudget).toBe(620);
    expect(r.plan.months).toBe(27);
    expect(r.plan.totalPaid).toBeCloseTo(16_185.24, 2);
    expect(r.plan.totalInterest).toBeCloseTo(2_485.24, 2);
    expect(paidOff(r)).toEqual({ 'Store card': 6, 'Credit card': 20, 'Personal loan': 27 });
  });

  it('case B matches calculator.net, including a 0% debt', () => {
    const r = calculateDebtSnowball(caseB);
    expect(r.plan.months).toBe(31);
    expect(r.plan.totalPaid).toBeCloseTo(21_427.08, 2);
    expect(paidOff(r)).toEqual({ 'Card 1': 13, 'Card 2': 28, 'Car loan': 31, Medical: 16 });
  });

  it('case C (UK figures) matches calculator.net', () => {
    const r = calculateDebtSnowball({
      debts: [
        { balance: 800, aprPercent: 29.9, minimumPayment: 25 },
        { balance: 3_200, aprPercent: 24.9, minimumPayment: 96 },
        { balance: 6_500, aprPercent: 9.9, minimumPayment: 210 },
      ],
      extraMonthly: 150,
      method: 'avalanche',
    });
    expect(r.plan.months).toBe(26);
    expect(r.plan.totalPaid).toBeCloseTo(12_219.18, 2);
    expect(r.plan.debts.map((d) => d.paidOffMonth)).toEqual([5, 18, 26]);
    expect(r.plan.debts.map((d) => d.name)).toEqual(['Debt 1', 'Debt 2', 'Debt 3']);
  });
});

describe('snowball versus avalanche', () => {
  it('snowball clears the smallest balance first; avalanche pays less interest here', () => {
    const snow = calculateDebtSnowball({ ...caseB, method: 'snowball' });
    expect(snow.plan.debts.map((d) => d.name)).toEqual(['Medical', 'Card 1', 'Card 2', 'Car loan']);
    expect(snow.plan.debts[0]!.paidOffMonth).toBe(4);
    expect(snow.plan.months).toBe(31);
    expect(snow.plan.totalInterest).toBeCloseTo(3_270.56, 2);
    expect(snow.avalanche.totalInterest).toBeCloseTo(3_127.08, 2);
    expect(snow.avalanche.totalInterest).toBeLessThan(snow.snowball.totalInterest);
  });

  it('orders ties by APR (snowball) or balance (avalanche), then by input order', () => {
    const debts = [
      { balance: 500, aprPercent: 10, minimumPayment: 25 },
      { balance: 500, aprPercent: 20, minimumPayment: 25 },
      { balance: 300, aprPercent: 20, minimumPayment: 25 },
      { balance: 300, aprPercent: 20, minimumPayment: 25 },
    ];
    expect(payoffOrder(debts, 'snowball')).toEqual([2, 3, 1, 0]);
    expect(payoffOrder(debts, 'avalanche')).toEqual([2, 3, 1, 0]);
  });
});

describe('edge cases', () => {
  it('0% APR: freed payments roll over, no interest', () => {
    const r = calculateDebtSnowball({
      debts: [
        { balance: 600, aprPercent: 0, minimumPayment: 100 },
        { balance: 900, aprPercent: 0, minimumPayment: 100 },
      ],
      extraMonthly: 100,
      method: 'snowball',
    });
    expect(r.plan.debts.map((d) => d.paidOffMonth)).toEqual([3, 5]);
    expect(r.plan.months).toBe(5);
    expect(r.plan.totalInterest).toBe(0);
    expect(r.plan.totalPaid).toBe(1_500);
    // Minimums only: 6 and 9 months.
    expect(r.minimumOnly.months).toBe(9);
    expect(r.monthsSaved).toBe(4);
  });

  it('no extra payment still helps, because cleared minimums roll into the next debt', () => {
    const r = calculateDebtSnowball({ ...caseA, extraMonthly: 0, method: 'snowball' });
    expect(r.plan.months).toBeLessThan(r.minimumOnly.months);
    expect(r.interestSaved!).toBeGreaterThan(0);
  });

  it('a minimum below the interest never clears alone, but the snowball still finishes', () => {
    const input: SnowballInput = {
      debts: [
        { balance: 1_000, aprPercent: 12, minimumPayment: 100 },
        { balance: 10_000, aprPercent: 24, minimumPayment: 150 }, // interest is $200 a month
      ],
      extraMonthly: 100,
      method: 'snowball',
    };
    const r = calculateDebtSnowball(input);
    expect(r.minimumOnly.feasible).toBe(false);
    expect(r.interestSaved).toBeNull();
    expect(r.plan.feasible).toBe(true);
  });

  it('a budget below the total interest is reported as not feasible', () => {
    const r = calculateDebtSnowball({ debts: [{ balance: 50_000, aprPercent: 24, minimumPayment: 500 }], extraMonthly: 0, method: 'snowball' });
    expect(r.plan.feasible).toBe(false);
  });

  it('balances end at exactly zero and payments = balances + interest', () => {
    for (const method of ['snowball', 'avalanche'] as const) {
      const r = calculateDebtSnowball({ ...caseB, method });
      expect(r.plan.schedule.at(-1)?.balance).toBe(0);
      expect(sum(r.plan.schedule.map((m) => m.payment))).toBeCloseTo(r.plan.totalPaid, 6);
      expect(r.plan.totalPaid - r.plan.totalInterest).toBeCloseTo(18_300, 6);
      expect(r.plan.schedule.every((m) => m.payment <= r.monthlyBudget + 1e-9)).toBe(true);
    }
  });

  it('max values: ten debts of 10,000,000 stay finite', () => {
    const debts = Array.from({ length: 10 }, (_, i) => ({ balance: 10_000_000, aprPercent: 5 + i, minimumPayment: 200_000 }));
    const r = calculateDebtSnowball({ debts, extraMonthly: 1_000_000, method: 'avalanche' });
    expect(r.plan.feasible).toBe(true);
    expect(Number.isFinite(r.plan.totalInterest)).toBe(true);
    expect(r.plan.schedule.at(-1)?.balance).toBe(0);
  });

  it('simulatePlan without an order pays minimums only', () => {
    const r = simulatePlan([{ debt: { balance: 300, aprPercent: 0, minimumPayment: 100 }, index: 0 }], 1_000, null);
    expect(r.months).toBe(3);
  });
});

describe('validateSnowballInput', () => {
  it('skips empty rows and needs at least one debt', () => {
    const empty = { balance: 0, aprPercent: Number.NaN, minimumPayment: Number.NaN };
    expect(validateSnowballInput({ debts: [empty, empty], extraMonthly: 0, method: 'snowball' }).map((e) => e.field)).toEqual(['balance-0']);
    expect(validateSnowballInput({ debts: [caseA.debts[0]!, empty], extraMonthly: 0, method: 'snowball' })).toEqual([]);
  });

  it('flags bad values per field', () => {
    const fields = validateSnowballInput({
      debts: [
        { balance: Number.NaN, aprPercent: 10, minimumPayment: 50 },
        { balance: 1_000, aprPercent: 120, minimumPayment: 0 },
      ],
      extraMonthly: -5,
      method: 'snowball',
    }).map((e) => e.field);
    expect(fields).toEqual(['balance-0', 'aprPercent-1', 'minimumPayment-1', 'extraMonthly']);
    expect(() => calculateDebtSnowball({ debts: [], extraMonthly: 0, method: 'snowball' })).toThrow(RangeError);
  });
});
