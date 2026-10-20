/** UK pension tax relief calculator: form reading and display strings (build time and browser). */
import type { PensionReliefDefaults } from '../../countries/types';
import {
  PENSION_METHODS,
  calculatePensionRelief,
  validatePensionReliefInput,
  type MethodRelief,
  type PensionReliefInput,
  type PensionReliefParams,
} from '../../engines/pensionTaxRelief';
import type { PensionMethod, UkRegion } from '../../engines/takeHomePay';
import type { FieldError } from '../../engines/validation';
import type { CalcView, Computed, Reader } from '../../lib/calcUi';
import { splitBar } from '../../lib/charts';
import { createFormatters, escapeHtml } from '../../lib/format';

export interface PensionReliefPageParams extends PensionReliefParams {
  locale: string;
  currency: string;
  taxYear: string;
}

export const METHOD_LABELS: Record<PensionMethod, string> = {
  reliefAtSource: 'Relief at source',
  netPay: 'Net pay arrangement',
  salarySacrifice: 'Salary sacrifice',
};

export interface PensionReliefForm {
  salary: number;
  region: UkRegion;
  method: PensionMethod;
  contributionType: 'percent' | 'amount';
  contributionPercent: number;
  /** Gross per month: the total going into your pension from you. */
  contributionMonthly: number;
  employerPercent: number;
  flexiblyAccessed: boolean;
}

export function pensionReliefDefaults(d: PensionReliefDefaults): PensionReliefForm {
  return { ...d, region: 'rUK', method: 'reliefAtSource', contributionType: 'percent', flexiblyAccessed: false };
}

export function readPensionReliefInput(r: Reader): PensionReliefForm {
  const method = r.text('method');
  return {
    salary: r.num('salary'),
    region: r.text('region') === 'scotland' ? 'scotland' : 'rUK',
    method: method === 'netPay' || method === 'salarySacrifice' ? method : 'reliefAtSource',
    contributionType: r.text('contributionType') === 'amount' ? 'amount' : 'percent',
    contributionPercent: r.num('contributionPercent'),
    contributionMonthly: r.num('contributionMonthly'),
    employerPercent: r.num('employerPercent', 0),
    flexiblyAccessed: r.checked('flexiblyAccessed'),
  };
}

export interface PensionReliefView extends CalcView {
  relief: string;
  reliefSub: string;
  intoPension: string;
  costMonthly: string;
  employerMonthly: string;
  hasEmployer: boolean;
  detailRows: string;
  compareRows: string;
  warnings: string;
  hasWarnings: boolean;
  chartSvg: string;
}

export function buildPensionReliefView(form: PensionReliefForm, p: PensionReliefPageParams): Computed<PensionReliefView> {
  const pre: FieldError[] = [];
  const salaryOk = Number.isFinite(form.salary) && form.salary >= 0;
  if (form.contributionType === 'percent' && !(form.contributionPercent >= 0 && form.contributionPercent <= 100)) {
    pre.push({ field: 'contributionPercent', message: 'Enter a percentage between 0 and 100.' });
  }
  if (form.contributionType === 'amount' && !(form.contributionMonthly >= 0 && form.contributionMonthly <= 1_000_000)) {
    pre.push({ field: 'contributionMonthly', message: 'Enter a monthly amount, or 0.' });
  }
  if (!(form.employerPercent >= 0 && form.employerPercent <= 100)) pre.push({ field: 'employerPercent', message: 'Enter a percentage between 0 and 100.' });
  const salary = salaryOk ? form.salary : 0;
  const contribution = form.contributionType === 'percent' ? (salary * form.contributionPercent) / 100 : form.contributionMonthly * 12;
  const input: PensionReliefInput = {
    salary: form.salary,
    region: form.region,
    method: form.method,
    contribution: Number.isFinite(contribution) ? contribution : Number.NaN,
    employerContribution: (salary * (form.employerPercent || 0)) / 100,
    flexiblyAccessed: form.flexiblyAccessed,
  };
  const errors = [...pre, ...validatePensionReliefInput(input).map((e) => (e.field === 'contribution' ? { ...e, field: form.contributionType === 'percent' ? 'contributionPercent' : 'contributionMonthly' } : e))];
  if (errors.length > 0) return { errors, view: null };

  const f = createFormatters(p.locale, p.currency);
  const r = calculatePensionRelief(input, p);
  const c = r.chosen;
  const m = (v: number) => f.money(v / 12);

  const rows: [string, number][] =
    form.method === 'reliefAtSource'
      ? [
          ['Added by your pension provider (20%)', c.reliefAddedByProvider],
          ['Extra relief to claim from HMRC', c.extraReliefToClaim],
        ]
      : form.method === 'netPay'
        ? [['Income Tax you don’t pay', c.incomeTaxSaved]]
        : [
            ['Income Tax you don’t pay', c.incomeTaxSaved],
            ['National Insurance you don’t pay', c.niSaved],
          ];
  const detailRows =
    rows.map(([label, v]) => `<tr><th scope="row">${escapeHtml(label)}</th><td>${f.money(v)}</td><td>${m(v)}</td></tr>`).join('') +
    `<tr class="total-row"><th scope="row">Total relief</th><td>${f.money(c.totalRelief)}</td><td>${m(c.totalRelief)}</td></tr>`;

  const compareRows = PENSION_METHODS.map((method) => {
    const x: MethodRelief = r.all[method];
    const chosen = method === form.method;
    return `<tr${chosen ? ' class="total-row"' : ''}><th scope="row">${escapeHtml(METHOD_LABELS[method])}${chosen ? ' (yours)' : ''}</th><td>${f.money(x.costToYou)}</td><td>${f.money(x.totalRelief)}</td></tr>`;
  }).join('');

  const warnings: string[] = [];
  if (r.overAllowance > 0) {
    warnings.push(
      `Everything going in (${f.money(r.totalIntoPension)}, including your employer’s) is ${f.money(r.overAllowance)} over your ${r.allowanceTapered ? 'tapered ' : ''}${form.flexiblyAccessed ? 'money purchase ' : ''}annual allowance of ${f.money(r.allowance)}. You may owe a tax charge, unless unused allowance from the last 3 tax years covers it.`,
    );
  } else if (r.allowanceTapered) {
    warnings.push(`Your annual allowance is tapered to ${f.money(r.allowance)} because of your income.`);
  }
  if (c.unrelieved > 0) warnings.push(`${f.money(c.unrelieved)} of your contribution is over 100% of your earnings, so it gets no tax relief.`);
  if (form.method === 'netPay' && c.totalRelief === 0 && contribution > 0) {
    warnings.push(`On a net pay arrangement you get no relief if you don’t pay Income Tax. Relief at source would add ${f.money(r.all.reliefAtSource.totalRelief)}.`);
  }
  if (form.method === 'reliefAtSource' && c.extraReliefToClaim > 0.005) {
    warnings.push(`Your provider only adds the 20%. Claim the other ${f.money(c.extraReliefToClaim)} through your Self Assessment tax return, or by contacting HMRC if you don’t file one.`);
  }

  const chartSvg = splitBar(
    [
      { value: c.costToYou, className: 'chart-s1', tooltip: `Costs you: ${f.money(c.costToYou)}` },
      { value: c.totalRelief - c.niSaved, className: 'chart-s3', tooltip: `Tax relief: ${f.money(c.totalRelief - c.niSaved)}` },
      { value: c.niSaved, className: 'chart-s4', tooltip: `National Insurance saved: ${f.money(c.niSaved)}` },
      { value: input.employerContribution, className: 'chart-rest', tooltip: `From your employer: ${f.money(input.employerContribution)}` },
    ],
    `Going into your pension each year: ${f.money(r.totalIntoPension)}. It costs you ${f.money(c.costToYou)}; tax relief adds ${f.money(c.totalRelief - c.niSaved)}${c.niSaved > 0 ? `, National Insurance savings ${f.money(c.niSaved)}` : ''}${input.employerContribution > 0 ? ` and your employer ${f.money(input.employerContribution)}` : ''}.`,
  );

  const rateText = r.marginalRate > 0 ? `${Math.round(r.marginalRate * 1000) / 10}%` : '0%';
  const summary =
    contribution === 0
      ? `With no contribution there’s no relief. Enter what you pay in to see your relief.`
      : `Putting ${f.money(contribution)} a year into your pension costs you ${f.money(c.costToYou)}: ${c.niSaved > 0 ? `tax relief and National Insurance savings of ${f.money(c.totalRelief)} make` : `tax relief of ${f.money(c.totalRelief)} makes`} up the rest. Your top rate of Income Tax is ${rateText}.`;

  return {
    errors: [],
    view: {
      relief: f.money(c.totalRelief),
      reliefSub: `a year (${m(c.totalRelief)} a month)`,
      intoPension: m(contribution),
      costMonthly: m(c.costToYou),
      employerMonthly: m(input.employerContribution),
      hasEmployer: input.employerContribution > 0,
      detailRows,
      compareRows,
      warnings: warnings.map((w) => `<li>${escapeHtml(w)}</li>`).join(''),
      hasWarnings: warnings.length > 0,
      chartSvg,
      summary,
    },
  };
}
