/** Rent vs buy calculator: form reading and display strings (build time and browser). */
import { calculatePropertyTax, type BuyerType, type PropertyTaxParams } from '../../engines/propertyTax';
import { RENT_VS_BUY_YEARS, calculateRentVsBuy, validateRentVsBuyInput, type RentVsBuyInput } from '../../engines/rentVsBuy';
import type { RentVsBuyDefaults } from '../../countries/types';
import type { CalcView, Computed, Reader } from '../../lib/calcUi';
import { lineChart } from '../../lib/charts';
import { createFormatters } from '../../lib/format';
import type { FieldError } from '../../engines/validation';

export interface RentVsBuyParams {
  locale: string;
  currency: string;
  country: 'us' | 'uk';
  /** UK: Stamp Duty Land Tax bands (England and Northern Ireland). */
  stampDuty?: PropertyTaxParams;
}

/** What the form collects: the engine input minus buying costs, plus the country's way of working them out. */
export interface RentVsBuyForm extends Omit<RentVsBuyInput, 'buyingCosts'> {
  /** US: closing costs as a % of the price. */
  closingCostsPercent: number;
  /** UK: legal, survey and mortgage fees. */
  otherBuyingCosts: number;
  /** UK: first-time buyer relief or standard rates. */
  buyerType: Extract<BuyerType, 'firstTime' | 'standard'>;
}

export function rentVsBuyDefaults(d: RentVsBuyDefaults): RentVsBuyForm {
  return {
    homePrice: d.homePrice,
    depositPercent: d.depositPercent,
    mortgageRatePercent: d.mortgageRatePercent,
    termYears: d.termYears,
    closingCostsPercent: d.closingCostsPercent ?? 0,
    otherBuyingCosts: d.otherBuyingCosts ?? 0,
    buyerType: 'firstTime',
    propertyTaxPercent: d.propertyTaxPercent ?? 0,
    insurancePerYear: d.insurancePerYear,
    maintenancePercent: d.maintenancePercent,
    feesPerMonth: d.feesPerMonth,
    sellingCostsPercent: d.sellingCostsPercent,
    homeGrowthPercent: d.homeGrowthPercent,
    monthlyRent: d.monthlyRent,
    rentGrowthPercent: d.rentGrowthPercent,
    investReturnPercent: d.investReturnPercent,
    years: d.years,
  };
}

export function readRentVsBuyInput(r: Reader): RentVsBuyForm {
  return {
    homePrice: r.num('homePrice'),
    depositPercent: r.num('depositPercent', 0),
    mortgageRatePercent: r.num('mortgageRatePercent'),
    termYears: r.num('termYears'),
    closingCostsPercent: r.num('closingCostsPercent', 0),
    otherBuyingCosts: r.num('otherBuyingCosts', 0),
    buyerType: r.text('buyerType') === 'standard' ? 'standard' : 'firstTime',
    propertyTaxPercent: r.num('propertyTaxPercent', 0),
    insurancePerYear: r.num('insurancePerYear', 0),
    maintenancePercent: r.num('maintenancePercent', 0),
    feesPerMonth: r.num('feesPerMonth', 0),
    sellingCostsPercent: r.num('sellingCostsPercent', 0),
    homeGrowthPercent: r.num('homeGrowthPercent', 0),
    monthlyRent: r.num('monthlyRent'),
    rentGrowthPercent: r.num('rentGrowthPercent', 0),
    investReturnPercent: r.num('investReturnPercent', 0),
    years: r.num('years'),
  };
}

export interface RentVsBuyView extends CalcView {
  verdictLabel: string;
  verdictAmount: string;
  verdictSub: string;
  breakEven: string;
  monthlyMortgage: string;
  upfrontCash: string;
  costsNote: string;
  buyPaid: string;
  rentPaid: string;
  buyNetWorth: string;
  rentNetWorth: string;
  homeValue: string;
  mortgageLeft: string;
  chartSvg: string;
  yearRows: string;
}

/** Buying costs on top of the deposit, by country. */
function buyingCosts(form: RentVsBuyForm, p: RentVsBuyParams): { total: number; stampDuty: number } {
  if (p.country === 'uk' && p.stampDuty) {
    const stampDuty = calculatePropertyTax({ price: form.homePrice, buyerType: form.buyerType, nonResident: false }, p.stampDuty).tax;
    return { total: stampDuty + form.otherBuyingCosts, stampDuty };
  }
  return { total: (form.homePrice * form.closingCostsPercent) / 100, stampDuty: 0 };
}

export function buildRentVsBuyView(raw: RentVsBuyForm, p: RentVsBuyParams): Computed<RentVsBuyView> {
  // Each country's form leaves out the other's fields (the reader returns NaN for a missing field).
  const form: RentVsBuyForm =
    p.country === 'uk' ? { ...raw, propertyTaxPercent: 0, closingCostsPercent: 0 } : { ...raw, otherBuyingCosts: 0, buyerType: 'standard' };
  const pre: FieldError[] = [];
  if (p.country === 'us' && !(form.closingCostsPercent >= 0 && form.closingCostsPercent <= 20)) {
    pre.push({ field: 'closingCostsPercent', message: 'Enter a percentage between 0 and 20.' });
  }
  if (p.country === 'uk' && !(form.otherBuyingCosts >= 0 && form.otherBuyingCosts <= 10_000_000)) {
    pre.push({ field: 'otherBuyingCosts', message: 'Enter an amount, or 0 for none.' });
  }
  // Buying costs depend on the price, so only work them out once the price is valid.
  const priceOk = Number.isFinite(form.homePrice) && form.homePrice >= 1_000 && form.homePrice <= 100_000_000;
  const costs = priceOk && pre.length === 0 ? buyingCosts(form, p) : { total: 0, stampDuty: 0 };
  const input: RentVsBuyInput = { ...form, buyingCosts: costs.total };
  const errors = [...pre, ...validateRentVsBuyInput(input)];
  if (errors.length > 0) return { errors, view: null };

  const f = createFormatters(p.locale, p.currency);
  const r = calculateRentVsBuy(input);
  const at = r.atYears;
  const yearsText = `${form.years} ${form.years === 1 ? 'year' : 'years'}`;
  const buyAhead = at.advantage >= 0;

  const breakEven =
    r.breakEvenYear === null ? `Not within ${RENT_VS_BUY_YEARS} years` : r.breakEvenYear === 1 ? 'From year 1' : `Year ${r.breakEvenYear}`;
  const verdictSub =
    r.breakEvenYear === null
      ? `after ${yearsText}. Renting stays ahead for all ${RENT_VS_BUY_YEARS} years.`
      : `after ${yearsText}. Buying pulls ahead ${r.breakEvenYear === 1 ? 'in the first year' : `in year ${r.breakEvenYear}`}.`;

  const costsNote =
    p.country === 'uk'
      ? `Up-front cost includes ${f.money(costs.stampDuty)} Stamp Duty${form.buyerType === 'firstTime' && form.homePrice > (p.stampDuty?.firstTimeBuyerMaxPrice ?? Infinity) ? ' (no first-time buyer relief over the price limit)' : ''} and ${f.money(form.otherBuyingCosts)} other buying costs.`
      : `Up-front cost includes ${f.money(costs.total)} closing costs.`;

  const chartSvg = lineChart({
    labels: r.rows.map((y) => String(y.year)),
    series: [
      { label: 'Buy', colour: 1, values: r.rows.map((y) => y.buyerNetWorth) },
      { label: 'Rent', colour: 3, values: r.rows.map((y) => y.renterNetWorth) },
    ],
    formatAxis: f.moneyCompact,
    tooltip: (i) => {
      const y = r.rows[i]!;
      return `Year ${y.year}: buy ${f.money(y.buyerNetWorth)}, rent ${f.money(y.renterNetWorth)}`;
    },
    ariaLabel: `Net worth each year if you buy or rent, over ${RENT_VS_BUY_YEARS} years. ${r.breakEvenYear === null ? 'Renting stays ahead throughout.' : `Buying pulls ahead in year ${r.breakEvenYear}.`} Full figures are in the table.`,
    xAxisLabel: 'Years from now',
  });

  const yearRows = r.rows
    .map(
      (y) =>
        `<tr${y.year === form.years ? ' class="total-row"' : ''}><th scope="row">${y.year}</th><td>${f.money(y.homeValue)}</td><td>${f.money(y.mortgageLeft)}</td><td>${f.money(y.buyerNetWorth)}</td><td>${f.money(y.renterNetWorth)}</td><td>${y.advantage >= 0 ? 'Buy +' : 'Rent +'}${f.money(Math.abs(y.advantage))}</td></tr>`,
    )
    .join('');

  const summary = `If you stay ${yearsText}, ${buyAhead ? 'buying' : 'renting'} leaves you ${f.money(Math.abs(at.advantage))} better off: ${f.money(at.buyerNetWorth)} if you buy (home equity after selling costs, plus savings) against ${f.money(at.renterNetWorth)} if you rent and invest the difference. ${r.breakEvenYear === null ? `Buying doesn't pull ahead within ${RENT_VS_BUY_YEARS} years.` : `Buying pulls ahead ${r.breakEvenYear === 1 ? 'in the first year' : `in year ${r.breakEvenYear}`}.`}`;

  return {
    errors: [],
    view: {
      verdictLabel: buyAhead ? 'Buying comes out ahead by' : 'Renting comes out ahead by',
      verdictAmount: f.money(Math.abs(at.advantage)),
      verdictSub,
      breakEven,
      monthlyMortgage: f.money(r.monthlyMortgage),
      upfrontCash: f.money(r.upfrontCash),
      costsNote,
      buyPaid: f.money(at.buyerPaid),
      rentPaid: f.money(at.renterPaid),
      buyNetWorth: f.money(at.buyerNetWorth),
      rentNetWorth: f.money(at.renterNetWorth),
      homeValue: f.money(at.homeValue),
      mortgageLeft: f.money(at.mortgageLeft),
      chartSvg,
      yearRows,
      summary,
    },
  };
}
