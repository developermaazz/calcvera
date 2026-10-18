import { describe, expect, it } from 'vitest';
import { balloonPayment, calculateCarFinance, validateCarFinanceInput, type CarFinanceInput } from '../../src/engines/carFinance';

/*
 * Expected values from an independent script (annuity with a final balloon payment, r = APR / 12).
 * External cross-checks to run (a UK PCP calculator such as MoneySavingExpert's or a lender's quote):
 *   1. £25,000 car, £3,000 deposit, 48 months, 9.9% APR, £9,000 final payment → £403.34/month, £31,370.30 total
 *   2. Same as hire purchase (no final payment) → £556.92/month, £29,732.20 total
 *   3. 0% APR: £20,000 car, £2,000 deposit, 36 months, £6,000 final → £333.33/month
 * Lenders use the APR as an annual compound rate, so quotes can differ by a few pence a month.
 */

const base: CarFinanceInput = { price: 25_000, deposit: 3_000, termMonths: 48, aprPercent: 9.9, finalPayment: 9_000, optionFee: 10 };

describe('calculateCarFinance', () => {
  it('PCP with a £9,000 final payment', () => {
    const r = calculateCarFinance(base);
    expect(r.financed).toBe(22_000);
    expect(r.monthlyPayment).toBeCloseTo(403.34, 2);
    expect(r.totalPayable).toBeCloseTo(31_370.3, 1);
    expect(r.totalCharges).toBeCloseTo(6_370.3, 1);
    expect(r.voluntaryTerminationPoint).toBeCloseTo(15_685.15, 1);
  });

  it('hire purchase comparison has no final payment', () => {
    const r = calculateCarFinance({ ...base, finalPayment: 0, optionFee: 0 });
    expect(r.monthlyPayment).toBeCloseTo(556.92, 2);
    expect(r.totalPayable).toBeCloseTo(29_732.2, 1);
    expect(calculateCarFinance(base).hirePurchasePayment).toBeCloseTo(556.92, 2);
  });

  it('0% APR: (financed − final) ÷ months', () => {
    const r = calculateCarFinance({ price: 20_000, deposit: 2_000, termMonths: 36, aprPercent: 0, finalPayment: 6_000, optionFee: 0 });
    expect(r.monthlyPayment).toBeCloseTo(333.33, 2);
    expect(r.totalCharges).toBeCloseTo(0, 6);
  });

  it('payments plus the discounted final payment repay the amount financed', () => {
    const r = 9.9 / 1200;
    const pmt = balloonPayment(22_000, 9.9, 48, 9_000);
    let pv = 9_000 / (1 + r) ** 48;
    for (let k = 1; k <= 48; k++) pv += pmt / (1 + r) ** k;
    expect(pv).toBeCloseTo(22_000, 6);
  });

  it('validates the deposit and final payment against the price', () => {
    expect(validateCarFinanceInput({ ...base, deposit: 25_000 }).map((e) => e.field)).toEqual(['deposit']);
    expect(validateCarFinanceInput({ ...base, finalPayment: 22_000 }).map((e) => e.field)).toEqual(['finalPayment']);
    expect(validateCarFinanceInput({ ...base, termMonths: 3, aprPercent: 60 }).map((e) => e.field)).toEqual(['termMonths', 'aprPercent']);
    expect(() => calculateCarFinance({ ...base, price: Number.NaN })).toThrow(RangeError);
  });
});
