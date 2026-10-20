/** Australian take-home pay calculator: form reading and display strings (build time and browser). */
import type { AuTakeHomeDefaults } from '../../countries/types';
import { calculateAuTakeHome, validateAuTakeHomeInput, type AuTakeHomeInput, type AuTakeHomeParams } from '../../engines/auTakeHome';
import type { CalcView, Computed, Reader } from '../../lib/calcUi';
import { splitBar } from '../../lib/charts';
import { createFormatters, escapeHtml } from '../../lib/format';

export interface AuTakeHomePageParams extends AuTakeHomeParams {
  locale: string;
  currency: string;
  taxYear: string;
  /** Income year of the Medicare levy low-income thresholds, when older than the tax year. */
  medicareThresholdsYear: string;
}

export type PayPeriod = 'week' | 'fortnight' | 'month' | 'year';
export const PERIODS: { value: PayPeriod; label: string; per: number }[] = [
  { value: 'week', label: 'Weekly', per: 52 },
  { value: 'fortnight', label: 'Fortnightly', per: 26 },
  { value: 'month', label: 'Monthly', per: 12 },
  { value: 'year', label: 'Yearly', per: 1 },
];

export interface AuTakeHomeFormInput extends AuTakeHomeInput {
  period: PayPeriod;
}

export function auTakeHomeDefaults(d: AuTakeHomeDefaults): AuTakeHomeFormInput {
  return { salary: d.salary, includesSuper: false, salarySacrifice: 0, hasHelpDebt: false, hasPrivateHospitalCover: true, period: 'fortnight' };
}

export function readAuTakeHomeInput(r: Reader): AuTakeHomeFormInput {
  const period = r.text('period') as PayPeriod;
  return {
    salary: r.num('salary'),
    includesSuper: r.checked('includesSuper'),
    salarySacrifice: r.num('salarySacrifice', 0),
    hasHelpDebt: r.checked('hasHelpDebt'),
    hasPrivateHospitalCover: !r.checked('noPrivateCover'),
    period: PERIODS.some((x) => x.value === period) ? period : 'fortnight',
  };
}

export interface AuTakeHomeView extends CalcView {
  takeHomeLabel: string;
  takeHome: string;
  takeHomeSub: string;
  incomeTax: string;
  medicare: string;
  super: string;
  tableHtml: string;
  notes: string;
  hasNotes: boolean;
  chartSvg: string;
}

export function buildAuTakeHomeView(input: AuTakeHomeFormInput, p: AuTakeHomePageParams): Computed<AuTakeHomeView> {
  const errors = validateAuTakeHomeInput(input);
  if (errors.length > 0) return { errors, view: null };

  const f = createFormatters(p.locale, p.currency);
  const r = calculateAuTakeHome(input, p);
  const period = PERIODS.find((x) => x.value === input.period)!;
  const medicare = r.medicareLevy + r.medicareLevySurcharge;

  const lines: [string, number, boolean][] = [
    ['Salary', r.baseSalary, true],
    ['Salary sacrifice to super', -(r.baseSalary - r.taxableIncome), r.baseSalary > r.taxableIncome],
    ['Income tax', -r.incomeTax, true],
    ['Medicare levy', -r.medicareLevy, true],
    ['Medicare levy surcharge', -r.medicareLevySurcharge, r.medicareLevySurcharge > 0],
    ['HELP repayment', -r.helpRepayment, r.helpRepayment > 0],
  ];
  const cells = (v: number) =>
    PERIODS.slice()
      .reverse()
      .map((x) => `<td>${v < 0 ? '− ' : ''}${f.money(Math.abs(v) / x.per)}</td>`)
      .join('');
  const tableHtml =
    lines
      .filter(([, , show]) => show)
      .map(([label, value]) => `<tr><th scope="row">${label}</th>${cells(value)}</tr>`)
      .join('') +
    `<tr class="total-row"><th scope="row">Take-home pay</th>${cells(r.takeHome)}</tr>` +
    `<tr><th scope="row">Super (paid by your employer)</th>${cells(r.totalSuper)}</tr>`;

  const notes: string[] = [];
  if (input.includesSuper) notes.push(`Your package of ${f.money(input.salary)} is ${f.money(r.baseSalary)} salary plus ${f.money(r.superGuarantee)} super guarantee.`);
  if (r.overConcessionalCap) {
    notes.push(`Your super contributions of ${f.money(r.totalSuper)} are over the ${f.moneyWhole(p.super.concessionalCap)} concessional contributions cap for ${p.taxYear}. Extra contributions are taxed at your marginal rate.`);
  }
  if (r.medicareLevySurcharge > 0) {
    notes.push(`Without private hospital cover, you pay the Medicare levy surcharge at ${f.percent(r.mlsRate * 100)} (${f.money(r.medicareLevySurcharge)} a year).`);
  }
  if (p.medicareThresholdsYear !== p.taxYear && r.taxableIncome <= p.tax.medicare.lowIncomeUpperThreshold) {
    notes.push(`Your Medicare levy is reduced on a low income. This uses the ATO's ${p.medicareThresholdsYear} thresholds until the ${p.taxYear} figures are published.`);
  }

  const chartSvg = splitBar(
    [
      { value: r.takeHome, className: 'chart-s1', tooltip: `Take-home pay: ${f.money(r.takeHome)}` },
      { value: r.incomeTax, className: 'chart-s2', tooltip: `Income tax: ${f.money(r.incomeTax)}` },
      { value: medicare, className: 'chart-s3', tooltip: `Medicare levy${r.medicareLevySurcharge > 0 ? ' and surcharge' : ''}: ${f.money(medicare)}` },
      { value: r.helpRepayment, className: 'chart-s4', tooltip: `HELP repayment: ${f.money(r.helpRepayment)}` },
      { value: r.baseSalary - r.taxableIncome, className: 'chart-rest', tooltip: `Salary sacrifice: ${f.money(r.baseSalary - r.taxableIncome)}` },
    ],
    `Salary ${f.money(r.baseSalary)}: take-home ${f.money(r.takeHome)}, income tax ${f.money(r.incomeTax)}, Medicare ${f.money(medicare)}, HELP ${f.money(r.helpRepayment)}, salary sacrifice ${f.money(r.baseSalary - r.taxableIncome)}.`,
  );

  const parts = [`${f.money(r.incomeTax)} income tax`, `${f.money(medicare)} Medicare levy${r.medicareLevySurcharge > 0 ? ' and surcharge' : ''}`];
  if (r.helpRepayment > 0) parts.push(`${f.money(r.helpRepayment)} HELP repayments`);
  const last = parts.pop();
  const summary = `On a ${f.money(r.baseSalary)} salary, you'd take home ${f.money(r.takeHome)} a year, or ${f.money(r.takeHome / 26)} a fortnight, after ${parts.join(', ')} and ${last}. Your employer also pays ${f.money(r.superGuarantee)} into your super.`;

  return {
    errors: [],
    view: {
      takeHomeLabel: `${period.label} take-home pay`,
      takeHome: f.money(r.takeHome / period.per),
      takeHomeSub: `${f.money(r.takeHome)} a year, ${f.percent(Math.round(r.effectiveTaxRate * 100) / 100)} average tax and Medicare`,
      incomeTax: f.money(r.incomeTax),
      medicare: f.money(medicare),
      super: f.money(r.totalSuper),
      tableHtml,
      notes: notes.map((n) => `<li>${escapeHtml(n)}</li>`).join(''),
      hasNotes: notes.length > 0,
      chartSvg,
      summary,
    },
  };
}
