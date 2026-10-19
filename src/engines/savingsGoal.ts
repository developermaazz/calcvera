/**
 * Savings goal (US, UK): the monthly deposit needed to reach a goal by a date, or how long a monthly deposit
 * takes to get there. The rate is the account's APY (US) / AER (UK), the yearly growth after compounding,
 * so the monthly rate is i = (1 + APY)^(1/12) − 1. Deposits are made at the end of each month.
 *   Future value:  FV = S(1 + i)^n + P × ((1 + i)^n − 1) ÷ i       (at 0%: S + P × n)
 *   Deposit:       P = (G − S(1 + i)^n) × i ÷ ((1 + i)^n − 1)       (at 0%: (G − S) ÷ n)
 *   Time:          n = ln((G·i + P) ÷ (S·i + P)) ÷ ln(1 + i), rounded up to whole months
 * No tax, fees or inflation. Pure: no formatting, no country lookups.
 */
import { MAX_PAYOFF_MONTHS } from './debtPayoff';
import { checkMoney, checkPercent, checkRange, type FieldError } from './validation';

export type SavingsGoalMode = 'deposit' | 'time';

export interface SavingsGoalInput {
  goal: number;
  currentSavings: number;
  /** APY / AER, e.g. 4.5 for 4.5%. */
  ratePercent: number;
  mode: SavingsGoalMode;
  /** Deposit mode: time to reach the goal, in years (decimals allowed, rounded to whole months). */
  years: number;
  /** Time mode: what you'll save each month. */
  monthlyDeposit: number;
}

export interface SavingsGoalYear {
  year: number;
  deposits: number;
  interest: number;
  balance: number;
}

export interface SavingsGoalResult {
  /** The goal is already covered by current savings. */
  alreadyThere: boolean;
  monthlyDeposit: number;
  months: number;
  /** Balance at the end (at least the goal; time mode can overshoot in the last month). */
  finalBalance: number;
  totalDeposits: number;
  interest: number;
  /** Current savings alone (with interest) reach the goal in time, so no deposit is needed. */
  noDepositNeeded: boolean;
  monthlyRate: number;
  years: SavingsGoalYear[];
}

export const goalMonths = (years: number) => Math.round(years * 12);

export function validateSavingsGoalInput(input: SavingsGoalInput): FieldError[] {
  const errors: FieldError[] = [];
  checkRange(errors, 'goal', input.goal, {
    min: 1,
    max: 100_000_000,
    empty: 'Enter your savings goal.',
    range: 'Enter a goal between 1 and 100,000,000.',
  });
  checkMoney(errors, 'currentSavings', input.currentSavings);
  checkPercent(errors, 'ratePercent', input.ratePercent, 30);
  if (input.mode === 'deposit') {
    checkRange(errors, 'years', input.years, {
      min: 1 / 12,
      max: 100,
      empty: 'Enter how long you have to save.',
      range: 'Enter between 1 month (0.1 years) and 100 years.',
    });
  } else if (input.mode === 'time') {
    checkMoney(errors, 'monthlyDeposit', input.monthlyDeposit, 10_000_000);
  } else {
    errors.push({ field: 'mode', message: 'Choose what you want to work out.' });
  }
  return errors;
}

const monthlyRateFor = (ratePercent: number) => (ratePercent === 0 ? 0 : Math.expm1(Math.log1p(ratePercent / 100) / 12));

function schedule(start: number, deposit: number, i: number, months: number) {
  const years: SavingsGoalYear[] = [];
  let balance = start;
  let interest = 0;
  for (let m = 1; m <= months; m++) {
    const earned = balance * i;
    balance += earned + deposit;
    interest += earned;
    const y = Math.ceil(m / 12);
    const row = years[y - 1] ?? (years[y - 1] = { year: y, deposits: 0, interest: 0, balance: 0 });
    row.deposits += deposit;
    row.interest += earned;
    row.balance = balance;
  }
  return { balance, interest, years };
}

/** Months for `deposit` a month to grow `start` to `goal`; Infinity if it never does. */
export function monthsToGoal(goal: number, start: number, deposit: number, i: number): number {
  if (start >= goal) return 0;
  if (i === 0) return deposit > 0 ? Math.ceil((goal - start) / deposit - 1e-9) : Infinity;
  if (deposit === 0 && start === 0) return Infinity;
  const n = Math.log((goal * i + deposit) / (start * i + deposit)) / Math.log1p(i);
  return Math.max(1, Math.ceil(n - 1e-9));
}

export function calculateSavingsGoal(input: SavingsGoalInput): SavingsGoalResult {
  const errors = validateSavingsGoalInput(input);
  if (errors.length > 0) throw new RangeError(errors.map((e) => `${e.field}: ${e.message}`).join(' '));

  const i = monthlyRateFor(input.ratePercent);
  const base = { monthlyRate: i };

  if (input.currentSavings >= input.goal) {
    return { ...base, alreadyThere: true, monthlyDeposit: 0, months: 0, finalBalance: input.currentSavings, totalDeposits: 0, interest: 0, noDepositNeeded: true, years: [] };
  }

  if (input.mode === 'deposit') {
    const n = goalMonths(input.years);
    const growth = i === 0 ? 1 : Math.exp(n * Math.log1p(i));
    const shortfall = input.goal - input.currentSavings * growth;
    const noDepositNeeded = shortfall <= 0;
    const deposit = noDepositNeeded ? 0 : i === 0 ? shortfall / n : (shortfall * i) / Math.expm1(n * Math.log1p(i));
    // With no deposit needed, show when current savings alone reach the goal.
    const months = noDepositNeeded ? monthsToGoal(input.goal, input.currentSavings, 0, i) : n;
    const s = schedule(input.currentSavings, deposit, i, months);
    return { ...base, alreadyThere: false, monthlyDeposit: deposit, months, finalBalance: s.balance, totalDeposits: deposit * months, interest: s.interest, noDepositNeeded, years: s.years };
  }

  const months = monthsToGoal(input.goal, input.currentSavings, input.monthlyDeposit, i);
  if (!Number.isFinite(months) || months > MAX_PAYOFF_MONTHS) {
    throw new RangeError('monthlyDeposit: The goal is never reached at this deposit.');
  }
  const s = schedule(input.currentSavings, input.monthlyDeposit, i, months);
  return {
    ...base,
    alreadyThere: false,
    monthlyDeposit: input.monthlyDeposit,
    months,
    finalBalance: s.balance,
    totalDeposits: input.monthlyDeposit * months,
    interest: s.interest,
    noDepositNeeded: input.monthlyDeposit === 0,
    years: s.years,
  };
}

/** True when time mode can never reach the goal (or not within 100 years). */
export function goalUnreachable(input: SavingsGoalInput): boolean {
  if (input.mode !== 'time' || input.currentSavings >= input.goal) return false;
  const m = monthsToGoal(input.goal, input.currentSavings, input.monthlyDeposit, monthlyRateFor(input.ratePercent));
  return !Number.isFinite(m) || m > MAX_PAYOFF_MONTHS;
}
