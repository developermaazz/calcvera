import { describe, expect, it } from 'vitest';
import { calculateCarLoan, carSalesTax, validateCarLoanInput, type CarLoanInput } from '../../src/engines/carLoan';

/*
 * OUTSIDE CHECK (calculator.net auto loan calculator, 18 Oct 2026), all exact:
 *   1. $19,180 financed, $1,080 tax, $402.82/month, $4,988.94 interest, $28,668.94 total cost
 *   2. 72 months: $350.51/month, $6,056.62 interest   3. Owing $7,000: $24,680 financed, $518.33/month
 *
 * Expected values from an independent script (amount financed, then the standard amortisation formula,
 * checked against a month-by-month simulation).
 * External cross-checks (calculator.net auto loan calculator or Bankrate's auto loan calculator):
 *   1. $22,000 car, $2,000 down, $4,000 trade-in owing $1,500, 6% tax after trade-in, $600 fees,
 *      9.5% APR, 60 months → $19,180 financed, $402.82/month, $4,988.94 interest
 *   2. Same car taxed on the full price → $19,420 financed, $407.86/month
 *   3. Same as 1 over 72 months → $350.51/month, $6,056.62 interest
 */

const base: CarLoanInput = {
  price: 22_000,
  downPayment: 2_000,
  tradeInValue: 4_000,
  tradeInOwed: 1_500,
  salesTaxPercent: 6,
  fees: 600,
  aprPercent: 9.5,
  termMonths: 60,
  taxAfterTradeIn: true,
};

describe('calculateCarLoan', () => {
  it('$22,000 used car with a trade-in, tax after trade-in', () => {
    const r = calculateCarLoan(base);
    expect(r.salesTax).toBeCloseTo(1_080, 8);
    expect(r.tradeInEquity).toBe(2_500);
    expect(r.loanAmount).toBeCloseTo(19_180, 8);
    expect(r.loan?.monthlyPayment).toBeCloseTo(402.82, 2);
    expect(r.totalInterest).toBeCloseTo(4_988.94, 2);
    expect(r.totalCost).toBeCloseTo(28_668.94, 2);
  });

  it('tax on the full price raises the loan', () => {
    const r = calculateCarLoan({ ...base, taxAfterTradeIn: false });
    expect(r.salesTax).toBeCloseTo(1_320, 8);
    expect(r.loanAmount).toBeCloseTo(19_420, 8);
    expect(r.loan?.monthlyPayment).toBeCloseTo(407.86, 2);
  });

  it('a longer term lowers the payment but adds interest', () => {
    const r = calculateCarLoan({ ...base, termMonths: 72 });
    expect(r.loan?.monthlyPayment).toBeCloseTo(350.51, 2);
    expect(r.totalInterest).toBeCloseTo(6_056.62, 2);
  });

  it('negative equity is added to the loan', () => {
    const r = calculateCarLoan({ ...base, tradeInOwed: 7_000 });
    expect(r.tradeInEquity).toBe(-3_000);
    expect(r.loanAmount).toBeCloseTo(24_680, 8);
    expect(r.loan?.monthlyPayment).toBeCloseTo(518.33, 2);
  });

  it('0% APR: payment is the loan ÷ months', () => {
    const r = calculateCarLoan({ ...base, price: 20_000, downPayment: 0, tradeInValue: 0, tradeInOwed: 0, salesTaxPercent: 0, fees: 0, aprPercent: 0, termMonths: 48 });
    expect(r.loan?.monthlyPayment).toBeCloseTo(416.67, 2);
    expect(r.totalInterest).toBe(0);
  });

  it('no loan needed when the down payment and trade-in cover everything', () => {
    const r = calculateCarLoan({ ...base, price: 5_000, downPayment: 5_000 });
    expect(r.needsLoan).toBe(false);
    expect(r.loanAmount).toBe(0);
    expect(r.loan).toBeNull();
    expect(r.totalCost).toBeCloseTo(5_000 + carSalesTax(5_000, 4_000, 6, true) + 600, 8);
  });

  it('1-month term and max values stay finite', () => {
    expect(calculateCarLoan({ ...base, termMonths: 1 }).loan?.monthlyPayment).toBeCloseTo(19_180 * (1 + 9.5 / 1200), 6);
    const big = calculateCarLoan({ ...base, price: 10_000_000, aprPercent: 100, termMonths: 120 });
    expect(Number.isFinite(big.totalInterest)).toBe(true);
  });
});

describe('carSalesTax', () => {
  it('never taxes a negative amount when the trade-in is worth more than the car', () => {
    expect(carSalesTax(3_000, 5_000, 6, true)).toBe(0);
    expect(carSalesTax(3_000, 5_000, 6, false)).toBeCloseTo(180, 8);
  });
});

describe('validateCarLoanInput', () => {
  it('flags empty, negative and out-of-range values', () => {
    const fields = validateCarLoanInput({ ...base, price: Number.NaN, downPayment: -1, salesTaxPercent: 30, aprPercent: -2, termMonths: 60.5 }).map(
      (e) => e.field,
    );
    expect(fields).toEqual(['price', 'downPayment', 'salesTaxPercent', 'aprPercent', 'termMonths']);
  });

  it('throws instead of returning NaN', () => {
    expect(() => calculateCarLoan({ ...base, termMonths: 0 })).toThrow(RangeError);
  });
});
