/** Indian income tax calculator: form reading and display strings (build time and browser). */
import type { InIncomeTaxDefaults, InTaxConfig } from '../../countries/types';
import { calculateInIncomeTax, validateInIncomeTaxInput, type InAgeGroup, type InIncomeTaxInput } from '../../engines/inIncomeTax';
import type { CalcView, Computed, Reader } from '../../lib/calcUi';
import { createFormatters } from '../../lib/format';

export interface InTaxPageParams extends InTaxConfig {
  locale: string;
  currency: string;
  taxYear: string;
}

export function inTaxDefaults(d: InIncomeTaxDefaults): InIncomeTaxInput {
  return { salary: d.salary, otherIncome: 0, ageGroup: 'under60', oldDeductions: d.oldDeductions };
}

export function readInTaxInput(r: Reader): InIncomeTaxInput {
  const age = r.text('ageGroup') as InAgeGroup;
  return {
    salary: r.num('salary', 0),
    otherIncome: r.num('otherIncome', 0),
    ageGroup: age === 'from60' || age === 'from80' ? age : 'under60',
    oldDeductions: r.num('oldDeductions', 0),
  };
}

export interface InTaxView extends CalcView {
  betterLabel: string;
  saving: string;
  betterSub: string;
  newTax: string;
  oldTax: string;
  monthly: string;
  compareRows: string;
}

export function buildInTaxView(input: InIncomeTaxInput, p: InTaxPageParams): Computed<InTaxView> {
  const errors = validateInIncomeTaxInput(input);
  if (errors.length > 0) return { errors, view: null };

  const f = createFormatters(p.locale, p.currency);
  const r = calculateInIncomeTax(input, p);
  const n = r.newRegime;
  const o = r.oldRegime;
  const best = r.better === 'old' ? o : n;
  const rows: [string, number, number][] = [
    ['Taxable income', n.taxableIncome, o.taxableIncome],
    ['Tax on slabs', n.slabTax, o.slabTax],
    ['Rebate (section 156)', -n.rebate, -o.rebate],
    ['Surcharge', n.surcharge, o.surcharge],
    ['Health and education cess', n.cess, o.cess],
  ];
  const cell = (v: number) => `<td>${v < 0 ? '− ' : ''}${f.money(Math.abs(v))}</td>`;
  const compareRows =
    rows.map(([label, a, b]) => `<tr><th scope="row">${label}</th>${cell(a)}${cell(b)}</tr>`).join('') +
    `<tr class="total-row"><th scope="row">Total tax</th>${cell(n.totalTax)}${cell(o.totalTax)}</tr>` +
    `<tr><th scope="row">Take-home a month</th>${cell(n.takeHome / 12)}${cell(o.takeHome / 12)}</tr>`;

  const betterLabel = r.better === 'same' ? 'Both regimes cost the same' : r.better === 'new' ? 'The new regime saves you' : 'The old regime saves you';
  const summary =
    r.better === 'same'
      ? `On ${f.money(input.salary + input.otherIncome)} of income, you'd pay ${f.money(n.totalTax)} in tax under either regime for ${p.taxYear}.`
      : `On ${f.money(input.salary + input.otherIncome)} of income, you'd pay ${f.money(n.totalTax)} under the new regime and ${f.money(o.totalTax)} under the old regime for ${p.taxYear}, so the ${r.better} regime saves ${f.money(r.saving)}.`;

  return {
    errors: [],
    view: {
      betterLabel,
      saving: f.money(r.saving),
      betterSub: `${f.percent(Math.round(best.effectiveRate * 100) / 100)} of your income in tax under the ${r.better === 'old' ? 'old' : 'new'} regime`,
      newTax: f.money(n.totalTax),
      oldTax: f.money(o.totalTax),
      monthly: f.money(best.takeHome / 12),
      compareRows,
      summary,
    },
  };
}
