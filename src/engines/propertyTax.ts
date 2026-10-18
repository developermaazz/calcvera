/**
 * Property purchase tax on a residential property: marginal bands plus percentage-point surcharges for
 * additional properties and non-resident buyers, with first-time buyer bands up to a price limit.
 * Used for UK Stamp Duty Land Tax (England and Northern Ireland). Pure: figures are passed in.
 */
import type { TaxBand } from '../countries/types';
import { taxOnBands } from './tax';
import { checkRange, type FieldError } from './validation';

export type BuyerType = 'standard' | 'firstTime' | 'additional';

export interface PropertyTaxParams {
  standardBands: TaxBand[];
  firstTimeBuyerBands: TaxBand[];
  firstTimeBuyerMaxPrice: number;
  additionalPropertySurcharge: number;
  additionalPropertyMinPrice: number;
  nonResidentSurcharge: number;
  nonResidentMinPrice: number;
}

export interface PropertyTaxInput {
  price: number;
  buyerType: BuyerType;
  nonResident: boolean;
}

export interface PropertyTaxBandRow {
  from: number;
  to: number | null;
  rate: number;
  /** Part of the price in this band. */
  portion: number;
  tax: number;
}

export interface PropertyTaxResult {
  tax: number;
  /** Tax ÷ price. */
  effectiveRate: number;
  rows: PropertyTaxBandRow[];
  firstTimeReliefApplied: boolean;
  /** First-time buyer chose relief but the price is over the limit. */
  firstTimeOverLimit: boolean;
  additionalSurchargeApplied: boolean;
  nonResidentSurchargeApplied: boolean;
  /** Tax at standard rates with no surcharges, for comparison. */
  standardTax: number;
}

export function validatePropertyTaxInput(input: PropertyTaxInput): FieldError[] {
  const errors: FieldError[] = [];
  checkRange(errors, 'price', input.price, {
    min: 1,
    max: 1_000_000_000,
    empty: 'Enter the property price.',
    range: 'Enter a price between 1 and 1,000,000,000.',
  });
  return errors;
}

export function calculatePropertyTax(input: PropertyTaxInput, p: PropertyTaxParams): PropertyTaxResult {
  const errors = validatePropertyTaxInput(input);
  if (errors.length > 0) throw new RangeError(errors.map((e) => e.message).join(' '));

  const firstTimeOverLimit = input.buyerType === 'firstTime' && input.price > p.firstTimeBuyerMaxPrice;
  const firstTimeReliefApplied = input.buyerType === 'firstTime' && !firstTimeOverLimit;
  const additionalSurchargeApplied = input.buyerType === 'additional' && input.price >= p.additionalPropertyMinPrice;
  const nonResidentSurchargeApplied = input.nonResident && input.price >= p.nonResidentMinPrice;

  const surcharge = (additionalSurchargeApplied ? p.additionalPropertySurcharge : 0) + (nonResidentSurchargeApplied ? p.nonResidentSurcharge : 0);
  const base = firstTimeReliefApplied ? p.firstTimeBuyerBands : p.standardBands;
  const bands = base.map((b) => ({ ...b, rate: b.rate + surcharge }));

  const rows: PropertyTaxBandRow[] = bands
    .filter((b) => input.price > b.from)
    .map((b) => {
      const portion = (b.to === null ? input.price : Math.min(input.price, b.to)) - b.from;
      return { from: b.from, to: b.to, rate: b.rate, portion, tax: portion * b.rate };
    });
  const tax = rows.reduce((sum, r) => sum + r.tax, 0);

  return {
    tax,
    effectiveRate: tax / input.price,
    rows,
    firstTimeReliefApplied,
    firstTimeOverLimit,
    additionalSurchargeApplied,
    nonResidentSurchargeApplied,
    standardTax: taxOnBands(input.price, p.standardBands),
  };
}
