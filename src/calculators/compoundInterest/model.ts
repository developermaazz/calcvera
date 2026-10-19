/** Compound interest calculator: form reading and display strings (build time and browser). */
import {
  calculateCompoundInterest,
  validateCompoundInterestInput,
  type Compounding,
  type CompoundInterestInput,
  type DepositTiming,
} from '../../engines/compoundInterest';
import type { CompoundInterestDefaults } from '../../countries/types';
import type { CalcView, Computed, Reader } from '../../lib/calcUi';
import { stackedBarChart } from '../../lib/charts';
import { createFormatters } from '../../lib/format';

export interface CompoundInterestParams {
  locale: string;
  currency: string;
  /** "APY" (US) or "AER" (UK). */
  rateName: string;
}

export const COMPOUNDING_LABELS: Record<Compounding, string> = {
  annually: 'annually',
  semiannually: 'twice a year',
  quarterly: 'quarterly',
  monthly: 'monthly',
  daily: 'daily',
};

export function compoundDefaults(d: CompoundInterestDefaults): CompoundInterestInput {
  return { ...d, compounding: 'monthly', timing: 'end' };
}

export function readCompoundInterestInput(r: Reader): CompoundInterestInput {
  return {
    initialDeposit: r.num('initialDeposit', 0),
    monthlyDeposit: r.num('monthlyDeposit', 0),
    annualRatePercent: r.num('annualRatePercent'),
    compounding: r.text('compounding') as Compounding,
    years: r.num('years'),
    timing: r.text('timing') as DepositTiming,
  };
}

export interface CompoundInterestView extends CalcView {
  balanceLabel: string;
  finalBalance: string;
  totalDeposits: string;
  totalInterest: string;
  effectiveRate: string;
  interestShare: string;
  chartSvg: string;
  yearRows: string;
}

export function buildCompoundInterestView(input: CompoundInterestInput, p: CompoundInterestParams): Computed<CompoundInterestView> {
  const errors = validateCompoundInterestInput(input);
  if (errors.length > 0) return { errors, view: null };

  const f = createFormatters(p.locale, p.currency);
  const r = calculateCompoundInterest(input);
  const yearsText = `${input.years} ${input.years === 1 ? 'year' : 'years'}`;

  const chartSvg = stackedBarChart({
    data: r.years.map((y) => ({
      label: String(y.year),
      values: [y.totalDeposits, y.totalInterest],
      tooltip: `Year ${y.year}: balance ${f.money(y.balance)} (deposits ${f.money(y.totalDeposits)}, interest ${f.money(y.totalInterest)})`,
    })),
    seriesClasses: ['chart-s1', 'chart-s3'],
    formatAxis: f.moneyCompact,
    ariaLabel: `Balance at the end of each of ${r.years.length} ${r.years.length === 1 ? 'year' : 'years'}, reaching ${f.money(r.finalBalance)}: ${f.money(r.totalDeposits)} deposited and ${f.money(r.totalInterest)} interest. Full figures are in the table.`,
  });

  const yearRows = r.years
    .map((y) => `<tr><th scope="row">${y.year}</th><td>${f.money(y.deposits)}</td><td>${f.money(y.interest)}</td><td>${f.money(y.totalInterest)}</td><td>${f.money(y.balance)}</td></tr>`)
    .join('');

  const parts = [input.initialDeposit > 0 ? `starting with ${f.money(input.initialDeposit)}` : '', input.monthlyDeposit > 0 ? `adding ${f.money(input.monthlyDeposit)} a month` : '']
    .filter(Boolean)
    .join(' and ');
  const summary = `${parts.charAt(0).toUpperCase() + parts.slice(1)} at ${f.percent(input.annualRatePercent)} compounded ${COMPOUNDING_LABELS[input.compounding]}, you'd have ${f.money(r.finalBalance)} after ${yearsText}: ${f.money(r.totalDeposits)} you put in and ${f.money(r.totalInterest)} of interest.`;

  return {
    errors: [],
    view: {
      balanceLabel: `Balance after ${yearsText}`,
      finalBalance: f.money(r.finalBalance),
      totalDeposits: f.money(r.totalDeposits),
      totalInterest: f.money(r.totalInterest),
      effectiveRate: `${(r.effectiveAnnualRate * 100).toFixed(2)}%`,
      interestShare: r.finalBalance > 0 ? `${Math.round((r.totalInterest / r.finalBalance) * 100)}%` : '0%',
      chartSvg,
      yearRows,
      summary,
    },
  };
}
