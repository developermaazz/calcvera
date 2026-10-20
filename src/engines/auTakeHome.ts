/**
 * Australian take-home pay for a resident employee claiming the tax-free threshold.
 *   Super guarantee: guaranteeRate × salary, up to the maximum contribution base. A package that includes
 *     super is split into salary + super.
 *   Salary sacrifice to super comes off taxable income, but counts as a reportable super contribution, so it's
 *     added back for HELP repayment income and income for Medicare levy surcharge purposes.
 *   Income tax, low income tax offset and Medicare levy: auIncomeTax.
 *   Medicare levy surcharge (no private hospital cover): the single tier rate × taxable income.
 *   HELP (study and training loans): the marginal repayment system on repayment income.
 * Pure: figures are passed in.
 */
import type { AuHelpConfig, AuMlsConfig, AuSuperConfig } from '../countries/types';
import { auIncomeTax, type AuTaxParams } from './auIncomeTax';
import { checkMoney, checkRange, type FieldError } from './validation';

export interface AuTakeHomeInput {
  salary: number;
  /** The salary entered is a package that includes super guarantee. */
  includesSuper: boolean;
  /** Yearly salary sacrifice to super. */
  salarySacrifice: number;
  hasHelpDebt: boolean;
  hasPrivateHospitalCover: boolean;
}

export interface AuTakeHomeParams {
  tax: AuTaxParams;
  super: AuSuperConfig;
  help: AuHelpConfig;
  mls: AuMlsConfig;
}

export interface AuTakeHomeResult {
  /** Salary before super and salary sacrifice. */
  baseSalary: number;
  superGuarantee: number;
  taxableIncome: number;
  incomeTax: number;
  lito: number;
  medicareLevy: number;
  mlsRate: number;
  medicareLevySurcharge: number;
  repaymentIncome: number;
  helpRepayment: number;
  takeHome: number;
  totalSuper: number;
  overConcessionalCap: boolean;
  /** (income tax + Medicare levy + surcharge) ÷ base salary × 100. */
  effectiveTaxRate: number;
}

export function helpRepayment(repaymentIncome: number, h: AuHelpConfig): number {
  const i = Math.max(0, repaymentIncome);
  if (i <= h.firstThreshold) return 0;
  if (i <= h.secondThreshold) return h.firstRate * (i - h.firstThreshold);
  if (i < h.flatThreshold) return h.secondBase + h.secondRate * (i - h.secondThreshold);
  return h.flatRate * i;
}

export function mlsRate(mlsIncome: number, m: AuMlsConfig): number {
  let rate = 0;
  for (const tier of m.singleTiers) if (mlsIncome > tier.from) rate = tier.rate;
  return rate;
}

export function validateAuTakeHomeInput(input: AuTakeHomeInput): FieldError[] {
  const errors: FieldError[] = [];
  checkRange(errors, 'salary', input.salary, {
    min: 1,
    max: 10_000_000,
    empty: 'Enter your salary.',
    range: 'Enter a salary between 1 and 10,000,000.',
  });
  checkMoney(errors, 'salarySacrifice', input.salarySacrifice, 10_000_000);
  return errors;
}

export function calculateAuTakeHome(input: AuTakeHomeInput, p: AuTakeHomeParams): AuTakeHomeResult {
  const errors = validateAuTakeHomeInput(input);
  if (errors.length > 0) throw new RangeError(errors.map((e) => `${e.field}: ${e.message}`).join(' '));

  const s = p.super;
  const sgCap = s.maxContributionBase * s.guaranteeRate;
  const baseSalary = !input.includesSuper
    ? input.salary
    : input.salary / (1 + s.guaranteeRate) <= s.maxContributionBase
      ? input.salary / (1 + s.guaranteeRate)
      : input.salary - sgCap;
  const superGuarantee = Math.min(baseSalary, s.maxContributionBase) * s.guaranteeRate;
  const sacrifice = Math.min(input.salarySacrifice, baseSalary);
  const taxableIncome = baseSalary - sacrifice;

  const tax = auIncomeTax(taxableIncome, p.tax);
  const reportable = taxableIncome + sacrifice;
  const rate = input.hasPrivateHospitalCover ? 0 : mlsRate(reportable, p.mls);
  const medicareLevySurcharge = rate * taxableIncome;
  const help = input.hasHelpDebt ? helpRepayment(reportable, p.help) : 0;
  const totalSuper = superGuarantee + sacrifice;

  return {
    baseSalary,
    superGuarantee,
    taxableIncome,
    incomeTax: tax.incomeTax,
    lito: tax.lito,
    medicareLevy: tax.medicareLevy,
    mlsRate: rate,
    medicareLevySurcharge,
    repaymentIncome: reportable,
    helpRepayment: help,
    takeHome: taxableIncome - tax.incomeTax - tax.medicareLevy - medicareLevySurcharge - help,
    totalSuper,
    overConcessionalCap: totalSuper > s.concessionalCap + 1e-9,
    effectiveTaxRate: baseSalary > 0 ? ((tax.incomeTax + tax.medicareLevy + medicareLevySurcharge) / baseSalary) * 100 : 0,
  };
}
