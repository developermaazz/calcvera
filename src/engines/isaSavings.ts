/**
 * ISA savings (UK): how savings grow in an ISA, against the same savings in a taxable account.
 *   Growth: monthly rate i = (1 + AER)^(1/12) − 1, deposits at the end of each month.
 *   Taxable account: each tax year, interest over your Personal Savings Allowance (£1,000 basic rate, £500
 *   higher, £0 additional) is taxed at your usual Income Tax rate. The tax is taken from the balance at the
 *   end of the year, so it also stops earning interest. The starting rate for savings (up to £5,000 extra
 *   for people with low other income) is not included.
 *   ISA allowance: deposits in each year are checked against the yearly limit (money already in the ISA
 *   doesn't count).
 * Pure: allowances and rates are passed in.
 */
import { checkMoney, checkPercent, checkRange, type FieldError } from './validation';

export type TaxBand = 'basic' | 'higher' | 'additional';

export interface IsaParams {
  isaAllowance: number;
  personalSavingsAllowance: Record<TaxBand, number>;
  savingsTaxRate: Record<TaxBand, number>;
}

export interface IsaInput {
  /** Already in the ISA. */
  startingBalance: number;
  monthlyDeposit: number;
  /** AER for a cash ISA, or expected yearly growth for stocks and shares. */
  ratePercent: number;
  years: number;
  taxBand: TaxBand;
}

export interface IsaYear {
  year: number;
  deposits: number;
  interest: number;
  balance: number;
  /** Same savings outside an ISA, after tax. */
  taxableBalance: number;
  taxDue: number;
}

export interface IsaResult {
  finalBalance: number;
  totalDeposits: number;
  totalInterest: number;
  taxableFinalBalance: number;
  totalTax: number;
  /** ISA balance − taxable account balance. */
  isaAdvantage: number;
  yearlyDeposits: number;
  /** Yearly deposits over the ISA allowance (0 if within it). */
  overAllowance: number;
  years: IsaYear[];
}

export function validateIsaInput(input: IsaInput): FieldError[] {
  const errors: FieldError[] = [];
  checkMoney(errors, 'startingBalance', input.startingBalance);
  checkMoney(errors, 'monthlyDeposit', input.monthlyDeposit, 10_000_000);
  checkPercent(errors, 'ratePercent', input.ratePercent, 30);
  checkRange(errors, 'years', input.years, { min: 1, max: 60, integer: true, empty: 'Enter how many years.', range: 'Enter between 1 and 60 years.' });
  if (input.taxBand !== 'basic' && input.taxBand !== 'higher' && input.taxBand !== 'additional') errors.push({ field: 'taxBand', message: 'Choose your tax band.' });
  if (errors.length === 0 && input.startingBalance === 0 && input.monthlyDeposit === 0) {
    errors.push({ field: 'monthlyDeposit', message: 'Enter a monthly amount or a starting balance.' });
  }
  return errors;
}

export function calculateIsaSavings(input: IsaInput, p: IsaParams): IsaResult {
  const errors = validateIsaInput(input);
  if (errors.length > 0) throw new RangeError(errors.map((e) => `${e.field}: ${e.message}`).join(' '));

  const i = input.ratePercent === 0 ? 0 : Math.expm1(Math.log1p(input.ratePercent / 100) / 12);
  const allowance = p.personalSavingsAllowance[input.taxBand];
  const taxRate = p.savingsTaxRate[input.taxBand];
  let isa = input.startingBalance;
  let taxable = input.startingBalance;
  let totalInterest = 0;
  let totalTax = 0;
  const years: IsaYear[] = [];

  for (let y = 1; y <= input.years; y++) {
    let interest = 0;
    let taxableInterest = 0;
    for (let m = 0; m < 12; m++) {
      const earned = isa * i;
      isa += earned + input.monthlyDeposit;
      interest += earned;
      const earnedTaxable = taxable * i;
      taxable += earnedTaxable + input.monthlyDeposit;
      taxableInterest += earnedTaxable;
    }
    const taxDue = Math.max(0, taxableInterest - allowance) * taxRate;
    taxable -= taxDue;
    totalInterest += interest;
    totalTax += taxDue;
    years.push({ year: y, deposits: input.monthlyDeposit * 12, interest, balance: isa, taxableBalance: taxable, taxDue });
  }

  const yearlyDeposits = input.monthlyDeposit * 12;
  return {
    finalBalance: isa,
    totalDeposits: input.startingBalance + yearlyDeposits * input.years,
    totalInterest,
    taxableFinalBalance: taxable,
    totalTax,
    isaAdvantage: isa - taxable,
    yearlyDeposits,
    overAllowance: Math.max(0, yearlyDeposits - p.isaAllowance),
    years,
  };
}
