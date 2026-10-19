/**
 * Compound interest with regular monthly deposits (US, UK). The stated annual rate compounds n times a year;
 * deposits are monthly, so each month grows by the equivalent monthly rate (1 + r/n)^(n/12) − 1, which gives
 * exactly the same yearly growth as the stated compounding. Deposits go in at the start or end of each month.
 * Effective annual rate (APY / AER) = (1 + r/n)^n − 1. No tax, fees or inflation.
 * Pure: no formatting, no country lookups.
 */
import { checkMoney, checkPercent, checkRange, type FieldError } from './validation';

export const COMPOUNDING = { annually: 1, semiannually: 2, quarterly: 4, monthly: 12, daily: 365 } as const;
export type Compounding = keyof typeof COMPOUNDING;
export type DepositTiming = 'start' | 'end';

export interface CompoundInterestInput {
  initialDeposit: number;
  monthlyDeposit: number;
  annualRatePercent: number;
  compounding: Compounding;
  years: number;
  timing: DepositTiming;
}

export interface CompoundYear {
  year: number;
  deposits: number;
  interest: number;
  balance: number;
  totalDeposits: number;
  totalInterest: number;
}

export interface CompoundInterestResult {
  finalBalance: number;
  /** Initial deposit plus all monthly deposits. */
  totalDeposits: number;
  totalInterest: number;
  /** As a fraction, e.g. 0.0512 for 5.12%. */
  effectiveAnnualRate: number;
  monthlyRate: number;
  years: CompoundYear[];
}

export function validateCompoundInterestInput(input: CompoundInterestInput): FieldError[] {
  const errors: FieldError[] = [];
  checkMoney(errors, 'initialDeposit', input.initialDeposit);
  checkMoney(errors, 'monthlyDeposit', input.monthlyDeposit, 10_000_000);
  checkPercent(errors, 'annualRatePercent', input.annualRatePercent, 50);
  checkRange(errors, 'years', input.years, {
    min: 1,
    max: 100,
    integer: true,
    empty: 'Enter how many years.',
    range: 'Enter between 1 and 100 years.',
  });
  if (!(input.compounding in COMPOUNDING)) errors.push({ field: 'compounding', message: 'Choose how often interest compounds.' });
  if (input.timing !== 'start' && input.timing !== 'end') errors.push({ field: 'timing', message: 'Choose when deposits are made.' });
  if (errors.length === 0 && input.initialDeposit === 0 && input.monthlyDeposit === 0) {
    errors.push({ field: 'initialDeposit', message: 'Enter a starting amount or a monthly deposit.' });
  }
  return errors;
}

/** Monthly growth rate equivalent to `annualRatePercent` compounded `n` times a year. */
export function equivalentMonthlyRate(annualRatePercent: number, n: number): number {
  const r = annualRatePercent / 100;
  return r === 0 ? 0 : Math.expm1((n / 12) * Math.log1p(r / n));
}

export function calculateCompoundInterest(input: CompoundInterestInput): CompoundInterestResult {
  const errors = validateCompoundInterestInput(input);
  if (errors.length > 0) throw new RangeError(errors.map((e) => `${e.field}: ${e.message}`).join(' '));

  const n = COMPOUNDING[input.compounding];
  const i = equivalentMonthlyRate(input.annualRatePercent, n);
  let balance = input.initialDeposit;
  let totalDeposits = input.initialDeposit;
  let totalInterest = 0;
  const years: CompoundYear[] = [];

  for (let y = 1; y <= input.years; y++) {
    let deposits = y === 1 ? input.initialDeposit : 0;
    let interest = 0;
    for (let m = 0; m < 12; m++) {
      if (input.timing === 'start') balance += input.monthlyDeposit;
      const earned = balance * i;
      balance += earned;
      interest += earned;
      if (input.timing === 'end') balance += input.monthlyDeposit;
      deposits += input.monthlyDeposit;
    }
    totalDeposits += deposits - (y === 1 ? input.initialDeposit : 0);
    totalInterest += interest;
    years.push({ year: y, deposits, interest, balance, totalDeposits, totalInterest });
  }

  return {
    finalBalance: balance,
    totalDeposits,
    totalInterest,
    effectiveAnnualRate: input.annualRatePercent === 0 ? 0 : Math.expm1(n * Math.log1p(input.annualRatePercent / 100 / n)),
    monthlyRate: i,
    years,
  };
}
