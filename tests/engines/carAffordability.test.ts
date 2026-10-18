import { describe, expect, it } from 'vitest';
import { calculateCarAffordability, validateCarAffordabilityInput, type CarAffordabilityInput } from '../../src/engines/carAffordability';
import { maxPrincipalForPayment, monthlyPayment } from '../../src/engines/loan';

/*
 * OUTSIDE CHECK (calculator.net auto loan calculator, run forward from our answer, 18 Oct 2026), all exact:
 *   1. $29,010.37 car → $500.00/month, $25,250.99 loan, $1,440.62 tax, $4,749.00 interest
 *   2. 72 months: $32,855.87 car → $500.00/month, $29,327.22 loan   3. 0% APR: $36,000 car → $500.00, $30,000 loan
 *
 * Expected values from an independent script (scratch reference: discounted-payment sum, then solving
 * price × 1.06 − 0.06 × trade-in = cash available).
 * External cross-check: a $500/month payment at 7% over 60 months supports about $25,251 of loan
 * (enter $25,251 / 7% / 60 months in any loan calculator: payment ≈ $500.00).
 */

const base: CarAffordabilityInput = {
  monthlyBudget: 500,
  downPayment: 3_000,
  tradeInValue: 5_000,
  tradeInOwed: 2_000,
  aprPercent: 7,
  termMonths: 60,
  salesTaxPercent: 6,
  fees: 800,
  taxAfterTradeIn: true,
};

describe('maxPrincipalForPayment', () => {
  it('is the exact inverse of monthlyPayment', () => {
    const loan = maxPrincipalForPayment(500, 7, 60);
    expect(loan).toBeCloseTo(25_251, 0);
    expect(monthlyPayment(loan, 7, 60)).toBeCloseTo(500, 8);
  });

  it('is payment × months at 0% APR', () => {
    expect(maxPrincipalForPayment(400, 0, 48)).toBe(19_200);
  });
});

describe('calculateCarAffordability', () => {
  it('finds the maximum price with tax charged after the trade-in', () => {
    const r = calculateCarAffordability(base);
    expect(r.loanAmount).toBeCloseTo(25_251, 0);
    expect(r.maxPrice).toBeCloseTo(29_010.37, 1);
    expect(r.salesTax).toBeCloseTo(1_440.62, 1);
    expect(r.tradeInEquity).toBe(3_000);
    expect(r.totalInterest).toBeCloseTo(4_749, 0);
    expect(r.affordable).toBe(true);
  });

  it('allows a lower price when tax is charged on the full price', () => {
    const r = calculateCarAffordability({ ...base, taxAfterTradeIn: false });
    expect(r.maxPrice).toBeCloseTo(28_727.36, 1);
    expect(r.salesTax).toBeCloseTo(r.maxPrice * 0.06, 8);
  });

  it('adds up: price + tax + fees = loan + down payment + equity', () => {
    const r = calculateCarAffordability(base);
    expect(r.maxPrice + r.salesTax + base.fees).toBeCloseTo(r.loanAmount + base.downPayment + r.tradeInEquity, 6);
    expect(r.totalCost).toBeCloseTo(base.monthlyBudget * base.termMonths + base.downPayment + r.tradeInEquity, 6);
  });

  it('negative equity lowers the price you can afford', () => {
    const r = calculateCarAffordability({ ...base, tradeInOwed: 8_000 });
    expect(r.tradeInEquity).toBe(-3_000);
    expect(r.maxPrice).toBeLessThan(calculateCarAffordability(base).maxPrice - 5_000);
  });

  it('0% APR: the loan is budget × months with no interest', () => {
    const r = calculateCarAffordability({ ...base, aprPercent: 0, salesTaxPercent: 0, fees: 0 });
    expect(r.loanAmount).toBe(30_000);
    expect(r.totalInterest).toBe(0);
    expect(r.maxPrice).toBe(36_000);
  });

  it('flags a budget that cannot cover fees and negative equity', () => {
    const r = calculateCarAffordability({ ...base, monthlyBudget: 10, downPayment: 0, tradeInOwed: 20_000 });
    expect(r.affordable).toBe(false);
    expect(r.maxPrice).toBe(0);
    expect(r.salesTax).toBe(0);
  });

  it('validates every field', () => {
    const fields = validateCarAffordabilityInput({
      ...base,
      monthlyBudget: 0,
      downPayment: -1,
      aprPercent: 101,
      termMonths: 60.5,
      salesTaxPercent: 30,
    }).map((e) => e.field);
    expect(fields).toEqual(['monthlyBudget', 'downPayment', 'aprPercent', 'termMonths', 'salesTaxPercent']);
  });
});
