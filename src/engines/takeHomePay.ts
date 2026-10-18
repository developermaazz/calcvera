/**
 * UK take-home pay for an employee on a standard tax code: Income Tax (rest of UK or Scotland) with the
 * Personal Allowance taper, Class 1 employee National Insurance (category A), student loan repayments and a
 * workplace pension paid by salary sacrifice, net pay or relief at source. Worked out on yearly figures;
 * payroll works per pay period, so payslips can differ by a few pounds.
 * Not included: tax codes other than the standard one, Marriage Allowance, benefits in kind, higher-rate
 * pension relief claimed through Self Assessment. Pure: figures are passed in.
 */
import type { TaxBand } from '../countries/types';
import { taxOnBands } from './tax';
import { checkPercent, checkRange, type FieldError } from './validation';

export type UkRegion = 'rUK' | 'scotland';
export type PensionMethod = 'salarySacrifice' | 'netPay' | 'reliefAtSource';
export type UndergraduatePlan = 'none' | 'plan1' | 'plan2' | 'plan4' | 'plan5';

export interface TakeHomePayParams {
  personalAllowance: number;
  taperStart: number;
  taperRate: number;
  /** Bands as taxable income above the Personal Allowance. */
  bands: Record<UkRegion, TaxBand[]>;
  ni: { primaryThreshold: number; upperEarningsLimit: number; mainRate: number; upperRate: number };
  studentLoans: Record<Exclude<UndergraduatePlan, 'none'> | 'postgraduate', { threshold: number; rate: number }>;
  reliefAtSourceRate: number;
}

export interface TakeHomePayInput {
  grossSalary: number;
  region: UkRegion;
  pensionPercent: number;
  pensionMethod: PensionMethod;
  undergraduatePlan: UndergraduatePlan;
  postgraduateLoan: boolean;
}

export interface TakeHomePayResult {
  personalAllowance: number;
  taxableIncome: number;
  incomeTax: number;
  nationalInsurance: number;
  studentLoan: number;
  /** Your pension contribution as it leaves your pay (net of relief at source). */
  pensionFromPay: number;
  /** Total going into your pension, including relief at source. */
  pensionTotal: number;
  takeHome: number;
}

export function validateTakeHomePayInput(input: TakeHomePayInput): FieldError[] {
  const errors: FieldError[] = [];
  checkRange(errors, 'grossSalary', input.grossSalary, {
    min: 0,
    max: 10_000_000,
    empty: 'Enter your yearly salary before tax.',
    range: 'Enter a salary between 0 and 10,000,000.',
  });
  checkPercent(errors, 'pensionPercent', input.pensionPercent, 100);
  return errors;
}

export function calculateTakeHomePay(input: TakeHomePayInput, p: TakeHomePayParams): TakeHomePayResult {
  const errors = validateTakeHomePayInput(input);
  if (errors.length > 0) throw new RangeError(errors.map((e) => e.message).join(' '));

  const contribution = (input.grossSalary * input.pensionPercent) / 100;
  const sacrifice = input.pensionMethod === 'salarySacrifice' ? contribution : 0;
  const netPay = input.pensionMethod === 'netPay' ? contribution : 0;
  const rasGross = input.pensionMethod === 'reliefAtSource' ? contribution : 0;

  // Pay for National Insurance and student loans: salary sacrifice reduces it; net pay does not.
  const niablePay = input.grossSalary - sacrifice;
  // Pay for Income Tax: salary sacrifice and net pay contributions come off first.
  const taxablePay = niablePay - netPay;
  // Adjusted net income for the taper also deducts relief-at-source contributions.
  const adjustedNetIncome = taxablePay - rasGross;

  const personalAllowance = Math.max(0, p.personalAllowance - Math.max(0, adjustedNetIncome - p.taperStart) * p.taperRate);
  const taxableIncome = Math.max(0, taxablePay - personalAllowance);
  const incomeTax = taxOnBands(taxableIncome, p.bands[input.region]);

  const ni = p.ni;
  const nationalInsurance =
    ni.mainRate * Math.max(0, Math.min(niablePay, ni.upperEarningsLimit) - ni.primaryThreshold) +
    ni.upperRate * Math.max(0, niablePay - ni.upperEarningsLimit);

  let studentLoan = 0;
  if (input.undergraduatePlan !== 'none') {
    const plan = p.studentLoans[input.undergraduatePlan];
    studentLoan += plan.rate * Math.max(0, niablePay - plan.threshold);
  }
  if (input.postgraduateLoan) {
    const pg = p.studentLoans.postgraduate;
    studentLoan += pg.rate * Math.max(0, niablePay - pg.threshold);
  }

  // Relief at source: you pay 80% from take-home pay and the provider adds the basic-rate relief.
  const pensionFromPay = sacrifice + netPay + rasGross * (1 - p.reliefAtSourceRate);
  const takeHome = input.grossSalary - pensionFromPay - incomeTax - nationalInsurance - studentLoan;

  return {
    personalAllowance,
    taxableIncome,
    incomeTax,
    nationalInsurance,
    studentLoan,
    pensionFromPay,
    pensionTotal: contribution,
    takeHome,
  };
}
