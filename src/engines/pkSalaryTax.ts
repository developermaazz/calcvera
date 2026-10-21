/**
 * Pakistan income tax on salary (Division I, Part I, First Schedule, clause (2)): tax = base + rate × (taxable income − the
 * band's lower limit), using FBR's official base amounts, plus any salaried surcharge. Compares this tax year with the last.
 * Taxable salary is entered by the user (gross salary less exempt allowances). Pure: figures are passed in.
 */
import type { DutyBand, PkSalaryTaxYear } from '../countries/types';
import { checkRange, type FieldError } from './validation';

export interface PkSalaryInput {
  /** Taxable salary per month. */
  monthlySalary: number;
}

export interface PkYearTax {
  yearlyTax: number;
  monthlyTax: number;
  surcharge: number;
  /** Tax ÷ salary × 100. */
  averageRate: number;
  /** Rate on the next rupee, × 100. */
  marginalRate: number;
  monthlyTakeHome: number;
}

export interface PkSalaryResult {
  yearlySalary: number;
  current: PkYearTax;
  previous: PkYearTax;
  /** previous.yearlyTax − current.yearlyTax. */
  yearlySaving: number;
}

export function taxOnSchedule(income: number, bands: DutyBand[]): number {
  let band: DutyBand | undefined;
  for (const b of bands) if (income > b.from || b.from === 0) band = b;
  return band ? band.base + band.rate * (income - band.from) : 0;
}

export function validatePkSalaryInput(input: PkSalaryInput): FieldError[] {
  const errors: FieldError[] = [];
  checkRange(errors, 'monthlySalary', input.monthlySalary, {
    min: 0,
    max: 100_000_000,
    empty: 'Enter your monthly salary.',
    range: 'Enter a salary between 0 and 100,000,000.',
  });
  return errors;
}

function yearTax(yearly: number, y: PkSalaryTaxYear): PkYearTax {
  const tax = (income: number) => {
    const base = Math.max(0, taxOnSchedule(income, y.bands));
    const sur = y.surcharge && income > y.surcharge.over ? base * y.surcharge.rate : 0;
    return { base, sur };
  };
  const t = tax(yearly);
  const yearlyTax = t.base + t.sur;
  const next = tax(yearly + 1_000);
  return {
    yearlyTax,
    monthlyTax: yearlyTax / 12,
    surcharge: t.sur,
    averageRate: yearly > 0 ? (yearlyTax / yearly) * 100 : 0,
    marginalRate: ((next.base + next.sur - yearlyTax) / 1_000) * 100,
    monthlyTakeHome: (yearly - yearlyTax) / 12,
  };
}

export function calculatePkSalaryTax(input: PkSalaryInput, p: { current: PkSalaryTaxYear; previous: PkSalaryTaxYear }): PkSalaryResult {
  const errors = validatePkSalaryInput(input);
  if (errors.length > 0) throw new RangeError(errors.map((e) => `${e.field}: ${e.message}`).join(' '));
  const yearlySalary = input.monthlySalary * 12;
  const current = yearTax(yearlySalary, p.current);
  const previous = yearTax(yearlySalary, p.previous);
  return { yearlySalary, current, previous, yearlySaving: previous.yearlyTax - current.yearlyTax };
}
