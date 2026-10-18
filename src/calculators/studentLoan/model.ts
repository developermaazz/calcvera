/** UK student loan repayment calculator: form reading and display strings (build time and browser). */
import type { UkStudentLoanPlanCode } from '../../countries/types';
import { calculateStudentLoan, validateStudentLoanInput, type StudentLoanInput, type StudentLoanParams } from '../../engines/studentLoan';
import type { CalcView, Computed, Reader } from '../../lib/calcUi';
import { stackedBarChart } from '../../lib/charts';
import { createFormatters } from '../../lib/format';

export interface StudentLoanPageParams extends StudentLoanParams {
  locale: string;
  currency: string;
}

export const PLAN_OPTIONS: { value: UkStudentLoanPlanCode; label: string }[] = [
  { value: 'plan1', label: 'Plan 1' },
  { value: 'plan2', label: 'Plan 2' },
  { value: 'plan4', label: 'Plan 4 (Scotland)' },
  { value: 'plan5', label: 'Plan 5' },
  { value: 'postgraduate', label: 'Postgraduate Loan' },
];

export function readStudentLoanInput(r: Reader): StudentLoanInput {
  const plan = r.text('plan') as UkStudentLoanPlanCode;
  return {
    plan: PLAN_OPTIONS.some((o) => o.value === plan) ? plan : 'plan2',
    balance: r.num('balance'),
    salary: r.num('salary', 0),
    salaryGrowthPercent: r.num('salaryGrowthPercent', 0),
    yearsRepaid: r.num('yearsRepaid', 0),
  };
}

export interface StudentLoanView extends CalcView {
  monthly: string;
  rate: string;
  outcomeLabel: string;
  outcome: string;
  totalRepaid: string;
  writtenOff: string;
  hasWriteOff: boolean;
  rowsHtml: string;
  chartSvg: string;
}

export function buildStudentLoanView(input: StudentLoanInput, p: StudentLoanPageParams): Computed<StudentLoanView> {
  const errors = validateStudentLoanInput(input, p);
  if (errors.length > 0) return { errors, view: null };

  const f = createFormatters(p.locale, p.currency);
  const r = calculateStudentLoan(input, p);
  const years = (n: number) => `${n} ${n === 1 ? 'year' : 'years'}`;
  const planLabel = PLAN_OPTIONS.find((o) => o.value === input.plan)?.label ?? 'Your plan';

  const step = Math.max(1, Math.ceil(r.rows.length / 30));
  const chartSvg = stackedBarChart({
    data: r.rows
      .filter((_, i, all) => i % step === step - 1 || i === all.length - 1)
      .map((row) => ({
        label: String(row.year),
        values: [row.balance],
        tooltip: `Year ${row.year}: balance ${f.moneyWhole(row.balance)}, repaid ${f.moneyWhole(row.repaid)}, interest ${f.moneyWhole(row.interest)}`,
      })),
    seriesClasses: ['chart-s2'],
    formatAxis: f.moneyCompact,
    ariaLabel: `Loan balance at the end of each year for ${years(r.years)}. Yearly figures are in the table.`,
    xAxisLabel: 'Year',
  });

  const rowsHtml = r.rows
    .map(
      (row) =>
        `<tr><th scope="row">${row.year}</th><td>${f.moneyWhole(row.salary)}</td><td>${f.money(row.repaid)}</td><td>${f.money(row.interest)}</td><td>${f.money(row.balance)}</td></tr>`,
    )
    .join('');

  const summary = r.paidOff
    ? `On ${planLabel}, you'd repay ${f.money(r.monthlyRepayment)} a month now and clear the loan in ${years(r.years)}, repaying ${f.money(r.totalRepaid)} in total.`
    : r.totalRepaid < 0.005
      ? `Your income is below the ${planLabel} threshold, so you'd repay nothing now. If that doesn't change, the loan is written off in ${years(r.years)}.`
      : `On ${planLabel}, you'd repay ${f.money(r.monthlyRepayment)} a month now. You'd repay ${f.money(r.totalRepaid)} before the remaining ${f.money(r.writtenOff)} is written off in ${years(r.years)}.`;

  return {
    errors: [],
    view: {
      monthly: f.money(r.monthlyRepayment),
      rate: f.percent(r.interestRate * 100),
      outcomeLabel: r.paidOff ? 'Repaid in' : 'Written off in',
      outcome: years(r.years),
      totalRepaid: f.money(r.totalRepaid),
      writtenOff: f.money(r.writtenOff),
      hasWriteOff: !r.paidOff,
      rowsHtml,
      chartSvg,
      summary,
    },
  };
}
