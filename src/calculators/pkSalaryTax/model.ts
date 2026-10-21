/** Pakistan salary tax calculator: form reading and display strings (build time and browser). */
import type { PkSalaryDefaults, PkSalaryTaxYear } from '../../countries/types';
import { calculatePkSalaryTax, validatePkSalaryInput, type PkSalaryInput } from '../../engines/pkSalaryTax';
import type { CalcView, Computed, Reader } from '../../lib/calcUi';
import { splitBar } from '../../lib/charts';
import { createFormatters } from '../../lib/format';

export interface PkSalaryPageParams {
  locale: string;
  currency: string;
  current: PkSalaryTaxYear;
  previous: PkSalaryTaxYear;
}

export function pkSalaryDefaults(d: PkSalaryDefaults): PkSalaryInput {
  return { monthlySalary: d.monthlySalary };
}

export function readPkSalaryInput(r: Reader): PkSalaryInput {
  return { monthlySalary: r.num('monthlySalary') };
}

export interface PkSalaryView extends CalcView {
  monthlyTax: string;
  monthlyTaxSub: string;
  yearlyTax: string;
  takeHome: string;
  change: string;
  changeLabel: string;
  compareRows: string;
  chartSvg: string;
}

export function buildPkSalaryView(input: PkSalaryInput, p: PkSalaryPageParams): Computed<PkSalaryView> {
  const errors = validatePkSalaryInput(input);
  if (errors.length > 0) return { errors, view: null };

  const f = createFormatters(p.locale, p.currency);
  const r = calculatePkSalaryTax(input, p);
  const c = r.current;
  const o = r.previous;
  const pct = (x: number) => f.percent(Math.round(x * 100) / 100);
  const row = (label: string, a: string, b: string, total = false) => `<tr${total ? ' class="total-row"' : ''}><th scope="row">${label}</th><td>${a}</td><td>${b}</td></tr>`;
  const compareRows = [
    row('Yearly taxable salary', f.money(r.yearlySalary), f.money(r.yearlySalary)),
    row('Income tax', f.money(c.yearlyTax - c.surcharge), f.money(o.yearlyTax - o.surcharge)),
    row('Surcharge', f.money(c.surcharge), f.money(o.surcharge)),
    row('Tax a year', f.money(c.yearlyTax), f.money(o.yearlyTax), true),
    row('Tax a month', f.money(c.monthlyTax), f.money(o.monthlyTax)),
    row('Take-home a month', f.money(c.monthlyTakeHome), f.money(o.monthlyTakeHome)),
    row('Average tax rate', pct(c.averageRate), pct(o.averageRate)),
  ].join('');

  const chartSvg = splitBar(
    [
      { value: c.monthlyTakeHome, className: 'chart-s1', tooltip: `Take-home: ${f.money(c.monthlyTakeHome)} a month` },
      { value: c.monthlyTax, className: 'chart-s2', tooltip: `Income tax: ${f.money(c.monthlyTax)} a month` },
    ],
    `Monthly salary ${f.money(input.monthlySalary)}: take-home ${f.money(c.monthlyTakeHome)} and income tax ${f.money(c.monthlyTax)}.`,
  );

  const saving = r.yearlySaving;
  const changeLabel = saving > 0.005 ? `Less than ${p.previous.label.toLowerCase()}` : saving < -0.005 ? `More than ${p.previous.label.toLowerCase()}` : `Change from ${p.previous.label.toLowerCase()}`;
  const summary =
    c.yearlyTax === 0
      ? `On a monthly salary of ${f.money(input.monthlySalary)}, you pay no income tax in ${p.current.label.toLowerCase()}, because your yearly salary is under the tax-free limit.`
      : `On a monthly salary of ${f.money(input.monthlySalary)}, your income tax for ${p.current.label.toLowerCase()} is ${f.money(c.monthlyTax)} a month (${f.money(c.yearlyTax)} a year), leaving ${f.money(c.monthlyTakeHome)} a month${saving > 0.005 ? `, which is ${f.money(saving / 12)} a month less tax than in ${p.previous.label.toLowerCase()}` : ''}.`;

  return {
    errors: [],
    view: {
      monthlyTax: f.money(c.monthlyTax),
      monthlyTaxSub: `${pct(c.averageRate)} of your salary; ${pct(c.marginalRate)} on extra income`,
      // Whole rupees in the narrow tiles (CLAUDE.md section 7).
      yearlyTax: f.moneyWhole(c.yearlyTax),
      takeHome: f.moneyWhole(c.monthlyTakeHome),
      change: f.moneyWhole(Math.abs(saving)) + (Math.abs(saving) > 0.005 ? ' a year' : ''),
      changeLabel,
      compareRows,
      chartSvg,
      summary,
    },
  };
}
