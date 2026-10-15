/**
 * Fixed-rate amortising loan engine (personal and auto loans, US/UK/AU).
 *
 * Pure: input object in, result object out. No DOM, no formatting, no country lookups.
 * Monthly rate = APR / 12. Calculated at full precision; callers round for display.
 */

export interface LoanInput {
  /** Amount borrowed, in currency units. */
  principal: number;
  /** Annual percentage rate, e.g. 7.5 for 7.5%. */
  aprPercent: number;
  /** Number of monthly payments. */
  termMonths: number;
  /** Optional extra amount paid towards principal every month. */
  extraMonthly?: number;
}

export interface LoanScheduleRow {
  /** 1-based payment number. */
  month: number;
  /** Total paid this month: interest + principal + extra. */
  payment: number;
  interest: number;
  /** Scheduled principal repaid this month. */
  principal: number;
  /** Extra principal repaid this month. */
  extra: number;
  /** Balance after this payment. */
  balance: number;
}

export interface LoanYearRow {
  /** 1-based loan year (payments 1–12 are year 1). */
  year: number;
  payments: number;
  interest: number;
  /** Principal repaid this year, including extra payments. */
  principal: number;
  balance: number;
}

export interface LoanResult {
  /** Scheduled monthly payment, excluding any extra payment. */
  monthlyPayment: number;
  /** Scheduled monthly payment plus the extra payment. */
  monthlyPaymentWithExtra: number;
  totalInterest: number;
  /** Principal + total interest. */
  totalCost: number;
  /** Number of payments actually made (shorter than the term if extra payments are made). */
  payoffMonths: number;
  /** Interest saved compared with paying no extra. 0 when there is no extra payment. */
  interestSaved: number;
  /** Payments saved compared with the full term. */
  monthsSaved: number;
  schedule: LoanScheduleRow[];
}

export type LoanField = 'principal' | 'aprPercent' | 'termMonths' | 'extraMonthly';

export interface LoanFieldError {
  field: LoanField;
  message: string;
}

export const LOAN_LIMITS = {
  principal: { min: 1, max: 100_000_000 },
  aprPercent: { min: 0, max: 100 },
  termMonths: { min: 1, max: 600 },
  extraMonthly: { min: 0, max: 100_000_000 },
} as const;

/** Smallest balance treated as still owing. */
const EPSILON = 1e-7;

/** Returns every problem with the input. An empty array means the input is valid. */
export function validateLoanInput(input: LoanInput): LoanFieldError[] {
  const errors: LoanFieldError[] = [];
  const { principal, aprPercent, termMonths, extraMonthly = 0 } = input;
  const L = LOAN_LIMITS;

  if (!Number.isFinite(principal)) {
    errors.push({ field: 'principal', message: 'Enter the amount you want to borrow.' });
  } else if (principal < L.principal.min || principal > L.principal.max) {
    errors.push({ field: 'principal', message: 'Enter an amount between 1 and 100,000,000.' });
  }

  if (!Number.isFinite(aprPercent)) {
    errors.push({ field: 'aprPercent', message: 'Enter an interest rate (APR).' });
  } else if (aprPercent < L.aprPercent.min || aprPercent > L.aprPercent.max) {
    errors.push({ field: 'aprPercent', message: 'Enter an APR between 0% and 100%.' });
  }

  if (!Number.isFinite(termMonths)) {
    errors.push({ field: 'termMonths', message: 'Enter the loan term.' });
  } else if (!Number.isInteger(termMonths)) {
    errors.push({ field: 'termMonths', message: 'The term must be a whole number of months.' });
  } else if (termMonths < L.termMonths.min || termMonths > L.termMonths.max) {
    errors.push({ field: 'termMonths', message: 'Enter a term between 1 month and 50 years.' });
  }

  if (!Number.isFinite(extraMonthly)) {
    errors.push({ field: 'extraMonthly', message: 'Enter an extra payment, or 0 for none.' });
  } else if (extraMonthly < L.extraMonthly.min || extraMonthly > L.extraMonthly.max) {
    errors.push({ field: 'extraMonthly', message: 'The extra payment cannot be negative.' });
  }

  return errors;
}

/** Standard amortisation payment: M = P·r / (1 − (1 + r)^−n), or P / n at 0% APR. */
export function monthlyPayment(principal: number, aprPercent: number, termMonths: number): number {
  const r = aprPercent / 100 / 12;
  if (r === 0) return principal / termMonths;
  return (principal * r) / (1 - Math.pow(1 + r, -termMonths));
}

/** Builds the full schedule. Throws a RangeError if the input is invalid; call validateLoanInput first. */
export function calculateLoan(input: LoanInput): LoanResult {
  const errors = validateLoanInput(input);
  if (errors.length > 0) {
    throw new RangeError(errors.map((e) => `${e.field}: ${e.message}`).join(' '));
  }

  const { principal, aprPercent, termMonths } = input;
  const extra = input.extraMonthly ?? 0;
  const r = aprPercent / 100 / 12;
  const payment = monthlyPayment(principal, aprPercent, termMonths);

  // Balances below this are floating-point noise and count as fully repaid.
  const tolerance = Math.max(EPSILON, principal * 1e-12);
  const balanceAfter = closedFormBalance(principal, r, termMonths, extra);

  const schedule: LoanScheduleRow[] = [];
  let opening = principal;
  let totalInterest = 0;

  for (let month = 1; month <= termMonths; month++) {
    const interest = opening * r;
    // The last scheduled payment is adjusted so the balance ends at exactly 0.
    let closing = month === termMonths ? 0 : balanceAfter(month);
    if (closing < tolerance) closing = 0; // an extra payment cleared the loan early

    const repaid = opening - closing;
    const scheduledPrincipal = extra === 0 ? repaid : Math.min(Math.max(payment - interest, 0), repaid);
    const extraPrincipal = repaid - scheduledPrincipal;
    totalInterest += interest;

    schedule.push({
      month,
      payment: interest + repaid,
      interest,
      principal: scheduledPrincipal,
      extra: extraPrincipal,
      balance: closing,
    });

    if (closing === 0) break;
    opening = closing;
  }

  const baselineInterest = payment * termMonths - principal;
  const payoffMonths = schedule.length;

  return {
    monthlyPayment: payment,
    monthlyPaymentWithExtra: payment + extra,
    totalInterest,
    totalCost: principal + totalInterest,
    payoffMonths,
    interestSaved: extra > 0 ? Math.max(0, baselineInterest - totalInterest) : 0,
    monthsSaved: termMonths - payoffMonths,
    schedule,
  };
}

/**
 * Balance after k payments, from the closed-form amortisation formula rather than month-by-month
 * subtraction. Subtracting each month amplifies rounding error by (1 + r)^k, which breaks long,
 * high-rate loans; this form stays accurate across the full input range.
 *
 *   scheduled balance  B_k = P · (1 − (1 + r)^(k − n)) / (1 − (1 + r)^−n)
 *   minus extra paid   E_k = extra · ((1 + r)^k − 1) / r
 */
function closedFormBalance(
  principal: number,
  r: number,
  termMonths: number,
  extra: number,
): (k: number) => number {
  if (r === 0) {
    return (k) => principal * (1 - k / termMonths) - extra * k;
  }
  const g = Math.log1p(r);
  const denominator = -Math.expm1(-termMonths * g);
  return (k) => (principal * -Math.expm1((k - termMonths) * g)) / denominator - (extra * Math.expm1(k * g)) / r;
}

/** Groups a monthly schedule into loan years. */
export function summariseByYear(schedule: LoanScheduleRow[]): LoanYearRow[] {
  const years: LoanYearRow[] = [];
  for (const row of schedule) {
    const year = Math.ceil(row.month / 12);
    let current = years[years.length - 1];
    if (!current || current.year !== year) {
      current = { year, payments: 0, interest: 0, principal: 0, balance: row.balance };
      years.push(current);
    }
    current.payments += 1;
    current.interest += row.interest;
    current.principal += row.principal + row.extra;
    current.balance = row.balance;
  }
  return years;
}
