/** Australian super calculator: form reading and display strings (build time and browser). */
import type { AuSuperConfig, AuSuperDefaults } from '../../countries/types';
import { calculateAuSuper, validateAuSuperInput, type AuSuperInput } from '../../engines/auSuper';
import type { CalcView, Computed, Reader } from '../../lib/calcUi';
import { stackedBarChart } from '../../lib/charts';
import { createFormatters, escapeHtml } from '../../lib/format';

export interface AuSuperPageParams extends AuSuperConfig {
  locale: string;
  currency: string;
  taxYear: string;
}

export function auSuperDefaults(d: AuSuperDefaults): AuSuperInput {
  return { ...d, salarySacrifice: 0, afterTaxContributions: 0 };
}

export function readAuSuperInput(r: Reader): AuSuperInput {
  return {
    age: r.num('age'),
    retirementAge: r.num('retirementAge'),
    balance: r.num('balance', 0),
    salary: r.num('salary', 0),
    salaryGrowthPercent: r.num('salaryGrowthPercent', 0),
    salarySacrifice: r.num('salarySacrifice', 0),
    afterTaxContributions: r.num('afterTaxContributions', 0),
    returnPercent: r.num('returnPercent'),
    feesPerYear: r.num('feesPerYear', 0),
    inflationPercent: r.num('inflationPercent', 0),
  };
}

export interface AuSuperView extends CalcView {
  balanceLabel: string;
  balance: string;
  balanceSub: string;
  contributions: string;
  earnings: string;
  fees: string;
  notes: string;
  hasNotes: boolean;
  chartSvg: string;
  yearRows: string;
}

export function buildAuSuperView(input: AuSuperInput, p: AuSuperPageParams): Computed<AuSuperView> {
  const errors = validateAuSuperInput(input);
  if (errors.length > 0) return { errors, view: null };

  const f = createFormatters(p.locale, p.currency);
  const r = calculateAuSuper(input, p);

  let paidIn = input.balance;
  const chartSvg = stackedBarChart({
    data: r.rows.map((y) => {
      paidIn += y.contributions;
      const growth = Math.max(0, y.balance - paidIn);
      return {
        label: String(y.age),
        values: [Math.min(paidIn, y.balance), growth],
        tooltip: `Age ${y.age}: ${f.money(y.balance)} (${f.money(paidIn)} paid in, ${f.money(y.balance - paidIn)} growth after fees)`,
      };
    }),
    seriesClasses: ['chart-s1', 'chart-s3'],
    formatAxis: f.moneyCompact,
    ariaLabel: `Super balance at each age from ${input.age + 1} to ${input.retirementAge}, reaching ${f.money(r.finalBalance)}. Full figures are in the table.`,
    xAxisLabel: 'Age',
  });

  const yearRows = r.rows
    .map((y) => `<tr><th scope="row">${y.age}</th><td>${f.money(y.contributions)}</td><td>${f.money(y.earnings)}</td><td>${f.money(y.fees)}</td><td>${f.money(y.balance)}</td></tr>`)
    .join('');

  const notes: string[] = [];
  if (r.balanceWithoutExtras < r.finalBalance - 0.005) {
    notes.push(`Your extra contributions add ${f.money(r.finalBalance - r.balanceWithoutExtras)} by age ${input.retirementAge}.`);
  }
  if (r.overConcessionalCap) {
    notes.push(`Your concessional contributions of ${f.money(r.firstYearConcessional)} are over the ${f.moneyWhole(p.concessionalCap)} cap for ${p.taxYear}. Extra amounts are taxed at your marginal rate.`);
  }
  if (r.overNonConcessionalCap) notes.push(`Your after-tax contributions are over the ${f.moneyWhole(p.nonConcessionalCap)} non-concessional cap for ${p.taxYear}.`);
  if (input.retirementAge < p.preservationAge) {
    notes.push(`You generally can't access super before your preservation age (${p.preservationAge} if you were born from 1 July 1964) unless you meet a condition of release.`);
  }

  const summary = `With ${f.money(input.balance)} now and ${f.money(r.rows[0]?.contributions ?? 0)} going in this year after tax, your super could reach ${f.money(r.finalBalance)} by age ${input.retirementAge}, or ${f.money(r.todaysDollars)} in today's dollars.`;

  return {
    errors: [],
    view: {
      balanceLabel: `Super at age ${input.retirementAge}`,
      balance: f.money(r.finalBalance),
      balanceSub: `${f.money(r.todaysDollars)} in today's dollars`,
      contributions: f.money(r.totalContributions),
      earnings: f.money(r.totalEarnings),
      fees: f.money(r.totalFees),
      notes: notes.map((n) => `<li>${escapeHtml(n)}</li>`).join(''),
      hasNotes: notes.length > 0,
      chartSvg,
      yearRows,
      summary,
    },
  };
}
