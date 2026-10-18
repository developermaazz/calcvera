/** UK take-home pay calculator: form reading and display strings (build time and browser). */
import type { TakeHomePayDefaults } from '../../countries/types';
import {
  calculateTakeHomePay,
  validateTakeHomePayInput,
  type PensionMethod,
  type TakeHomePayInput,
  type TakeHomePayParams,
  type UndergraduatePlan,
} from '../../engines/takeHomePay';
import type { CalcView, Computed, Reader } from '../../lib/calcUi';
import { splitBar } from '../../lib/charts';
import { createFormatters } from '../../lib/format';

export interface TakeHomePayPageParams extends TakeHomePayParams {
  locale: string;
  currency: string;
  taxYear: string;
}

export const PENSION_METHODS: { value: PensionMethod; label: string }[] = [
  { value: 'netPay', label: 'Net pay (taken before tax)' },
  { value: 'reliefAtSource', label: 'Relief at source (taken after tax)' },
  { value: 'salarySacrifice', label: 'Salary sacrifice' },
];

export const STUDENT_LOAN_PLANS: { value: UndergraduatePlan; label: string }[] = [
  { value: 'none', label: 'No student loan' },
  { value: 'plan1', label: 'Plan 1' },
  { value: 'plan2', label: 'Plan 2' },
  { value: 'plan4', label: 'Plan 4 (Scotland)' },
  { value: 'plan5', label: 'Plan 5' },
];

export function takeHomeDefaults(d: TakeHomePayDefaults): TakeHomePayInput {
  return { ...d, region: 'rUK', pensionMethod: 'netPay', undergraduatePlan: 'none', postgraduateLoan: false };
}

export function readTakeHomeInput(r: Reader): TakeHomePayInput {
  const method = r.text('pensionMethod') as PensionMethod;
  const plan = r.text('undergraduatePlan') as UndergraduatePlan;
  return {
    grossSalary: r.num('grossSalary'),
    region: r.text('region') === 'scotland' ? 'scotland' : 'rUK',
    pensionPercent: r.num('pensionPercent', 0),
    pensionMethod: PENSION_METHODS.some((m) => m.value === method) ? method : 'netPay',
    undergraduatePlan: STUDENT_LOAN_PLANS.some((p) => p.value === plan) ? plan : 'none',
    postgraduateLoan: r.checked('postgraduateLoan'),
  };
}

export interface TakeHomePayView extends CalcView {
  monthly: string;
  yearly: string;
  weekly: string;
  incomeTax: string;
  ni: string;
  studentLoan: string;
  pension: string;
  hasStudentLoan: boolean;
  hasPension: boolean;
  tableHtml: string;
  notesHtml: string;
  hasNotes: boolean;
  chartSvg: string;
}

export function buildTakeHomeView(input: TakeHomePayInput, p: TakeHomePayPageParams): Computed<TakeHomePayView> {
  const errors = validateTakeHomePayInput(input);
  if (errors.length > 0) return { errors, view: null };

  const f = createFormatters(p.locale, p.currency);
  const r = calculateTakeHomePay(input, p);

  const lines: [string, number, boolean][] = [
    ['Gross pay', input.grossSalary, true],
    ['Pension', -r.pensionFromPay, r.pensionFromPay > 0],
    ['Income Tax', -r.incomeTax, true],
    ['National Insurance', -r.nationalInsurance, true],
    ['Student loan', -r.studentLoan, r.studentLoan > 0],
  ];
  const cells = (v: number) => [v, v / 12, v / 52].map((x) => `<td>${x < 0 ? '− ' : ''}${f.money(Math.abs(x))}</td>`).join('');
  const tableHtml =
    lines
      .filter(([, , show]) => show)
      .map(([label, value]) => `<tr><th scope="row">${label}</th>${cells(value)}</tr>`)
      .join('') + `<tr class="total-row"><th scope="row">Take-home pay</th>${cells(r.takeHome)}</tr>`;

  const notes: string[] = [];
  if (r.personalAllowance < p.personalAllowance) {
    notes.push(
      `Your income is over ${f.moneyWhole(p.taperStart)}, so your Personal Allowance is reduced to ${f.money(r.personalAllowance)}. Pension contributions lower the income used for this.`,
    );
  }
  if (input.pensionMethod === 'reliefAtSource' && r.pensionFromPay > 0 && r.taxableIncome > (p.bands[input.region].find((b) => b.rate >= 0.4)?.from ?? Infinity)) {
    notes.push('As a higher or additional rate taxpayer, you can claim extra relief on relief-at-source contributions through Self Assessment. It isn\'t included here.');
  }
  if (input.pensionMethod === 'reliefAtSource' && r.pensionFromPay > 0) {
    notes.push(`Your pension provider adds ${f.money(r.pensionTotal - r.pensionFromPay)} of basic-rate tax relief, so ${f.money(r.pensionTotal)} goes into your pension in total.`);
  }
  const notesHtml = notes.map((n) => `<li>${n}</li>`).join('');

  const chartSvg = splitBar(
    [
      { value: r.takeHome, className: 'chart-s1', tooltip: `Take-home pay: ${f.money(r.takeHome)}` },
      { value: r.incomeTax, className: 'chart-s2', tooltip: `Income Tax: ${f.money(r.incomeTax)}` },
      { value: r.nationalInsurance, className: 'chart-s3', tooltip: `National Insurance: ${f.money(r.nationalInsurance)}` },
      { value: r.studentLoan, className: 'chart-s4', tooltip: `Student loan: ${f.money(r.studentLoan)}` },
      { value: r.pensionFromPay, className: 'chart-rest', tooltip: `Pension: ${f.money(r.pensionFromPay)}` },
    ],
    `Gross pay ${f.money(input.grossSalary)}: take-home ${f.money(r.takeHome)}, Income Tax ${f.money(r.incomeTax)}, National Insurance ${f.money(r.nationalInsurance)}, student loan ${f.money(r.studentLoan)}, pension ${f.money(r.pensionFromPay)}.`,
  );

  const deductions = [`${f.money(r.incomeTax)} Income Tax`, `${f.money(r.nationalInsurance)} National Insurance`];
  if (r.studentLoan > 0) deductions.push(`${f.money(r.studentLoan)} student loan`);
  if (r.pensionFromPay > 0) deductions.push(`${f.money(r.pensionFromPay)} pension`);
  const last = deductions.pop();
  const summary = `On ${f.money(input.grossSalary)} a year, you'd take home ${f.money(r.takeHome)}, or ${f.money(r.takeHome / 12)} a month, after ${deductions.join(', ')}${deductions.length ? ' and ' : ''}${last}.`;

  return {
    errors: [],
    view: {
      monthly: f.money(r.takeHome / 12),
      yearly: f.money(r.takeHome),
      weekly: f.money(r.takeHome / 52),
      incomeTax: f.money(r.incomeTax),
      ni: f.money(r.nationalInsurance),
      studentLoan: f.money(r.studentLoan),
      pension: f.money(r.pensionFromPay),
      hasStudentLoan: r.studentLoan > 0,
      hasPension: r.pensionFromPay > 0,
      tableHtml,
      notesHtml,
      hasNotes: notes.length > 0,
      chartSvg,
      summary,
    },
  };
}
