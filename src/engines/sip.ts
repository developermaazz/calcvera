/**
 * SIP (systematic investment plan) growth, as Indian SIP calculators show it: a fixed amount invested at the start
 * of every month, growing at the expected yearly return ÷ 12 each month. An optional step-up raises the monthly
 * amount by a % each year. Returns aren't guaranteed. Pure: no formatting, no country lookups.
 */
import { checkPercent, checkRange, type FieldError } from './validation';

export interface SipInput {
  monthly: number;
  returnPercent: number;
  years: number;
  /** Yearly increase in the monthly amount, %. */
  stepUpPercent: number;
}

export interface SipYear {
  year: number;
  invested: number;
  value: number;
}

export interface SipResult {
  invested: number;
  returns: number;
  value: number;
  years: SipYear[];
}

export function validateSipInput(input: SipInput): FieldError[] {
  const errors: FieldError[] = [];
  checkRange(errors, 'monthly', input.monthly, { min: 1, max: 100_000_000, empty: 'Enter your monthly SIP amount.', range: 'Enter an amount between 1 and 10,00,00,000.' });
  checkPercent(errors, 'returnPercent', input.returnPercent, 50);
  checkRange(errors, 'years', input.years, { min: 1, max: 50, integer: true, empty: 'Enter the number of years.', range: 'Enter between 1 and 50 years.' });
  checkPercent(errors, 'stepUpPercent', input.stepUpPercent, 50);
  return errors;
}

export function calculateSip(input: SipInput): SipResult {
  const errors = validateSipInput(input);
  if (errors.length > 0) throw new RangeError(errors.map((e) => `${e.field}: ${e.message}`).join(' '));
  const i = input.returnPercent / 100 / 12;
  let value = 0;
  let invested = 0;
  const years: SipYear[] = [];
  for (let y = 0; y < input.years; y++) {
    const amount = input.monthly * Math.pow(1 + input.stepUpPercent / 100, y);
    for (let m = 0; m < 12; m++) {
      value = (value + amount) * (1 + i);
      invested += amount;
    }
    years.push({ year: y + 1, invested, value });
  }
  return { invested, returns: value - invested, value, years };
}
