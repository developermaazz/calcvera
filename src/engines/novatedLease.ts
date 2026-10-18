/**
 * Australian novated lease, simplified to the standard structure:
 * - The employer claims the GST credit on the car (capped at the car limit ÷ 11) and on running costs,
 *   so the lease finances the GST-exclusive price and packaged costs are GST-exclusive.
 * - Residual = ATO minimum residual % for the term × financed amount. Lease payments are monthly in
 *   arrears with the residual as a balloon. The residual is paid from after-tax money plus GST.
 * - Eligible EVs (price at or below the threshold) are FBT-exempt: everything is packaged pre-tax.
 * - Other cars use the employee contribution method: a post-tax contribution equal to the statutory FBT
 *   taxable value (base value × statutory fraction) removes the FBT; the rest is pre-tax.
 * Base value is taken as the car price entered. Pure: figures are passed in.
 */
import { auIncomeTax, type AuTaxParams } from './auIncomeTax';
import { checkMoney, checkPercent, checkRange, type FieldError } from './validation';

export interface NovatedLeaseParams {
  tax: AuTaxParams;
  minimumResidualByTermYears: Record<1 | 2 | 3 | 4 | 5, number>;
  carCostLimit: number;
  gstRate: number;
  statutoryFraction: number;
  evExemptionPriceThreshold: number;
}

export interface NovatedLeaseInput {
  salary: number;
  /** Drive-away price including GST. */
  carPrice: number;
  termYears: number;
  interestRatePercent: number;
  /** Fuel or charging, insurance, servicing, tyres and registration, including GST. */
  runningCostsAnnual: number;
  isElectric: boolean;
}

export interface NovatedLeaseResult {
  gstCredit: number;
  financedAmount: number;
  residualPercent: number;
  residual: number;
  monthlyLeasePayment: number;
  /** Lease payments + running costs per year, excluding GST. */
  annualPackageCost: number;
  fbtExempt: boolean;
  preTaxDeduction: number;
  postTaxDeduction: number;
  takeHomeWithout: number;
  takeHomeWith: number;
  /** How much less you take home each year with the lease. */
  takeHomeReduction: number;
  /** Take-home reduction over the term plus the residual (with GST). */
  leaseTotalCost: number;
  /** Car price plus running costs over the same term, paid from take-home pay. */
  buyOutrightCost: number;
  /** Positive = the lease costs less than buying outright. */
  savings: number;
}

export function validateNovatedLeaseInput(input: NovatedLeaseInput): FieldError[] {
  const errors: FieldError[] = [];
  checkRange(errors, 'salary', input.salary, {
    min: 1,
    max: 10_000_000,
    empty: 'Enter your annual salary before tax.',
    range: 'Enter a salary between 1 and 10,000,000.',
  });
  checkRange(errors, 'carPrice', input.carPrice, {
    min: 1_000,
    max: 1_000_000,
    empty: 'Enter the drive-away price.',
    range: 'Enter a price between 1,000 and 1,000,000.',
  });
  checkRange(errors, 'termYears', input.termYears, {
    min: 1,
    max: 5,
    integer: true,
    empty: 'Choose a lease term.',
    range: 'Choose a term of 1 to 5 years.',
  });
  checkPercent(errors, 'interestRatePercent', input.interestRatePercent, 30);
  checkMoney(errors, 'runningCostsAnnual', input.runningCostsAnnual, 1_000_000);
  return errors;
}

export function calculateNovatedLease(input: NovatedLeaseInput, p: NovatedLeaseParams): NovatedLeaseResult {
  const errors = validateNovatedLeaseInput(input);
  if (errors.length > 0) throw new RangeError(errors.map((e) => e.message).join(' '));

  const gstFraction = p.gstRate / (1 + p.gstRate);
  const gstCredit = Math.min(input.carPrice, p.carCostLimit) * gstFraction;
  const financedAmount = input.carPrice - gstCredit;
  const residualPercent = p.minimumResidualByTermYears[input.termYears as 1 | 2 | 3 | 4 | 5];
  const residual = financedAmount * residualPercent;

  const n = input.termYears * 12;
  const r = input.interestRatePercent / 100 / 12;
  const monthlyLeasePayment =
    r === 0
      ? (financedAmount - residual) / n
      : ((financedAmount - residual * Math.pow(1 + r, -n)) * r) / -Math.expm1(-n * Math.log1p(r));

  const runningEx = input.runningCostsAnnual / (1 + p.gstRate);
  const annualPackageCost = monthlyLeasePayment * 12 + runningEx;

  const fbtExempt = input.isElectric && input.carPrice <= p.evExemptionPriceThreshold;
  const postTaxDeduction = fbtExempt ? 0 : p.statutoryFraction * input.carPrice;
  // The employer remits GST on the post-tax contribution, so only its GST-exclusive part offsets the cost.
  const preTaxDeduction = Math.max(0, annualPackageCost - postTaxDeduction / (1 + p.gstRate));

  const takeHome = (salary: number) => salary - auIncomeTax(salary, p.tax).total;
  const takeHomeWithout = takeHome(input.salary);
  const takeHomeWith = takeHome(input.salary - preTaxDeduction) - postTaxDeduction;
  const takeHomeReduction = takeHomeWithout - takeHomeWith;

  const leaseTotalCost = takeHomeReduction * input.termYears + residual * (1 + p.gstRate);
  const buyOutrightCost = input.carPrice + input.runningCostsAnnual * input.termYears;

  return {
    gstCredit,
    financedAmount,
    residualPercent,
    residual,
    monthlyLeasePayment,
    annualPackageCost,
    fbtExempt,
    preTaxDeduction,
    postTaxDeduction,
    takeHomeWithout,
    takeHomeWith,
    takeHomeReduction,
    leaseTotalCost,
    buyOutrightCost,
    savings: buyOutrightCost - leaseTotalCost,
  };
}
