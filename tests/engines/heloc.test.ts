import { describe, expect, it } from 'vitest';
import { calculateHeloc, validateHelocInput, type HelocInput } from '../../src/engines/heloc';
import { monthlyPayment } from '../../src/engines/loan';

/*
 * OUTSIDE CHECK (calculator.net HELOC calculator, no closing costs or annual fee, 20 Oct 2026), all exact:
 *   1. 80,000 at 7.25%, 10-year draw, 20-year repayment: draw 483.33, repayment 632.30, interest 129,752.19
 *   2. 120,000 at 9.5%, 10-year draw, 15-year repayment: draw 950.00, repayment 1,253.07, interest 219,552.53
 *   3. 30,000 at 6%, 3-year draw, 10-year repayment: draw 150.00, repayment 333.06, interest 15,367.38
 *   (Its default, 50,000 at 8% over 5 + 15 years: 333.33, 477.83, interest 56,008.69, total 106,008.69.)
 */

const base: HelocInput = {
  balance: 50_000,
  ratePercent: 8,
  drawYears: 5,
  repayYears: 15,
  drawPaymentType: 'interestOnly',
  extraDrawPayment: 0,
  rateRisePercent: 2,
  homeValue: 400_000,
  mortgageBalance: 250_000,
  maxCltvPercent: 85,
};
const run = (x: Partial<HelocInput>) => calculateHeloc({ ...base, ...x });

describe('interest-only draw period', () => {
  it('matches calculator.net default', () => {
    const r = run({});
    expect(r.drawPayment).toBeCloseTo(333.33, 2);
    expect(r.repayPayment).toBeCloseTo(477.83, 2);
    expect(r.totalInterest).toBeCloseTo(56_008.69, 2);
    expect(r.totalPaid).toBeCloseTo(106_008.69, 2);
    expect(r.months).toBe(240);
    expect(r.balanceAtRepay).toBe(50_000);
    expect(r.drawInterest).toBeCloseTo(20_000, 6);
    expect(r.paymentIncrease).toBeCloseTo(477.83 - 333.33, 1);
  });

  it('outside check 1', () => {
    const r = run({ balance: 80_000, ratePercent: 7.25, drawYears: 10, repayYears: 20 });
    expect(r.drawPayment).toBeCloseTo(483.33, 2);
    expect(r.repayPayment).toBeCloseTo(632.3, 2);
    expect(r.totalInterest).toBeCloseTo(129_752.19, 2);
  });

  it('outside check 2', () => {
    const r = run({ balance: 120_000, ratePercent: 9.5, drawYears: 10, repayYears: 15 });
    expect(r.drawPayment).toBeCloseTo(950, 2);
    expect(r.repayPayment).toBeCloseTo(1_253.07, 2);
    expect(r.totalInterest).toBeCloseTo(219_552.53, 2);
  });

  it('outside check 3', () => {
    const r = run({ balance: 30_000, ratePercent: 6, drawYears: 3, repayYears: 10 });
    expect(r.drawPayment).toBeCloseTo(150, 2);
    expect(r.repayPayment).toBeCloseTo(333.06, 2);
    expect(r.totalInterest).toBeCloseTo(15_367.38, 2);
    expect(r.months).toBe(156);
  });

  it('year rows split draw and repayment months and end at 0', () => {
    const r = run({ drawYears: 2.5 });
    expect(r.years[2]!.drawMonths).toBe(6);
    expect(r.years[0]!.principal).toBe(0);
    expect(r.years.at(-1)!.balance).toBe(0);
    const principal = r.years.reduce((s, y) => s + y.principal, 0);
    expect(principal).toBeCloseTo(50_000, 6);
  });
});

describe('other draw options', () => {
  it('principal and interest: one level payment over the whole term', () => {
    const r = run({ drawPaymentType: 'principalAndInterest' });
    const level = monthlyPayment(50_000, 8, 240);
    expect(r.drawPayment).toBeCloseTo(level, 8);
    expect(r.repayPayment).toBeCloseTo(level, 8);
    expect(r.paymentIncrease).toBeCloseTo(0, 8);
    expect(r.totalInterest).toBeLessThan(56_008.69);
  });

  it('an extra draw payment lowers the balance, the repayment payment and the interest', () => {
    const r = run({ extraDrawPayment: 200 });
    expect(r.drawPayment).toBeCloseTo(533.33, 2);
    expect(r.balanceAtRepay).toBeCloseTo(38_000, 6);
    expect(r.repayPayment).toBeCloseTo(monthlyPayment(38_000, 8, 180), 8);
    expect(r.totalInterest).toBeLessThan(56_008.69);
  });

  it('paying it all off in the draw period leaves no repayment payment', () => {
    const r = run({ extraDrawPayment: 100_000 });
    expect(r.months).toBe(1);
    expect(r.repayPayment).toBe(0);
    expect(r.stressRepayPayment).toBe(0);
    expect(r.totalPaid).toBeCloseTo(50_000 + 50_000 * (0.08 / 12), 6);
  });

  it('0% rate: nothing to pay in the draw period, then equal repayments', () => {
    const r = run({ ratePercent: 0, drawYears: 10, repayYears: 10 });
    expect(r.drawPayment).toBe(0);
    expect(r.repayPayment).toBeCloseTo(50_000 / 120, 8);
    expect(r.totalInterest).toBe(0);
  });
});

describe('rate rise and credit line', () => {
  it('stress test uses the higher rate on the repayment balance', () => {
    const r = run({});
    expect(r.stressRepayPayment).toBeCloseTo(monthlyPayment(50_000, 10, 180), 8);
    expect(run({ rateRisePercent: 0 }).stressRepayPayment).toBeCloseTo(r.repayPayment, 8);
  });

  it('credit line = home value × CLTV − mortgage', () => {
    const r = run({});
    expect(r.creditLine).toBe(90_000);
    expect(r.cltvPercent).toBeCloseTo(75, 8);
    expect(r.overCreditLine).toBe(false);
    expect(run({ balance: 95_000 }).overCreditLine).toBe(true);
    expect(run({ mortgageBalance: 400_000 }).creditLine).toBe(0);
    const none = run({ homeValue: 0 });
    expect(none.creditLine).toBeNull();
    expect(none.cltvPercent).toBeNull();
    expect(none.overCreditLine).toBe(false);
  });

  it('large values stay finite', () => {
    const r = run({ balance: 100_000_000, ratePercent: 30, drawYears: 30, repayYears: 30 });
    expect(Number.isFinite(r.totalInterest)).toBe(true);
    expect(r.years.at(-1)!.balance).toBe(0);
    expect(r.months).toBe(720);
  });
});

describe('validateHelocInput', () => {
  it('flags bad values', () => {
    expect(validateHelocInput({ ...base, balance: 0, ratePercent: 31, drawYears: 0, repayYears: 31 }).map((e) => e.field)).toEqual([
      'balance',
      'ratePercent',
      'drawYears',
      'repayYears',
    ]);
    expect(validateHelocInput({ ...base, balance: Number.NaN }).map((e) => e.field)).toEqual(['balance']);
    expect(validateHelocInput({ ...base, extraDrawPayment: -1, homeValue: -5 }).map((e) => e.field)).toEqual(['extraDrawPayment', 'homeValue']);
    expect(validateHelocInput(base)).toEqual([]);
  });
});
