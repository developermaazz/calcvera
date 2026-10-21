/**
 * PPF (Public Provident Fund) maturity, India. Interest is worked out monthly on the lowest balance between the
 * 5th and the end of the month, and credited at the end of the financial year:
 *   one deposit by 5 April each year: interest = (balance + deposit) × rate
 *   equal monthly deposits by the 5th: interest = rate × balance + rate ÷ 12 × (deposit ÷ 12) × 78
 *     (the sum of 1 to 12 monthly deposits held in each month).
 * The rate is held at today's rate. Pure: figures are passed in.
 */
import type { InPpfConfig } from '../countries/types';
import { checkPercent, checkRange, type FieldError } from './validation';

export type PpfTiming = 'yearStart' | 'monthly';

export interface PpfInput {
  /** Total deposit each financial year. */
  yearly: number;
  ratePercent: number;
  years: number;
  timing: PpfTiming;
}

export interface PpfYear {
  year: number;
  deposit: number;
  interest: number;
  balance: number;
}

export interface PpfResult {
  invested: number;
  interest: number;
  maturity: number;
  belowMinimum: boolean;
  aboveMaximum: boolean;
  years: PpfYear[];
}

export function validatePpfInput(input: PpfInput, p: Pick<InPpfConfig, 'termYears' | 'extensionYears'>): FieldError[] {
  const errors: FieldError[] = [];
  checkRange(errors, 'yearly', input.yearly, { min: 1, max: 100_000_000, empty: 'Enter how much you’ll deposit each year.', range: 'Enter a positive amount.' });
  checkPercent(errors, 'ratePercent', input.ratePercent, 20);
  checkRange(errors, 'years', input.years, {
    min: p.termYears,
    max: 50,
    integer: true,
    empty: 'Enter the number of years.',
    range: `Enter at least ${p.termYears} years.`,
  });
  if (errors.length === 0 && (input.years - p.termYears) % p.extensionYears !== 0) {
    errors.push({ field: 'years', message: `After ${p.termYears} years, you can extend in blocks of ${p.extensionYears} years.` });
  }
  return errors;
}

export function calculatePpf(input: PpfInput, p: InPpfConfig): PpfResult {
  const errors = validatePpfInput(input, p);
  if (errors.length > 0) throw new RangeError(errors.map((e) => `${e.field}: ${e.message}`).join(' '));
  const r = input.ratePercent / 100;
  let balance = 0;
  let invested = 0;
  let interestTotal = 0;
  const years: PpfYear[] = [];
  for (let y = 1; y <= input.years; y++) {
    const d = input.yearly;
    const interest = input.timing === 'yearStart' ? (balance + d) * r : r * balance + (r / 12) * (d / 12) * 78;
    balance += d + interest;
    invested += d;
    interestTotal += interest;
    years.push({ year: y, deposit: d, interest, balance });
  }
  return {
    invested,
    interest: interestTotal,
    maturity: balance,
    belowMinimum: input.yearly < p.minDeposit,
    aboveMaximum: input.yearly > p.maxDeposit,
    years,
  };
}
