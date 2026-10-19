/**
 * Rent vs buy (US, UK): compares your net worth after each year if you buy a home or rent and invest.
 *   Buyer: pays the deposit and buying costs up front, then each month the mortgage payment, property tax,
 *   insurance, maintenance and any HOA / service charge. Net worth = home value − selling costs − mortgage
 *   left + any money invested.
 *   Renter: invests what the buyer paid up front, pays rent, and each month invests the difference whenever
 *   owning costs more than renting (when renting costs more, the buyer invests the difference instead).
 *   Net worth = the investments.
 * Home value grows monthly at the equivalent of the yearly rate. Property tax and maintenance are a yearly
 * % of the home's value at the start of each year; insurance and fees grow with home prices; rent rises
 * once a year. Mortgage: monthly rate = rate ÷ 12, standard repayment. No income tax, capital gains tax or
 * tax relief. Pure: buying costs (closing costs, stamp duty) are worked out by the caller and passed in.
 */
import { monthlyPayment } from './loan';
import { checkMoney, checkPercent, checkRange, type FieldError } from './validation';

/** Years simulated for the break-even search and the year-by-year table. */
export const RENT_VS_BUY_YEARS = 30;

export interface RentVsBuyInput {
  homePrice: number;
  depositPercent: number;
  mortgageRatePercent: number;
  termYears: number;
  /** One-off costs of buying on top of the deposit: closing costs, stamp duty, legal and survey fees. */
  buyingCosts: number;
  /** Yearly property tax as a % of the home's value (0 where it doesn't apply). */
  propertyTaxPercent: number;
  insurancePerYear: number;
  /** Yearly maintenance as a % of the home's value. */
  maintenancePercent: number;
  /** HOA fees (US) or service charge and ground rent (UK). */
  feesPerMonth: number;
  /** Cost of selling at the end, as a % of the sale price. */
  sellingCostsPercent: number;
  homeGrowthPercent: number;
  monthlyRent: number;
  rentGrowthPercent: number;
  investReturnPercent: number;
  /** How long you'd stay: the comparison year. */
  years: number;
}

export interface RentVsBuyYear {
  year: number;
  homeValue: number;
  mortgageLeft: number;
  /** Home value − selling costs − mortgage left. */
  homeEquity: number;
  buyerInvestments: number;
  buyerNetWorth: number;
  renterNetWorth: number;
  /** Buyer − renter: positive means buying is ahead. */
  advantage: number;
  /** Money paid out so far: up-front cash plus monthly costs (buyer) or rent (renter). */
  buyerPaid: number;
  renterPaid: number;
}

export interface RentVsBuyResult {
  deposit: number;
  loanAmount: number;
  monthlyMortgage: number;
  /** Deposit + buying costs. */
  upfrontCash: number;
  /** Owning costs in month 1 (mortgage, tax, insurance, maintenance, fees). */
  firstMonthOwning: number;
  /** Results at the comparison year. */
  atYears: RentVsBuyYear;
  /** First year-end when buying is ahead and stays ahead to year 30; null if it never is. */
  breakEvenYear: number | null;
  rows: RentVsBuyYear[];
}

export function validateRentVsBuyInput(input: RentVsBuyInput): FieldError[] {
  const errors: FieldError[] = [];
  checkRange(errors, 'homePrice', input.homePrice, {
    min: 1_000,
    max: 100_000_000,
    empty: 'Enter the home price.',
    range: 'Enter a price between 1,000 and 100,000,000.',
  });
  checkPercent(errors, 'depositPercent', input.depositPercent);
  checkPercent(errors, 'mortgageRatePercent', input.mortgageRatePercent, 25);
  checkRange(errors, 'termYears', input.termYears, {
    min: 1,
    max: 40,
    integer: true,
    empty: 'Enter the mortgage term.',
    range: 'Enter a term between 1 and 40 years.',
  });
  checkMoney(errors, 'buyingCosts', input.buyingCosts);
  checkPercent(errors, 'propertyTaxPercent', input.propertyTaxPercent, 10);
  checkMoney(errors, 'insurancePerYear', input.insurancePerYear, 1_000_000);
  checkPercent(errors, 'maintenancePercent', input.maintenancePercent, 10);
  checkMoney(errors, 'feesPerMonth', input.feesPerMonth, 1_000_000);
  checkPercent(errors, 'sellingCostsPercent', input.sellingCostsPercent, 20);
  const growth = (field: string, value: number, label: string) =>
    checkRange(errors, field, value, { min: -20, max: 20, empty: `Enter ${label}, or 0 for none.`, range: 'Enter a rate between −20% and 20%.' });
  growth('homeGrowthPercent', input.homeGrowthPercent, 'the yearly change in home prices');
  checkRange(errors, 'monthlyRent', input.monthlyRent, {
    min: 1,
    max: 1_000_000,
    empty: 'Enter the monthly rent for a similar home.',
    range: 'Enter a rent of at least 1.',
  });
  growth('rentGrowthPercent', input.rentGrowthPercent, 'the yearly rent increase');
  checkRange(errors, 'investReturnPercent', input.investReturnPercent, {
    min: -20,
    max: 30,
    empty: 'Enter an investment return, or 0 for none.',
    range: 'Enter a return between −20% and 30%.',
  });
  checkRange(errors, 'years', input.years, {
    min: 1,
    max: RENT_VS_BUY_YEARS,
    integer: true,
    empty: 'Enter how long you plan to stay.',
    range: `Enter between 1 and ${RENT_VS_BUY_YEARS} years.`,
  });
  return errors;
}

/** Monthly rate equivalent to a yearly growth rate (works for negative rates above −100%). */
const monthlyGrowth = (yearlyPercent: number) => Math.expm1(Math.log1p(yearlyPercent / 100) / 12);

export function calculateRentVsBuy(input: RentVsBuyInput): RentVsBuyResult {
  const errors = validateRentVsBuyInput(input);
  if (errors.length > 0) throw new RangeError(errors.map((e) => `${e.field}: ${e.message}`).join(' '));

  const deposit = (input.homePrice * input.depositPercent) / 100;
  const loanAmount = input.homePrice - deposit;
  const termMonths = input.termYears * 12;
  const payment = loanAmount > 0 ? monthlyPayment(loanAmount, input.mortgageRatePercent, termMonths) : 0;
  const r = input.mortgageRatePercent / 100 / 12;
  // Balance after k payments, closed form (exact at full precision; 0 after the term).
  const balanceAfter = (k: number) => {
    if (loanAmount <= 0 || k >= termMonths) return 0;
    if (r === 0) return loanAmount - payment * k;
    const g = Math.pow(1 + r, k);
    return Math.max(0, loanAmount * g - (payment * (g - 1)) / r);
  };

  const homeG = monthlyGrowth(input.homeGrowthPercent);
  const investG = monthlyGrowth(input.investReturnPercent);
  const upfrontCash = deposit + input.buyingCosts;

  let homeValue = input.homePrice;
  let buyerInvest = 0;
  let renterInvest = upfrontCash;
  let buyerPaid = upfrontCash;
  let renterPaid = 0;
  let firstMonthOwning = 0;
  const rows: RentVsBuyYear[] = [];

  for (let year = 1; year <= RENT_VS_BUY_YEARS; year++) {
    const valueAtStart = homeValue;
    const yearFactor = Math.pow(1 + input.homeGrowthPercent / 100, year - 1);
    const tax = (valueAtStart * input.propertyTaxPercent) / 100 / 12;
    const maintenance = (valueAtStart * input.maintenancePercent) / 100 / 12;
    const insurance = (input.insurancePerYear * yearFactor) / 12;
    const fees = input.feesPerMonth * yearFactor;
    const rent = input.monthlyRent * Math.pow(1 + input.rentGrowthPercent / 100, year - 1);

    for (let m = 1; m <= 12; m++) {
      const month = (year - 1) * 12 + m;
      const owning = (month <= termMonths ? payment : 0) + tax + maintenance + insurance + fees;
      if (month === 1) firstMonthOwning = owning;
      buyerPaid += owning;
      renterPaid += rent;
      buyerInvest *= 1 + investG;
      renterInvest *= 1 + investG;
      const diff = owning - rent;
      if (diff > 0) renterInvest += diff;
      else buyerInvest -= diff;
      homeValue *= 1 + homeG;
    }

    const mortgageLeft = balanceAfter(year * 12);
    const homeEquity = homeValue * (1 - input.sellingCostsPercent / 100) - mortgageLeft;
    const buyerNetWorth = homeEquity + buyerInvest;
    rows.push({
      year,
      homeValue,
      mortgageLeft,
      homeEquity,
      buyerInvestments: buyerInvest,
      buyerNetWorth,
      renterNetWorth: renterInvest,
      advantage: buyerNetWorth - renterInvest,
      buyerPaid,
      renterPaid,
    });
  }

  // Break-even: the first year from which buying stays ahead through year 30.
  let breakEvenYear: number | null = null;
  for (let i = rows.length - 1; i >= 0 && rows[i]!.advantage >= 0; i--) breakEvenYear = rows[i]!.year;

  return {
    deposit,
    loanAmount,
    monthlyMortgage: payment,
    upfrontCash,
    firstMonthOwning,
    atYears: rows[input.years - 1]!,
    breakEvenYear,
    rows,
  };
}
