/** US Roth IRA calculator: form reading and display strings (build time and browser). */
import type { RothIraDefaults } from '../../countries/types';
import { calculateRothIra, validateRothInput, type RothFilingStatus, type RothInput, type RothParams } from '../../engines/rothIra';
import type { CalcView, Computed, Reader } from '../../lib/calcUi';
import { stackedBarChart } from '../../lib/charts';
import { createFormatters, escapeHtml } from '../../lib/format';

export interface RothPageParams extends RothParams {
  locale: string;
  currency: string;
  taxYear: string;
}

export function rothDefaults(d: RothIraDefaults): RothInput {
  return { ...d, status: 'single', compensation: d.magi };
}

export function readRothInput(r: Reader): RothInput {
  const status = r.text('status');
  const magi = r.num('magi');
  const compensation = r.num('compensation', Number.NaN);
  return {
    age: r.num('age'),
    retirementAge: r.num('retirementAge'),
    currentBalance: r.num('currentBalance', 0),
    plannedContribution: r.num('plannedContribution', 0),
    status: (['headOfHousehold', 'marriedJoint', 'marriedSeparate'].includes(status) ? status : 'single') as RothFilingStatus,
    magi,
    // Taxable compensation defaults to MAGI when left empty.
    compensation: Number.isFinite(compensation) ? compensation : magi,
    returnPercent: r.num('returnPercent'),
  };
}

export interface RothView extends CalcView {
  balanceLabel: string;
  balance: string;
  balanceSub: string;
  limit: string;
  contribution: string;
  growth: string;
  notes: string;
  hasNotes: boolean;
  chartSvg: string;
  yearRows: string;
}

export function buildRothView(input: RothInput, p: RothPageParams): Computed<RothView> {
  const errors = validateRothInput(input);
  if (errors.length > 0) return { errors, view: null };

  const f = createFormatters(p.locale, p.currency);
  const r = calculateRothIra(input, p);

  let paidIn = input.currentBalance;
  const chartSvg = stackedBarChart({
    data: r.rows.map((y) => {
      paidIn += y.contribution;
      return {
        label: String(y.age + 1),
        values: [paidIn, Math.max(0, y.balance - paidIn)],
        tooltip: `Age ${y.age + 1}: ${f.money(y.balance)} (contributed ${f.money(paidIn)}, growth ${f.money(y.balance - paidIn)})`,
      };
    }),
    seriesClasses: ['chart-s1', 'chart-s3'],
    formatAxis: f.moneyCompact,
    ariaLabel: `Roth IRA balance by age, reaching ${f.money(r.balance)} at ${input.retirementAge}: ${f.money(input.currentBalance + r.totalContributions)} contributed and ${f.money(r.growth)} growth. Full figures are in the table.`,
    xAxisLabel: 'Age',
  });
  const yearRows = r.rows.map((y) => `<tr><th scope="row">${y.age}</th><td>${f.money(y.contribution)}</td><td>${f.money(y.balance)}</td></tr>`).join('');

  const notes: string[] = [];
  if (r.allowedThisYear === 0) {
    notes.push(`At this income you can't contribute to a Roth IRA for ${p.taxYear}: the limit phases out completely for your filing status. Any money already in the account keeps growing.`);
  } else if (r.reduced) {
    notes.push(`Your income reduces your ${p.taxYear} limit from ${f.money(r.fullLimit)} to ${f.money(r.allowedThisYear)}.`);
  }
  if (input.plannedContribution > r.allowedThisYear && r.allowedThisYear > 0) {
    notes.push(`You planned ${f.money(input.plannedContribution)}, but your limit this year is ${f.money(r.allowedThisYear)}, so the projection uses ${f.money(r.allowedThisYear)}.`);
  }
  if (input.compensation < p.contributionLimit) notes.push(`You can't contribute more than your taxable compensation (${f.money(input.compensation)}).`);

  const summary =
    r.totalContributions === 0 && input.currentBalance === 0
      ? `With no contributions allowed or planned, there's nothing to grow.`
      : `Contributing ${f.money(r.contributionThisYear)} a year from age ${input.age} at a ${f.percent(input.returnPercent)} return, your Roth IRA could reach ${f.money(r.balance)} by ${input.retirementAge}. ${f.money(r.growth)} of that is growth, which you can take out tax-free once the withdrawal rules are met.`;

  return {
    errors: [],
    view: {
      balanceLabel: `Roth IRA at age ${input.retirementAge}`,
      balance: f.money(r.balance),
      balanceSub: `${f.money(input.currentBalance + r.totalContributions)} contributed · ${f.money(r.growth)} tax-free growth`,
      limit: f.money(r.allowedThisYear),
      contribution: f.money(r.contributionThisYear),
      growth: f.money(r.growth),
      notes: notes.map((n) => `<li>${escapeHtml(n)}</li>`).join(''),
      hasNotes: notes.length > 0,
      chartSvg,
      yearRows,
      summary,
    },
  };
}
