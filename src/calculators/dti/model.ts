/** Debt-to-income calculator: input defaults, form reading and display strings (build time and browser). */
import type { UsDtiReference } from '../../countries/types';
import { calculateDti, validateDtiInput, type DtiInput } from '../../engines/dti';
import type { CalcView, Computed, Reader } from '../../lib/calcUi';
import { splitBar } from '../../lib/charts';
import { createFormatters, escapeHtml } from '../../lib/format';

export interface DtiParams {
  locale: string;
  currency: string;
  references: UsDtiReference[];
}

export const DTI_DEFAULTS: DtiInput = {
  grossMonthlyIncome: 6_000,
  housing: 1_500,
  carLoans: 400,
  studentLoans: 250,
  creditCards: 150,
  otherDebts: 0,
  targetPercent: 36,
};

export function readDtiInput(r: Reader): DtiInput {
  return {
    grossMonthlyIncome: r.num('grossMonthlyIncome'),
    housing: r.num('housing', 0),
    carLoans: r.num('carLoans', 0),
    studentLoans: r.num('studentLoans', 0),
    creditCards: r.num('creditCards', 0),
    otherDebts: r.num('otherDebts', 0),
    targetPercent: r.num('targetPercent'),
  };
}

export interface DtiView extends CalcView {
  backEnd: string;
  frontEnd: string;
  totalDebts: string;
  verdict: string;
  debtToCut: string;
  incomeNeeded: string;
  needsCut: boolean;
  chartSvg: string;
  referencesHtml: string;
}

const pct = (ratio: number) => Math.round(ratio * 100);

export function dtiVerdict(backEnd: number, refs: UsDtiReference[]): string {
  const sorted = [...refs].sort((a, b) => a.backEndMax - b.backEndMax);
  const first = sorted[0];
  if (!first) return '';
  if (backEnd <= first.backEndMax) return `At or below ${pct(first.backEndMax)}%: within ${first.label.charAt(0).toLowerCase()}${first.label.slice(1)}.`;
  for (let i = 1; i < sorted.length; i++) {
    const ref = sorted[i]!;
    if (backEnd <= ref.backEndMax) {
      return `Above ${pct(sorted[i - 1]!.backEndMax)}% but at or below ${pct(ref.backEndMax)}%: within ${ref.label.charAt(0).toLowerCase()}${ref.label.slice(1)}.`;
    }
  }
  return `Above ${pct(sorted[sorted.length - 1]!.backEndMax)}%: higher than every Fannie Mae maximum shown below. Lenders set their own limits, but most would want this lower.`;
}

export function buildDtiView(input: DtiInput, p: DtiParams): Computed<DtiView> {
  const errors = validateDtiInput(input);
  if (errors.length > 0) return { errors, view: null };

  const f = createFormatters(p.locale, p.currency);
  const r = calculateDti(input);
  const back = f.percent(r.backEnd * 100);
  const front = f.percent(r.frontEnd * 100);
  const target = f.percent(input.targetPercent);
  const needsCut = r.debtToCut > 0.005;

  const otherDebts = r.totalDebts - input.housing;
  const left = Math.max(0, input.grossMonthlyIncome - r.totalDebts);
  const chartSvg = splitBar(
    [
      { value: input.housing, className: 'chart-s1', tooltip: `Housing: ${f.money(input.housing)} (${front})` },
      { value: otherDebts, className: 'chart-s2', tooltip: `Other debt payments: ${f.money(otherDebts)}` },
      { value: left, className: 'chart-rest', tooltip: `Left after debt payments: ${f.money(left)}` },
    ],
    `Gross monthly income of ${f.money(input.grossMonthlyIncome)}: housing ${f.money(input.housing)}, other debts ${f.money(otherDebts)}, ${f.money(left)} left.`,
  );

  const sorted = [...p.references].sort((a, b) => a.backEndMax - b.backEndMax);
  const matchIndex = sorted.findIndex((ref) => r.backEnd <= ref.backEndMax);
  const referencesHtml = sorted
    .map(
      (ref, i) =>
        `<li class="ref-item${i === matchIndex ? ' is-match' : ''}"><strong>${pct(ref.backEndMax)}%</strong> <span>${escapeHtml(ref.label)}</span>${
          i === matchIndex ? ' <em>(you are here)</em>' : ''
        }</li>`,
    )
    .join('');

  const summary = needsCut
    ? `Your debt payments are ${back} of your gross income, and housing alone is ${front}. To get down to ${target}, you'd need to cut ${f.money(r.debtToCut)} a month from your debt payments or earn ${f.money(r.incomeNeeded)} a month.`
    : `Your debt payments are ${back} of your gross income, and housing alone is ${front}. That's at or below your ${target} target.`;

  return {
    errors: [],
    view: {
      backEnd: back,
      frontEnd: front,
      totalDebts: f.money(r.totalDebts),
      verdict: dtiVerdict(r.backEnd, p.references),
      debtToCut: needsCut ? f.money(r.debtToCut) : f.money(0),
      incomeNeeded: f.money(r.incomeNeeded),
      needsCut,
      chartSvg,
      referencesHtml,
      summary,
    },
  };
}
