import { describe, expect, it } from 'vitest';
import { RENT_VS_BUY_YEARS, calculateRentVsBuy, validateRentVsBuyInput, type RentVsBuyInput } from '../../src/engines/rentVsBuy';

/*
 * OUTSIDE CHECK (calculator.net, 20 Oct 2026):
 *   1. Amortization calculator, $320,000 at 6.5% over 30 years: $2,022.62 a month; balance $316,423.28 after
 *      year 1, $277,693.66 after year 9, $271,283.60 after year 10 (all exact).
 *   2. Amortization calculator, £255,000 at 4.5% over 25 years: £1,417.37 a month; balance £224,037.65 after
 *      year 5, £185,279.12 after year 10 (all exact).
 *   3. Rent vs buy calculator with the case below (tax inputs 0, so no deductions): "buying is cheaper if you
 *      stay for 8.1 years or longer". Ours: buying pulls ahead in year 10 (it's $545 behind after year 9).
 *      The methods differ: calculator.net compares the average yearly cost of each choice, while we compare
 *      net worth (home equity after selling costs plus investments) at each year-end. Both put the
 *      break-even around 8 to 10 years for these inputs.
 *   UK stamp duty is worked out by the propertyTax engine, checked against HMRC in propertyTax.test.ts.
 */

const base: RentVsBuyInput = {
  homePrice: 400_000,
  depositPercent: 20,
  mortgageRatePercent: 6.5,
  termYears: 30,
  buyingCosts: 12_000,
  propertyTaxPercent: 1.2,
  insurancePerYear: 1_500,
  maintenancePercent: 1,
  feesPerMonth: 0,
  sellingCostsPercent: 6,
  homeGrowthPercent: 3,
  monthlyRent: 2_200,
  rentGrowthPercent: 3,
  investReturnPercent: 5,
  years: 10,
};

/** Simple case: no costs, no growth, no returns, so every figure can be checked by hand. */
const flat: RentVsBuyInput = {
  ...base,
  homePrice: 100_000,
  depositPercent: 100,
  buyingCosts: 0,
  propertyTaxPercent: 0,
  insurancePerYear: 0,
  maintenancePercent: 0,
  sellingCostsPercent: 0,
  homeGrowthPercent: 0,
  monthlyRent: 500,
  rentGrowthPercent: 0,
  investReturnPercent: 0,
};

describe('calculateRentVsBuy', () => {
  it('outside check 1: mortgage payment and balances match calculator.net', () => {
    const r = calculateRentVsBuy(base);
    expect(r.loanAmount).toBe(320_000);
    expect(r.monthlyMortgage).toBeCloseTo(2_022.62, 2);
    expect(r.rows[0]!.mortgageLeft).toBeCloseTo(316_423.28, 2);
    expect(r.rows[8]!.mortgageLeft).toBeCloseTo(277_693.66, 2);
    expect(r.rows[9]!.mortgageLeft).toBeCloseTo(271_283.6, 2);
    expect(r.upfrontCash).toBe(92_000);
  });

  it('outside check 2: UK mortgage figures', () => {
    const r = calculateRentVsBuy({ ...base, homePrice: 300_000, depositPercent: 15, mortgageRatePercent: 4.5, termYears: 25 });
    expect(r.monthlyMortgage).toBeCloseTo(1_417.37, 2);
    expect(r.rows[4]!.mortgageLeft).toBeCloseTo(224_037.65, 2);
    expect(r.rows[9]!.mortgageLeft).toBeCloseTo(185_279.12, 2);
  });

  it('outside check 3: break-even year for the calculator.net case', () => {
    const r = calculateRentVsBuy(base);
    expect(r.rows[8]!.advantage).toBeCloseTo(-545.43, 2);
    expect(r.breakEvenYear).toBe(10);
    expect(r.atYears.advantage).toBeCloseTo(6_571.42, 2);
    expect(r.firstMonthOwning).toBeCloseTo(2_022.62 + 400 + 125 + 333.33, 1);
  });

  it('flat case: cash buyer saves the rent; renter keeps the price invested at 0%', () => {
    const r = calculateRentVsBuy(flat);
    expect(r.monthlyMortgage).toBe(0);
    expect(r.rows[0]!.buyerNetWorth).toBe(106_000);
    expect(r.rows[0]!.renterNetWorth).toBe(100_000);
    expect(r.rows[0]!.advantage).toBe(6_000);
    expect(r.rows[9]!.advantage).toBe(60_000);
    expect(r.breakEvenYear).toBe(1);
    expect(r.rows[0]!.renterPaid).toBe(6_000);
    expect(r.rows[0]!.buyerPaid).toBe(100_000);
  });

  it('selling costs and buying costs count against buying', () => {
    const r = calculateRentVsBuy({ ...flat, buyingCosts: 3_000, sellingCostsPercent: 2 });
    // Buyer: 100,000 × 0.98 + 6,000 saved rent; renter: 103,000 invested.
    expect(r.rows[0]!.buyerNetWorth).toBeCloseTo(104_000, 6);
    expect(r.rows[0]!.renterNetWorth).toBe(103_000);
  });

  it('cheap rent and high returns keep renting ahead for 30 years', () => {
    const r = calculateRentVsBuy({ ...base, monthlyRent: 1_200, homeGrowthPercent: 1, investReturnPercent: 8 });
    expect(r.breakEvenYear).toBeNull();
    expect(r.rows.at(-1)!.advantage).toBeLessThan(0);
  });

  it('a short mortgage stops after its term; falling prices are allowed', () => {
    const r = calculateRentVsBuy({ ...base, termYears: 10, homeGrowthPercent: -2 });
    expect(r.rows[9]!.mortgageLeft).toBe(0);
    expect(r.rows[10]!.mortgageLeft).toBe(0);
    expect(r.rows[0]!.homeValue).toBeCloseTo(400_000 * 0.98, 6);
    expect(r.rows).toHaveLength(RENT_VS_BUY_YEARS);
  });

  it('0% mortgage rate repays evenly', () => {
    const r = calculateRentVsBuy({ ...base, mortgageRatePercent: 0 });
    expect(r.monthlyMortgage).toBeCloseTo(320_000 / 360, 10);
    expect(r.rows[0]!.mortgageLeft).toBeCloseTo(320_000 - (320_000 / 360) * 12, 6);
  });

  it('net worth adds up and large values stay finite', () => {
    const r = calculateRentVsBuy(base);
    for (const y of r.rows) expect(y.buyerNetWorth).toBeCloseTo(y.homeEquity + y.buyerInvestments, 6);
    const big = calculateRentVsBuy({ ...base, homePrice: 100_000_000, monthlyRent: 1_000_000, investReturnPercent: 30, homeGrowthPercent: 20 });
    expect(Number.isFinite(big.atYears.advantage)).toBe(true);
  });
});

describe('validateRentVsBuyInput', () => {
  it('flags empty and out-of-range values', () => {
    const fields = validateRentVsBuyInput({ ...base, homePrice: Number.NaN, depositPercent: 120, termYears: 0, monthlyRent: 0, homeGrowthPercent: -30, years: 31 }).map((e) => e.field);
    expect(fields).toEqual(['homePrice', 'depositPercent', 'termYears', 'homeGrowthPercent', 'monthlyRent', 'years']);
    expect(validateRentVsBuyInput(base)).toEqual([]);
    expect(() => calculateRentVsBuy({ ...base, years: 2.5 })).toThrow(RangeError);
  });
});
