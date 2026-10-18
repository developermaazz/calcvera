/** Inheritance Tax calculator (UK): defaults, form reading and display strings (build time and browser). */
import {
  calculateInheritanceTax,
  validateInheritanceTaxInput,
  type InheritanceTaxInput,
  type InheritanceTaxParams,
  type MaritalStatus,
} from '../../engines/inheritanceTax';
import type { CalcView, Computed, Reader } from '../../lib/calcUi';
import { splitBar } from '../../lib/charts';
import { createFormatters } from '../../lib/format';

export interface InheritanceTaxPageParams extends InheritanceTaxParams {
  locale: string;
  currency: string;
}

export const IHT_DEFAULTS: InheritanceTaxInput = {
  estateValue: 750_000,
  debtsAndFuneral: 15_000,
  giftsLast7Years: 0,
  homeToDescendants: true,
  homeValue: 350_000,
  maritalStatus: 'single',
  leftToSpouse: 0,
  transferredNrbPercent: 100,
  transferredRnrbPercent: 100,
  charityPercent: 0,
};

export const MARITAL_OPTIONS: { value: MaritalStatus; label: string }[] = [
  { value: 'single', label: 'Single or divorced' },
  { value: 'married', label: 'Married or in a civil partnership' },
  { value: 'widowed', label: 'Widowed (spouse or civil partner died first)' },
];

export function readInheritanceTaxInput(r: Reader): InheritanceTaxInput {
  const status = r.text('maritalStatus');
  return {
    estateValue: r.num('estateValue'),
    debtsAndFuneral: r.num('debtsAndFuneral', 0),
    giftsLast7Years: r.num('giftsLast7Years', 0),
    homeToDescendants: r.checked('homeToDescendants'),
    homeValue: r.num('homeValue', 0),
    maritalStatus: status === 'married' || status === 'widowed' ? status : 'single',
    leftToSpouse: r.num('leftToSpouse', 0),
    transferredNrbPercent: r.num('transferredNrbPercent', 0),
    transferredRnrbPercent: r.num('transferredRnrbPercent', 0),
    charityPercent: r.num('charityPercent', 0),
  };
}

export interface InheritanceTaxView extends CalcView {
  tax: string;
  taxable: string;
  rate: string;
  thresholdTotal: string;
  breakdownHtml: string;
  notesHtml: string;
  hasNotes: boolean;
  chartSvg: string;
}

export function buildInheritanceTaxView(input: InheritanceTaxInput, p: InheritanceTaxPageParams): Computed<InheritanceTaxView> {
  const errors = validateInheritanceTaxInput(input);
  if (errors.length > 0) return { errors, view: null };

  const f = createFormatters(p.locale, p.currency);
  const r = calculateInheritanceTax(input, p);
  const thresholdTotal = r.nilRateBandAvailable + r.residenceBandUsed;
  const rateText = f.percent(r.rate * 100);

  const rows: [string, string][] = [
    ['Estate after debts and funeral costs', f.money(r.netEstate)],
    ...(r.spouseExempt > 0 ? ([['Left to spouse or civil partner (exempt)', `− ${f.money(r.spouseExempt)}`]] as [string, string][]) : []),
    ...(r.charityExempt > 0 ? ([['Left to charity (exempt)', `− ${f.money(r.charityExempt)}`]] as [string, string][]) : []),
    ['Nil-rate band available', `− ${f.money(r.nilRateBandAvailable)}`],
    ...(input.homeToDescendants ? ([['Residence nil-rate band used', `− ${f.money(r.residenceBandUsed)}`]] as [string, string][]) : []),
    ['Taxable amount', f.money(r.taxableAmount)],
    [`Tax at ${rateText}`, f.money(r.tax)],
  ];
  const breakdownHtml = rows.map(([label, value]) => `<tr><th scope="row">${label}</th><td>${value}</td></tr>`).join('');

  const notes: string[] = [];
  if (r.residenceBandTaper > 0 && input.homeToDescendants) {
    notes.push(
      `Your estate is over ${f.moneyWhole(p.taperThreshold)}, so the residence nil-rate band is reduced by ${f.money(Math.min(r.residenceBandTaper, r.residenceBandMax))}.`,
    );
  }
  if (input.homeToDescendants && input.homeValue < r.residenceBandMax - r.residenceBandTaper) {
    notes.push('The residence nil-rate band is limited to the value of the home passed to your direct descendants.');
  }
  if (r.giftsExceedNilRateBand) {
    notes.push('Your gifts in the last 7 years are more than the nil-rate band. Tax may be due on the gifts themselves; this calculator only covers the estate.');
  }
  if (r.charityExempt > 0 && !r.charityRateApplies) {
    notes.push(
      `To get the 36% rate, gifts to charity must be at least 10% of the baseline amount: about ${f.money(r.charityNeededForReducedRate)} here.`,
    );
  }
  if (r.charityRateApplies) notes.push('At least 10% of the baseline amount goes to charity, so the reduced 36% rate applies.');
  const notesHtml = notes.map((n) => `<li>${n}</li>`).join('');

  const taxed = r.taxableAmount;
  const exempt = r.spouseExempt + r.charityExempt;
  const covered = Math.max(0, r.netEstate - exempt - taxed);
  const chartSvg = splitBar(
    [
      { value: covered, className: 'chart-s1', tooltip: `Covered by tax-free bands: ${f.money(covered)}` },
      { value: exempt, className: 'chart-s2', tooltip: `Exempt (spouse and charity): ${f.money(exempt)}` },
      { value: taxed, className: 'chart-s3', tooltip: `Taxed at ${rateText}: ${f.money(taxed)}` },
    ],
    `Estate of ${f.money(r.netEstate)}: ${f.money(covered)} covered by tax-free bands, ${f.money(exempt)} exempt, ${f.money(taxed)} taxed.`,
  );

  const summary =
    r.tax < 0.005
      ? `No Inheritance Tax is due: your tax-free bands and exemptions cover the whole ${f.money(r.netEstate)} estate.`
      : `Inheritance Tax of ${f.money(r.tax)} would be due: ${rateText} on the ${f.money(r.taxableAmount)} above your tax-free bands of ${f.money(thresholdTotal)}.`;

  return {
    errors: [],
    view: {
      tax: f.money(r.tax),
      taxable: f.money(r.taxableAmount),
      rate: rateText,
      thresholdTotal: f.money(thresholdTotal),
      breakdownHtml,
      notesHtml,
      hasNotes: notes.length > 0,
      chartSvg,
      summary,
    },
  };
}
