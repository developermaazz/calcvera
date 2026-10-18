/** FHSA calculator (Canada): defaults, form reading and display strings (build time and browser). */
import type { CaProvinceCode } from '../../countries/types';
import { caIncomeTax, type CaTaxParams } from '../../engines/caIncomeTax';
import { calculateFhsa, validateFhsaInput, type FhsaInput, type FhsaParams } from '../../engines/fhsa';
import { checkRange, type FieldError } from '../../engines/validation';
import type { CalcView, Computed, Reader } from '../../lib/calcUi';
import { stackedBarChart } from '../../lib/charts';
import { createFormatters } from '../../lib/format';

export interface FhsaPageParams {
  locale: string;
  currency: string;
  taxYear: string;
  fhsa: FhsaParams;
  provinces: { code: CaProvinceCode; name: string }[];
  taxByProvince: Record<string, CaTaxParams>;
}

export interface FhsaFormInput extends FhsaInput {
  province: CaProvinceCode;
  rateMode: 'income' | 'rate';
  income: number;
  marginalRatePercent: number;
}

export const FHSA_DEFAULTS: FhsaFormInput = {
  startBalance: 0,
  contributionsSoFar: 0,
  annualContribution: 8_000,
  years: 5,
  returnPercent: 5,
  carryForward: 0,
  province: 'ON',
  rateMode: 'income',
  income: 80_000,
  marginalRatePercent: 30,
};

export function readFhsaInput(r: Reader): FhsaFormInput {
  const startBalance = r.num('startBalance', 0);
  return {
    startBalance,
    // Empty means "all of my balance came from contributions".
    contributionsSoFar: r.num('contributionsSoFar', Number.isFinite(startBalance) ? startBalance : 0),
    annualContribution: r.num('annualContribution', 0),
    years: r.num('years'),
    returnPercent: r.num('returnPercent', 0),
    carryForward: r.num('carryForward', 0),
    province: (r.text('province') || 'ON') as CaProvinceCode,
    rateMode: r.text('rateMode') === 'rate' ? 'rate' : 'income',
    income: r.num('income'),
    marginalRatePercent: r.num('marginalRatePercent'),
  };
}

export interface FhsaView extends CalcView {
  balance: string;
  contributions: string;
  refunds: string;
  growth: string;
  refundRate: string;
  warningsHtml: string;
  hasWarnings: boolean;
  rowsHtml: string;
  chartSvg: string;
}

export function validateFhsaForm(input: FhsaFormInput, p: FhsaPageParams): FieldError[] {
  const errors = validateFhsaInput(input, p.fhsa);
  if (input.rateMode === 'income') {
    checkRange(errors, 'income', input.income, {
      min: 0,
      max: 10_000_000,
      empty: 'Enter your taxable income.',
      range: 'Enter an income between 0 and 10,000,000.',
    });
  } else {
    checkRange(errors, 'marginalRatePercent', input.marginalRatePercent, {
      min: 0,
      max: 60,
      empty: 'Enter your marginal tax rate.',
      range: 'Enter a rate between 0% and 60%.',
    });
  }
  return errors;
}

export function buildFhsaView(input: FhsaFormInput, p: FhsaPageParams): Computed<FhsaView> {
  const errors = validateFhsaForm(input, p);
  if (errors.length > 0) return { errors, view: null };

  const f = createFormatters(p.locale, p.currency);
  const tax = p.taxByProvince[input.province] ?? p.taxByProvince.ON!;
  const refundFor =
    input.rateMode === 'rate'
      ? (c: number) => (c * input.marginalRatePercent) / 100
      : (c: number) => caIncomeTax(input.income, tax).total - caIncomeTax(Math.max(0, input.income - c), tax).total;

  const r = calculateFhsa(input, p.fhsa, refundFor);
  const refundRate = r.totalContributions > 0 ? r.totalRefunds / r.totalContributions : 0;

  const warnings: string[] = [];
  if (r.annualLimitHitYear !== null) {
    warnings.push(
      `In year ${r.annualLimitHitYear} you plan to put in more than your participation room (${f.moneyWhole(p.fhsa.annualLimit)} a year, plus up to ${f.moneyWhole(p.fhsa.maxCarryForward)} carried forward). This projection caps contributions at your room. Contributing more than your room is an excess, which the CRA taxes until it's removed.`,
    );
  }
  if (r.lifetimeLimitHitYear !== null) {
    warnings.push(`You reach the ${f.moneyWhole(p.fhsa.lifetimeLimit)} lifetime limit in year ${r.lifetimeLimitHitYear}. Contributions stop there, but the balance keeps growing.`);
  }
  const warningsHtml = warnings.map((w) => `<li>${w}</li>`).join('');

  let contributed = input.startBalance;
  const chartRows = r.rows.map((row) => {
    contributed += row.contribution;
    return { year: row.year, contributed, growth: row.balance - contributed };
  });
  const chartSvg = stackedBarChart({
    data: chartRows.map((row) => ({
      label: String(row.year),
      values: [row.contributed, row.growth],
      tooltip: `Year ${row.year}: ${f.money(row.contributed)} put in, ${f.money(row.growth)} growth`,
    })),
    seriesClasses: ['chart-s1', 'chart-s2'],
    formatAxis: f.moneyCompact,
    ariaLabel: `FHSA balance over ${input.years} years, reaching ${f.money(r.balance)}. Yearly figures are in the table.`,
  });

  const rowsHtml = r.rows
    .map(
      (row) =>
        `<tr><th scope="row">${row.year}</th><td>${f.money(row.room)}</td><td>${f.money(row.contribution)}</td><td>${f.money(row.refund)}</td><td>${f.money(row.balance)}</td></tr>`,
    )
    .join('');

  const summary = `Putting ${f.moneyWhole(input.annualContribution)} a year into your FHSA for ${input.years} ${input.years === 1 ? 'year' : 'years'} could grow it to ${f.money(r.balance)}, from ${f.money(r.totalContributions)} of contributions${r.totalRefunds > 0.005 ? `, and cut your tax by about ${f.money(r.totalRefunds)}` : ''}.`;

  return {
    errors: [],
    view: {
      balance: f.money(r.balance),
      contributions: f.money(r.totalContributions),
      refunds: f.money(r.totalRefunds),
      growth: f.money(r.growth),
      refundRate: f.percent(refundRate * 100),
      warningsHtml,
      hasWarnings: warnings.length > 0,
      rowsHtml,
      chartSvg,
      summary,
    },
  };
}
