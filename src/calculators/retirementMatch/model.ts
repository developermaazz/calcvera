/** 401(k) match calculator (US): form reading and display strings (build time and browser). */
import {
  calculateRetirementMatch,
  validateRetirementMatchInput,
  type RetirementLimits,
  type RetirementMatchInput,
} from '../../engines/retirementMatch';
import type { CalcView, Computed, Reader } from '../../lib/calcUi';
import { stackedBarChart } from '../../lib/charts';
import { createFormatters } from '../../lib/format';

export interface RetirementMatchParams extends RetirementLimits {
  locale: string;
  currency: string;
  taxYear: string;
}

export function readRetirementMatchInput(r: Reader): RetirementMatchInput {
  return {
    salary: r.num('salary'),
    contributionPercent: r.num('contributionPercent', 0),
    matchRatePercent: r.num('matchRatePercent', 0),
    matchCapPercent: r.num('matchCapPercent', 0),
    age: r.num('age'),
    currentBalance: r.num('currentBalance', 0),
    retirementAge: r.num('retirementAge'),
    returnPercent: r.num('returnPercent', 0),
    salaryGrowthPercent: r.num('salaryGrowthPercent', 0),
  };
}

export interface RetirementMatchView extends CalcView {
  match: string;
  employee: string;
  total: string;
  missed: string;
  hasMissed: boolean;
  missedText: string;
  hitLimit: boolean;
  balance: string;
  retireLabel: string;
  fullMatchText: string;
  rowsHtml: string;
  chartSvg: string;
}

export function buildRetirementMatchView(input: RetirementMatchInput, p: RetirementMatchParams): Computed<RetirementMatchView> {
  const errors = validateRetirementMatchInput(input);
  if (errors.length > 0) return { errors, view: null };

  const f = createFormatters(p.locale, p.currency);
  const r = calculateRetirementMatch(input, p);
  const y = r.thisYear;
  const hasMissed = r.missedMatch > 0.005;

  // Balance makeup by year: starting balance + your money, employer money, growth.
  let you = input.currentBalance;
  let employer = 0;
  const step = Math.max(1, Math.ceil(r.rows.length / 30));
  const data = r.rows
    .map((row) => {
      you += row.employee;
      employer += row.match;
      return { row, you, employer, growth: Math.max(0, row.balance - you - employer) };
    })
    .filter((_, i, all) => i % step === step - 1 || i === all.length - 1)
    .map(({ row, you: yv, employer: ev, growth }) => ({
      label: String(row.age + 1),
      values: [yv, ev, growth],
      tooltip: `Age ${row.age + 1}: you ${f.moneyWhole(yv)}, employer ${f.moneyWhole(ev)}, growth ${f.moneyWhole(growth)}`,
    }));
  const chartSvg = stackedBarChart({
    data,
    seriesClasses: ['chart-s1', 'chart-s2', 'chart-s3'],
    formatAxis: f.moneyCompact,
    ariaLabel: `401(k) balance by age, reaching ${f.money(r.balance)} at ${input.retirementAge}. Yearly figures are in the table.`,
    xAxisLabel: 'Age',
  });

  const rowsHtml = r.rows
    .map((row) => `<tr><th scope="row">${row.age}</th><td>${f.money(row.employee)}</td><td>${f.money(row.match)}</td><td>${f.money(row.balance)}</td></tr>`)
    .join('');

  const extra = r.balanceAtFullMatch - r.balance;
  const summary = hasMissed
    ? `At ${f.percent(input.contributionPercent)}, your employer adds ${f.money(y.match)} this year, but you're leaving ${f.money(r.missedMatch)} of match unclaimed. Contributing ${f.percent(input.matchCapPercent)} would get the full match.`
    : `You put in ${f.money(y.employee)} this year and your employer adds ${f.money(y.match)}, so ${f.money(y.employee + y.match)} goes into your 401(k). That could grow to ${f.money(r.balance)} by age ${input.retirementAge}.`;

  return {
    errors: [],
    view: {
      match: f.money(y.match),
      employee: f.money(y.employee),
      total: f.money(y.employee + y.match),
      missed: f.money(r.missedMatch),
      hasMissed,
      missedText: `Raise your contribution to ${f.percent(input.matchCapPercent)} to get ${f.money(r.missedMatch)} more from your employer each year.`,
      hitLimit: y.hitDeferralLimit,
      balance: f.money(r.balance),
      retireLabel: `Projected balance at ${input.retirementAge}`,
      fullMatchText: hasMissed ? `Contributing ${f.percent(input.matchCapPercent)} instead could add about ${f.moneyWhole(extra)} by retirement.` : '',
      rowsHtml,
      chartSvg,
      summary,
    },
  };
}
