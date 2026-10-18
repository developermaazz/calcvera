import { describe, expect, it } from 'vitest';
import {
  calculateCardPayoff,
  fixedPaymentMonths,
  validateCardPayoffInput,
  type CardPayoffInput,
} from '../../src/engines/debtPayoff';

/*
 * Expected values from an independent month-by-month script (monthly rate = APR / 12, no new spending).
 * External cross-checks to run (calculator.net credit card payoff calculator or Bankrate):
 *   1. $5,000, 21.99% APR, $200/month → 34 months, $1,748.69 interest
 *   2. $5,000, 21.99% APR, pay off in 24 months → $259.37/month, $1,224.79 interest
 *   3. £3,000, 24.9% APR, £150/month → 27 months, £915.95 interest
 * Card issuers charge interest daily, so real statements can differ slightly. Record the check date here.
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
