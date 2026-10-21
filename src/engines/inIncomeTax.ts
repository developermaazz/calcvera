/**
 * Indian income tax for a resident individual, tax year 2026-27, under the new regime (section 202, the default)
 * and the old regime (the option under section 202(4)):
 *   taxable income = salary − standard deduction + other income − (old regime only) deductions
 *   tax on slabs − rebate (section 156; the new regime has marginal relief just above ₹12 lakh)
 *   + surcharge on high incomes (with marginal relief) + 4% health and education cess.
 * Pure: figures are passed in.
 */
import type { InRegime, InSurchargeTier, InTaxConfig, TaxBand } from '../countries/types';
import { taxOnBands } from './tax';
import { checkMoney, type FieldError } from './validation';

export type InAgeGroup = 'under60' | 'from60' | 'from80';

export interface InIncomeTaxInput {
  /** Gross yearly salary. */
  salary: number;
  /** Other taxable income (interest, rent after deductions, etc.). */
  otherIncome: number;
  ageGroup: InAgeGroup;
  /** Deductions and exemptions claimed under the old regime (80C, 80D, HRA, home loan interest...). */
  oldDeductions: number;
}

export interface InRegimeResult {
  taxableIncome: number;
  slabTax: number;
  rebate: number;
  surcharge: number;
  cess: number;
  totalTax: number;
  /** Gross income − total tax. */
  takeHome: number;
  effectiveRate: number;
}

export interface InIncomeTaxResult {
  newRegime: InRegimeResult;
  oldRegime: InRegimeResult;
  better: 'new' | 'old' | 'same';
  saving: number;
}

export function validateInIncomeTaxInput(input: InIncomeTaxInput): FieldError[] {
  const errors: FieldError[] = [];
  checkMoney(errors, 'salary', input.salary, 10_000_000_000);
  checkMoney(errors, 'otherIncome', input.otherIncome, 10_000_000_000);
  checkMoney(errors, 'oldDeductions', input.oldDeductions, 10_000_000_000);
  if (errors.length === 0 && input.salary + input.otherIncome <= 0) errors.push({ field: 'salary', message: 'Enter your salary or other income.' });
  return errors;
}

/** Surcharge on tax, with marginal relief at each threshold. */
export function surcharge(income: number, tax: number, tiers: InSurchargeTier[], bands: TaxBand[]): number {
  let i = -1;
  for (let k = 0; k < tiers.length; k++) if (income > tiers[k]!.over) i = k;
  if (i < 0) return 0;
  const tier = tiers[i]!;
  const full = tax * tier.rate;
  // Tax + surcharge may not exceed the tax at the threshold (with the lower tier's surcharge) + the income above it.
  const atThreshold = taxOnBands(tier.over, bands) * (1 + (i > 0 ? tiers[i - 1]!.rate : 0));
  return Math.max(0, Math.min(full, atThreshold + (income - tier.over) - tax));
}

function regime(input: InIncomeTaxInput, r: InRegime, bands: TaxBand[], cessRate: number, old: boolean): InRegimeResult {
  const gross = input.salary + input.otherIncome;
  const taxableIncome = Math.max(0, input.salary - Math.min(input.salary, r.standardDeduction) + input.otherIncome - (old ? input.oldDeductions : 0));
  const slabTax = taxOnBands(taxableIncome, bands);
  let rebate = 0;
  if (taxableIncome <= r.rebate.upTo) rebate = Math.min(slabTax, r.rebate.max);
  else if (r.rebate.marginalRelief && slabTax > taxableIncome - r.rebate.upTo) rebate = slabTax - (taxableIncome - r.rebate.upTo);
  const afterRebate = slabTax - rebate;
  const sur = surcharge(taxableIncome, afterRebate, r.surcharge, bands);
  const cess = (afterRebate + sur) * cessRate;
  const totalTax = afterRebate + sur + cess;
  return { taxableIncome, slabTax, rebate, surcharge: sur, cess, totalTax, takeHome: gross - totalTax, effectiveRate: gross > 0 ? (totalTax / gross) * 100 : 0 };
}

export function calculateInIncomeTax(input: InIncomeTaxInput, p: InTaxConfig): InIncomeTaxResult {
  const errors = validateInIncomeTaxInput(input);
  if (errors.length > 0) throw new RangeError(errors.map((e) => `${e.field}: ${e.message}`).join(' '));
  const n = regime(input, p.newRegime, p.newRegime.bands, p.cessRate, false);
  const o = regime(input, { ...p.oldRegime, bands: [] }, p.oldRegime.bands[input.ageGroup], p.cessRate, true);
  const diff = o.totalTax - n.totalTax;
  return { newRegime: n, oldRegime: o, better: Math.abs(diff) < 0.005 ? 'same' : diff > 0 ? 'new' : 'old', saving: Math.abs(diff) };
}
