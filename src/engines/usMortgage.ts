/**
 * US mortgage payment. Principal and interest come from the loan engine (monthly rate = rate ÷ 12, the last payment
 * adjusted so the balance ends at exactly 0); property tax, homeowners insurance, PMI and HOA dues go on top.
 *
 * PMI on a conventional loan follows the Homeowners Protection Act as the CFPB describes it, with the home price
 * as the original value:
 *   - charged when the loan is more than pmiAboveLtv of the price, at pmiPercent of the loan amount a year;
 *   - included in each payment until the balance is scheduled to reach pmiAutoEndLtv (on the original schedule, so
 *     extra payments don't move it), and never after the payment at the midpoint of the term;
 *   - you can ask to cancel it once the balance actually reaches pmiRequestLtv, which extra payments bring forward.
 * Pure: no formatting; country figures are passed in.
 */
import type { UsMortgageConfig } from '../countries/types';
import { calculateLoan, type LoanScheduleRow } from './loan';
import { checkMoney, checkPercent, checkRange, type FieldError } from './validation';

export interface UsMortgageInput {
  homePrice: number;
  downPayment: number;
  ratePercent: number;
  termYears: number;
  /** Yearly property tax as a % of the home price. */
  propertyTaxPercent: number;
  insurancePerYear: number;
  /** Yearly PMI as a % of the loan amount; charged only when the loan is over pmiAboveLtv of the price. */
  pmiPercent: number;
  hoaPerMonth: number;
  /** Extra principal paid every month. */
  extraMonthly: number;
}

export interface UsMortgageResult {
  loanAmount: number;
  /** Down payment as a % of the price. */
  downPercent: number;
  /** Scheduled monthly principal and interest. */
  principalAndInterest: number;
  propertyTax: number;
  insurance: number;
  /** Monthly PMI while it's charged; 0 when it isn't. */
  pmi: number;
  hoa: number;
  /** First payment: principal and interest, tax, insurance, PMI and HOA dues (not extra payments). */
  monthlyPayment: number;
  /** The same payment once PMI ends. */
  paymentAfterPmi: number;
  /** Number of payments that include PMI. */
  pmiMonths: number;
  totalPmi: number;
  /** Payment that brings the balance to pmiRequestLtv, if that's before PMI ends anyway; otherwise 0. */
  pmiRequestMonth: number;
  payoffMonths: number;
  totalInterest: number;
  /** Interest and payments saved by the extra payment (0 without one). */
  interestSaved: number;
  monthsSaved: number;
  schedule: LoanScheduleRow[];
}

export function validateUsMortgageInput(input: UsMortgageInput): FieldError[] {
  const errors: FieldError[] = [];
  checkRange(errors, 'homePrice', input.homePrice, {
    min: 10_000,
    max: 100_000_000,
    empty: 'Enter the home price.',
    range: 'Enter a price between 10,000 and 100,000,000.',
  });
  checkMoney(errors, 'downPayment', input.downPayment);
  if (errors.length === 0 && input.homePrice - input.downPayment < 1_000) {
    errors.push({ field: 'downPayment', message: 'The down payment must leave at least 1,000 to borrow.' });
  }
  checkPercent(errors, 'ratePercent', input.ratePercent, 25);
  checkRange(errors, 'termYears', input.termYears, { min: 1, max: 40, integer: true, empty: 'Enter the loan term.', range: 'Enter a term between 1 and 40 years.' });
  checkPercent(errors, 'propertyTaxPercent', input.propertyTaxPercent, 10);
  checkMoney(errors, 'insurancePerYear', input.insurancePerYear, 10_000_000);
  checkPercent(errors, 'pmiPercent', input.pmiPercent, 5);
  checkMoney(errors, 'hoaPerMonth', input.hoaPerMonth, 1_000_000);
  checkMoney(errors, 'extraMonthly', input.extraMonthly, 100_000_000);
  return errors;
}

export function calculateUsMortgage(input: UsMortgageInput, c: UsMortgageConfig): UsMortgageResult {
  const errors = validateUsMortgageInput(input);
  if (errors.length > 0) throw new RangeError(errors.map((e) => `${e.field}: ${e.message}`).join(' '));

  const loanAmount = input.homePrice - input.downPayment;
  const termMonths = input.termYears * 12;
  const loan = calculateLoan({ principal: loanAmount, aprPercent: input.ratePercent, termMonths, extraMonthly: input.extraMonthly });

  const pmiRequired = input.pmiPercent > 0 && loanAmount > c.pmiAboveLtv * input.homePrice;
  const pmi = pmiRequired ? (loanAmount * input.pmiPercent) / 100 / 12 : 0;
  let pmiMonths = 0;
  let pmiRequestMonth = 0;
  if (pmiRequired) {
    // The automatic end uses the original schedule, without extra payments.
    const original = input.extraMonthly > 0 ? calculateLoan({ principal: loanAmount, aprPercent: input.ratePercent, termMonths }).schedule : loan.schedule;
    const autoEnd = original.findIndex((row) => row.balance <= c.pmiAutoEndLtv * input.homePrice) + 1;
    pmiMonths = Math.min(autoEnd, termMonths / 2, loan.payoffMonths);
    const request = loan.schedule.findIndex((row) => row.balance <= c.pmiRequestLtv * input.homePrice) + 1;
    if (request < pmiMonths) pmiRequestMonth = request;
  }

  const propertyTax = (input.homePrice * input.propertyTaxPercent) / 100 / 12;
  const insurance = input.insurancePerYear / 12;
  const paymentAfterPmi = loan.monthlyPayment + propertyTax + insurance + input.hoaPerMonth;

  return {
    loanAmount,
    downPercent: (input.downPayment / input.homePrice) * 100,
    principalAndInterest: loan.monthlyPayment,
    propertyTax,
    insurance,
    pmi,
    hoa: input.hoaPerMonth,
    monthlyPayment: paymentAfterPmi + pmi,
    paymentAfterPmi,
    pmiMonths,
    totalPmi: pmi * pmiMonths,
    pmiRequestMonth,
    payoffMonths: loan.payoffMonths,
    totalInterest: loan.totalInterest,
    interestSaved: loan.interestSaved,
    monthsSaved: loan.monthsSaved,
    schedule: loan.schedule,
  };
}
