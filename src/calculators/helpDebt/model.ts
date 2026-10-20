/** Australian HECS-HELP repayment calculator: form reading and display strings (build time and browser). */
import type { AuHelpConfig, AuHelpDefaults } from '../../countries/types';
import { MAX_YEARS, calculateHelpDebt, validateHelpDebtInput, type HelpDebtInput } from '../../engines/helpDebt';
import type { CalcView, Computed, Reader } from '../../lib/calcUi';
import { lineChart } from '../../lib/charts';
import { createFormatters, escapeHtml } from '../../lib/format';

export interface HelpPageParams extends AuHelpConfig {
  locale: string;
  currency: string;
  taxYear: string;
}

export function helpDefaults(d: AuHelpDefaults, p: AuHelpConfig): HelpDebtInput {
  return { ...d, indexationPercent: Math.round(p.indexationRate * 10_000) / 100, voluntaryPerYear: 0 };
}

export function readHelpInput(r: Reader): HelpDebtInput {
  return {
    balance: r.num('balance'),
    income: r.num('income', 0),
    incomeGrowthPercent: r.num('incomeGrowthPercent', 0),
    indexationPercent: r.num('indexationPercent', 0),
    voluntaryPerYear: r.num('voluntaryPerYear', 0),
  };
}

export interface HelpView extends CalcView {
  repayment: string;
  repaymentSub: string;
  payoff: string;
  totalRepaid: string;
  indexation: string;
  notes: string;
  hasNotes: boolean;
  chartSvg: string;
  yearRows: string;
}

const years = (n: number) => `${n} ${n === 1 ? 'year' : 'years'}`;

export function buildHelpView(input: HelpDebtInput, p: HelpPageParams): Computed<HelpView> {
  const errors = validateHelpDebtInput(input);
  if (errors.length > 0) return { errors, view: null };

  const f = createFormatters(p.locale, p.currency);
  const r = calculateHelpDebt(input, p);
  const repaid = r.yearsToRepay !== null;

  const chartSvg = lineChart({
    labels: r.rows.map((y) => String(y.year)),
    series: [{ label: 'HELP balance', colour: 1, values: r.rows.map((y) => y.balance) }],
    formatAxis: f.moneyCompact,
    tooltip: (k) => {
      const y = r.rows[k]!;
      return `Year ${y.year}: ${f.money(y.balance)} left after ${f.money(y.compulsory + y.voluntary)} repaid and ${f.money(y.indexation)} indexation`;
    },
    ariaLabel: `HELP balance at the end of each year${repaid ? `, repaid in ${years(r.yearsToRepay!)}` : ''}. Full figures are in the table.`,
    xAxisLabel: 'Year',
  });

  const yearRows = r.rows
    .map((y) => `<tr><th scope="row">${y.year}</th><td>${f.money(y.income)}</td><td>${f.money(y.compulsory)}</td><td>${f.money(y.voluntary)}</td><td>${f.money(y.indexation)}</td><td>${f.money(y.balance)}</td></tr>`)
    .join('');

  const notes: string[] = [];
  if (r.firstYearRepayment === 0) notes.push(`Your repayment income is at or below ${f.moneyWhole(p.firstThreshold)}, so you don't make a compulsory repayment for ${p.taxYear}. Your debt still grows with indexation.`);
  if (!repaid) notes.push(`At these settings, your debt isn't repaid within ${MAX_YEARS} years. Try a higher pay rise or voluntary repayments.`);
  if (input.voluntaryPerYear > 0 && repaid && r.yearsWithoutVoluntary !== null && r.yearsWithoutVoluntary > r.yearsToRepay!) {
    notes.push(`Voluntary repayments clear your debt ${years(r.yearsWithoutVoluntary - r.yearsToRepay!)} sooner.`);
  }

  const summary = repaid
    ? `You'd repay ${f.money(r.firstYearRepayment)} for ${p.taxYear} and clear your ${f.money(input.balance)} HELP debt in about ${years(r.yearsToRepay!)}, repaying ${f.money(r.totalCompulsory + r.totalVoluntary)} including ${f.money(r.totalIndexation)} of indexation.`
    : `You'd repay ${f.money(r.firstYearRepayment)} for ${p.taxYear}, but at these settings your HELP debt isn't repaid within ${MAX_YEARS} years.`;

  return {
    errors: [],
    view: {
      repayment: f.money(r.firstYearRepayment),
      repaymentSub: r.firstYearRepayment > 0 ? `${f.percent(Math.round(r.firstYearRate * 100) / 100)} of your repayment income, about ${f.money(r.firstYearRepayment / 26)} a fortnight` : 'Below the repayment threshold',
      payoff: repaid ? years(r.yearsToRepay!) : `Over ${MAX_YEARS} years`,
      totalRepaid: f.money(r.totalCompulsory + r.totalVoluntary),
      indexation: f.money(r.totalIndexation),
      notes: notes.map((n) => `<li>${escapeHtml(n)}</li>`).join(''),
      hasNotes: notes.length > 0,
      chartSvg,
      yearRows,
      summary,
    },
  };
}
