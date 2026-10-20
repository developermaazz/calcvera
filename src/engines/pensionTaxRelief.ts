/**
 * UK pension tax relief on your own contributions, for each way of paying in:
 *   Relief at source (personal pensions, some workplace schemes): you pay 80% and the provider adds 20%
 *   on contributions up to 100% of earnings (or £3,600 gross with little or no earnings). Where income
 *   is taxed above 20% (40%/45%, or 21%/42%/45%/48% in Scotland), you claim the rest through Self
 *   Assessment. Adjusted net income falls by the gross contribution, which can restore Personal Allowance.
 *   Net pay arrangement: contributions come off pay before Income Tax, so relief is at your own rates.
 *   Salary sacrifice: your salary falls by the contribution, saving Income Tax and employee National
 *   Insurance.
 * Relief is worked out as the tax (and NI) on your pay with and without the contribution, so the Personal
 * Allowance taper and Scottish bands are handled exactly. Annual allowance, its taper and the money
 * purchase annual allowance are checked against everything going in (yours plus your employer's).
 * Pure: figures are passed in.
 */
import type { TaxBand } from '../countries/types';
import type { PensionMethod, UkRegion } from './takeHomePay';
import { taxOnBands } from './tax';
import { checkMoney, checkRange, type FieldError } from './validation';

export const PENSION_METHODS: PensionMethod[] = ['reliefAtSource', 'netPay', 'salarySacrifice'];

export interface PensionReliefParams {
  personalAllowance: number;
  taperStart: number;
  taperRate: number;
  /** Bands as taxable income above the Personal Allowance. */
  bands: Record<UkRegion, TaxBand[]>;
  ni: { primaryThreshold: number; upperEarningsLimit: number; mainRate: number; upperRate: number };
  reliefAtSourceRate: number;
  annualAllowance: number;
  taperThresholdIncome: number;
  taperAdjustedIncome: number;
  taperMinimum: number;
  moneyPurchaseAnnualAllowance: number;
  nonEarnerGrossLimit: number;
}

export interface PensionReliefInput {
  /** Yearly salary before any pension deduction. */
  salary: number;
  region: UkRegion;
  method: PensionMethod;
  /** Your contribution for the year, gross: the total going into your pension from you, including relief. */
  contribution: number;
  employerContribution: number;
  /** You've taken money flexibly from a pension, so the money purchase annual allowance applies. */
  flexiblyAccessed: boolean;
}

export interface MethodRelief {
  method: PensionMethod;
  /** Added by the provider (relief at source only). */
  reliefAddedByProvider: number;
  /** Relief at source: extra to claim through Self Assessment or by contacting HMRC. */
  extraReliefToClaim: number;
  /** Net pay and salary sacrifice: Income Tax you don't pay. */
  incomeTaxSaved: number;
  /** Salary sacrifice: employee National Insurance you don't pay. */
  niSaved: number;
  totalRelief: number;
  /** What the contribution costs you after all relief. */
  costToYou: number;
  /** Part of your contribution that gets no relief (over the earnings limit). */
  unrelieved: number;
}

export interface PensionReliefResult {
  chosen: MethodRelief;
  all: Record<PensionMethod, MethodRelief>;
  totalIntoPension: number;
  /** Annual allowance that applies to you (tapered or money purchase where relevant). */
  allowance: number;
  allowanceTapered: boolean;
  /** Pension savings over your allowance (carry forward from the last 3 years may cover it). */
  overAllowance: number;
  /** Your top rate of Income Tax on your salary before the contribution, as a decimal. */
  marginalRate: number;
}

export function validatePensionReliefInput(input: PensionReliefInput): FieldError[] {
  const errors: FieldError[] = [];
  checkRange(errors, 'salary', input.salary, {
    min: 0,
    max: 10_000_000,
    empty: 'Enter your yearly salary before tax, or 0 if you have no earnings.',
    range: 'Enter a salary between 0 and 10,000,000.',
  });
  checkMoney(errors, 'contribution', input.contribution, 10_000_000);
  checkMoney(errors, 'employerContribution', input.employerContribution, 10_000_000);
  if (errors.length === 0 && input.method !== 'reliefAtSource' && input.contribution > input.salary) {
    errors.push({ field: 'contribution', message: 'With net pay or salary sacrifice, you can only pay in from your salary. Lower the amount or choose relief at source.' });
  }
  return errors;
}

export function ukIncomeTax(pay: number, region: UkRegion, p: PensionReliefParams): number {
  const allowance = Math.max(0, p.personalAllowance - Math.max(0, pay - p.taperStart) * p.taperRate);
  return taxOnBands(Math.max(0, pay - allowance), p.bands[region]);
}

export function ukEmployeeNi(pay: number, p: PensionReliefParams): number {
  const main = Math.max(0, Math.min(pay, p.ni.upperEarningsLimit) - p.ni.primaryThreshold) * p.ni.mainRate;
  return main + Math.max(0, pay - p.ni.upperEarningsLimit) * p.ni.upperRate;
}

/**
 * Income below this gets no more than the relief-at-source rate: the Personal Allowance plus any leading
 * bands taxed below it (Scotland's 19% starter rate).
 */
function lowRateCeiling(region: UkRegion, p: PensionReliefParams): number {
  let ceiling = p.personalAllowance;
  for (const band of p.bands[region]) {
    if (band.rate >= p.reliefAtSourceRate) break;
    ceiling = p.personalAllowance + (band.to ?? 0);
  }
  return ceiling;
}

function reliefFor(method: PensionMethod, input: PensionReliefInput, p: PensionReliefParams): MethodRelief {
  const { salary, region, contribution: g } = input;
  const base = { method, reliefAddedByProvider: 0, extraReliefToClaim: 0, incomeTaxSaved: 0, niSaved: 0, unrelieved: 0 };

  if (method === 'reliefAtSource') {
    const relieved = Math.min(g, Math.max(salary, p.nonEarnerGrossLimit));
    const atSource = relieved * p.reliefAtSourceRate;
    // Contribution taken off the top of income: the part above the low-rate ceiling earns relief at your
    // own (higher) rates; everything else still gets the relief-at-source rate.
    const ceiling = lowRateCeiling(region, p);
    const aboveCeiling = Math.min(relieved, Math.max(0, salary - ceiling));
    const reliefAbove = ukIncomeTax(salary, region, p) - ukIncomeTax(salary - aboveCeiling, region, p);
    const total = Math.max(atSource, reliefAbove + (relieved - aboveCeiling) * p.reliefAtSourceRate);
    return { ...base, reliefAddedByProvider: atSource, extraReliefToClaim: total - atSource, totalRelief: total, costToYou: g - total, unrelieved: g - relieved };
  }

  const incomeTaxSaved = ukIncomeTax(salary, region, p) - ukIncomeTax(salary - g, region, p);
  const niSaved = method === 'salarySacrifice' ? ukEmployeeNi(salary, p) - ukEmployeeNi(salary - g, p) : 0;
  const total = incomeTaxSaved + niSaved;
  return { ...base, incomeTaxSaved, niSaved, totalRelief: total, costToYou: g - total };
}

export function calculatePensionRelief(input: PensionReliefInput, p: PensionReliefParams): PensionReliefResult {
  const errors = validatePensionReliefInput(input);
  if (errors.length > 0) throw new RangeError(errors.map((e) => `${e.field}: ${e.message}`).join(' '));

  const all = Object.fromEntries(
    PENSION_METHODS.map((m) => [m, reliefFor(m, { ...input, contribution: m === 'reliefAtSource' ? input.contribution : Math.min(input.contribution, input.salary) }, p)]),
  ) as Record<PensionMethod, MethodRelief>;

  // Annual allowance. Threshold income deducts relief-at-source and net pay contributions (salary
  // sacrifice set up after July 2015 is added back); adjusted income adds employer contributions back.
  const personalDeducted = input.method === 'salarySacrifice' ? 0 : input.contribution;
  const thresholdIncome = input.salary - personalDeducted;
  const adjustedIncome = input.salary + input.employerContribution;
  const tapered = thresholdIncome > p.taperThresholdIncome && adjustedIncome > p.taperAdjustedIncome;
  let allowance = tapered ? Math.max(p.taperMinimum, p.annualAllowance - (adjustedIncome - p.taperAdjustedIncome) / 2) : p.annualAllowance;
  if (input.flexiblyAccessed) allowance = Math.min(allowance, p.moneyPurchaseAnnualAllowance);
  const totalIntoPension = input.contribution + input.employerContribution;

  const allowanceNow = Math.max(0, p.personalAllowance - Math.max(0, input.salary - p.taperStart) * p.taperRate);
  const taxable = Math.max(0, input.salary - allowanceNow);
  const band = p.bands[input.region].find((b) => b.to === null || taxable <= b.to);
  const inTaper = input.salary > p.taperStart && allowanceNow > 0;

  return {
    chosen: all[input.method],
    all,
    totalIntoPension,
    allowance,
    allowanceTapered: tapered,
    overAllowance: Math.max(0, totalIntoPension - allowance),
    marginalRate: taxable <= 0 ? 0 : inTaper ? (band?.rate ?? 0) * (1 + p.taperRate) : (band?.rate ?? 0),
  };
}
