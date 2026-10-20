/**
 * US paycheck: federal income tax withholding by the IRS percentage method for automated payroll
 * (Pub 15-T Worksheet 1A, 2020-or-later Form W-4), plus Social Security, Medicare, pre-tax 401(k) and
 * Section 125 benefits, and an optional flat state/local rate the user enters.
 *   Annual wage = taxable wages per paycheck × paychecks per year + Step 4(a) other income
 *                 − Step 4(b) deductions − (Step 2 box not checked: $12,900 married filing jointly, else $8,600).
 *   Tentative withholding: the standard schedule is the tax brackets starting at (standard deduction − that
 *   adjustment); with the Step 2 box checked, the brackets and standard deduction are halved.
 *   Per paycheck = tentative ÷ paychecks − Step 3 credits ÷ paychecks (not below 0) + Step 4(c) extra.
 * Social Security stops at the yearly wage base; Additional Medicare is withheld on wages over $200,000.
 * Withholding is what your employer takes from pay, not your final tax bill.
 * Pure: brackets, deductions and rates are passed in.
 */
import type { TaxBand } from '../countries/types';
import { taxOnBands } from './tax';
import { checkMoney, checkPercent, checkRange, type FieldError } from './validation';

export const PAY_PERIODS = { weekly: 52, biweekly: 26, semimonthly: 24, monthly: 12 } as const;
export type PayFrequency = keyof typeof PAY_PERIODS;
/** Form W-4 Step 1(c). Married filing separately uses the single schedule. */
export type W4Status = 'single' | 'marriedJoint' | 'headOfHousehold';

export interface PaycheckParams {
  bands: Record<W4Status, TaxBand[]>;
  standardDeduction: Record<W4Status, number>;
  withholdingAdjustment: { marriedJoint: number; other: number };
  socialSecurityRate: number;
  socialSecurityWageBase: number;
  medicareRate: number;
  additionalMedicareRate: number;
  additionalMedicareThreshold: number;
}

export interface PaycheckInput {
  payType: 'salary' | 'hourly';
  annualSalary: number;
  hourlyRate: number;
  hoursPerWeek: number;
  frequency: PayFrequency;
  status: W4Status;
  /** Step 2 box: multiple jobs or a working spouse. */
  multipleJobs: boolean;
  /** Step 3: yearly credits for dependents. */
  dependentsCredit: number;
  /** Step 4(a): other yearly income. */
  otherIncome: number;
  /** Step 4(b): yearly deductions beyond the standard deduction. */
  deductions: number;
  /** Step 4(c): extra withholding per paycheck. */
  extraWithholding: number;
  /** Pre-tax 401(k) or 403(b), % of gross pay (reduces income tax, not Social Security or Medicare). */
  retirementPercent: number;
  /** Pre-tax Section 125 benefits per paycheck, e.g. health premiums (reduce income tax and FICA). */
  pretaxBenefits: number;
  /** Optional flat state and local income tax rate, % of taxable wages. */
  stateTaxPercent: number;
}

export interface PaycheckLines {
  gross: number;
  retirement: number;
  benefits: number;
  federalIncomeTax: number;
  socialSecurity: number;
  medicare: number;
  stateTax: number;
  takeHome: number;
}

export interface PaycheckResult {
  periods: number;
  /** A regular paycheck early in the year. */
  perPaycheck: PaycheckLines;
  /** The whole year, with the Social Security cap and Additional Medicare applied. */
  annual: PaycheckLines;
  /** Wages per year that count for income tax withholding (after pre-tax deductions). */
  annualTaxableWages: number;
  /** Social Security stops part-way through the year. */
  socialSecurityCapped: boolean;
  /** Additional Medicare Tax is withheld later in the year. */
  additionalMedicare: boolean;
}

export function validatePaycheckInput(input: PaycheckInput): FieldError[] {
  const errors: FieldError[] = [];
  if (input.payType === 'hourly') {
    checkRange(errors, 'hourlyRate', input.hourlyRate, { min: 0.01, max: 10_000, empty: 'Enter your hourly rate.', range: 'Enter an hourly rate between 0.01 and 10,000.' });
    checkRange(errors, 'hoursPerWeek', input.hoursPerWeek, { min: 0.5, max: 100, empty: 'Enter your hours per week.', range: 'Enter between 0.5 and 100 hours a week.' });
  } else {
    checkRange(errors, 'annualSalary', input.annualSalary, { min: 1, max: 10_000_000, empty: 'Enter your yearly salary.', range: 'Enter a salary between 1 and 10,000,000.' });
  }
  if (!(input.frequency in PAY_PERIODS)) errors.push({ field: 'frequency', message: 'Choose how often you are paid.' });
  checkMoney(errors, 'dependentsCredit', input.dependentsCredit, 1_000_000);
  checkMoney(errors, 'otherIncome', input.otherIncome, 10_000_000);
  checkMoney(errors, 'deductions', input.deductions, 10_000_000);
  checkMoney(errors, 'extraWithholding', input.extraWithholding, 1_000_000);
  checkPercent(errors, 'retirementPercent', input.retirementPercent, 100);
  checkMoney(errors, 'pretaxBenefits', input.pretaxBenefits, 1_000_000);
  checkPercent(errors, 'stateTaxPercent', input.stateTaxPercent, 20);
  if (errors.length === 0) {
    const gross = annualGross(input) / PAY_PERIODS[input.frequency];
    if ((gross * input.retirementPercent) / 100 + input.pretaxBenefits > gross) {
      errors.push({ field: 'pretaxBenefits', message: 'Pre-tax deductions can’t be more than your gross pay.' });
    }
  }
  return errors;
}

export function annualGross(input: PaycheckInput): number {
  return input.payType === 'hourly' ? input.hourlyRate * input.hoursPerWeek * 52 : input.annualSalary;
}

/** The Pub 15-T percentage-method schedule for a filing status: where withholding starts and the brackets. */
export function withholdingSchedule(status: W4Status, multipleJobs: boolean, p: PaycheckParams): { start: number; bands: TaxBand[] } {
  const std = p.standardDeduction[status];
  if (multipleJobs) {
    return { start: std / 2, bands: p.bands[status].map((b) => ({ from: b.from / 2, to: b.to === null ? null : b.to / 2, rate: b.rate })) };
  }
  const adjustment = status === 'marriedJoint' ? p.withholdingAdjustment.marriedJoint : p.withholdingAdjustment.other;
  return { start: std - adjustment, bands: p.bands[status] };
}

/** Tentative yearly withholding for an adjusted annual wage (Worksheet 1A, line 2). */
export function tentativeAnnualWithholding(adjustedAnnualWage: number, status: W4Status, multipleJobs: boolean, p: PaycheckParams): number {
  const { start, bands } = withholdingSchedule(status, multipleJobs, p);
  return taxOnBands(Math.max(0, adjustedAnnualWage - start), bands);
}

export function calculatePaycheck(input: PaycheckInput, p: PaycheckParams): PaycheckResult {
  const errors = validatePaycheckInput(input);
  if (errors.length > 0) throw new RangeError(errors.map((e) => `${e.field}: ${e.message}`).join(' '));

  const periods = PAY_PERIODS[input.frequency];
  const gross = annualGross(input) / periods;
  const retirement = (gross * input.retirementPercent) / 100;
  const benefits = input.pretaxBenefits;
  const taxableWages = gross - retirement - benefits;
  const ficaWages = gross - benefits;

  // Worksheet 1A.
  const adjustment = input.multipleJobs ? 0 : input.status === 'marriedJoint' ? p.withholdingAdjustment.marriedJoint : p.withholdingAdjustment.other;
  const adjustedAnnualWage = Math.max(0, taxableWages * periods + input.otherIncome - (input.deductions + adjustment));
  const tentative = tentativeAnnualWithholding(adjustedAnnualWage, input.status, input.multipleJobs, p) / periods;
  const federalIncomeTax = Math.max(0, tentative - input.dependentsCredit / periods) + input.extraWithholding;

  const stateTax = (Math.max(0, taxableWages) * input.stateTaxPercent) / 100;
  const ssFirst = Math.min(ficaWages, p.socialSecurityWageBase) * p.socialSecurityRate;
  const medicareFirst = ficaWages * p.medicareRate + Math.max(0, ficaWages - p.additionalMedicareThreshold) * p.additionalMedicareRate;
  const line = (ss: number, med: number, fed: number, st: number, n: number): PaycheckLines => {
    const g = gross * n;
    const ret = retirement * n;
    const ben = benefits * n;
    return { gross: g, retirement: ret, benefits: ben, federalIncomeTax: fed, socialSecurity: ss, medicare: med, stateTax: st, takeHome: g - ret - ben - fed - ss - med - st };
  };

  const annualFica = ficaWages * periods;
  const annualSs = Math.min(annualFica, p.socialSecurityWageBase) * p.socialSecurityRate;
  const annualMedicare = annualFica * p.medicareRate + Math.max(0, annualFica - p.additionalMedicareThreshold) * p.additionalMedicareRate;

  return {
    periods,
    perPaycheck: line(ssFirst, medicareFirst, federalIncomeTax, stateTax, 1),
    annual: line(annualSs, annualMedicare, federalIncomeTax * periods, stateTax * periods, periods),
    annualTaxableWages: taxableWages * periods,
    socialSecurityCapped: annualFica > p.socialSecurityWageBase,
    additionalMedicare: annualFica > p.additionalMedicareThreshold,
  };
}
