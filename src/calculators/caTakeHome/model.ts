/** Canadian income tax calculator: form reading and display strings (build time and browser). */
import type { CaIncomeTaxDefaults } from '../../countries/types';
import { calculateCaTakeHome, validateCaTakeHomeInput, type CaTakeHomeInput, type CaTakeHomeParams } from '../../engines/caTakeHome';
import type { CalcView, Computed, Reader } from '../../lib/calcUi';
import { splitBar } from '../../lib/charts';
import { createFormatters } from '../../lib/format';

export interface CaTakeHomePageParams {
  locale: string;
  currency: string;
  taxYear: string;
  provinces: { code: string; name: string }[];
  byProvince: Record<string, CaTakeHomeParams>;
}

export interface CaTakeHomeFormInput extends CaTakeHomeInput {
  province: string;
}

export function caTakeHomeDefaults(d: CaIncomeTaxDefaults): CaTakeHomeFormInput {
  return { income: d.income, rrspDeduction: 0, province: 'ON' };
}

export function readCaTakeHomeInput(r: Reader): CaTakeHomeFormInput {
  return { income: r.num('income'), rrspDeduction: r.num('rrspDeduction', 0), province: r.text('province') || 'ON' };
}

export interface CaTakeHomeView extends CalcView {
  takeHome: string;
  takeHomeSub: string;
  incomeTax: string;
  payroll: string;
  marginal: string;
  federal: string;
  provincial: string;
  provincialLabel: string;
  average: string;
  tableHtml: string;
  chartSvg: string;
}

const PERIODS: [string, number][] = [
  ['Year', 1],
  ['Month', 12],
  ['Every two weeks', 26],
  ['Week', 52],
];

export function buildCaTakeHomeView(input: CaTakeHomeFormInput, p: CaTakeHomePageParams): Computed<CaTakeHomeView> {
  const errors = validateCaTakeHomeInput(input);
  if (errors.length > 0) return { errors, view: null };
  const params = p.byProvince[input.province] ?? p.byProvince.ON!;
  const prov = p.provinces.find((x) => x.code === input.province) ?? p.provinces.find((x) => x.code === 'ON')!;

  const f = createFormatters(p.locale, p.currency);
  const r = calculateCaTakeHome(input, params);

  const lines: [string, number, boolean][] = [
    ['Employment income', input.income, true],
    ['Federal tax', -r.federalTax, true],
    [`${prov.name} tax`, -r.provincialTax, true],
    ['CPP contributions', -r.cppTotal, true],
    ['EI premiums', -r.ei, true],
  ];
  const cells = (v: number) => PERIODS.map(([, per]) => `<td>${v < 0 ? '− ' : ''}${f.money(Math.abs(v) / per)}</td>`).join('');
  const tableHtml =
    lines
      .filter(([, , show]) => show)
      .map(([label, value]) => `<tr><th scope="row">${label}</th>${cells(value)}</tr>`)
      .join('') + `<tr class="total-row"><th scope="row">Take-home pay</th>${cells(r.takeHome)}</tr>`;

  const chartSvg = splitBar(
    [
      { value: r.takeHome, className: 'chart-s1', tooltip: `Take-home pay: ${f.money(r.takeHome)}` },
      { value: r.federalTax, className: 'chart-s2', tooltip: `Federal tax: ${f.money(r.federalTax)}` },
      { value: r.provincialTax, className: 'chart-s3', tooltip: `${prov.name} tax: ${f.money(r.provincialTax)}` },
      { value: r.cppTotal + r.ei, className: 'chart-s4', tooltip: `CPP and EI: ${f.money(r.cppTotal + r.ei)}` },
    ],
    `Income ${f.money(input.income)}: take-home ${f.money(r.takeHome)}, federal tax ${f.money(r.federalTax)}, ${prov.name} tax ${f.money(r.provincialTax)}, CPP and EI ${f.money(r.cppTotal + r.ei)}.`,
  );

  const summary = `On ${f.money(input.income)} in ${prov.name}, you'd pay ${f.money(r.incomeTax)} in income tax and ${f.money(r.cppTotal + r.ei)} in CPP and EI, leaving ${f.money(r.takeHome)} a year, or ${f.money(r.takeHome / 12)} a month. Your marginal tax rate is ${f.percent(Math.round(r.marginalRate * 100) / 100)}.`;

  return {
    errors: [],
    view: {
      takeHome: f.money(r.takeHome),
      takeHomeSub: `${f.money(r.takeHome / 12)} a month or ${f.money(r.takeHome / 26)} every two weeks`,
      incomeTax: f.money(r.incomeTax),
      payroll: f.money(r.cppTotal + r.ei),
      marginal: f.percent(Math.round(r.marginalRate * 100) / 100),
      federal: f.money(r.federalTax),
      provincial: f.money(r.provincialTax),
      provincialLabel: `${prov.name} tax`,
      average: f.percent(Math.round(r.averageRate * 100) / 100),
      tableHtml,
      chartSvg,
      summary,
    },
  };
}
