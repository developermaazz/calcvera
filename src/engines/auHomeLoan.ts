/**
 * Australian home loan repayments. Interest each period = (balance − offset) × annual rate ÷ periods a year.
 *   Monthly, fortnightly or weekly repayments over the term, or half the monthly repayment every fortnight.
 *   Optional interest-only period first; then principal and interest over the rest of the term.
 *   An offset balance and extra repayments don't change the scheduled repayment; they shorten the loan.
 * The last repayment is adjusted so the balance ends at exactly 0. Pure: no formatting, no country lookups.
 */
import { checkMoney, checkPercent, checkRange, type FieldError } from './validation';

export type LoanFrequency = 'monthly' | 'fortnightly' | 'weekly' | 'halfMonthly';

export const PERIODS_PER_YEAR: Record<LoanFrequency, number> = { monthly: 12, fortnightly: 26, weekly: 52, halfMonthly: 26 };

export interface AuHomeLoanInput {
  amount: number;
  ratePercent: number;
  termYears: number;
  frequency: LoanFrequency;
  /** Years of interest-only repayments at the start (0 for none). */
  interestOnlyYears: number;
  /** Extra paid with each repayment. */
  extraRepayment: number;
  offsetBalance: number;
}

export interface AuHomeLoanYear {
  year: number;
  paid: number;
  principal: number;
  interest: number;
  balance: number;
}

export interface AuHomeLoanResult {
  periodsPerYear: number;
  /** Scheduled repayment once principal and interest repayments start. */
  repayment: number;
  /** Interest-only repayment on the starting balance (0 when there's no interest-only period). */
  interestOnlyRepayment: number;
  /** Repayments made until the balance reaches 0. */
  repayments: number;
  payoffYears: number;
  totalInterest: number;
  totalPaid: number;
  /** Same loan with no offset and no extra repayments. */
  baseTotalInterest: number;
  basePayoffYears: number;
  interestSaved: number;
  years: AuHomeLoanYear[];
}

function level(principal: number, rate: number, n: number): number {
  if (n <= 0) return principal;
  if (rate === 0) return principal / n;
  return (principal * rate) / -Math.expm1(-n * Math.log1p(rate));
}

export function validateAuHomeLoanInput(input: AuHomeLoanInput): FieldError[] {
  const errors: FieldError[] = [];
  checkRange(errors, 'amount', input.amount, {
    min: 1_000,
    max: 100_000_000,
    empty: 'Enter how much you’ll borrow.',
    range: 'Enter an amount between 1,000 and 100,000,000.',
  });
  checkPercent(errors, 'ratePercent', input.ratePercent, 25);
  checkRange(errors, 'termYears', input.termYears, { min: 1, max: 40, integer: true, empty: 'Enter the loan term.', range: 'Enter a term between 1 and 40 years.' });
  if (!(input.frequency in PERIODS_PER_YEAR)) errors.push({ field: 'frequency', message: 'Choose how often you’ll repay.' });
  checkRange(errors, 'interestOnlyYears', input.interestOnlyYears, {
    min: 0,
    max: 15,
    integer: true,
    empty: 'Enter the interest-only years, or 0 for none.',
    range: 'Enter between 0 and 15 years.',
  });
  if (errors.length === 0 && input.interestOnlyYears >= input.termYears) {
    errors.push({ field: 'interestOnlyYears', message: 'The interest-only period must be shorter than the loan term.' });
  }
  checkMoney(errors, 'extraRepayment', input.extraRepayment, 10_000_000);
  checkMoney(errors, 'offsetBalance', input.offsetBalance, 100_000_000);
  return errors;
}

interface Run {
  repayment: number;
  interestOnlyRepayment: number;
  repayments: number;
  totalInterest: number;
  totalPaid: number;
  years: AuHomeLoanYear[];
}

function simulate(input: AuHomeLoanInput, extra: number, offset: number): Run {
  const perYear = PERIODS_PER_YEAR[input.frequency];
  const rate = input.ratePercent / 100 / perYear;
  const ioPeriods = input.interestOnlyYears * perYear;
  const total = input.termYears * perYear;
  // Principal and interest repayment after any interest-only period.
  const repayment =
    input.frequency === 'halfMonthly'
      ? level(input.amount, input.ratePercent / 100 / 12, (input.termYears - input.interestOnlyYears) * 12) / 2
      : level(input.amount, rate, total - ioPeriods);
  const interestOnlyRepayment = ioPeriods > 0 ? Math.max(0, input.amount - offset) * rate : 0;

  let balance = input.amount;
  let k = 0;
  let totalInterest = 0;
  let totalPaid = 0;
  const years: AuHomeLoanYear[] = [];
  while (balance > 1e-9 && k < total) {
    k++;
    if ((k - 1) % perYear === 0) years.push({ year: (k - 1) / perYear + 1, paid: 0, principal: 0, interest: 0, balance: 0 });
    const row = years[years.length - 1]!;
    const interest = Math.max(0, balance - offset) * rate;
    const scheduled = k <= ioPeriods ? interest : repayment;
    const principal = k === total ? balance : Math.min(balance, Math.max(0, scheduled - interest) + extra);
    balance -= principal;
    if (balance < 1e-9) balance = 0;
    totalInterest += interest;
    totalPaid += interest + principal;
    row.paid += interest + principal;
    row.principal += principal;
    row.interest += interest;
    row.balance = balance;
  }
  return { repayment, interestOnlyRepayment, repayments: k, totalInterest, totalPaid, years };
}

export function calculateAuHomeLoan(input: AuHomeLoanInput): AuHomeLoanResult {
  const errors = validateAuHomeLoanInput(input);
  if (errors.length > 0) throw new RangeError(errors.map((e) => `${e.field}: ${e.message}`).join(' '));
  const perYear = PERIODS_PER_YEAR[input.frequency];
  const r = simulate(input, input.extraRepayment, input.offsetBalance);
  const base = input.extraRepayment > 0 || input.offsetBalance > 0 ? simulate(input, 0, 0) : r;
  return {
    periodsPerYear: perYear,
    repayment: r.repayment,
    interestOnlyRepayment: r.interestOnlyRepayment,
    repayments: r.repayments,
    payoffYears: r.repayments / perYear,
    totalInterest: r.totalInterest,
    totalPaid: r.totalPaid,
    baseTotalInterest: base.totalInterest,
    basePayoffYears: base.repayments / perYear,
    interestSaved: base.totalInterest - r.totalInterest,
    years: r.years,
  };
}
