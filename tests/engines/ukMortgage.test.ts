import { describe, expect, it } from 'vitest';
import { calculateUkMortgage, validateUkMortgageInput, type UkMortgageInput } from '../../src/engines/ukMortgage';

/*
 * OUTSIDE CHECK (calculator.net amortization calculator, monthly, 4 Nov 2026). The deal period is the full loan
 * over the whole term; the follow-on period is a new loan of the balance left over the remaining years:
 *   1. £255,000 over 25 years at 4.6% for 5 years, then 7.1%: £1,431.89 a month, £224,412.34 left after 60
 *      payments, then £1,753.36 a month (240 payments totalling £420,806.97)
 *   2. £200,000 over 30 years at 3.99% for 2 years, then 6.99%: £953.68, £192,800.24 left after 24 payments,
 *      then £1,309.02 (336 payments totalling £439,829.87)
 *   3. £150,000 over 20 years at 5.5% for 3 years, then 7.5%: £1,031.83, £136,556.17 left after 36 payments,
 *      then £1,186.28 (204 payments totalling £242,000.36)
 */

const base: UkMortgageInput = {
  price: 300_000,
  deposit: 45_000,
  termYears: 25,
  repaymentType: 'repayment',
  initialRatePercent: 4.6,
  dealYears: 5,
  followOnRatePercent: 7.1,
  productFee: 0,
  addFeeToLoan: false,
};
const run = (x: Partial<UkMortgageInput>) => calculateUkMortgage({ ...base, ...x });

describe('outside checks', () => {
  it('1: £255,000, 5-year deal at 4.6%, then 7.1%', () => {
    const r = run({});
    expect(r.loan).toBe(255_000);
    expect(r.initialPayment).toBeCloseTo(1_431.89, 2);
    expect(r.dealBalance).toBeCloseTo(224_412.34, 2);
    expect(r.followOnPayment).toBeCloseTo(1_753.36, 2);
    const followOnPaid = r.schedule.slice(60).reduce((s, row) => s + row.payment, 0);
    expect(followOnPaid).toBeCloseTo(420_806.97, 1);
    expect(r.schedule).toHaveLength(300);
    expect(r.balanceAtEnd).toBe(0);
  });

  it('2: £200,000, 2-year deal at 3.99%, then 6.99% over 30 years', () => {
    const r = run({ price: 250_000, deposit: 50_000, termYears: 30, initialRatePercent: 3.99, dealYears: 2, followOnRatePercent: 6.99 });
    expect(r.initialPayment).toBeCloseTo(953.68, 2);
    expect(r.dealBalance).toBeCloseTo(192_800.24, 2);
    expect(r.followOnPayment).toBeCloseTo(1_309.02, 2);
    expect(r.schedule.slice(24).reduce((s, row) => s + row.payment, 0)).toBeCloseTo(439_829.87, 1);
  });

  it('3: £150,000, 3-year deal at 5.5%, then 7.5% over 20 years', () => {
    const r = run({ price: 200_000, deposit: 50_000, termYears: 20, initialRatePercent: 5.5, dealYears: 3, followOnRatePercent: 7.5 });
    expect(r.initialPayment).toBeCloseTo(1_031.83, 2);
    expect(r.dealBalance).toBeCloseTo(136_556.17, 2);
    expect(r.followOnPayment).toBeCloseTo(1_186.28, 2);
    expect(r.schedule.slice(36).reduce((s, row) => s + row.payment, 0)).toBeCloseTo(242_000.36, 1);
  });
});

describe('deal, fees and loan to value', () => {
  it('uses one rate throughout when the deal lasts the whole term', () => {
    const r = run({ dealYears: 25 });
    expect(r.hasFollowOn).toBe(false);
    expect(r.followOnPayment).toBe(r.initialPayment);
    expect(r.dealBalance).toBe(0);
    expect(r.dealPaid).toBeCloseTo(255_000 + r.totalInterest, 6);
  });

  it('adds the fee to the loan, or counts it in the deal cost when paid upfront', () => {
    const added = run({ productFee: 999, addFeeToLoan: true });
    expect(added.loan).toBe(255_999);
    expect(added.dealCost).toBeCloseTo(added.dealPaid, 8);
    const upfront = run({ productFee: 999 });
    expect(upfront.loan).toBe(255_000);
    expect(upfront.dealCost).toBeCloseTo(upfront.dealPaid + 999, 8);
    expect(added.totalInterest).toBeGreaterThan(upfront.totalInterest);
  });

  it('works out loan to value from the price and deposit', () => {
    expect(run({}).ltvPercent).toBeCloseTo(85, 10);
    expect(run({ productFee: 999, addFeeToLoan: true }).ltvPercent).toBeCloseTo(85, 10);
  });

  it('handles a 0% rate', () => {
    const r = run({ initialRatePercent: 0, followOnRatePercent: 0 });
    expect(r.initialPayment).toBeCloseTo(850, 8);
    expect(r.followOnPayment).toBeCloseTo(850, 8);
    expect(r.totalInterest).toBe(0);
  });

  it('handles the shortest term and the largest loan', () => {
    expect(run({ termYears: 1, dealYears: 1 }).schedule).toHaveLength(12);
    const r = run({ price: 100_000_000, deposit: 0, termYears: 40, initialRatePercent: 25, dealYears: 10, followOnRatePercent: 25 });
    expect(Number.isFinite(r.followOnPayment)).toBe(true);
    expect(r.balanceAtEnd).toBe(0);
  });
});

describe('interest-only', () => {
  it('pays only interest and owes the whole loan at the end', () => {
    const r = run({ repaymentType: 'interestOnly' });
    expect(r.initialPayment).toBeCloseTo((255_000 * 0.046) / 12, 8);
    expect(r.followOnPayment).toBeCloseTo((255_000 * 0.071) / 12, 8);
    expect(r.dealBalance).toBe(255_000);
    expect(r.balanceAtEnd).toBe(255_000);
    expect(r.totalInterest).toBeCloseTo(((255_000 * 0.046) / 12) * 60 + ((255_000 * 0.071) / 12) * 240, 6);
  });
});

describe('guide figures (src/content/guides/uk/mortgage-calculator.md)', () => {
  it('matches the example and the £250,000 FAQ', () => {
    const r = run({ productFee: 999 });
    expect(r.dealPaid).toBeCloseTo(85_913.13, 2);
    expect(r.dealInterest).toBeCloseTo(55_325.47, 2);
    expect(r.dealCost).toBeCloseTo(86_912.13, 2);
    expect(r.totalInterest).toBeCloseTo(251_720.1, 2);
    expect(run({ dealYears: 25 }).totalInterest).toBeCloseTo(174_565.65, 2);
    expect(run({ productFee: 999, addFeeToLoan: true }).totalInterest - r.totalInterest).toBeCloseTo(986.15, 2);
    const faq = run({ price: 250_000, deposit: 0 });
    expect(faq.initialPayment).toBeCloseTo(1_403.81, 2);
    expect(faq.followOnPayment).toBeCloseTo(1_718.98, 2);
    expect(run({ price: 250_000, deposit: 0, repaymentType: 'interestOnly' }).initialPayment).toBeCloseTo(958.33, 2);
  });
});

describe('validation', () => {
  it('accepts the defaults', () => {
    expect(validateUkMortgageInput(base)).toEqual([]);
  });

  it('needs something to borrow and a deal no longer than the term', () => {
    expect(validateUkMortgageInput({ ...base, deposit: 299_500 }).map((e) => e.field)).toEqual(['deposit']);
    expect(validateUkMortgageInput({ ...base, dealYears: 26 }).map((e) => e.field)).toEqual(['dealYears']);
  });

  it('flags empty, out-of-range and fractional input', () => {
    const fields = validateUkMortgageInput({
      ...base,
      price: Number.NaN,
      termYears: 20.5,
      repaymentType: 'other' as UkMortgageInput['repaymentType'],
      initialRatePercent: 30,
      dealYears: 0,
      followOnRatePercent: -1,
      productFee: -5,
    }).map((e) => e.field);
    expect(fields).toEqual(['price', 'termYears', 'repaymentType', 'initialRatePercent', 'dealYears', 'followOnRatePercent', 'productFee']);
    expect(() => run({ termYears: 0 })).toThrow(RangeError);
  });
});
