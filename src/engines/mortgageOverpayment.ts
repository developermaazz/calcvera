/**
 * Mortgage overpayment (UK): the effect of a regular monthly overpayment and/or a one-off lump sum on a
 * repayment mortgage. Interest each month = balance × rate ÷ 12. Overpayments come straight off the balance
 * after the normal payment.
 *   Pay off sooner: the monthly payment stays the same, so the mortgage ends early.
 *   Lower payments: the lender recalculates the payment each month over the remaining original term.
 * Also checks overpayments in each year against the lender's allowance (a % of the balance at the start of
 * that year) before early repayment charges. Pure: no formatting, no country lookups.
 */
import { monthlyPayment } from './loan';
import { checkMoney, checkPercent, checkRange, type FieldError } from './validation';

export type OverpaymentMode = 'shorterTerm' | 'lowerPayment';

export interface MortgageOverpaymentInput {
  balance: number;
  ratePercent: number;
  /** Remaining term in years (decimals allowed; rounded to whole months). */
  years: number;
  monthlyOverpayment: number;
  lumpSum: number;
  /** Month the lump sum is paid: 1 = with the first payment. */
  lumpSumMonth: number;
  mode: OverpaymentMode;
  /** Yearly overpayment allowance as a % of the balance at the start of each year. */
  allowancePercent: number;
}

export interface OverpaymentYear {
  year: number;
  paid: number;
  overpaid: number;
  interest: number;
  balance: number;
  /** Balance at the same point with no overpayments. */
  balanceWithout: number;
  /** Overpaid more than the allowance this year. */
  overAllowance: boolean;
}

export interface MortgageOverpaymentResult {
  months: number;
  /** Months with no overpayments. */
  monthsWithout: number;
  monthlyPayment: number;
  totalInterest: number;
  totalInterestWithout: number;
  interestSaved: number;
  monthsSaved: number;
  /** Lower-payments mode: the payment after the first year (or after the lump sum, if later). */
  paymentAfter: number;
  /** Years where overpayments went over the allowance. */
  yearsOverAllowance: number[];
  /** Balance at the end of each year of the original term with no overpayments. */
  balanceWithoutByYear: number[];
  years: OverpaymentYear[];
}

export function validateMortgageOverpaymentInput(input: MortgageOverpaymentInput): FieldError[] {
  const errors: FieldError[] = [];
  checkRange(errors, 'balance', input.balance, {
    min: 1,
    max: 100_000_000,
    empty: 'Enter how much you still owe.',
    range: 'Enter a balance between 1 and 100,000,000.',
  });
  checkPercent(errors, 'ratePercent', input.ratePercent, 25);
  checkRange(errors, 'years', input.years, {
    min: 1 / 12,
    max: 40,
    empty: 'Enter the years left on your mortgage.',
    range: 'Enter between 1 month and 40 years.',
  });
  checkMoney(errors, 'monthlyOverpayment', input.monthlyOverpayment, 10_000_000);
  checkMoney(errors, 'lumpSum', input.lumpSum, 100_000_000);
  if (input.lumpSum > 0) {
    checkRange(errors, 'lumpSumMonth', input.lumpSumMonth, {
      min: 1,
      max: 480,
      integer: true,
      empty: 'Enter when you’ll pay the lump sum.',
      range: 'Enter a month between 1 and 480.',
    });
  }
  checkPercent(errors, 'allowancePercent', input.allowancePercent);
  if (input.mode !== 'shorterTerm' && input.mode !== 'lowerPayment') errors.push({ field: 'mode', message: 'Choose what overpayments should do.' });
  return errors;
}

export function calculateMortgageOverpayment(input: MortgageOverpaymentInput): MortgageOverpaymentResult {
  const errors = validateMortgageOverpaymentInput(input);
  if (errors.length > 0) throw new RangeError(errors.map((e) => `${e.field}: ${e.message}`).join(' '));

  const n = Math.max(1, Math.round(input.years * 12));
  const r = input.ratePercent / 100 / 12;
  const payment = monthlyPayment(input.balance, input.ratePercent, n);

  // Without overpayments.
  let base = input.balance;
  let interestWithout = 0;
  const baseByMonth: number[] = [];
  for (let m = 1; m <= n; m++) {
    const interest = base * r;
    const pay = m === n ? base + interest : Math.min(payment, base + interest);
    base = Math.max(0, base + interest - pay);
    interestWithout += interest;
    baseByMonth.push(m === n ? 0 : base);
  }

  let balance = input.balance;
  let totalInterest = 0;
  let month = 0;
  let paymentAfter = payment;
  const settleMonth = Math.max(12, input.lumpSum > 0 ? input.lumpSumMonth : 0);
  const years: OverpaymentYear[] = [];
  let yearRow: OverpaymentYear | null = null;
  let allowanceLeft = 0;

  while (balance > 1e-9 && month < n) {
    month++;
    if ((month - 1) % 12 === 0) {
      yearRow = { year: (month - 1) / 12 + 1, paid: 0, overpaid: 0, interest: 0, balance: 0, balanceWithout: 0, overAllowance: false };
      years.push(yearRow);
      allowanceLeft = (balance * input.allowancePercent) / 100;
    }
    const row = yearRow!;
    const interest = balance * r;
    const scheduled = input.mode === 'lowerPayment' ? monthlyPayment(balance, input.ratePercent, n - month + 1) : payment;
    const pay = month === n ? balance + interest : Math.min(scheduled, balance + interest);
    balance = Math.max(0, balance + interest - pay);
    const wanted = input.monthlyOverpayment + (input.lumpSum > 0 && month === input.lumpSumMonth ? input.lumpSum : 0);
    const extra = Math.min(wanted, balance);
    balance -= extra;
    if (balance < 1e-9) balance = 0;
    totalInterest += interest;
    row.paid += pay + extra;
    row.overpaid += extra;
    row.interest += interest;
    row.balance = balance;
    row.balanceWithout = baseByMonth[month - 1] ?? 0;
    allowanceLeft -= extra;
    if (allowanceLeft < -1e-6) row.overAllowance = true;
    if (month === settleMonth) paymentAfter = input.mode === 'lowerPayment' && balance > 0 ? monthlyPayment(balance, input.ratePercent, n - month) : payment;
  }
  // If it ended before the "after" month, the payment after is 0.
  if (month < settleMonth && input.mode === 'lowerPayment') paymentAfter = 0;

  return {
    months: month,
    monthsWithout: n,
    monthlyPayment: payment,
    totalInterest,
    totalInterestWithout: interestWithout,
    interestSaved: interestWithout - totalInterest,
    monthsSaved: n - month,
    paymentAfter,
    yearsOverAllowance: years.filter((y) => y.overAllowance).map((y) => y.year),
    balanceWithoutByYear: Array.from({ length: Math.ceil(n / 12) }, (_, k) => baseByMonth[Math.min(n, (k + 1) * 12) - 1] ?? 0),
    years,
  };
}
