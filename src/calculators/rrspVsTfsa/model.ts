/** Canadian RRSP vs TFSA calculator: form reading and display strings (build time and browser). */
import type { CaRegisteredConfig, CaRrspTfsaDefaults } from '../../countries/types';
import { caIncomeTaxOnly, calculateCaTakeHome, type CaTakeHomeParams } from '../../engines/caTakeHome';
import { calculateRrspVsTfsa, validateRrspVsTfsaInput } from '../../engines/rrspVsTfsa';
import type { FieldError } from '../../engines/validation';
import type { CalcView, Computed, Reader } from '../../lib/calcUi';
import { lineChart } from '../../lib/charts';
import { createFormatters, escapeHtml } from '../../lib/format';

export interface RrspTfsaPageParams {
  locale: string;
  currency: string;
  taxYear: string;
  provinces: { code: string; name: string }[];
  byProvince: Record<string, CaTakeHomeParams>;
  registered: CaRegisteredConfig;
}

export interface RrspTfsaFormInput extends CaRrspTfsaDefaults {
  province: string;
}

export function rrspTfsaDefaults(d: CaRrspTfsaDefaults): RrspTfsaFormInput {
  return { ...d, province: 'ON' };
}

export function readRrspTfsaInput(r: Reader): RrspTfsaFormInput {
  return {
    province: r.text('province') || 'ON',
    income: r.num('income'),
    retirementIncome: r.num('retirementIncome', 0),
    contribution: r.num('contribution'),
    years: r.num('years'),
    returnPercent: r.num('returnPercent'),
  };
}

export interface RrspTfsaView extends CalcView {
  winnerLabel: string;
  difference: string;
  winnerSub: string;
  rrspAfterTax: string;
  tfsaValue: string;
  rates: string;
  notes: string;
  hasNotes: boolean;
  chartSvg: string;
  yearRows: string;
}

/** Tax rates for the comparison: the refund rate on the contribution, and the marginal rate in retirement. */
export function rrspTfsaRates(input: RrspTfsaFormInput, p: CaTakeHomeParams): { now: number; later: number } {
  const without = calculateCaTakeHome({ income: input.income, rrspDeduction: 0 }, p).incomeTax;
  const withDeduction = calculateCaTakeHome({ income: input.income, rrspDeduction: input.contribution }, p).incomeTax;
  const later = (caIncomeTaxOnly(input.retirementIncome + 100, p) - caIncomeTaxOnly(input.retirementIncome, p)) / 100;
  return { now: (without - withDeduction) / input.contribution, later };
}

export function buildRrspTfsaView(input: RrspTfsaFormInput, p: RrspTfsaPageParams): Computed<RrspTfsaView> {
  const errors: FieldError[] = [];
  if (!Number.isFinite(input.income) || input.income < 0 || input.income > 10_000_000) errors.push({ field: 'income', message: 'Enter an income between 0 and 10,000,000.' });
  if (!Number.isFinite(input.retirementIncome) || input.retirementIncome < 0 || input.retirementIncome > 10_000_000) {
    errors.push({ field: 'retirementIncome', message: 'Enter an income between 0 and 10,000,000.' });
  }
  errors.push(...validateRrspVsTfsaInput({ contribution: input.contribution, years: input.years, returnPercent: input.returnPercent, rateNow: 0, rateLater: 0 }));
  if (errors.length === 0 && input.contribution > input.income) errors.push({ field: 'contribution', message: 'Enter no more than your income.' });
  if (errors.length > 0) return { errors, view: null };

  const f = createFormatters(p.locale, p.currency);
  const params = p.byProvince[input.province] ?? p.byProvince.ON!;
  const rates = rrspTfsaRates(input, params);
  const r = calculateRrspVsTfsa({ contribution: input.contribution, years: input.years, returnPercent: input.returnPercent, rateNow: rates.now, rateLater: rates.later });
  const pct = (x: number) => f.percent(Math.round(x * 10_000) / 100);

  const chartSvg = lineChart({
    labels: r.rows.map((y) => String(y.year)),
    series: [
      { label: 'TFSA', colour: 3, values: r.rows.map((y) => y.tfsaValue) },
      { label: 'RRSP after tax', colour: 1, values: r.rows.map((y) => y.rrspAfterTax) },
    ],
    formatAxis: f.moneyCompact,
    tooltip: (k) => `Year ${k + 1}: RRSP after tax ${f.money(r.rows[k]!.rrspAfterTax)}, TFSA ${f.money(r.rows[k]!.tfsaValue)}`,
    ariaLabel: `Value after tax each year: RRSP ${f.money(r.rrspAfterTax)} and TFSA ${f.money(r.tfsaValue)} after ${input.years} years. Full figures are in the table.`,
    xAxisLabel: 'Year',
  });

  const yearRows = r.rows
    .map((y) => `<tr><th scope="row">${y.year}</th><td>${f.money(y.rrspValue)}</td><td>${f.money(y.rrspAfterTax)}</td><td>${f.money(y.tfsaValue)}</td></tr>`)
    .join('');

  const notes: string[] = [];
  if (r.tfsaDeposit > p.registered.tfsaLimit) {
    notes.push(`The TFSA deposit of ${f.money(r.tfsaDeposit)} a year is more than the ${f.moneyWhole(p.registered.tfsaLimit)} TFSA dollar limit for ${p.taxYear}, unless you have unused room from earlier years.`);
  }
  const rrspRoom = Math.min(p.registered.rrspDollarLimit, input.income * p.registered.rrspIncomeRate);
  if (input.contribution > rrspRoom) {
    notes.push(`RRSP room is ${pct(p.registered.rrspIncomeRate)} of last year's earned income, up to ${f.moneyWhole(p.registered.rrspDollarLimit)} for ${p.taxYear}. On your income that's about ${f.money(rrspRoom)}, plus any unused room.`);
  }

  const winnerLabel = r.winner === 'rrsp' ? 'The RRSP leaves you more' : r.winner === 'tfsa' ? 'The TFSA leaves you more' : 'Both leave you the same';
  const summary =
    r.winner === 'same'
      ? `With the same tax rate now and later (${pct(rates.now)}), the RRSP and TFSA both leave you ${f.money(r.tfsaValue)} after tax.`
      : `Saving ${f.money(input.contribution)} of before-tax income a year for ${input.years} years, the ${r.winner === 'rrsp' ? 'RRSP' : 'TFSA'} leaves you ${f.money(Math.abs(r.difference))} more after tax, because your tax rate is ${pct(rates.now)} now and ${pct(rates.later)} in retirement.`;

  return {
    errors: [],
    view: {
      winnerLabel,
      difference: f.money(Math.abs(r.difference)),
      winnerSub: `after ${input.years} ${input.years === 1 ? 'year' : 'years'}, after tax`,
      rrspAfterTax: f.money(r.rrspAfterTax),
      tfsaValue: f.money(r.tfsaValue),
      rates: `${pct(rates.now)} now, ${pct(rates.later)} later`,
      notes: notes.map((n) => `<li>${escapeHtml(n)}</li>`).join(''),
      hasNotes: notes.length > 0,
      chartSvg,
      yearRows,
      summary,
    },
  };
}
