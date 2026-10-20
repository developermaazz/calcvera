/**
 * RRSP vs TFSA (Canada). The same amount of before-tax income goes into each, at the start of every year:
 *   RRSP: the full amount goes in (the tax refund is reinvested). Withdrawals are taxed at the retirement rate.
 *   TFSA: the amount after tax at today's rate goes in. Withdrawals are tax-free.
 * With the same return, the RRSP comes out ahead when the tax rate at withdrawal is lower than today's.
 * Tax rates are passed in. Pure: no formatting, no country lookups.
 */
import { checkPercent, checkRange, type FieldError } from './validation';

export interface RrspVsTfsaInput {
  /** Before-tax income set aside each year. */
  contribution: number;
  years: number;
  returnPercent: number;
  /** Tax rate on the contribution today (the RRSP refund rate), as a decimal. */
  rateNow: number;
  /** Tax rate on RRSP withdrawals in retirement, as a decimal. */
  rateLater: number;
}

export interface RrspVsTfsaResult {
  rrspDeposit: number;
  tfsaDeposit: number;
  /** Tax refund from the RRSP deduction each year. */
  refund: number;
  rrspValue: number;
  rrspTax: number;
  rrspAfterTax: number;
  tfsaValue: number;
  /** RRSP after tax − TFSA. */
  difference: number;
  winner: 'rrsp' | 'tfsa' | 'same';
  rows: { year: number; rrspValue: number; rrspAfterTax: number; tfsaValue: number }[];
}

export function validateRrspVsTfsaInput(input: RrspVsTfsaInput): FieldError[] {
  const errors: FieldError[] = [];
  checkRange(errors, 'contribution', input.contribution, {
    min: 1,
    max: 1_000_000,
    empty: 'Enter how much you’ll put in each year.',
    range: 'Enter an amount between 1 and 1,000,000.',
  });
  checkRange(errors, 'years', input.years, { min: 1, max: 60, integer: true, empty: 'Enter the number of years.', range: 'Enter between 1 and 60 years.' });
  checkPercent(errors, 'returnPercent', input.returnPercent, 20);
  return errors;
}

/** Value after n years of equal deposits at the start of each year. */
function annuityDue(deposit: number, r: number, n: number): number {
  return r === 0 ? deposit * n : deposit * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
}

export function calculateRrspVsTfsa(input: RrspVsTfsaInput): RrspVsTfsaResult {
  const errors = validateRrspVsTfsaInput(input);
  if (errors.length > 0) throw new RangeError(errors.map((e) => `${e.field}: ${e.message}`).join(' '));
  const r = input.returnPercent / 100;
  const rrspDeposit = input.contribution;
  const tfsaDeposit = input.contribution * (1 - input.rateNow);
  const rows = Array.from({ length: input.years }, (_, k) => {
    const rrspValue = annuityDue(rrspDeposit, r, k + 1);
    return { year: k + 1, rrspValue, rrspAfterTax: rrspValue * (1 - input.rateLater), tfsaValue: annuityDue(tfsaDeposit, r, k + 1) };
  });
  const last = rows[rows.length - 1]!;
  const difference = last.rrspAfterTax - last.tfsaValue;
  return {
    rrspDeposit,
    tfsaDeposit,
    refund: input.contribution * input.rateNow,
    rrspValue: last.rrspValue,
    rrspTax: last.rrspValue - last.rrspAfterTax,
    rrspAfterTax: last.rrspAfterTax,
    tfsaValue: last.tfsaValue,
    difference,
    winner: Math.abs(difference) < 0.005 ? 'same' : difference > 0 ? 'rrsp' : 'tfsa',
    rows,
  };
}
