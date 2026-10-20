/**
 * HELP (study and training loan) payoff projection, Australia.
 * Each income year: compulsory repayment from repayment income (helpRepayment, the marginal system). On 1 June,
 * indexation is applied to the balance less any voluntary repayments made in the year; the compulsory repayment
 * is credited after the year ends, when the tax return is assessed. Income grows each year. As an assumption,
 * the repayment thresholds rise each year by the indexation rate (the real change is set each year).
 * Pure: figures are passed in.
 */
import type { AuHelpConfig } from '../countries/types';
import { helpRepayment } from './auTakeHome';
import { checkMoney, checkPercent, checkRange, type FieldError } from './validation';

/** Projection stops after this many years if the debt isn't repaid. */
export const MAX_YEARS = 60;

export interface HelpDebtInput {
  balance: number;
  /** Repayment income this year. */
  income: number;
  incomeGrowthPercent: number;
  indexationPercent: number;
  /** Voluntary repayments each year. */
  voluntaryPerYear: number;
}

export interface HelpDebtYear {
  year: number;
  income: number;
  compulsory: number;
  voluntary: number;
  indexation: number;
  balance: number;
}

export interface HelpDebtResult {
  /** Compulsory repayment for this year's income. */
  firstYearRepayment: number;
  /** Repayment rate on this year's whole income, × 100. */
  firstYearRate: number;
  /** Years until the balance reaches 0, or null if not repaid within MAX_YEARS. */
  yearsToRepay: number | null;
  totalCompulsory: number;
  totalVoluntary: number;
  totalIndexation: number;
  /** Payoff with no voluntary repayments (null if never). */
  yearsWithoutVoluntary: number | null;
  rows: HelpDebtYear[];
}

export function validateHelpDebtInput(input: HelpDebtInput): FieldError[] {
  const errors: FieldError[] = [];
  checkRange(errors, 'balance', input.balance, {
    min: 1,
    max: 10_000_000,
    empty: 'Enter your HELP balance.',
    range: 'Enter a balance between 1 and 10,000,000.',
  });
  checkMoney(errors, 'income', input.income, 10_000_000);
  checkPercent(errors, 'incomeGrowthPercent', input.incomeGrowthPercent, 15);
  checkPercent(errors, 'indexationPercent', input.indexationPercent, 15);
  checkMoney(errors, 'voluntaryPerYear', input.voluntaryPerYear, 10_000_000);
  return errors;
}

function project(input: HelpDebtInput, h: AuHelpConfig, voluntary: number) {
  let balance = input.balance;
  const rows: HelpDebtYear[] = [];
  let totalCompulsory = 0;
  let totalVoluntary = 0;
  let totalIndexation = 0;
  for (let y = 1; y <= MAX_YEARS && balance > 1e-9; y++) {
    const income = input.income * Math.pow(1 + input.incomeGrowthPercent / 100, y - 1);
    const vol = Math.min(voluntary, balance);
    balance -= vol;
    const indexation = balance * (input.indexationPercent / 100);
    balance += indexation;
    // Thresholds scaled by (1 + indexation)^(years from now): same as repaying on income in today's terms.
    const scale = Math.pow(1 + input.indexationPercent / 100, y - 1);
    const compulsory = Math.min(helpRepayment(income / scale, h) * scale, balance);
    balance -= compulsory;
    if (balance < 1e-9) balance = 0;
    totalCompulsory += compulsory;
    totalVoluntary += vol;
    totalIndexation += indexation;
    rows.push({ year: y, income, compulsory, voluntary: vol, indexation, balance });
  }
  return { rows, totalCompulsory, totalVoluntary, totalIndexation, yearsToRepay: balance === 0 ? rows.length : null };
}

export function calculateHelpDebt(input: HelpDebtInput, h: AuHelpConfig): HelpDebtResult {
  const errors = validateHelpDebtInput(input);
  if (errors.length > 0) throw new RangeError(errors.map((e) => `${e.field}: ${e.message}`).join(' '));
  const r = project(input, h, input.voluntaryPerYear);
  const first = helpRepayment(input.income, h);
  return {
    firstYearRepayment: first,
    firstYearRate: input.income > 0 ? (first / input.income) * 100 : 0,
    yearsToRepay: r.yearsToRepay,
    totalCompulsory: r.totalCompulsory,
    totalVoluntary: r.totalVoluntary,
    totalIndexation: r.totalIndexation,
    yearsWithoutVoluntary: input.voluntaryPerYear > 0 ? project(input, h, 0).yearsToRepay : r.yearsToRepay,
    rows: r.rows,
  };
}
