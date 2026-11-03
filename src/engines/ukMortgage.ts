/**
 * UK mortgage repayments with an initial deal. Interest each month = balance × rate ÷ 12.
 *   Repayment: the payment repays the loan over the full term at the initial rate; when the deal ends, the lender
 *   recalculates it to repay the balance left over the rest of the term at the follow-on rate (usually the SVR).
 *   Interest-only: each payment is balance × rate ÷ 12, and the whole loan is still owed at the end of the term.
 * A product fee is either paid upfront or added to the loan (and charged interest). The loan engine builds each
 * phase, so the last payment ends at exactly 0. Pure: no formatting, no country lookups.
 */
import { calculateLoan, type LoanScheduleRow } from './loan';
import { checkMoney, checkPercent, checkRange, type FieldError } from './validation';

export type UkRepaymentType = 'repayment' | 'interestOnly';

export interface UkMortgageInput {
  price: number;
  deposit: number;
  termYears: number;
  repaymentType: UkRepaymentType;
  initialRatePercent: number;
  /** Years at the initial rate (a fixed or discount deal). Equal to the term for one rate throughout. */
  dealYears: number;
  /** Rate after the deal: usually the lender's standard variable rate. */
  followOnRatePercent: number;
  productFee: number;
  /** Add the product fee to the loan instead of paying it upfront. */
  addFeeToLoan: boolean;
}

export interface UkMortgageResult {
  /** Amount borrowed, including the fee when it's added. */
  loan: number;
  /** (price − deposit) ÷ price, as a %. */
  ltvPercent: number;
  initialPayment: number;
  /** Payment after the deal; equal to initialPayment when the deal lasts the whole term. */
  followOnPayment: number;
  dealMonths: number;
  /** True when a follow-on rate applies before the end of the term. */
  hasFollowOn: boolean;
  dealPaid: number;
  dealInterest: number;
  /** Balance left when the deal ends. */
  dealBalance: number;
  /** Payments during the deal plus the fee if it's paid upfront. */
  dealCost: number;
  totalInterest: number;
  /** Still owed at the end of the term: the whole loan on interest-only, 0 on repayment. */
  balanceAtEnd: number;
  schedule: LoanScheduleRow[];
}

const TYPES: UkRepaymentType[] = ['repayment', 'interestOnly'];

export function validateUkMortgageInput(input: UkMortgageInput): FieldError[] {
  const errors: FieldError[] = [];
  checkRange(errors, 'price', input.price, {
    min: 10_000,
    max: 100_000_000,
    empty: 'Enter the property price.',
    range: 'Enter a price between 10,000 and 100,000,000.',
  });
  checkMoney(errors, 'deposit', input.deposit);
  if (errors.length === 0 && input.price - input.deposit < 1_000) {
    errors.push({ field: 'deposit', message: 'The deposit must leave at least 1,000 to borrow.' });
  }
  checkRange(errors, 'termYears', input.termYears, { min: 1, max: 40, integer: true, empty: 'Enter the mortgage term.', range: 'Enter a term between 1 and 40 years.' });
  if (!TYPES.includes(input.repaymentType)) errors.push({ field: 'repaymentType', message: 'Choose repayment or interest-only.' });
  checkPercent(errors, 'initialRatePercent', input.initialRatePercent, 25);
  checkRange(errors, 'dealYears', input.dealYears, { min: 1, max: 40, integer: true, empty: 'Enter how long the initial rate lasts.', range: 'Enter between 1 and 40 years.' });
  if (Number.isInteger(input.termYears) && Number.isInteger(input.dealYears) && input.dealYears > input.termYears && input.termYears >= 1) {
    errors.push({ field: 'dealYears', message: 'The initial rate period can’t be longer than the mortgage term.' });
  }
  checkPercent(errors, 'followOnRatePercent', input.followOnRatePercent, 25);
  checkMoney(errors, 'productFee', input.productFee, 100_000);
  return errors;
}

function interestOnlyRows(balance: number, ratePercent: number, from: number, months: number): LoanScheduleRow[] {
  const interest = (balance * ratePercent) / 100 / 12;
  return Array.from({ length: months }, (_, k) => ({ month: from + k, payment: interest, interest, principal: 0, extra: 0, balance }));
}

export function calculateUkMortgage(input: UkMortgageInput): UkMortgageResult {
  const errors = validateUkMortgageInput(input);
  if (errors.length > 0) throw new RangeError(errors.map((e) => `${e.field}: ${e.message}`).join(' '));

  const borrowed = input.price - input.deposit;
  const loan = borrowed + (input.addFeeToLoan ? input.productFee : 0);
  const termMonths = input.termYears * 12;
  const dealMonths = input.dealYears * 12;
  const hasFollowOn = dealMonths < termMonths;

  let schedule: LoanScheduleRow[];
  if (input.repaymentType === 'interestOnly') {
    schedule = [
      ...interestOnlyRows(loan, input.initialRatePercent, 1, dealMonths),
      ...(hasFollowOn ? interestOnlyRows(loan, input.followOnRatePercent, dealMonths + 1, termMonths - dealMonths) : []),
    ];
  } else {
    const deal = calculateLoan({ principal: loan, aprPercent: input.initialRatePercent, termMonths }).schedule.slice(0, dealMonths);
    schedule = deal;
    if (hasFollowOn) {
      const rest = calculateLoan({ principal: deal[deal.length - 1]!.balance, aprPercent: input.followOnRatePercent, termMonths: termMonths - dealMonths });
      schedule = [...deal, ...rest.schedule.map((row) => ({ ...row, month: row.month + dealMonths }))];
    }
  }

  const dealRows = schedule.slice(0, dealMonths);
  const dealPaid = dealRows.reduce((sum, row) => sum + row.payment, 0);
  const dealInterest = dealRows.reduce((sum, row) => sum + row.interest, 0);
  return {
    loan,
    ltvPercent: (borrowed / input.price) * 100,
    initialPayment: schedule[0]!.payment,
    followOnPayment: hasFollowOn ? schedule[dealMonths]!.payment : schedule[0]!.payment,
    dealMonths,
    hasFollowOn,
    dealPaid,
    dealInterest,
    dealBalance: dealRows[dealRows.length - 1]!.balance,
    dealCost: dealPaid + (input.addFeeToLoan ? 0 : input.productFee),
    totalInterest: schedule.reduce((sum, row) => sum + row.interest, 0),
    balanceAtEnd: schedule[schedule.length - 1]!.balance,
    schedule,
  };
}
