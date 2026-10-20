/**
 * Canadian mortgage payments. Fixed rates compound semi-annually (Interest Act), so the rate per payment is
 * (1 + rate ÷ 2)^(2 ÷ payments a year) − 1; variable rates are treated as compounding monthly.
 * Accelerated bi-weekly and weekly payments are the monthly payment ÷ 2 or ÷ 4, paid 26 or 52 times a year.
 * Down payments under 20% need mortgage loan insurance: the premium (a % of the loan, by loan-to-value) is
 * added to the mortgage. Minimum down payment, the insured price cap and amortization limits come from params.
 * The last payment is adjusted so the balance ends at exactly 0. Pure: no formatting, no country lookups.
 */
import type { CaMortgageConfig } from '../countries/types';
import { checkMoney, checkPercent, checkRange, type FieldError } from './validation';

export type PaymentFrequency = 'monthly' | 'semiMonthly' | 'biWeekly' | 'accelBiWeekly' | 'weekly' | 'accelWeekly';
export type RateType = 'fixed' | 'variable';

export const PAYMENTS_PER_YEAR: Record<PaymentFrequency, number> = {
  monthly: 12,
  semiMonthly: 24,
  biWeekly: 26,
  accelBiWeekly: 26,
  weekly: 52,
  accelWeekly: 52,
};

export interface CaMortgageInput {
  price: number;
  downPayment: number;
  ratePercent: number;
  rateType: RateType;
  amortizationYears: number;
  frequency: PaymentFrequency;
  /** Mortgage term (years until renewal). */
  termYears: number;
  /** First-time buyer or buying a new build: allows a 30-year insured amortization. */
  firstTimeOrNewBuild: boolean;
}

export interface CaMortgageYear {
  year: number;
  paid: number;
  principal: number;
  interest: number;
  balance: number;
}

export interface CaMortgageResult {
  minDownPayment: number;
  downPercent: number;
  insured: boolean;
  /** Premium rate including any surcharge (0 when not insured). */
  premiumRate: number;
  premium: number;
  /** Loan before the premium. */
  baseLoan: number;
  /** Loan including the premium. */
  mortgage: number;
  paymentsPerYear: number;
  /** Rate per payment period. */
  periodicRate: number;
  payment: number;
  /** Number of payments until the balance reaches 0. */
  payments: number;
  totalInterest: number;
  totalPaid: number;
  /** Years to pay off (payments ÷ payments a year). */
  payoffYears: number;
  /** Interest saved compared with monthly payments over the full amortization (accelerated payments only). */
  interestSavedVsMonthly: number;
  termBalance: number;
  termInterest: number;
  termPrincipal: number;
  years: CaMortgageYear[];
}

/** Message for a down payment below the minimum; the page adds the amount. */
export const BELOW_MINIMUM = 'Your down payment is below the minimum for this price.';

export function minimumDownPayment(price: number, p: CaMortgageConfig): number {
  const m = p.minDownPayment;
  if (price >= p.insuredPriceCap) return price * m.uninsuredRate;
  return Math.min(price, m.firstTierTop) * m.firstRate + Math.max(0, price - m.firstTierTop) * m.secondRate;
}

/** Rate per payment: semi-annual compounding for fixed rates, monthly for variable. */
export function periodicRate(ratePercent: number, rateType: RateType, paymentsPerYear: number): number {
  const j = ratePercent / 100;
  return rateType === 'fixed' ? Math.pow(1 + j / 2, 2 / paymentsPerYear) - 1 : Math.pow(1 + j / 12, 12 / paymentsPerYear) - 1;
}

export function levelPayment(principal: number, rate: number, n: number): number {
  if (rate === 0) return principal / n;
  return (principal * rate) / -Math.expm1(-n * Math.log1p(rate));
}

export function validateCaMortgageInput(input: CaMortgageInput, p: CaMortgageConfig): FieldError[] {
  const errors: FieldError[] = [];
  checkRange(errors, 'price', input.price, {
    min: 1_000,
    max: 100_000_000,
    empty: 'Enter the purchase price.',
    range: 'Enter a price between 1,000 and 100,000,000.',
  });
  checkMoney(errors, 'downPayment', input.downPayment, 100_000_000);
  checkPercent(errors, 'ratePercent', input.ratePercent, 25);
  checkRange(errors, 'amortizationYears', input.amortizationYears, {
    min: 1,
    max: 30,
    integer: true,
    empty: 'Enter the amortization period.',
    range: 'Enter between 1 and 30 years.',
  });
  checkRange(errors, 'termYears', input.termYears, {
    min: 1,
    max: 10,
    integer: true,
    empty: 'Enter the mortgage term.',
    range: 'Enter a term between 1 and 10 years.',
  });
  if (!(input.frequency in PAYMENTS_PER_YEAR)) errors.push({ field: 'frequency', message: 'Choose how often you’ll pay.' });
  if (input.rateType !== 'fixed' && input.rateType !== 'variable') errors.push({ field: 'rateType', message: 'Choose a rate type.' });
  if (errors.length > 0) return errors;

  const min = minimumDownPayment(input.price, p);
  if (input.downPayment >= input.price) {
    errors.push({ field: 'downPayment', message: 'Your down payment must be less than the price.' });
  } else if (input.downPayment < min - 1e-6) {
    errors.push({ field: 'downPayment', message: BELOW_MINIMUM });
  } else if (input.downPayment < input.price * p.insuranceRequiredBelow) {
    const max = input.firstTimeOrNewBuild ? p.maxInsuredAmortizationYearsFirstTime : p.maxInsuredAmortizationYears;
    if (input.amortizationYears > max) {
      errors.push({
        field: 'amortizationYears',
        message: input.firstTimeOrNewBuild
          ? `With less than 20% down, the longest amortization is ${max} years.`
          : `With less than 20% down, the longest amortization is ${max} years (${p.maxInsuredAmortizationYearsFirstTime} for first-time buyers and new builds).`,
      });
    }
  }
  return errors;
}

function premiumRateFor(ltv: number, amortizationYears: number, p: CaMortgageConfig): number {
  const tier = p.premiums.find((t) => ltv <= t.maxLtv + 1e-12) ?? p.premiums[p.premiums.length - 1]!;
  return tier.rate + (amortizationYears > p.maxInsuredAmortizationYears ? p.longAmortizationSurcharge : 0);
}

interface Schedule {
  payments: number;
  totalInterest: number;
  totalPaid: number;
  termBalance: number;
  termInterest: number;
  termPrincipal: number;
  years: CaMortgageYear[];
}

function simulate(mortgage: number, rate: number, payment: number, perYear: number, maxPayments: number, termPayments: number): Schedule {
  let balance = mortgage;
  let k = 0;
  let totalInterest = 0;
  let totalPaid = 0;
  let termBalance = 0;
  let termInterest = 0;
  const years: CaMortgageYear[] = [];
  while (balance > 1e-9 && k < maxPayments) {
    k++;
    if ((k - 1) % perYear === 0) years.push({ year: (k - 1) / perYear + 1, paid: 0, principal: 0, interest: 0, balance: 0 });
    const row = years[years.length - 1]!;
    const interest = balance * rate;
    const principal = k === maxPayments ? balance : Math.min(balance, payment - interest);
    balance -= principal;
    if (balance < 1e-9) balance = 0;
    totalInterest += interest;
    totalPaid += interest + principal;
    row.paid += interest + principal;
    row.principal += principal;
    row.interest += interest;
    row.balance = balance;
    if (k <= termPayments) termInterest += interest;
    if (k === termPayments) termBalance = balance;
  }
  return { payments: k, totalInterest, totalPaid, termBalance, termInterest, termPrincipal: mortgage - (k >= termPayments ? termBalance : 0), years };
}

export function calculateCaMortgage(input: CaMortgageInput, p: CaMortgageConfig): CaMortgageResult {
  const errors = validateCaMortgageInput(input, p);
  if (errors.length > 0) throw new RangeError(errors.map((e) => `${e.field}: ${e.message}`).join(' '));

  const baseLoan = input.price - input.downPayment;
  const insured = input.downPayment < input.price * p.insuranceRequiredBelow;
  const premiumRate = insured ? premiumRateFor(baseLoan / input.price, input.amortizationYears, p) : 0;
  const premium = baseLoan * premiumRate;
  const mortgage = baseLoan + premium;

  const perYear = PAYMENTS_PER_YEAR[input.frequency];
  const rate = periodicRate(input.ratePercent, input.rateType, perYear);
  const monthlyRate = periodicRate(input.ratePercent, input.rateType, 12);
  const monthlyN = input.amortizationYears * 12;
  const monthly = levelPayment(mortgage, monthlyRate, monthlyN);
  const accelerated = input.frequency === 'accelBiWeekly' || input.frequency === 'accelWeekly';
  const payment = accelerated ? monthly / (input.frequency === 'accelBiWeekly' ? 2 : 4) : levelPayment(mortgage, rate, input.amortizationYears * perYear);

  const s = simulate(mortgage, rate, payment, perYear, input.amortizationYears * perYear, input.termYears * perYear);
  const monthlyTotalInterest = accelerated ? simulate(mortgage, monthlyRate, monthly, 12, monthlyN, 0).totalInterest : s.totalInterest;

  return {
    minDownPayment: minimumDownPayment(input.price, p),
    downPercent: (input.downPayment / input.price) * 100,
    insured,
    premiumRate,
    premium,
    baseLoan,
    mortgage,
    paymentsPerYear: perYear,
    periodicRate: rate,
    payment,
    payments: s.payments,
    totalInterest: s.totalInterest,
    totalPaid: s.totalPaid,
    payoffYears: s.payments / perYear,
    interestSavedVsMonthly: accelerated ? monthlyTotalInterest - s.totalInterest : 0,
    termBalance: s.termBalance,
    termInterest: s.termInterest,
    termPrincipal: s.termPrincipal,
    years: s.years,
  };
}
