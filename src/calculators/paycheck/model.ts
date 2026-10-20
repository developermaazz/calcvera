/** US paycheck calculator: form reading and display strings (build time and browser). */
import type { PaycheckDefaults } from '../../countries/types';
import { PAY_PERIODS, calculatePaycheck, validatePaycheckInput, type PayFrequency, type PaycheckInput, type PaycheckLines, type PaycheckParams, type W4Status } from '../../engines/paycheck';
import type { CalcView, Computed, Reader } from '../../lib/calcUi';
import { splitBar } from '../../lib/charts';
import { createFormatters, escapeHtml } from '../../lib/format';

export interface PaycheckPageParams extends PaycheckParams {
  locale: string;
  currency: string;
  taxYear: string;
}

export const FREQUENCY_LABELS: Record<PayFrequency, string> = {
  weekly: 'Weekly (52 paychecks)',
  biweekly: 'Every two weeks (26)',
  semimonthly: 'Twice a month (24)',
  monthly: 'Monthly (12)',
};

const FREQUENCY_WORD: Record<PayFrequency, string> = { weekly: 'weekly', biweekly: 'every two weeks', semimonthly: 'twice a month', monthly: 'monthly' };

export function paycheckDefaults(d: PaycheckDefaults): PaycheckInput {
  return {
    payType: 'salary',
    annualSalary: d.annualSalary,
    hourlyRate: d.hourlyRate,
    hoursPerWeek: d.hoursPerWeek,
    frequency: 'biweekly',
    status: 'single',
    multipleJobs: false,
    dependentsCredit: 0,
    otherIncome: 0,
    deductions: 0,
    extraWithholding: 0,
    retirementPercent: d.retirementPercent,
    pretaxBenefits: d.pretaxBenefits,
    stateTaxPercent: 0,
  };
}

export function readPaycheckInput(r: Reader): PaycheckInput {
  const status = r.text('status');
  const frequency = r.text('frequency');
  return {
    payType: r.text('payType') === 'hourly' ? 'hourly' : 'salary',
    annualSalary: r.num('annualSalary'),
    hourlyRate: r.num('hourlyRate'),
    hoursPerWeek: r.num('hoursPerWeek'),
    frequency: (frequency in PAY_PERIODS ? frequency : 'biweekly') as PayFrequency,
    status: (status === 'marriedJoint' || status === 'headOfHousehold' ? status : 'single') as W4Status,
    multipleJobs: r.checked('multipleJobs'),
    dependentsCredit: r.num('dependentsCredit', 0),
    otherIncome: r.num('otherIncome', 0),
    deductions: r.num('deductions', 0),
    extraWithholding: r.num('extraWithholding', 0),
    retirementPercent: r.num('retirementPercent', 0),
    pretaxBenefits: r.num('pretaxBenefits', 0),
    stateTaxPercent: r.num('stateTaxPercent', 0),
  };
}

export interface PaycheckView extends CalcView {
  takeHome: string;
  takeHomeSub: string;
  federal: string;
  fica: string;
  pretax: string;
  rows: string;
  notes: string;
  hasNotes: boolean;
  chartSvg: string;
}

export function buildPaycheckView(input: PaycheckInput, p: PaycheckPageParams): Computed<PaycheckView> {
  const errors = validatePaycheckInput(input);
  if (errors.length > 0) return { errors, view: null };

  const f = createFormatters(p.locale, p.currency);
  const r = calculatePaycheck(input, p);
  const a = r.annual;
  const one = r.perPaycheck;

  const lines: [string, keyof PaycheckLines, boolean][] = [
    ['Gross pay', 'gross', false],
    ['401(k) or 403(b), pre-tax', 'retirement', true],
    ['Pre-tax benefits', 'benefits', true],
    ['Federal income tax withheld', 'federalIncomeTax', true],
    ['Social Security (6.2%)', 'socialSecurity', true],
    ['Medicare (1.45%)', 'medicare', true],
    ['State and local tax', 'stateTax', true],
  ];
  const rows =
    lines
      .filter(([, key]) => key === 'gross' || a[key] > 0 || key === 'federalIncomeTax' || key === 'socialSecurity' || key === 'medicare')
      .map(([label, key, minus]) => `<tr><th scope="row">${escapeHtml(label)}</th><td>${minus ? '− ' : ''}${f.money(one[key])}</td><td>${minus ? '− ' : ''}${f.money(a[key])}</td></tr>`)
      .join('') + `<tr class="total-row"><th scope="row">Take-home pay</th><td>${f.money(one.takeHome)}</td><td>${f.money(a.takeHome)}</td></tr>`;

  const notes: string[] = [];
  if (r.socialSecurityCapped) notes.push(`Social Security stops once your wages for the year reach ${f.moneyWhole(p.socialSecurityWageBase)}, so your last paychecks of the year are bigger. The yearly column includes this.`);
  if (r.additionalMedicare) notes.push(`An extra 0.9% Medicare tax is withheld on wages over ${f.moneyWhole(p.additionalMedicareThreshold)} in the year. The yearly column includes it.`);
  if (input.stateTaxPercent === 0) notes.push('State and local income taxes aren’t included. Enter your state’s rate to estimate them.');

  const chartSvg = splitBar(
    [
      { value: a.takeHome, className: 'chart-s1', tooltip: `Take-home pay: ${f.money(a.takeHome)}` },
      { value: a.federalIncomeTax, className: 'chart-s2', tooltip: `Federal income tax: ${f.money(a.federalIncomeTax)}` },
      { value: a.socialSecurity + a.medicare, className: 'chart-s4', tooltip: `Social Security and Medicare: ${f.money(a.socialSecurity + a.medicare)}` },
      { value: a.retirement + a.benefits, className: 'chart-s3', tooltip: `Pre-tax 401(k) and benefits: ${f.money(a.retirement + a.benefits)}` },
      { value: a.stateTax, className: 'chart-rest', tooltip: `State and local tax: ${f.money(a.stateTax)}` },
    ],
    `Gross pay of ${f.money(a.gross)} a year: take-home ${f.money(a.takeHome)}, federal income tax ${f.money(a.federalIncomeTax)}, Social Security and Medicare ${f.money(a.socialSecurity + a.medicare)}, pre-tax deductions ${f.money(a.retirement + a.benefits)}${a.stateTax > 0 ? `, state and local tax ${f.money(a.stateTax)}` : ''}.`,
  );

  const summary = `On ${f.money(a.gross)} a year paid ${FREQUENCY_WORD[input.frequency]}, your paycheck is ${f.money(one.takeHome)} after ${f.money(one.federalIncomeTax)} federal income tax, ${f.money(one.socialSecurity + one.medicare)} Social Security and Medicare${one.retirement + one.benefits > 0 ? ` and ${f.money(one.retirement + one.benefits)} of pre-tax deductions` : ''}${one.stateTax > 0 ? `, plus ${f.money(one.stateTax)} state and local tax` : ''}.`;

  return {
    errors: [],
    view: {
      takeHome: f.money(one.takeHome),
      takeHomeSub: `per paycheck · ${f.money(a.takeHome)} a year`,
      federal: f.money(one.federalIncomeTax),
      fica: f.money(one.socialSecurity + one.medicare),
      pretax: f.money(one.retirement + one.benefits),
      rows,
      notes: notes.map((n) => `<li>${escapeHtml(n)}</li>`).join(''),
      hasNotes: notes.length > 0,
      chartSvg,
      summary,
    },
  };
}
