/**
 * HELOC payments (US): a home equity line of credit with a draw period and a repayment period.
 * The amount borrowed is drawn at the start. Interest each month = balance × APR ÷ 12.
 *   Draw period: interest only (the usual minimum), or principal and interest over the whole term.
 *     An optional extra payment comes off the balance each month.
 *   Repayment period: the balance left is repaid in equal monthly payments; the last one is adjusted to end at 0.
 * Also estimates the credit line from home value, mortgage balance and the lender's combined loan-to-value
 * limit, and the repayment payment if the rate rises. Pure: no formatting, no country lookups.
 */
import { monthlyPayment } from './loan';
import { checkMoney, checkPercent, checkRange, type FieldError } from './validation';

export type DrawPaymentType = 'interestOnly' | 'principalAndInterest';

export interface HelocInput {
  /** Amount drawn at the start of the draw period. */
  balance: number;
  ratePercent: number;
  /** Years of draw period (decimals allowed; rounded to whole months). */
  drawYears: number;
  /** Years of repayment period (decimals allowed; rounded to whole months). */
  repayYears: number;
  drawPaymentType: DrawPaymentType;
  /** Extra paid off the balance each month during the draw period. */
  extraDrawPayment: number;
  /** Rate rise to test, in percentage points. */
  rateRisePercent: number;
  /** Home value; 0 skips the credit line estimate. */
  homeValue: number;
  mortgageBalance: number;
  /** Lender's combined loan-to-value limit, e.g. 85. */
  maxCltvPercent: number;
}

export interface HelocYear {
  year: number;
  /** Months of this year in the draw period (the rest are repayment). */
  drawMonths: number;
  paid: number;
  principal: number;
  interest: number;
  balance: number;
}

export interface HelocResult {
  drawMonths: number;
  repayMonths: number;
  /** Monthly payment in the first month of the draw period, including any extra. */
  drawPayment: number;
  /** Balance when the repayment period starts. */
  balanceAtRepay: number;
  /** Monthly payment in the repayment period (0 if paid off during the draw period). */
  repayPayment: number;
  /** Repayment payment minus draw payment. */
  paymentIncrease: number;
  /** Repayment payment if the rate is higher by rateRisePercent. */
  stressRepayPayment: number;
  totalInterest: number;
  /** Interest paid in the draw period (the rest is paid in the repayment period). */
  drawInterest: number;
  totalPaid: number;
  /** Months until the balance reaches 0. */
  months: number;
  /** Estimated credit line, or null when no home value is given. */
  creditLine: number | null;
  /** (mortgage + amount borrowed) ÷ home value × 100, or null. */
  cltvPercent: number | null;
  overCreditLine: boolean;
  years: HelocYear[];
}

export function validateHelocInput(input: HelocInput): FieldError[] {
  const errors: FieldError[] = [];
  checkRange(errors, 'balance', input.balance, {
    min: 1,
    max: 100_000_000,
    empty: 'Enter how much you’ll borrow.',
    range: 'Enter an amount between 1 and 100,000,000.',
  });
  checkPercent(errors, 'ratePercent', input.ratePercent, 30);
  checkRange(errors, 'drawYears', input.drawYears, {
    min: 1 / 12,
    max: 30,
    empty: 'Enter the length of the draw period.',
    range: 'Enter between 1 month and 30 years.',
  });
  checkRange(errors, 'repayYears', input.repayYears, {
    min: 1 / 12,
    max: 30,
    empty: 'Enter the length of the repayment period.',
    range: 'Enter between 1 month and 30 years.',
  });
  if (input.drawPaymentType !== 'interestOnly' && input.drawPaymentType !== 'principalAndInterest') {
    errors.push({ field: 'drawPaymentType', message: 'Choose how you’ll pay during the draw period.' });
  }
  checkMoney(errors, 'extraDrawPayment', input.extraDrawPayment, 10_000_000);
  checkPercent(errors, 'rateRisePercent', input.rateRisePercent, 20);
  checkMoney(errors, 'homeValue', input.homeValue, 1_000_000_000);
  checkMoney(errors, 'mortgageBalance', input.mortgageBalance, 1_000_000_000);
  checkPercent(errors, 'maxCltvPercent', input.maxCltvPercent);
  return errors;
}

export function calculateHeloc(input: HelocInput): HelocResult {
  const errors = validateHelocInput(input);
  if (errors.length > 0) throw new RangeError(errors.map((e) => `${e.field}: ${e.message}`).join(' '));

  const nd = Math.max(1, Math.round(input.drawYears * 12));
  const nr = Math.max(1, Math.round(input.repayYears * 12));
  const r = input.ratePercent / 100 / 12;
  // Principal and interest in the draw period: the payment that repays the balance over the whole term.
  const fullTermPayment = monthlyPayment(input.balance, input.ratePercent, nd + nr);

  let balance = input.balance;
  let totalInterest = 0;
  let drawInterest = 0;
  let totalPaid = 0;
  let drawPayment = 0;
  let balanceAtRepay = 0;
  let repayPayment = 0;
  let month = 0;
  const years: HelocYear[] = [];

  while (balance > 1e-9 && month < nd + nr) {
    month++;
    if ((month - 1) % 12 === 0) years.push({ year: (month - 1) / 12 + 1, drawMonths: 0, paid: 0, principal: 0, interest: 0, balance: 0 });
    const row = years[years.length - 1]!;
    if (month === nd + 1) {
      balanceAtRepay = balance;
      repayPayment = monthlyPayment(balance, input.ratePercent, nr);
    }
    const interest = balance * r;
    let principal: number;
    if (month <= nd) {
      row.drawMonths++;
      drawInterest += interest;
      const scheduled = input.drawPaymentType === 'interestOnly' ? 0 : fullTermPayment - interest;
      principal = Math.min(balance, scheduled + input.extraDrawPayment);
      if (month === 1) drawPayment = interest + principal;
    } else {
      principal = month === nd + nr ? balance : Math.min(balance, repayPayment - interest);
    }
    balance -= principal;
    if (balance < 1e-9) balance = 0;
    totalInterest += interest;
    totalPaid += interest + principal;
    row.paid += interest + principal;
    row.principal += principal;
    row.interest += interest;
    row.balance = balance;
  }

  const rise = input.ratePercent + input.rateRisePercent;
  const creditLine = input.homeValue > 0 ? Math.max(0, (input.homeValue * input.maxCltvPercent) / 100 - input.mortgageBalance) : null;

  return {
    drawMonths: nd,
    repayMonths: nr,
    drawPayment,
    balanceAtRepay,
    repayPayment,
    paymentIncrease: repayPayment - drawPayment,
    stressRepayPayment: balanceAtRepay > 0 ? monthlyPayment(balanceAtRepay, rise, nr) : 0,
    totalInterest,
    drawInterest,
    totalPaid,
    months: month,
    creditLine,
    cltvPercent: input.homeValue > 0 ? ((input.mortgageBalance + input.balance) / input.homeValue) * 100 : null,
    overCreditLine: creditLine !== null && input.balance > creditLine + 1e-9,
    years,
  };
}
