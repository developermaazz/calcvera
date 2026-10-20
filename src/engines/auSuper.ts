/**
 * Australian super projection to retirement.
 *   Each year: salary grows by salaryGrowthPercent. Super guarantee = guaranteeRate × salary (up to the maximum
 *     contribution base). Concessional contributions (super guarantee + salary sacrifice) are taxed at
 *     contributionsTaxRate going in; after-tax (non-concessional) contributions are not.
 *   Each month: a twelfth of the year's net contributions and fees, with growth at the monthly equivalent of the
 *     yearly return (taken as net of investment fees and earnings tax).
 *   Caps, the maximum contribution base and fees stay at today's values. Today's dollars use inflationPercent.
 * Pure: figures are passed in.
 */
import type { AuSuperConfig } from '../countries/types';
import { checkMoney, checkPercent, checkRange, type FieldError } from './validation';

export interface AuSuperInput {
  age: number;
  retirementAge: number;
  balance: number;
  salary: number;
  salaryGrowthPercent: number;
  /** Yearly salary sacrifice (concessional). */
  salarySacrifice: number;
  /** Yearly after-tax (non-concessional) contributions. */
  afterTaxContributions: number;
  returnPercent: number;
  /** Yearly dollar fees. */
  feesPerYear: number;
  inflationPercent: number;
}

export interface AuSuperYear {
  /** Age at the end of the year. */
  age: number;
  contributions: number;
  contributionsTax: number;
  earnings: number;
  fees: number;
  balance: number;
}

export interface AuSuperResult {
  years: number;
  finalBalance: number;
  /** Final balance in today's dollars. */
  todaysDollars: number;
  /** Contributions after contributions tax. */
  totalContributions: number;
  contributionsTax: number;
  totalEarnings: number;
  totalFees: number;
  /** First-year concessional contributions (super guarantee + salary sacrifice). */
  firstYearConcessional: number;
  overConcessionalCap: boolean;
  overNonConcessionalCap: boolean;
  /** Final balance with no salary sacrifice or after-tax contributions. */
  balanceWithoutExtras: number;
  rows: AuSuperYear[];
}

export function validateAuSuperInput(input: AuSuperInput): FieldError[] {
  const errors: FieldError[] = [];
  checkRange(errors, 'age', input.age, { min: 15, max: 74, integer: true, empty: 'Enter your age.', range: 'Enter an age between 15 and 74.' });
  checkRange(errors, 'retirementAge', input.retirementAge, {
    min: 16,
    max: 75,
    integer: true,
    empty: 'Enter the age you plan to retire.',
    range: 'Enter a retirement age between 16 and 75.',
  });
  if (errors.length === 0 && input.retirementAge <= input.age) errors.push({ field: 'retirementAge', message: 'Enter an age older than you are now.' });
  checkMoney(errors, 'balance', input.balance, 100_000_000);
  checkMoney(errors, 'salary', input.salary, 10_000_000);
  checkPercent(errors, 'salaryGrowthPercent', input.salaryGrowthPercent, 10);
  checkMoney(errors, 'salarySacrifice', input.salarySacrifice, 1_000_000);
  checkMoney(errors, 'afterTaxContributions', input.afterTaxContributions, 1_000_000);
  checkPercent(errors, 'returnPercent', input.returnPercent, 15);
  checkMoney(errors, 'feesPerYear', input.feesPerYear, 100_000);
  checkPercent(errors, 'inflationPercent', input.inflationPercent, 10);
  return errors;
}

function project(input: AuSuperInput, p: AuSuperConfig, withExtras: boolean): Omit<AuSuperResult, 'balanceWithoutExtras' | 'todaysDollars'> {
  const n = input.retirementAge - input.age;
  const i = Math.pow(1 + input.returnPercent / 100, 1 / 12) - 1;
  const sacrifice = withExtras ? input.salarySacrifice : 0;
  const afterTax = withExtras ? input.afterTaxContributions : 0;
  let balance = input.balance;
  let totalContributions = 0;
  let contributionsTax = 0;
  let totalEarnings = 0;
  let totalFees = 0;
  const rows: AuSuperYear[] = [];
  let firstYearConcessional = 0;

  for (let y = 0; y < n; y++) {
    const salary = input.salary * Math.pow(1 + input.salaryGrowthPercent / 100, y);
    const concessional = Math.min(salary, p.maxContributionBase) * p.guaranteeRate + sacrifice;
    if (y === 0) firstYearConcessional = concessional;
    const tax = concessional * p.contributionsTaxRate;
    const net = concessional - tax + afterTax;
    const row: AuSuperYear = { age: input.age + y + 1, contributions: net, contributionsTax: tax, earnings: 0, fees: 0, balance: 0 };
    for (let m = 0; m < 12; m++) {
      const earned = balance * i;
      const fee = Math.min(balance + earned + net / 12, input.feesPerYear / 12);
      balance = balance + earned + net / 12 - fee;
      row.earnings += earned;
      row.fees += fee;
    }
    row.balance = balance;
    totalContributions += net;
    contributionsTax += tax;
    totalEarnings += row.earnings;
    totalFees += row.fees;
    rows.push(row);
  }

  return {
    years: n,
    finalBalance: balance,
    totalContributions,
    contributionsTax,
    totalEarnings,
    totalFees,
    firstYearConcessional,
    overConcessionalCap: firstYearConcessional > p.concessionalCap + 1e-9,
    overNonConcessionalCap: afterTax > p.nonConcessionalCap + 1e-9,
    rows,
  };
}

export function calculateAuSuper(input: AuSuperInput, p: AuSuperConfig): AuSuperResult {
  const errors = validateAuSuperInput(input);
  if (errors.length > 0) throw new RangeError(errors.map((e) => `${e.field}: ${e.message}`).join(' '));
  const r = project(input, p, true);
  const base = input.salarySacrifice > 0 || input.afterTaxContributions > 0 ? project(input, p, false).finalBalance : r.finalBalance;
  return { ...r, todaysDollars: r.finalBalance / Math.pow(1 + input.inflationPercent / 100, r.years), balanceWithoutExtras: base };
}
