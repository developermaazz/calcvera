/** Savings goal calculator: form reading and display strings (build time and browser). */
import {
  calculateSavingsGoal,
  goalUnreachable,
  validateSavingsGoalInput,
  type SavingsGoalInput,
  type SavingsGoalMode,
} from '../../engines/savingsGoal';
import type { SavingsGoalDefaults } from '../../countries/types';
import type { CalcView, Computed, Reader } from '../../lib/calcUi';
import { stackedBarChart } from '../../lib/charts';
import { addMonths, createFormatters, formatDuration } from '../../lib/format';
import { currentStartMonth } from '../loan/view';

export interface SavingsGoalParams {
  locale: string;
  currency: string;
  /** "APY" (US) or "AER" (UK). */
  rateName: string;
}

export function savingsGoalDefaults(d: SavingsGoalDefaults): SavingsGoalInput {
  return { ...d, mode: 'deposit' };
}

export function readSavingsGoalInput(r: Reader): SavingsGoalInput {
  return {
    goal: r.num('goal'),
    currentSavings: r.num('currentSavings', 0),
    ratePercent: r.num('ratePercent', 0),
    mode: r.text('mode') as SavingsGoalMode,
    years: r.num('years'),
    monthlyDeposit: r.num('monthlyDeposit', 0),
  };
}

export interface SavingsGoalView extends CalcView {
  headlineLabel: string;
  headline: string;
  subline: string;
  goalDate: string;
  totalDeposits: string;
  interest: string;
  finalBalance: string;
  chartSvg: string;
  yearRows: string;
}

export function buildSavingsGoalView(input: SavingsGoalInput, p: SavingsGoalParams): Computed<SavingsGoalView> {
  const errors = validateSavingsGoalInput(input);
  if (errors.length > 0) return { errors, view: null };
  if (goalUnreachable(input)) {
    return {
      errors: [
        {
          field: 'monthlyDeposit',
          message: input.monthlyDeposit === 0 ? 'Enter a monthly amount. Without deposits your savings don\'t reach the goal.' : 'At this amount the goal takes more than 100 years. Try a larger monthly amount.',
        },
      ],
      view: null,
    };
  }

  const f = createFormatters(p.locale, p.currency);
  const r = calculateSavingsGoal(input);
  const start = currentStartMonth();
  const monthLabel = (months: number) => {
    const m = addMonths(start.year, start.monthIndex, months);
    return f.monthYear(m.year, m.monthIndex);
  };
  const goal = f.money(input.goal);

  if (r.alreadyThere) {
    return {
      errors: [],
      view: {
        headlineLabel: 'You already have enough',
        headline: 'Goal reached',
        subline: `Your ${f.money(input.currentSavings)} already covers your ${goal} goal.`,
        goalDate: 'Now',
        totalDeposits: f.money(0),
        interest: f.money(0),
        finalBalance: f.money(input.currentSavings),
        chartSvg: stackedBarChart({ data: [], seriesClasses: ['chart-s1', 'chart-s3'], formatAxis: f.moneyCompact, ariaLabel: 'No chart: the goal is already reached.' }),
        yearRows: '',
        summary: `Your current savings of ${f.money(input.currentSavings)} already cover your ${goal} goal, so you don't need to save any more for it.`,
      },
    };
  }

  const date = monthLabel(r.months);
  const time = formatDuration(r.months);

  // Balance at the end of each year, split into what you put in (current savings + deposits) and interest.
  let paidIn = input.currentSavings;
  let earned = 0;
  const bars = r.years.map((y) => {
    paidIn += y.deposits;
    earned += y.interest;
    return { year: y.year, paidIn, earned, balance: y.balance };
  });
  const chartSvg = stackedBarChart({
    data: bars.map((b) => ({
      label: String(b.year),
      values: [b.paidIn, b.earned],
      tooltip: `Year ${b.year}: ${f.money(b.balance)} (put in ${f.money(b.paidIn)}, interest ${f.money(b.earned)})`,
    })),
    seriesClasses: ['chart-s1', 'chart-s3'],
    formatAxis: f.moneyCompact,
    ariaLabel: `Savings at the end of each year, reaching ${f.money(r.finalBalance)} in ${time}: ${f.money(input.currentSavings + r.totalDeposits)} put in and ${f.money(r.interest)} interest. Full figures are in the table.`,
  });
  const yearRows = r.years
    .map((y) => `<tr><th scope="row">${y.year}</th><td>${f.money(y.deposits)}</td><td>${f.money(y.interest)}</td><td>${f.money(y.balance)}</td></tr>`)
    .join('');

  let headlineLabel: string;
  let headline: string;
  let subline: string;
  let summary: string;
  if (input.mode === 'deposit' && r.noDepositNeeded) {
    headlineLabel = 'Save each month';
    headline = f.money(0);
    subline = `Interest alone takes your savings to ${goal} by ${date}.`;
    summary = `At ${f.percent(input.ratePercent)} ${p.rateName}, your ${f.money(input.currentSavings)} grows to ${goal} by ${date} with no more deposits, ${time} from now.`;
  } else if (input.mode === 'deposit') {
    headlineLabel = 'Save each month';
    headline = f.money(r.monthlyDeposit);
    subline = `for ${time} to reach ${goal} by ${date}`;
    summary = `To reach ${goal} in ${time}, save ${f.money(r.monthlyDeposit)} a month at ${f.percent(input.ratePercent)} ${p.rateName}${input.currentSavings > 0 ? ` on top of the ${f.money(input.currentSavings)} you have now` : ''}. You'll deposit ${f.money(r.totalDeposits)} and earn ${f.money(r.interest)} in interest.`;
  } else {
    headlineLabel = 'Time to reach your goal';
    headline = time;
    subline = `You reach ${goal} in ${date}.`;
    summary = `Saving ${f.money(input.monthlyDeposit)} a month at ${f.percent(input.ratePercent)} ${p.rateName}${input.currentSavings > 0 ? `, starting from ${f.money(input.currentSavings)},` : ''} you'll reach ${goal} in ${time}, by ${date}. You'll deposit ${f.money(r.totalDeposits)} and earn ${f.money(r.interest)} in interest.`;
  }

  return {
    errors: [],
    view: {
      headlineLabel,
      headline,
      subline,
      goalDate: date,
      totalDeposits: f.money(r.totalDeposits),
      interest: f.money(r.interest),
      finalBalance: f.money(r.finalBalance),
      chartSvg,
      yearRows,
      summary,
    },
  };
}
