import { describe, expect, it } from 'vitest';
import { us } from '../../src/countries/us';
import { calculateUsMortgage, validateUsMortgageInput, type UsMortgageInput } from '../../src/engines/usMortgage';

/*
 * OUTSIDE CHECK (calculator.net mortgage calculator, 3 Nov 2026), all exact:
 *   1. $400,000 home, 10% down, 30 years at 6.5%, property tax 1.1%, insurance $1,800 a year: loan $360,000,
 *      principal and interest $2,275.44, tax $366.67, insurance $150.00, total interest $459,160.16
 *   2. $300,000 home, 20% down, 15 years at 5.75%, tax $3,000 a year, insurance $1,200 a year: principal and
 *      interest $1,992.98, tax $250.00, insurance $100.00, total interest $118,737.16
 *   3. $500,000 home, $25,000 down, 30 years at 7%, $300 a month extra: principal and interest $3,160.19,
 *      278 payments, total interest $484,773.93, interest saved $177,893.34
 * PMI rules (80% request, 78% automatic, midpoint) from the CFPB pages cited in us.ts.
 */

const config = us.us!.mortgage;
const base: UsMortgageInput = {
  homePrice: 400_000,
  downPayment: 40_000,
  ratePercent: 6.5,
  termYears: 30,
  propertyTaxPercent: 1.1,
  insurancePerYear: 1_800,
  pmiPercent: 0,
  hoaPerMonth: 0,
  extraMonthly: 0,
};
const run = (x: Partial<UsMortgageInput>) => calculateUsMortgage({ ...base, ...x }, config);

/** First payment after which the balance is at or under `limit`. */
const firstAtOrUnder = (schedule: { balance: number }[], limit: number) => schedule.findIndex((row) => row.balance <= limit) + 1;

describe('outside checks', () => {
  it('1: $400,000 with 10% down at 6.5%', () => {
    const r = run({});
    expect(r.loanAmount).toBe(360_000);
    expect(r.principalAndInterest).toBeCloseTo(2_275.44, 2);
    expect(r.propertyTax).toBeCloseTo(366.67, 2);
    expect(r.insurance).toBeCloseTo(150, 8);
    expect(r.totalInterest).toBeCloseTo(459_160.16, 2);
    expect(r.payoffMonths).toBe(360);
    expect(r.schedule.at(-1)!.balance).toBe(0);
  });

  it('2: 15 years at 5.75% with 20% down', () => {
    const r = run({ homePrice: 300_000, downPayment: 60_000, termYears: 15, ratePercent: 5.75, propertyTaxPercent: 1, insurancePerYear: 1_200 });
    expect(r.principalAndInterest).toBeCloseTo(1_992.98, 2);
    expect(r.propertyTax).toBeCloseTo(250, 8);
    expect(r.insurance).toBeCloseTo(100, 8);
    expect(r.totalInterest).toBeCloseTo(118_737.16, 2);
  });

  it('3: $300 a month extra', () => {
    const r = run({ homePrice: 500_000, downPayment: 25_000, ratePercent: 7, propertyTaxPercent: 0, insurancePerYear: 0, extraMonthly: 300 });
    expect(r.principalAndInterest).toBeCloseTo(3_160.19, 2);
    expect(r.payoffMonths).toBe(278);
    expect(r.totalInterest).toBeCloseTo(484_773.93, 2);
    expect(r.interestSaved).toBeCloseTo(177_893.34, 2);
    expect(r.monthsSaved).toBe(82);
  });
});

describe('monthly payment', () => {
  it('adds tax, insurance, PMI and HOA dues to principal and interest', () => {
    const r = run({ pmiPercent: 0.5, hoaPerMonth: 250 });
    expect(r.pmi).toBeCloseTo((360_000 * 0.005) / 12, 8);
    expect(r.monthlyPayment).toBeCloseTo(r.principalAndInterest + r.propertyTax + r.insurance + 150 + 250, 8);
    expect(r.paymentAfterPmi).toBeCloseTo(r.monthlyPayment - 150, 8);
  });

  it('handles a 0% rate: principal ÷ months, no interest', () => {
    const r = run({ ratePercent: 0 });
    expect(r.principalAndInterest).toBeCloseTo(1_000, 8);
    expect(r.totalInterest).toBe(0);
    expect(r.payoffMonths).toBe(360);
  });

  it('handles the minimum term and the largest price', () => {
    expect(run({ termYears: 1 }).payoffMonths).toBe(12);
    const r = run({ homePrice: 100_000_000, downPayment: 20_000_000, ratePercent: 25, termYears: 40 });
    expect(Number.isFinite(r.monthlyPayment)).toBe(true);
    expect(r.schedule.at(-1)!.balance).toBe(0);
  });
});

describe('PMI', () => {
  it('ends when the balance is scheduled to reach 78% of the price; you can ask at 80%', () => {
    const r = run({ pmiPercent: 0.5 });
    const auto = firstAtOrUnder(r.schedule, 312_000);
    expect(r.pmiMonths).toBe(auto);
    expect(r.pmiRequestMonth).toBe(firstAtOrUnder(r.schedule, 320_000));
    expect(r.pmiRequestMonth).toBeLessThan(r.pmiMonths);
    expect(r.schedule[auto - 2]!.balance).toBeGreaterThan(312_000);
    expect(r.totalPmi).toBeCloseTo(150 * auto, 6);
  });

  it('is not charged with 20% down or with no PMI rate', () => {
    const twenty = run({ downPayment: 80_000, pmiPercent: 0.5 });
    expect(twenty.pmi).toBe(0);
    expect(twenty.pmiMonths).toBe(0);
    expect(twenty.monthlyPayment).toBe(twenty.paymentAfterPmi);
    expect(run({ pmiPercent: 0 }).totalPmi).toBe(0);
  });

  it('ends after the payment at the midpoint of the term when 78% comes later', () => {
    // 3% down at 10%: the balance is still over 78% of the price after 15 years.
    const r = run({ downPayment: 12_000, ratePercent: 10, pmiPercent: 1 });
    expect(r.schedule[179]!.balance).toBeGreaterThan(312_000);
    expect(r.pmiMonths).toBe(180);
  });

  it('extra payments bring the request date forward but not the automatic end', () => {
    const plain = run({ pmiPercent: 0.5 });
    const extra = run({ pmiPercent: 0.5, extraMonthly: 500 });
    expect(extra.pmiMonths).toBe(plain.pmiMonths);
    expect(extra.pmiRequestMonth).toBeLessThan(plain.pmiRequestMonth);
  });

  it('stops when the loan is paid off before PMI would end', () => {
    const r = run({ pmiPercent: 0.5, extraMonthly: 100_000 });
    expect(r.payoffMonths).toBe(4);
    expect(r.pmiMonths).toBe(4);
  });
});

describe('validation', () => {
  it('accepts the defaults', () => {
    expect(validateUsMortgageInput(base)).toEqual([]);
  });

  it('needs something to borrow', () => {
    expect(validateUsMortgageInput({ ...base, downPayment: 399_500 }).map((e) => e.field)).toEqual(['downPayment']);
    expect(validateUsMortgageInput({ ...base, downPayment: 500_000 }).map((e) => e.field)).toEqual(['downPayment']);
  });

  it('flags empty, out-of-range and fractional input', () => {
    const fields = validateUsMortgageInput({
      ...base,
      homePrice: Number.NaN,
      ratePercent: 30,
      termYears: 15.5,
      propertyTaxPercent: -1,
      insurancePerYear: Number.NaN,
      pmiPercent: 6,
      hoaPerMonth: -5,
      extraMonthly: -1,
    }).map((e) => e.field);
    expect(fields).toEqual(['homePrice', 'ratePercent', 'termYears', 'propertyTaxPercent', 'insurancePerYear', 'pmiPercent', 'hoaPerMonth', 'extraMonthly']);
    expect(() => run({ termYears: 0 })).toThrow(RangeError);
  });
});
