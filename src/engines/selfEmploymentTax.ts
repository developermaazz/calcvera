/**
 * US quarterly estimated tax for the self-employed: self-employment tax (Schedule SE), Additional
 * Medicare Tax on SE income (Form 8959), and federal income tax after the standard or itemized deduction
 * and the qualified business income deduction. Federal only.
 *
 * QBI assumes a business with no W-2 employees and no qualified property: above the threshold the
 * deduction phases out to zero across the phase-in range. Credits are not included.
 * Pure: every figure is passed in.
 */
import type { TaxBand, UsFilingStatus } from '../countries/types';
import { taxOnBands } from './tax';
import { checkMoney, type FieldError } from './validation';

export interface SelfEmploymentTaxParams {
  bands: TaxBand[];
  standardDeduction: number;
  netEarningsFactor: number;
  socialSecurityRate: number;
  medicareRate: number;
  socialSecurityWageBase: number;
  additionalMedicareRate: number;
  additionalMedicareThreshold: number;
  deductibleShare: number;
  minimumNetEarnings: number;
  qbi: { rate: number; minimumDeduction: number; minimumQbi: number; threshold: number; phaseInEnd: number };
}

export interface SelfEmploymentTaxInput {
  netSelfEmployment: number;
  filingStatus: UsFilingStatus;
  /** W-2 wages (also count towards the Social Security wage base). */
  wages: number;
  /** Other taxable income: interest, dividends, etc. */
  otherIncome: number;
  deduction: 'standard' | 'itemized';
  itemizedAmount: number;
  /** Federal tax already withheld from wages this year. */
  taxWithheld: number;
}

export interface SelfEmploymentTaxResult {
  netEarnings: number;
  socialSecurityTax: number;
  medicareTax: number;
  selfEmploymentTax: number;
  additionalMedicareTax: number;
  deductibleSeTax: number;
  adjustedGrossIncome: number;
  deductionUsed: number;
  qbiDeduction: number;
  /** True when income is in or above the QBI phase-in range, where the result depends on the business. */
  qbiLimited: boolean;
  taxableIncome: number;
  incomeTax: number;
  totalTax: number;
  /** Total tax minus withholding. */
  remaining: number;
  quarterlyPayment: number;
}

export function validateSelfEmploymentTaxInput(input: SelfEmploymentTaxInput): FieldError[] {
  const errors: FieldError[] = [];
  checkMoney(errors, 'netSelfEmployment', input.netSelfEmployment, 100_000_000);
  checkMoney(errors, 'wages', input.wages, 100_000_000);
  checkMoney(errors, 'otherIncome', input.otherIncome, 100_000_000);
  if (input.deduction === 'itemized') checkMoney(errors, 'itemizedAmount', input.itemizedAmount, 100_000_000);
  checkMoney(errors, 'taxWithheld', input.taxWithheld, 100_000_000);
  return errors;
}

export function calculateSelfEmploymentTax(
  input: SelfEmploymentTaxInput,
  p: SelfEmploymentTaxParams,
): SelfEmploymentTaxResult {
  const errors = validateSelfEmploymentTaxInput(input);
  if (errors.length > 0) throw new RangeError(errors.map((e) => e.message).join(' '));

  // Schedule SE.
  const factored = input.netSelfEmployment * p.netEarningsFactor;
  const netEarnings = factored >= p.minimumNetEarnings ? factored : 0;
  const ssRoom = Math.max(0, p.socialSecurityWageBase - input.wages);
  const socialSecurityTax = p.socialSecurityRate * Math.min(netEarnings, ssRoom);
  const medicareTax = p.medicareRate * netEarnings;
  const selfEmploymentTax = socialSecurityTax + medicareTax;

  // Form 8959, SE part: the threshold is first used up by wages.
  const additionalMedicareTax =
    p.additionalMedicareRate * Math.max(0, netEarnings - Math.max(0, p.additionalMedicareThreshold - input.wages));

  const deductibleSeTax = selfEmploymentTax * p.deductibleShare;
  const adjustedGrossIncome = input.netSelfEmployment + input.wages + input.otherIncome - deductibleSeTax;
  const deductionUsed = input.deduction === 'itemized' ? input.itemizedAmount : p.standardDeduction;
  const incomeBeforeQbi = Math.max(0, adjustedGrossIncome - deductionUsed);

  // Qualified business income deduction.
  const qbiBase = Math.max(0, input.netSelfEmployment - deductibleSeTax);
  let qbiDeduction = 0;
  let qbiLimited = false;
  if (qbiBase > 0) {
    let deduction = Math.min(p.qbi.rate * qbiBase, p.qbi.rate * incomeBeforeQbi);
    if (incomeBeforeQbi > p.qbi.threshold) {
      qbiLimited = true;
      const phase = Math.min(1, (incomeBeforeQbi - p.qbi.threshold) / (p.qbi.phaseInEnd - p.qbi.threshold));
      deduction *= 1 - phase;
    }
    if (qbiBase >= p.qbi.minimumQbi) deduction = Math.max(deduction, p.qbi.minimumDeduction);
    qbiDeduction = Math.min(deduction, incomeBeforeQbi);
  }

  const taxableIncome = Math.max(0, incomeBeforeQbi - qbiDeduction);
  const incomeTax = taxOnBands(taxableIncome, p.bands);
  const totalTax = incomeTax + selfEmploymentTax + additionalMedicareTax;
  const remaining = Math.max(0, totalTax - input.taxWithheld);

  return {
    netEarnings,
    socialSecurityTax,
    medicareTax,
    selfEmploymentTax,
    additionalMedicareTax,
    deductibleSeTax,
    adjustedGrossIncome,
    deductionUsed,
    qbiDeduction,
    qbiLimited,
    taxableIncome,
    incomeTax,
    totalTax,
    remaining,
    quarterlyPayment: remaining / 4,
  };
}
