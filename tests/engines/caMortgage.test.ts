import { describe, expect, it } from 'vitest';
import { requireFigure } from '../../src/countries';
import { ca } from '../../src/countries/ca';
import { BELOW_MINIMUM, calculateCaMortgage, levelPayment, minimumDownPayment, periodicRate, validateCaMortgageInput, type CaMortgageInput } from '../../src/engines/caMortgage';

/*
 * OUTSIDE CHECK (calculator.net Canadian mortgage calculator, semi-annual compounding, 20 Oct 2026), all exact:
 *   1. $500,000 price, 20% down, 5%, 25 years: $2,326.42 a month, interest $297,925.98
 *   2. $750,000 price, 20% down, 4.29%, 30 years: $2,952.40 a month, interest $462,862.46
 *   3. $400,000 price, 25% down, 6.1%, 20 years: $2,153.43 a month, interest $216,823.33
 *
 * Hand checks (FCAC down payment table, CMHC premium schedule):
 *   $600,000: minimum down 5% × 500,000 + 10% × 100,000 = $35,000. 10% down → loan $540,000, LTV 90% → 3.10%
 *   premium = $16,740, mortgage $556,740. 30-year amortization (first-time buyer) → 3.10% + 0.20% = 3.30%.
 *   $1,600,000: 20% down = $320,000.
 */

const p = requireFigure(ca.ca, 'ca').mortgage;
const base: CaMortgageInput = {
  price: 500_000,
  downPayment: 100_000,
  ratePercent: 5,
  rateType: 'fixed',
  amortizationYears: 25,
  frequency: 'monthly',
  termYears: 5,
  firstTimeOrNewBuild: false,
};
const run = (x: Partial<CaMortgageInput>) => calculateCaMortgage({ ...base, ...x }, p);

describe('payments (semi-annual compounding)', () => {
  it('outside check 1', () => {
    const r = run({});
    expect(r.insured).toBe(false);
    expect(r.mortgage).toBe(400_000);
    expect(r.payment).toBeCloseTo(2_326.42, 2);
    expect(r.totalInterest).toBeCloseTo(297_925.98, 2);
    expect(r.payments).toBe(300);
    expect(r.years.at(-1)!.balance).toBe(0);
  });

  it('outside check 2', () => {
    const r = run({ price: 750_000, downPayment: 150_000, ratePercent: 4.29, amortizationYears: 30 });
    expect(r.payment).toBeCloseTo(2_952.4, 2);
    expect(r.totalInterest).toBeCloseTo(462_862.46, 2);
  });

  it('outside check 3', () => {
    const r = run({ price: 400_000, downPayment: 100_000, ratePercent: 6.1, amortizationYears: 20 });
    expect(r.payment).toBeCloseTo(2_153.43, 2);
    expect(r.totalInterest).toBeCloseTo(216_823.33, 2);
  });

  it('variable rate compounds monthly; 0% repays evenly', () => {
    const r = run({ rateType: 'variable' });
    const i = 0.05 / 12;
    expect(r.payment).toBeCloseTo((400_000 * i) / (1 - Math.pow(1 + i, -300)), 8);
    expect(run({ ratePercent: 0 }).payment).toBeCloseTo(400_000 / 300, 8);
    expect(run({ ratePercent: 0 }).totalInterest).toBe(0);
  });

  it('term balance, interest and principal for the first 5 years', () => {
    const r = run({});
    expect(r.termBalance).toBeCloseTo(r.years[4]!.balance, 8);
    expect(r.termPrincipal).toBeCloseTo(400_000 - r.termBalance, 8);
    expect(r.termInterest).toBeCloseTo(r.years.slice(0, 5).reduce((s, y) => s + y.interest, 0), 8);
  });
});

describe('payment frequency', () => {
  it('bi-weekly and weekly repay over the same amortization', () => {
    const bw = run({ frequency: 'biWeekly' });
    expect(bw.payments).toBe(650);
    expect(bw.payment).toBeCloseTo(levelPayment(400_000, periodicRate(5, 'fixed', 26), 650), 8);
    expect(run({ frequency: 'semiMonthly' }).payments).toBe(600);
    expect(run({ frequency: 'weekly' }).payments).toBe(1_300);
  });

  it('accelerated payments are the monthly payment ÷ 2 or ÷ 4 and pay off sooner', () => {
    const monthly = run({}).payment;
    const abw = run({ frequency: 'accelBiWeekly' });
    expect(abw.payment).toBeCloseTo(monthly / 2, 8);
    expect(abw.payoffYears).toBeLessThan(25);
    expect(abw.interestSavedVsMonthly).toBeGreaterThan(0);
    expect(abw.interestSavedVsMonthly).toBeCloseTo(297_925.98 - abw.totalInterest, 2);
    const aw = run({ frequency: 'accelWeekly' });
    expect(aw.payment).toBeCloseTo(monthly / 4, 8);
    expect(aw.payoffYears).toBeLessThan(25);
  });
});

describe('down payment and mortgage loan insurance', () => {
  it('minimum down payment', () => {
    expect(minimumDownPayment(400_000, p)).toBe(20_000);
    expect(minimumDownPayment(600_000, p)).toBe(35_000);
    expect(minimumDownPayment(1_600_000, p)).toBe(320_000);
  });

  it('insured: premium by loan-to-value is added to the mortgage', () => {
    const r = run({ price: 600_000, downPayment: 60_000 });
    expect(r.insured).toBe(true);
    expect(r.premiumRate).toBeCloseTo(0.031, 10);
    expect(r.premium).toBeCloseTo(16_740, 6);
    expect(r.mortgage).toBeCloseTo(556_740, 6);
    expect(run({ price: 600_000, downPayment: 90_000 }).premiumRate).toBeCloseTo(0.028, 10);
    expect(run({ price: 600_000, downPayment: 35_000 }).premiumRate).toBeCloseTo(0.04, 10);
    expect(run({ price: 600_000, downPayment: 120_000 }).insured).toBe(false);
  });

  it('30-year insured amortization: first-time buyers only, with the surcharge', () => {
    const r = run({ price: 600_000, downPayment: 60_000, amortizationYears: 30, firstTimeOrNewBuild: true });
    expect(r.premiumRate).toBeCloseTo(0.033, 10);
    const errs = validateCaMortgageInput({ ...base, price: 600_000, downPayment: 60_000, amortizationYears: 30 }, p);
    expect(errs.map((e) => e.field)).toEqual(['amortizationYears']);
  });

  it('flags a down payment below the minimum or not below the price', () => {
    expect(validateCaMortgageInput({ ...base, downPayment: 10_000 }, p)).toEqual([{ field: 'downPayment', message: BELOW_MINIMUM }]);
    expect(validateCaMortgageInput({ ...base, price: 1_600_000, downPayment: 160_000 }, p).map((e) => e.field)).toEqual(['downPayment']);
    expect(validateCaMortgageInput({ ...base, downPayment: 500_000 }, p).map((e) => e.field)).toEqual(['downPayment']);
  });

  it('flags other bad values', () => {
    expect(validateCaMortgageInput({ ...base, price: Number.NaN, ratePercent: 30, amortizationYears: 31, termYears: 0 }, p).map((e) => e.field)).toEqual([
      'price',
      'ratePercent',
      'amortizationYears',
      'termYears',
    ]);
    expect(validateCaMortgageInput(base, p)).toEqual([]);
  });

  it('large values stay finite', () => {
    const r = run({ price: 100_000_000, downPayment: 50_000_000, ratePercent: 25, amortizationYears: 30, frequency: 'accelWeekly' });
    expect(Number.isFinite(r.totalInterest)).toBe(true);
    expect(r.years.at(-1)!.balance).toBe(0);
  });
});
