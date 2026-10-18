/**
 * UK student loan repayment projection: 9% (6% Postgraduate) of income over the plan threshold, interest
 * added monthly at the plan rate (Plan 2 varies with income), until the loan is repaid or written off.
 * Today's thresholds and rates are held constant; salary grows each year. Pure: figures are passed in.
 */
import type { UkStudentLoanPlanCode } from '../countries/types';
import { checkMoney, checkPercent, checkRange, type FieldError } from './validation';

export interface StudentLoanParams {
  thresholds: Record<UkStudentLoanPlanCode, { threshold: number; rate: number }>;
  interest: Record<Exclude<UkStudentLoanPlanCode, 'plan2'>, number>;
  plan2: { minRate: number; maxRate: number; lowerIncome: number; upperIncome: number };
  writeOffYears: Record<UkStudentLoanPlanCode, number>;
}

export interface StudentLoanInput {
  plan: UkStudentLoanPlanCode;
  balance: number;
  salary: number;
  salaryGrowthPercent: number;
  /** Full years since the April you were first due to repay. */
  yearsRepaid: number;
}

export interface StudentLoanYear {
  year: number;
  salary: number;
  repaid: number;
  interest: number;
  balance: number;
}

export interface StudentLoanResult {
  monthlyRepayment: number;
  interestRate: number;
  paidOff: boolean;
  /** Years until the loan is repaid, or until it's written off. */
  years: number;
  totalRepaid: number;
  totalInterest: number;
  writtenOff: number;
  rows: StudentLoanYear[];
}

/** Yearly interest rate for a plan at an income. */
export function studentLoanRate(plan: UkStudentLoanPlanCode, income: number, p: StudentLoanParams): number {
  if (plan !== 'plan2') return p.interest[plan];
  const { minRate, maxRate, lowerIncome, upperIncome } = p.plan2;
  if (income <= lowerIncome) return minRate;
  if (income >= upperIncome) return maxRate;
  return minRate + ((maxRate - minRate) * (income - lowerIncome)) / (upperIncome - lowerIncome);
}

export function validateStudentLoanInput(input: StudentLoanInput, p: StudentLoanParams): FieldError[] {
  const errors: FieldError[] = [];
  checkRange(errors, 'balance', input.balance, {
    min: 1,
    max: 1_000_000,
    empty: 'Enter your loan balance.',
    range: 'Enter a balance between 1 and 1,000,000.',
  });
  checkMoney(errors, 'salary', input.salary, 10_000_000);
  checkPercent(errors, 'salaryGrowthPercent', input.salaryGrowthPercent, 20);
  const writeOff = p.writeOffYears[input.plan];
  checkRange(errors, 'yearsRepaid', input.yearsRepaid, {
    min: 0,
    max: writeOff - 1,
    integer: true,
    empty: 'Enter how many years you have been repaying, or 0.',
    range: `This plan is written off after ${writeOff} years. Enter 0 to ${writeOff - 1}.`,
  });
  return errors;
}

export function calculateStudentLoan(input: StudentLoanInput, p: StudentLoanParams): StudentLoanResult {
  const errors = validateStudentLoanInput(input, p);
  if (errors.length > 0) throw new RangeError(errors.map((e) => e.message).join(' '));

  const plan = p.thresholds[input.plan];
  const g = input.salaryGrowthPercent / 100;
  const yearsLeft = p.writeOffYears[input.plan] - input.yearsRepaid;
  let balance = input.balance;
  let salary = input.salary;
  let totalRepaid = 0;
  let totalInterest = 0;
  const rows: StudentLoanYear[] = [];

  for (let year = 1; year <= yearsLeft && balance > 1e-9; year++) {
    const rate = studentLoanRate(input.plan, salary, p);
    const monthly = (plan.rate * Math.max(0, salary - plan.threshold)) / 12;
    let repaid = 0;
    let interest = 0;
    for (let m = 0; m < 12 && balance > 1e-9; m++) {
      const i = (balance * rate) / 12;
      const pay = Math.min(monthly, balance + i);
      balance = balance + i - pay;
      interest += i;
      repaid += pay;
    }
    if (balance < 1e-7) balance = 0;
    totalRepaid += repaid;
    totalInterest += interest;
    rows.push({ year, salary, repaid, interest, balance });
    salary *= 1 + g;
  }

  const paidOff = balance === 0;
  return {
    monthlyRepayment: (plan.rate * Math.max(0, input.salary - plan.threshold)) / 12,
    interestRate: studentLoanRate(input.plan, input.salary, p),
    paidOff,
    years: rows.length,
    totalRepaid,
    totalInterest,
    writtenOff: paidOff ? 0 : balance,
    rows,
  };
}
