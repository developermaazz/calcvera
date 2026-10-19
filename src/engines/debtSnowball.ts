/**
 * Debt snowball (US, UK): pay every debt's minimum, put the extra on one target debt, and when a debt is
 * cleared roll its payment into the next target. The monthly budget stays the same until everything is
 * paid off. Order: snowball = smallest starting balance first; avalanche = highest APR first.
 * Each month: interest = balance × APR ÷ 12 is added, then minimums are paid, then the rest of the budget
 * goes to targets in order. Minimum payments are fixed amounts (they don't shrink as balances fall).
 * Pure: no formatting, no country lookups.
 */
import { MAX_PAYOFF_MONTHS } from './debtPayoff';
import { checkMoney, checkPercent, checkRange, type FieldError } from './validation';

export const MAX_SNOWBALL_DEBTS = 10;
const MAX_BALANCE = 10_000_000;

export type PayoffMethod = 'snowball' | 'avalanche';

export interface SnowballDebt {
  /** Optional label shown in the payoff order; "Debt 1", "Debt 2", … when empty. */
  name?: string;
  balance: number;
  aprPercent: number;
  minimumPayment: number;
}

export interface SnowballInput {
  /** Rows with a zero balance are ignored. */
  debts: SnowballDebt[];
  extraMonthly: number;
  method: PayoffMethod;
}

export interface PlanDebt {
  /** Position in the input list (rows can be skipped). */
  index: number;
  name: string;
  balance: number;
  aprPercent: number;
  /** Month (1 = first payment) when the balance reaches zero; null if it never does. */
  paidOffMonth: number | null;
  interest: number;
}

export interface PlanMonth {
  month: number;
  payment: number;
  interest: number;
  /** Total balance left after this month's payments. */
  balance: number;
  /** Indices of debts cleared this month. */
  cleared: number[];
}

export interface PlanResult {
  /** Every debt is paid off within the 100-year cap. */
  feasible: boolean;
  /** Months until the last debt is paid off (the cap when not feasible). */
  months: number;
  totalInterest: number;
  totalPaid: number;
  /** Debts in the order they were targeted (minimum-only plans keep input order). */
  debts: PlanDebt[];
  schedule: PlanMonth[];
}

export interface SnowballResult {
  monthlyBudget: number;
  /** The chosen method. */
  plan: PlanResult;
  snowball: PlanResult;
  avalanche: PlanResult;
  /** Minimum payments only: no extra, and cleared debts' payments are not reused. */
  minimumOnly: PlanResult;
  /** Interest saved by the chosen plan against minimum payments only (null if minimums never finish). */
  interestSaved: number | null;
  monthsSaved: number | null;
}

/** Field names for debt rows: name-0, balance-0, aprPercent-0, minimumPayment-0, … */
export const snowballField = (name: keyof SnowballDebt, index: number) => `${name}-${index}`;

export const debtLabel = (debt: SnowballDebt, index: number) => debt.name?.trim().slice(0, 40) || `Debt ${index + 1}`;

export function activeSnowballDebts(debts: SnowballDebt[]): { debt: SnowballDebt; index: number }[] {
  return debts
    .slice(0, MAX_SNOWBALL_DEBTS)
    .map((debt, index) => ({ debt, index }))
    .filter(({ debt }) => debt.balance > 0);
}

export function validateSnowballInput(input: SnowballInput): FieldError[] {
  const errors: FieldError[] = [];
  input.debts.slice(0, MAX_SNOWBALL_DEBTS).forEach((debt, i) => {
    if (debt.balance === 0) return; // empty row
    checkRange(errors, snowballField('balance', i), debt.balance, {
      min: 0,
      max: MAX_BALANCE,
      empty: 'Enter a balance, or leave the row empty.',
      range: 'Enter a balance between 0 and 10,000,000.',
    });
    checkPercent(errors, snowballField('aprPercent', i), debt.aprPercent);
    checkRange(errors, snowballField('minimumPayment', i), debt.minimumPayment, {
      min: 1,
      max: MAX_BALANCE,
      empty: 'Enter the minimum monthly payment.',
      range: 'Enter a minimum payment of at least 1.',
    });
  });
  if (activeSnowballDebts(input.debts).length === 0 && !errors.some((e) => e.field.startsWith('balance-'))) {
    errors.push({ field: snowballField('balance', 0), message: 'Enter at least one debt balance.' });
  }
  checkMoney(errors, 'extraMonthly', input.extraMonthly, MAX_BALANCE);
  if (input.method !== 'snowball' && input.method !== 'avalanche') {
    errors.push({ field: 'method', message: 'Choose a payoff order.' });
  }
  return errors;
}

/** Target order: indices into `debts` (snowball: smallest balance first; avalanche: highest APR first). */
export function payoffOrder(debts: SnowballDebt[], method: PayoffMethod): number[] {
  return debts
    .map((_, i) => i)
    .sort((a, b) => {
      const x = debts[a]!;
      const y = debts[b]!;
      const primary = method === 'snowball' ? x.balance - y.balance : y.aprPercent - x.aprPercent;
      if (primary !== 0) return primary;
      const secondary = method === 'snowball' ? y.aprPercent - x.aprPercent : x.balance - y.balance;
      return secondary !== 0 ? secondary : a - b;
    });
}

/**
 * Month-by-month payoff. With `order`, the whole budget is used every month (extra plus any freed-up
 * minimums go to the first unpaid debt in `order`). Without it, each debt just gets its minimum.
 */
export function simulatePlan(entries: { debt: SnowballDebt; index: number }[], budget: number, order: number[] | null): PlanResult {
  const n = entries.length;
  const balances = entries.map((e) => e.debt.balance);
  const rates = entries.map((e) => e.debt.aprPercent / 100 / 12);
  const interestByDebt = new Array<number>(n).fill(0);
  const paidOff = new Array<number | null>(n).fill(null);
  const schedule: PlanMonth[] = [];
  let totalInterest = 0;
  let totalPaid = 0;
  let month = 0;
  const remaining = () => balances.reduce((s, b) => s + b, 0);

  while (remaining() > 1e-9 && month < MAX_PAYOFF_MONTHS) {
    month += 1;
    let monthInterest = 0;
    let monthPaid = 0;
    for (let k = 0; k < n; k++) {
      if (balances[k]! <= 0) continue;
      const interest = balances[k]! * rates[k]!;
      balances[k]! += interest;
      interestByDebt[k]! += interest;
      monthInterest += interest;
    }
    let pool = order ? budget : 0;
    for (let k = 0; k < n; k++) {
      if (balances[k]! <= 0) continue;
      const pay = Math.min(entries[k]!.debt.minimumPayment, balances[k]!);
      balances[k]! -= pay;
      monthPaid += pay;
      pool -= pay;
    }
    if (order) {
      for (const k of order) {
        if (pool <= 1e-12) break;
        if (balances[k]! <= 0) continue;
        const pay = Math.min(pool, balances[k]!);
        balances[k]! -= pay;
        monthPaid += pay;
        pool -= pay;
      }
    }
    const cleared: number[] = [];
    for (let k = 0; k < n; k++) {
      if (paidOff[k] === null && balances[k]! <= 1e-9) {
        balances[k] = 0;
        paidOff[k] = month;
        cleared.push(entries[k]!.index);
      }
    }
    totalInterest += monthInterest;
    totalPaid += monthPaid;
    schedule.push({ month, payment: monthPaid, interest: monthInterest, balance: remaining(), cleared });
  }

  const listOrder = order ?? entries.map((_, k) => k);
  return {
    feasible: paidOff.every((m) => m !== null),
    months: month,
    totalInterest,
    totalPaid,
    debts: listOrder.map((k) => ({
      index: entries[k]!.index,
      name: debtLabel(entries[k]!.debt, entries[k]!.index),
      balance: entries[k]!.debt.balance,
      aprPercent: entries[k]!.debt.aprPercent,
      paidOffMonth: paidOff[k]!,
      interest: interestByDebt[k]!,
    })),
    schedule,
  };
}

export function calculateDebtSnowball(input: SnowballInput): SnowballResult {
  const errors = validateSnowballInput(input);
  if (errors.length > 0) throw new RangeError(errors.map((e) => `${e.field}: ${e.message}`).join(' '));

  const entries = activeSnowballDebts(input.debts);
  const debts = entries.map((e) => e.debt);
  const monthlyBudget = debts.reduce((s, d) => s + d.minimumPayment, 0) + input.extraMonthly;
  const snowball = simulatePlan(entries, monthlyBudget, payoffOrder(debts, 'snowball'));
  const avalanche = simulatePlan(entries, monthlyBudget, payoffOrder(debts, 'avalanche'));
  const minimumOnly = simulatePlan(entries, monthlyBudget, null);
  const plan = input.method === 'snowball' ? snowball : avalanche;
  const comparable = plan.feasible && minimumOnly.feasible;

  return {
    monthlyBudget,
    plan,
    snowball,
    avalanche,
    minimumOnly,
    interestSaved: comparable ? minimumOnly.totalInterest - plan.totalInterest : null,
    monthsSaved: comparable ? minimumOnly.months - plan.months : null,
  };
}
