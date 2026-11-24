import { describe, expect, it } from 'vitest';
import {
  calculateCardPayoff,
  fixedPaymentMonths,
  validateCardPayoffInput,
  type CardPayoffInput,
} from '../../src/engines/debtPayoff';

/*
 * OUTSIDE CHECK (calculator.net credit card calculator, 18 Oct 2026):
 *   1. 34 months, $1,748.34 interest   2. $259.37/month, $1,224.79 (exact)   3. 27 months, £915.81
 *   Months and target payments match. Fixed-payment interest there is 14–35 cents lower because it rounds
 *   each month's interest to the cent; we keep full precision (CLAUDE.md section 7).
 *
 * Expected values from an independent month-by-month script (monthly rate = APR / 12, no new spending).
 * External cross-checks (calculator.net credit card payoff calculator or Bankrate):
 *   1. $5,000, 21.99% APR, $200/month → 34 months, $1,748.69 interest
 *   2. $5,000, 21.99% APR, pay off in 24 months → $259.37/month, $1,224.79 interest
 *   3. £3,000, 24.9% APR, £150/month → 27 months, £915.95 interest
 */

const base: CardPayoffInput = { balance: 5_000, aprPercent: 21.99, mode: 'payment', monthlyPayment: 200, targetMonths: 24 };

describe('calculateCardPayoff, fixed payment', () => {
  it('$5,000 at 21.99% paying $200 a month', () => {
    const r = calculateCardPayoff(base);
    expect(r.months).toBe(34);
    expect(r.totalInterest).toBeCloseTo(1_748.69, 2);
    expect(r.totalPaid).toBeCloseTo(6_748.69, 2);
    expect(r.firstMonthInterest).toBeCloseTo(91.625, 6);
    expect(r.schedule.at(-1)?.balance).toBe(0);
    expect(r.schedule.at(-1)!.payment).toBeLessThan(200);
  });

  it('£3,000 at 24.9% paying £150 a month', () => {
    const r = calculateCardPayoff({ balance: 3_000, aprPercent: 24.9, mode: 'payment', monthlyPayment: 150, targetMonths: 12 });
    expect(r.months).toBe(27);
    expect(r.totalInterest).toBeCloseTo(915.95, 2);
  });

  it('a small payment takes years: $100 a month takes 137 months and $8,656.83 of interest', () => {
    const r = calculateCardPayoff({ ...base, monthlyPayment: 100 });
    expect(r.months).toBe(137);
    expect(r.totalInterest).toBeCloseTo(8_656.83, 2);
  });

  it('0% APR: balance ÷ payment months, no interest', () => {
    const r = calculateCardPayoff({ ...base, balance: 1_200, aprPercent: 0, monthlyPayment: 100 });
    expect(r.months).toBe(12);
    expect(r.totalInterest).toBe(0);
  });

  it('a payment above balance + interest clears the card in one month', () => {
    const r = calculateCardPayoff({ ...base, monthlyPayment: 10_000 });
    expect(r.months).toBe(1);
    expect(r.schedule[0]?.payment).toBeCloseTo(5_000 * (1 + 21.99 / 1200), 8);
  });

  it('schedule repays exactly the balance', () => {
    const r = calculateCardPayoff({ ...base, balance: 7_321.45, aprPercent: 29.99, monthlyPayment: 333.33 });
    const principal = r.schedule.reduce((s, row) => s + row.principal, 0);
    expect(principal).toBeCloseTo(7_321.45, 6);
    expect(r.months).toBe(fixedPaymentMonths(7_321.45, 29.99, 333.33));
  });
});

describe('calculateCardPayoff, target months', () => {
  it('$5,000 at 21.99% in 24 months needs $259.37 a month', () => {
    const r = calculateCardPayoff({ ...base, mode: 'months', targetMonths: 24 });
    expect(r.monthlyPayment).toBeCloseTo(259.37, 2);
    expect(r.totalInterest).toBeCloseTo(1_224.79, 2);
    expect(r.months).toBe(24);
  });

  it('£3,000 at 24.9% in 12 months needs £284.99 a month', () => {
    const r = calculateCardPayoff({ balance: 3_000, aprPercent: 24.9, mode: 'months', monthlyPayment: 0, targetMonths: 12 });
    expect(r.monthlyPayment).toBeCloseTo(284.99, 2);
    expect(r.totalInterest).toBeCloseTo(419.84, 2);
  });

  it('1-month target pays balance plus one month of interest', () => {
    const r = calculateCardPayoff({ ...base, mode: 'months', targetMonths: 1 });
    expect(r.monthlyPayment).toBeCloseTo(5_000 * (1 + 21.99 / 1200), 8);
  });
});

describe('validateCardPayoffInput', () => {
  it('rejects a payment that does not cover the monthly interest', () => {
    expect(validateCardPayoffInput({ ...base, monthlyPayment: 91 }).map((e) => e.field)).toEqual(['monthlyPayment']);
    expect(validateCardPayoffInput({ ...base, monthlyPayment: 92 })).toEqual([]);
  });

  it('rejects payments that would take more than 100 years', () => {
    // At 100% APR even a tiny overpayment clears the max balance (175 months), so it is allowed.
    expect(validateCardPayoffInput({ ...base, balance: 10_000_000, aprPercent: 100, monthlyPayment: 833_334 })).toEqual([]);
    // Max balance at 1% APR, paying 1 cent over the monthly interest of 8,333.33.
    const errors = validateCardPayoffInput({ ...base, balance: 10_000_000, aprPercent: 1, monthlyPayment: 8_333.34 });
    expect(errors.map((e) => e.message)).toEqual(['At this payment the card would take more than 100 years to clear.']);
  });

  it('flags empty, negative and out-of-range inputs', () => {
    const fields = (input: CardPayoffInput) => validateCardPayoffInput(input).map((e) => e.field);
    expect(fields({ ...base, balance: Number.NaN, aprPercent: -1, monthlyPayment: Number.NaN })).toEqual([
      'balance',
      'aprPercent',
      'monthlyPayment',
    ]);
    expect(fields({ ...base, mode: 'months', targetMonths: 0 })).toEqual(['targetMonths']);
    expect(fields({ ...base, mode: 'months', targetMonths: 12.5 })).toEqual(['targetMonths']);
  });

  it('throws instead of returning NaN', () => {
    expect(() => calculateCardPayoff({ ...base, balance: Number.NaN })).toThrow(RangeError);
  });
});

describe('guide figures (src/content/guides/uk/credit-card-payoff-calculator.md)', () => {
  const uk: CardPayoffInput = { balance: 3_000, aprPercent: 24.9, mode: 'payment', monthlyPayment: 150, targetMonths: 24 };
  const pay = (monthlyPayment: number) => calculateCardPayoff({ ...uk, monthlyPayment });
  const target = (targetMonths: number, aprPercent = 24.9) => calculateCardPayoff({ ...uk, mode: 'months', targetMonths, aprPercent });
  /** The FCA test: interest against principal over the first 18 months. */
  const first18 = (monthlyPayment: number) => {
    const rows = pay(monthlyPayment).schedule.slice(0, 18);
    return { interest: rows.reduce((s, x) => s + x.interest, 0), principal: rows.reduce((s, x) => s + x.principal, 0) };
  };

  it('matches the payment table and the first month of interest', () => {
    const rows: [number, number, number][] = [
      [70, 108, 4_501.25],
      [100, 48, 1_743.66],
      [150, 27, 915.95],
      [200, 19, 631.43],
    ];
    for (const [payment, months, interest] of rows) {
      const r = pay(payment);
      expect(r.months, `£${payment}`).toBe(months);
      expect(r.totalInterest, `£${payment}`).toBeCloseTo(interest, 2);
    }
    expect(pay(150).firstMonthInterest).toBeCloseTo(62.25, 2);
    expect(pay(100).totalInterest - pay(200).totalInterest).toBeCloseTo(1_112.24, 2);
  });

  it('matches the target-date figures and the 0% transfer', () => {
    const rows: [number, number, number][] = [
      [12, 284.99, 419.84],
      [24, 159.96, 839.14],
      [36, 119.12, 1_288.35],
      [48, 99.3, 1_766.6],
    ];
    for (const [months, payment, interest] of rows) {
      expect(target(months).monthlyPayment, `${months} months`).toBeCloseTo(payment, 2);
      expect(target(months).totalInterest, `${months} months`).toBeCloseTo(interest, 2);
    }
    expect(target(24, 0).monthlyPayment).toBe(125);
  });

  it('matches the persistent debt figures, with £107 the lowest whole-pound payment that avoids it', () => {
    const rows: [number, number, number][] = [
      [70, 1_092.95, 167.05],
      [100, 986.3, 813.7],
      [107, 961.41, 964.59],
    ];
    for (const [payment, interest, principal] of rows) {
      expect(first18(payment).interest, `£${payment}`).toBeCloseTo(interest, 2);
      expect(first18(payment).principal, `£${payment}`).toBeCloseTo(principal, 2);
    }
    expect(first18(106).principal).toBeLessThan(first18(106).interest);
    expect(first18(107).principal).toBeGreaterThan(first18(107).interest);
  });
});
