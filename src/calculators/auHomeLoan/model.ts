/** Australian home loan repayment calculator: form reading and display strings (build time and browser). */
import type { AuHomeLoanDefaults } from '../../countries/types';
import { PERIODS_PER_YEAR, calculateAuHomeLoan, validateAuHomeLoanInput, type AuHomeLoanInput, type LoanFrequency } from '../../engines/auHomeLoan';
import type { CalcView, Computed, Reader } from '../../lib/calcUi';
import { lineChart } from '../../lib/charts';
import { createFormatters, formatDuration } from '../../lib/format';

export interface AuHomeLoanParams {
  locale: string;
  currency: string;
}

export const FREQUENCIES: { value: LoanFrequency; label: string; noun: string; per: string }[] = [
  { value: 'monthly', label: 'Monthly', noun: 'Monthly repayment', per: 'a month' },
  { value: 'fortnightly', label: 'Fortnightly', noun: 'Fortnightly repayment', per: 'a fortnight' },
  { value: 'weekly', label: 'Weekly', noun: 'Weekly repayment', per: 'a week' },
  { value: 'halfMonthly', label: 'Fortnightly: half the monthly repayment', noun: 'Fortnightly repayment', per: 'a fortnight' },
];

export function homeLoanDefaults(d: AuHomeLoanDefaults): AuHomeLoanInput {
  return { ...d, frequency: 'monthly', interestOnlyYears: 0, extraRepayment: 0, offsetBalance: 0 };
}

export function readHomeLoanInput(r: Reader): AuHomeLoanInput {
  const freq = r.text('frequency') as LoanFrequency;
  return {
    amount: r.num('amount'),
    ratePercent: r.num('ratePercent'),
    termYears: r.num('termYears'),
    frequency: freq in PERIODS_PER_YEAR ? freq : 'monthly',
    interestOnlyYears: r.num('interestOnlyYears', 0),
    extraRepayment: r.num('extraRepayment', 0),
    offsetBalance: r.num('offsetBalance', 0),
  };
}

export interface HomeLoanView extends CalcView {
  repaymentLabel: string;
  repayment: string;
  repaymentSub: string;
  totalInterest: string;
  totalPaid: string;
  payoff: string;
  ioNote: string;
  hasIo: boolean;
  savedNote: string;
  hasSaved: boolean;
  chartSvg: string;
  yearRows: string;
}

export function buildHomeLoanView(input: AuHomeLoanInput, p: AuHomeLoanParams): Computed<HomeLoanView> {
  const errors = validateAuHomeLoanInput(input);
  if (errors.length > 0) return { errors, view: null };

  const f = createFormatters(p.locale, p.currency);
  const r = calculateAuHomeLoan(input);
  const freq = FREQUENCIES.find((x) => x.value === input.frequency)!;
  const payoff = formatDuration(Math.round(r.payoffYears * 12));
  const extras = input.extraRepayment > 0 ? input.extraRepayment : 0;

  const balances = r.years.map((y) => y.balance);
  // The plain loan (no offset or extras); the two lines overlap when there are none.
  const showBase = r.interestSaved > 0.005;
  const baseYears = showBase ? calculateAuHomeLoan({ ...input, extraRepayment: 0, offsetBalance: 0 }).years : r.years;
  const length = Math.max(r.years.length, baseYears.length);
  const chartSvg = lineChart({
    labels: Array.from({ length }, (_, k) => String(k + 1)),
    series: [
      { label: 'Without offset or extra repayments', colour: 4, values: Array.from({ length }, (_, k) => baseYears[k]?.balance ?? 0) },
      { label: 'Your loan', colour: 1, values: Array.from({ length }, (_, k) => balances[k] ?? 0) },
    ],
    formatAxis: f.moneyCompact,
    tooltip: (k) => `Year ${k + 1}: ${f.money(balances[k] ?? 0)} left${showBase ? `, against ${f.money(baseYears[k]?.balance ?? 0)} without offset or extras` : ''}`,
    ariaLabel: `Loan balance at the end of each year, paid off in ${payoff}. Full figures are in the table.`,
    xAxisLabel: 'Year',
  });

  const yearRows = r.years
    .map((y) => `<tr><th scope="row">${y.year}</th><td>${f.money(y.paid)}</td><td>${f.money(y.principal)}</td><td>${f.money(y.interest)}</td><td>${f.money(y.balance)}</td></tr>`)
    .join('');

  const ioNote =
    input.interestOnlyYears > 0
      ? `For the first ${formatDuration(input.interestOnlyYears * 12)}, you pay interest only: ${f.money(r.interestOnlyRepayment)} ${freq.per}${input.offsetBalance > 0 ? ' with your offset' : ''}. Then ${f.money(r.repayment)} ${freq.per}.`
      : '';
  const savedNote = showBase
    ? `Your ${[input.offsetBalance > 0 ? 'offset' : '', extras > 0 ? 'extra repayments' : ''].filter(Boolean).join(' and ')} save ${f.money(r.interestSaved)} in interest and cut ${formatDuration(Math.round((r.basePayoffYears - r.payoffYears) * 12))} off the loan.`
    : '';

  const summary = `${freq.noun}s of ${f.money(r.repayment + extras)} pay off ${f.money(input.amount)} in ${payoff}, with ${f.money(r.totalInterest)} of interest.`;

  return {
    errors: [],
    view: {
      repaymentLabel: freq.noun,
      repayment: f.money(r.repayment + extras),
      repaymentSub: extras > 0 ? `${f.money(r.repayment)} plus ${f.money(extras)} extra` : `${r.periodsPerYear} repayments a year`,
      totalInterest: f.money(r.totalInterest),
      // Whole dollars: the tile is narrow (CLAUDE.md section 7).
      totalPaid: f.moneyWhole(r.totalPaid),
      payoff,
      ioNote,
      hasIo: ioNote !== '',
      savedNote,
      hasSaved: showBase,
      chartSvg,
      yearRows,
      summary,
    },
  };
}
