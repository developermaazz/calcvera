/** Quarterly estimated tax calculator (US): defaults, form reading and display strings (build time and browser). */
import type { UsFilingStatus } from '../../countries/types';
import {
  calculateSelfEmploymentTax,
  validateSelfEmploymentTaxInput,
  type SelfEmploymentTaxInput,
  type SelfEmploymentTaxParams,
} from '../../engines/selfEmploymentTax';
import type { CalcView, Computed, Reader } from '../../lib/calcUi';
import { splitBar } from '../../lib/charts';
import { createFormatters } from '../../lib/format';

export interface QuarterlyTaxParams {
  locale: string;
  currency: string;
  taxYear: string;
  byStatus: Record<UsFilingStatus, SelfEmploymentTaxParams>;
  dueDates: [string, string, string, string];
}

export const FILING_STATUS_OPTIONS: { value: UsFilingStatus; label: string }[] = [
  { value: 'single', label: 'Single' },
  { value: 'marriedJoint', label: 'Married filing jointly' },
  { value: 'marriedSeparate', label: 'Married filing separately' },
  { value: 'headOfHousehold', label: 'Head of household' },
];

export const QUARTERLY_DEFAULTS: SelfEmploymentTaxInput = {
  netSelfEmployment: 60_000,
  filingStatus: 'single',
  wages: 0,
  otherIncome: 0,
  deduction: 'standard',
  itemizedAmount: 0,
  taxWithheld: 0,
};

const STATUSES = FILING_STATUS_OPTIONS.map((o) => o.value);

export function readQuarterlyInput(r: Reader): SelfEmploymentTaxInput {
  const status = r.text('filingStatus') as UsFilingStatus;
  return {
    netSelfEmployment: r.num('netSelfEmployment'),
    filingStatus: STATUSES.includes(status) ? status : 'single',
    wages: r.num('wages', 0),
    otherIncome: r.num('otherIncome', 0),
    deduction: r.text('deduction') === 'itemized' ? 'itemized' : 'standard',
    itemizedAmount: r.num('itemizedAmount', 0),
    taxWithheld: r.num('taxWithheld', 0),
  };
}

export interface QuarterlyTaxView extends CalcView {
  quarterly: string;
  totalTax: string;
  seTax: string;
  incomeTax: string;
  additionalMedicare: string;
  hasAdditionalMedicare: boolean;
  qbi: string;
  taxableIncome: string;
  withheld: string;
  hasWithholding: boolean;
  qbiLimited: boolean;
  scheduleHtml: string;
  chartSvg: string;
}

export function buildQuarterlyView(input: SelfEmploymentTaxInput, p: QuarterlyTaxParams): Computed<QuarterlyTaxView> {
  const errors = validateSelfEmploymentTaxInput(input);
  if (errors.length > 0) return { errors, view: null };

  const f = createFormatters(p.locale, p.currency);
  const r = calculateSelfEmploymentTax(input, p.byStatus[input.filingStatus]);
  const labels = ['1st payment', '2nd payment', '3rd payment', '4th payment'];
  const scheduleHtml = p.dueDates
    .map((iso, i) => `<tr><th scope="row">${labels[i]}</th><td>${f.date(iso)}</td><td>${f.money(r.quarterlyPayment)}</td></tr>`)
    .join('');

  const chartSvg = splitBar(
    [
      { value: r.selfEmploymentTax, className: 'chart-s1', tooltip: `Self-employment tax: ${f.money(r.selfEmploymentTax)}` },
      { value: r.incomeTax, className: 'chart-s2', tooltip: `Federal income tax: ${f.money(r.incomeTax)}` },
      { value: r.additionalMedicareTax, className: 'chart-s3', tooltip: `Additional Medicare Tax: ${f.money(r.additionalMedicareTax)}` },
    ],
    `Total federal tax ${f.money(r.totalTax)}: self-employment tax ${f.money(r.selfEmploymentTax)}, income tax ${f.money(r.incomeTax)}, Additional Medicare Tax ${f.money(r.additionalMedicareTax)}.`,
  );

  const afterWithholding =
    input.taxWithheld > 0 ? `, or ${f.money(r.remaining)} after the ${f.money(input.taxWithheld)} withheld from your wages` : '';
  const summary =
    r.remaining < 0.005
      ? `Your withholding covers your estimated ${f.money(r.totalTax)} of federal tax for ${p.taxYear}, so no quarterly payments are needed.`
      : `You'd owe about ${f.money(r.totalTax)} in federal tax for ${p.taxYear}${afterWithholding}: four payments of ${f.money(r.quarterlyPayment)}, the first due ${f.date(p.dueDates[0])}.`;

  return {
    errors: [],
    view: {
      quarterly: f.money(r.quarterlyPayment),
      totalTax: f.money(r.totalTax),
      seTax: f.money(r.selfEmploymentTax),
      incomeTax: f.money(r.incomeTax),
      additionalMedicare: f.money(r.additionalMedicareTax),
      hasAdditionalMedicare: r.additionalMedicareTax > 0.005,
      qbi: f.money(r.qbiDeduction),
      taxableIncome: f.money(r.taxableIncome),
      withheld: f.money(input.taxWithheld),
      hasWithholding: input.taxWithheld > 0,
      qbiLimited: r.qbiLimited,
      scheduleHtml,
      chartSvg,
      summary,
    },
  };
}
