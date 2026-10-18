import { describe, expect, it } from 'vitest';
import { requireFigure } from '../../src/countries';
import { uk } from '../../src/countries/uk';
import { calculatePropertyTax, validatePropertyTaxInput, type PropertyTaxInput, type PropertyTaxParams } from '../../src/engines/propertyTax';

/*
 * Official cross-checks (GOV.UK, checked 18 Oct 2026):
 *   £295,000 home: 0% on £125,000 + 2% on £125,000 + 5% on £45,000 = £4,750
 *   First-time buyer at £500,000: 0% on £300,000 + 5% on £200,000 = £10,000
 * Other cases worked by hand from the GOV.UK bands and surcharges.
 */

const s = requireFigure(uk.uk, 'uk').stampDuty;
const params: PropertyTaxParams = {
  standardBands: requireFigure(s.standardBands, 'standard'),
  firstTimeBuyerBands: requireFigure(s.firstTimeBuyerBands, 'ftb'),
  firstTimeBuyerMaxPrice: requireFigure(s.firstTimeBuyerMaxPrice, 'ftbMax'),
  additionalPropertySurcharge: requireFigure(s.additionalPropertySurcharge, 'add'),
  additionalPropertyMinPrice: requireFigure(s.additionalPropertyMinPrice, 'addMin'),
  nonResidentSurcharge: requireFigure(s.nonResidentSurcharge, 'nr'),
  nonResidentMinPrice: requireFigure(s.nonResidentMinPrice, 'nrMin'),
};
const run = (input: Partial<PropertyTaxInput>) =>
  calculatePropertyTax({ price: 295_000, buyerType: 'standard', nonResident: false, ...input }, params);

describe('calculatePropertyTax', () => {
  it('GOV.UK example: £295,000 pays £4,750', () => {
    const r = run({});
    expect(r.tax).toBeCloseTo(4_750, 8);
    expect(r.rows.map((row) => row.tax)).toEqual([0, 2_500, 2_250]);
  });

  it('GOV.UK example: first-time buyer at £500,000 pays £10,000', () => {
    const r = run({ price: 500_000, buyerType: 'firstTime' });
    expect(r.tax).toBeCloseTo(10_000, 8);
    expect(r.firstTimeReliefApplied).toBe(true);
    expect(r.standardTax).toBeCloseTo(15_000, 8);
  });

  it('first-time buyer above £500,000 loses the relief entirely', () => {
    const r = run({ price: 500_001, buyerType: 'firstTime' });
    expect(r.firstTimeOverLimit).toBe(true);
    expect(r.tax).toBeCloseTo(15_000.05, 6);
    expect(run({ price: 300_000, buyerType: 'firstTime' }).tax).toBe(0);
  });

  it('additional property: 5% on top of every band', () => {
    const r = run({ buyerType: 'additional' });
    expect(r.tax).toBeCloseTo(19_500, 8);
    expect(r.additionalSurchargeApplied).toBe(true);
  });

  it('no higher rates below £40,000', () => {
    const r = run({ price: 39_999, buyerType: 'additional' });
    expect(r.additionalSurchargeApplied).toBe(false);
    expect(r.tax).toBe(0);
  });

  it('non-UK resident: 2% on top, including on first-time buyer rates and with the 5% surcharge', () => {
    expect(run({ nonResident: true }).tax).toBeCloseTo(10_650, 8);
    expect(run({ price: 400_000, buyerType: 'firstTime', nonResident: true }).tax).toBeCloseTo(13_000, 8);
    expect(run({ buyerType: 'additional', nonResident: true }).tax).toBeCloseTo(25_400, 8);
    expect(run({ price: 39_000, nonResident: true }).nonResidentSurchargeApplied).toBe(false);
  });

  it('£2 million home reaches the 12% band', () => {
    const r = run({ price: 2_000_000 });
    expect(r.tax).toBeCloseTo(153_750, 8);
    expect(r.effectiveRate).toBeCloseTo(153_750 / 2_000_000, 12);
  });

  it('validates the price', () => {
    expect(validatePropertyTaxInput({ price: Number.NaN, buyerType: 'standard', nonResident: false }).map((e) => e.field)).toEqual(['price']);
    expect(() => run({ price: 0 })).toThrow(RangeError);
  });
});
