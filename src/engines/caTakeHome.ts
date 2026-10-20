/**
 * Canadian income tax on employment income, as on a T1 return (provinces and territories except Quebec):
 *   CPP: base + first additional on earnings between the basic exemption and the YMPE, second additional (CPP2)
 *     up to the YAMPE. EI premiums up to the maximum insurable earnings.
 *   Deductions: enhanced CPP (first + second additional) and RRSP/FHSA contributions.
 *   Federal credits at the lowest rate: basic personal amount (phased down at high incomes), Canada employment
 *     amount, base CPP and EI. Provincial credits at the lowest provincial rate: basic personal amount, base CPP, EI.
 *   Ontario: surtax on basic Ontario tax, plus the Ontario Health Premium.
 * Not included: provincial low-income reductions and other credits. Pure: figures are passed in.
 */
import type { CaPayrollConfig } from '../countries/types';
import type { CaTaxParams } from './caIncomeTax';
import { phasedAmount, taxOnBands } from './tax';
import { checkMoney, checkRange, type FieldError } from './validation';

export interface CaTakeHomeInput {
  income: number;
  /** RRSP and FHSA contributions deducted this year. */
  rrspDeduction: number;
}

export interface CaTakeHomeParams {
  tax: CaTaxParams;
  payroll: Omit<CaPayrollConfig, 'ontarioHealthPremium'>;
  /** Ontario only. */
  ontarioHealthPremium?: CaPayrollConfig['ontarioHealthPremium'];
}

export interface CaTakeHomeResult {
  cppBase: number;
  cppEnhanced: number;
  cpp2: number;
  cppTotal: number;
  ei: number;
  taxableIncome: number;
  federalTax: number;
  /** Provincial tax including any surtax and health premium. */
  provincialTax: number;
  ontarioSurtax: number;
  ontarioHealthPremium: number;
  incomeTax: number;
  takeHome: number;
  /** Income tax ÷ income × 100. */
  averageRate: number;
  /** Combined federal + provincial rate on the next dollar of taxable income, × 100. */
  marginalRate: number;
}

export function ontarioHealthPremium(taxable: number, tiers: CaPayrollConfig['ontarioHealthPremium']): number {
  let premium = 0;
  for (const t of tiers) if (taxable > t.from) premium = Math.min(t.cap, t.base + t.rate * (taxable - t.from));
  return premium;
}

export function validateCaTakeHomeInput(input: CaTakeHomeInput): FieldError[] {
  const errors: FieldError[] = [];
  checkRange(errors, 'income', input.income, {
    min: 0,
    max: 10_000_000,
    empty: 'Enter your employment income.',
    range: 'Enter an income between 0 and 10,000,000.',
  });
  checkMoney(errors, 'rrspDeduction', input.rrspDeduction, 10_000_000);
  if (errors.length === 0 && input.rrspDeduction > input.income) errors.push({ field: 'rrspDeduction', message: 'Enter no more than your income.' });
  return errors;
}

interface TaxParts {
  federal: number;
  provincialBasic: number;
  surtax: number;
  ohp: number;
}

function incomeTaxOn(taxable: number, credits: { employment: number; cppBase: number; ei: number }, p: CaTakeHomeParams): TaxParts {
  const t = p.tax;
  const fedRate = t.federalBands[0]?.rate ?? 0;
  const fedCredits = fedRate * (phasedAmount(taxable, t.federalBpa, t.federalBpaPhaseOut) + Math.min(p.payroll.canadaEmploymentAmount, credits.employment) + credits.cppBase + credits.ei);
  let federal = Math.max(0, taxOnBands(taxable, t.federalBands) - fedCredits);
  federal -= federal * t.quebecAbatement;

  const provRate = t.provinceBands[0]?.rate ?? 0;
  const provCredits = provRate * (phasedAmount(taxable, t.provinceBpa, t.provinceBpaPhaseOut) + credits.cppBase + credits.ei);
  const provincialBasic = Math.max(0, taxOnBands(taxable, t.provinceBands) - provCredits);
  const s = t.ontarioSurtax;
  const surtax = s ? s.firstRate * Math.max(0, provincialBasic - s.firstThreshold) + s.secondRate * Math.max(0, provincialBasic - s.secondThreshold) : 0;
  const ohp = p.ontarioHealthPremium ? ontarioHealthPremium(taxable, p.ontarioHealthPremium) : 0;
  return { federal, provincialBasic, surtax, ohp };
}

const total = (x: TaxParts) => x.federal + x.provincialBasic + x.surtax + x.ohp;

export function calculateCaTakeHome(input: CaTakeHomeInput, p: CaTakeHomeParams): CaTakeHomeResult {
  const errors = validateCaTakeHomeInput(input);
  if (errors.length > 0) throw new RangeError(errors.map((e) => `${e.field}: ${e.message}`).join(' '));

  const c = p.payroll.cpp;
  const contributory = Math.max(0, Math.min(input.income, c.ympe) - c.basicExemption);
  const cppBase = contributory * c.baseRate;
  const cppEnhanced = contributory * c.firstAdditionalRate;
  const cpp2 = Math.max(0, Math.min(input.income, c.yampe) - c.ympe) * c.secondAdditionalRate;
  const ei = Math.min(input.income, p.payroll.ei.maxInsurableEarnings) * p.payroll.ei.rate;

  const taxableIncome = Math.max(0, input.income - cppEnhanced - cpp2 - input.rrspDeduction);
  const credits = { employment: input.income, cppBase, ei };
  const parts = incomeTaxOn(taxableIncome, credits, p);
  const incomeTax = total(parts);
  const cppTotal = cppBase + cppEnhanced + cpp2;
  const step = 100;

  return {
    cppBase,
    cppEnhanced,
    cpp2,
    cppTotal,
    ei,
    taxableIncome,
    federalTax: parts.federal,
    provincialTax: parts.provincialBasic + parts.surtax + parts.ohp,
    ontarioSurtax: parts.surtax,
    ontarioHealthPremium: parts.ohp,
    incomeTax,
    takeHome: input.income - incomeTax - cppTotal - ei,
    averageRate: input.income > 0 ? (incomeTax / input.income) * 100 : 0,
    marginalRate: ((total(incomeTaxOn(taxableIncome + step, credits, p)) - incomeTax) / step) * 100,
  };
}
