/** Auto loan refinance calculator (US): form reading and display strings (build time and browser). */
import type { AutoRefinanceDefaults } from '../../countries/types';
import { calculateRefinance, validateRefinanceInput, type RefinanceInput } from '../../engines/refinance';
import type { CalcView, Computed, Reader } from '../../lib/calcUi';
import { stackedBarChart } from '../../lib/charts';
import { createFormatters, formatDuration } from '../../lib/format';

export interface AutoRefinanceParams {
  locale: string;
  currency: string;
}

export const REFINANCE_TERMS = [24, 36, 48, 60, 72, 84];

export function refinanceDefaults(d: AutoRefinanceDefaults): RefinanceInput {
  return { ...d, feesInLoan: false };
}

export function readRefinanceInput(r: Reader): RefinanceInput {
  return {
    balance: r.num('balance'),
    currentAprPercent: r.num('currentAprPercent'),
    remainingMonths: r.num('remainingMonths'),
    newAprPercent: r.num('newAprPercent'),
    newTermMonths: r.num('newTermMonths'),
    fees: r.num('fees', 0),
    feesInLoan: r.checked('feesInLoan'),
  };
}

export interface AutoRefinanceView extends CalcView {
  headlineLabel: string;
  headline: string;
  currentPayment: string;
  newPayment: string;
  currentTime: string;
  newTime: string;
  currentInterest: string;
  newInterest: string;
  fees: string;
  monthlyChange: string;
  breakEven: string;
  costsMore: boolean;
  chartSvg: string;
}

export function buildRefinanceView(input: RefinanceInput, p: AutoRefinanceParams): Computed<AutoRefinanceView> {
  const errors = validateRefinanceInput(input);
  if (errors.length > 0) return { errors, view: null };

  const f = createFormatters(p.locale, p.currency);
  const r = calculateRefinance(input);
  const saves = r.totalSaving >= 0;

  const chartSvg = stackedBarChart({
    data: [
      { label: 'Keep current loan', values: [r.currentInterest, 0], tooltip: `Current loan: ${f.money(r.currentInterest)} interest` },
      {
        label: 'Refinance',
        values: [r.newInterest, input.fees],
        tooltip: `Refinance: ${f.money(r.newInterest)} interest + ${f.money(input.fees)} fees`,
      },
    ],
    seriesClasses: ['chart-s2', 'chart-s3'],
    formatAxis: f.moneyCompact,
    ariaLabel: `Interest left on the current loan ${f.money(r.currentInterest)}, against ${f.money(r.newInterest)} interest and ${f.money(input.fees)} fees if you refinance.`,
  });

  const change = r.monthlySaving;
  const changeText =
    Math.abs(change) < 0.005 ? 'stays the same' : change > 0 ? `falls by ${f.money(change)}` : `rises by ${f.money(-change)}`;
  const longer = input.newTermMonths > input.remainingMonths;
  const summary = saves
    ? `Refinancing at ${f.percent(input.newAprPercent)} saves ${f.money(r.totalSaving)} overall, and your payment ${changeText} a month.${r.breakEvenMonth ? ` The fees are paid back by month ${r.breakEvenMonth}.` : ''}`
    : `Refinancing would cost ${f.money(-r.totalSaving)} more overall${longer ? ', mainly because the new loan runs longer' : ''}, even though your payment ${changeText} a month.`;

  return {
    errors: [],
    view: {
      headlineLabel: saves ? 'You save overall' : 'Extra cost overall',
      headline: f.money(Math.abs(r.totalSaving)),
      currentPayment: f.money(r.currentPayment),
      newPayment: f.money(r.newPayment),
      currentTime: formatDuration(input.remainingMonths),
      newTime: formatDuration(input.newTermMonths),
      currentInterest: f.money(r.currentInterest),
      newInterest: f.money(r.newInterest),
      fees: f.money(input.fees),
      monthlyChange: change >= 0 ? `${f.money(change)} less` : `${f.money(-change)} more`,
      breakEven: r.breakEvenMonth === null ? 'Never' : `Month ${r.breakEvenMonth}`,
      costsMore: !saves,
      chartSvg,
      summary,
    },
  };
}
