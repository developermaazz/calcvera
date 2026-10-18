/** Shared input checks for engines. Messages are plain text; the UI shows them next to the field. */

export interface FieldError {
  field: string;
  message: string;
}

interface RangeRule {
  min: number;
  max: number;
  integer?: boolean;
  /** Message when the value is empty or not a number. */
  empty: string;
  /** Message when the value is outside min–max. */
  range: string;
}

/** Adds an error for `field` if `value` is missing, not finite, not whole (when required) or out of range. */
export function checkRange(errors: FieldError[], field: string, value: number, rule: RangeRule): void {
  if (!Number.isFinite(value)) {
    errors.push({ field, message: rule.empty });
  } else if (rule.integer && !Number.isInteger(value)) {
    errors.push({ field, message: 'Enter a whole number.' });
  } else if (value < rule.min || value > rule.max) {
    errors.push({ field, message: rule.range });
  }
}

/** Money amount that can be zero (debts, fees, down payments). */
export function checkMoney(errors: FieldError[], field: string, value: number, max = 100_000_000): void {
  checkRange(errors, field, value, {
    min: 0,
    max,
    empty: 'Enter an amount, or 0 for none.',
    range: 'Enter an amount of 0 or more.',
  });
}

/** Percentage between 0 and max. */
export function checkPercent(errors: FieldError[], field: string, value: number, max = 100): void {
  checkRange(errors, field, value, {
    min: 0,
    max,
    empty: 'Enter a percentage, or 0 for none.',
    range: `Enter a percentage between 0 and ${max}.`,
  });
}
