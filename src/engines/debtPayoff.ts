/**
 * Paying off several debts at their current monthly payments, each on its own (no snowball).
 * Monthly rate = APR / 12. Pure: no formatting, no country lookups.
 */

export interface DebtInput {
  balance: number;
  aprPercent: number;
  monthlyPayment: number;
}

export interface DebtPayoffLine {
  months: number;
  interest: number;
  /** False if the payment never clears the balance. */
  feasible: boolean;
}

export interface DebtPayoffResult {
  /** All debts can be paid off at these payments. */
  feasible: boolean;
  /** Months until the last debt is paid off. */
  months: number;
  totalInterest: number;
  /** Interest across all debts in month 1, 2, 3, … (for break-even comparisons). */
  monthlyInterest: number[];
  perDebt: DebtPayoffLine[];
}

/** Safety cap: 100 years. */
export const MAX_PAYOFF_MONTHS = 1200;

export function simulatePayoff(debts: DebtInput[]): DebtPayoffResult {
  const monthlyInterest: number[] = [];
  const perDebt: DebtPayoffLine[] = [];

  for (const debt of debts) {
    const r = debt.aprPercent / 100 / 12;
    let balance = debt.balance;
    let interestTotal = 0;
    let month = 0;
    // A payment at or below the first month's interest never reduces the balance.
    const feasible = debt.balance <= 0 || debt.monthlyPayment > debt.balance * r;

    while (feasible && balance > 1e-9 && month < MAX_PAYOFF_MONTHS) {
      const interest = balance * r;
      const payment = Math.min(debt.monthlyPayment, balance + interest);
      balance = balance + interest - payment;
      interestTotal += interest;
      monthlyInterest[month] = (monthlyInterest[month] ?? 0) + interest;
      month += 1;
    }

    perDebt.push({ months: month, interest: interestTotal, feasible: feasible && balance <= 1e-9 });
  }

  return {
    feasible: perDebt.every((d) => d.feasible),
    months: Math.max(0, ...perDebt.map((d) => d.months)),
    totalInterest: perDebt.reduce((sum, d) => sum + d.interest, 0),
    monthlyInterest: Array.from(monthlyInterest, (v) => v ?? 0),
    perDebt,
  };
}
