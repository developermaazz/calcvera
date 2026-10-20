/** Canadian CPP calculator: form reading and display strings (build time and browser). */
import type { CaCppConfig, CaCppDefaults } from '../../countries/types';
import { calculateCppTiming, validateCppTimingInput, type CppTimingInput } from '../../engines/cppTiming';
import type { CalcView, Computed, Reader } from '../../lib/calcUi';
import { lineChart } from '../../lib/charts';
import { createFormatters } from '../../lib/format';

export interface CppPageParams extends CaCppConfig {
  locale: string;
  currency: string;
}

export function cppDefaults(d: CaCppDefaults): CppTimingInput {
  return { ...d };
}

export function readCppInput(r: Reader): CppTimingInput {
  return { pensionAt65: r.num('pensionAt65'), startAge: r.num('startAge'), lifeExpectancy: r.num('lifeExpectancy') };
}

export interface CppView extends CalcView {
  monthlyLabel: string;
  monthly: string;
  monthlySub: string;
  yearly: string;
  breakEven: string;
  breakEvenLabel: string;
  total: string;
  totalLabel: string;
  chartSvg: string;
  ageRows: string;
}

export function buildCppView(input: CppTimingInput, p: CppPageParams): Computed<CppView> {
  const errors = validateCppTimingInput(input, p);
  if (errors.length > 0) return { errors, view: null };

  const f = createFormatters(p.locale, p.currency);
  const r = calculateCppTiming(input, p);
  const pctChange = (x: number) => `${x > 0 ? '+' : x < 0 ? '−' : ''}${f.percent(Math.round(Math.abs(x) * 10_000) / 100)}`;

  // Running totals from age 60 to the comparison age, starting at 60, 65 and 70.
  const ages = Array.from({ length: Math.max(1, input.lifeExpectancy - p.earliestAge) }, (_, k) => p.earliestAge + k + 1);
  const cumulative = (start: number) => {
    const m = r.rows.find((x) => x.age === start)!.monthly;
    return ages.map((a) => m * Math.max(0, a - start) * 12);
  };
  const chartSvg = lineChart({
    labels: ages.map(String),
    series: [
      { label: 'Start at 60', colour: 2, values: cumulative(p.earliestAge) },
      { label: 'Start at 65', colour: 4, values: cumulative(65) },
      { label: 'Start at 70', colour: 1, values: cumulative(p.latestAge) },
    ],
    formatAxis: f.moneyCompact,
    tooltip: (k) => `By age ${ages[k]}: ${f.money(cumulative(p.earliestAge)[k]!)} starting at 60, ${f.money(cumulative(65)[k]!)} at 65, ${f.money(cumulative(p.latestAge)[k]!)} at 70`,
    ariaLabel: `Total CPP received by age, starting at 60, 65 or 70, up to age ${input.lifeExpectancy}. Full figures are in the table.`,
    xAxisLabel: 'Age',
  });

  const ageRows = r.rows
    .map(
      (x) =>
        `<tr${x.age === input.startAge ? ' class="total-row"' : ''}><th scope="row">${x.age}</th><td>${pctChange(x.adjustment)}</td><td>${f.money(x.monthly)}</td><td>${f.money(x.monthly * 12)}</td><td>${f.money(x.totalByLifeExpectancy)}</td></tr>`,
    )
    .join('');

  const be = r.breakEvenVs65;
  const breakEven =
    be === null ? '—' : `Age ${Math.floor(be)}${Math.round((be - Math.floor(be)) * 12) > 0 ? ` and ${Math.round((be - Math.floor(be)) * 12)} months` : ''}`;
  const summary =
    input.startAge === 65
      ? `Starting at 65, you'd receive ${f.money(r.monthly)} a month, or ${f.money(r.totalByLifeExpectancy)} by age ${input.lifeExpectancy}.`
      : `Starting at ${input.startAge} gives ${f.money(r.monthly)} a month (${pctChange(r.adjustment)} compared with 65). ${
          input.startAge < 65 ? 'Starting at 65 catches up' : 'You catch up with starting at 65'
        } at about ${breakEven.toLowerCase()}. By age ${input.lifeExpectancy}, you'd receive ${f.money(r.totalByLifeExpectancy)}, against ${f.money(r.totalAt65ByLifeExpectancy)} starting at 65.`;

  return {
    errors: [],
    view: {
      monthlyLabel: `Monthly pension starting at ${input.startAge}`,
      monthly: f.money(r.monthly),
      monthlySub: input.startAge === 65 ? 'Your pension at 65' : `${pctChange(r.adjustment)} compared with starting at 65`,
      yearly: f.money(r.yearly),
      breakEvenLabel: 'Break-even with 65',
      breakEven,
      totalLabel: `Total by age ${input.lifeExpectancy}`,
      total: f.money(r.totalByLifeExpectancy),
      chartSvg,
      ageRows,
      summary,
    },
  };
}
