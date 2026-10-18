/** Redundancy pay calculator (UK): defaults, form reading and display strings (build time and browser). */
import {
  calculateRedundancyPay,
  validateRedundancyInput,
  type RedundancyInput,
  type RedundancyParams,
} from '../../engines/redundancyPay';
import type { CalcView, Computed, Reader } from '../../lib/calcUi';
import { createFormatters } from '../../lib/format';

export type RedundancyRegion = 'greatBritain' | 'northernIreland';

export interface RedundancyPageParams {
  locale: string;
  currency: string;
  /** ISO date the caps apply from. */
  effectiveFrom: string;
  regions: Record<RedundancyRegion, RedundancyParams>;
}

export interface RedundancyFormInput extends RedundancyInput {
  region: RedundancyRegion;
}

export const REDUNDANCY_DEFAULTS: RedundancyFormInput = {
  age: 45,
  yearsOfService: 12,
  weeklyPay: 650,
  region: 'greatBritain',
};

export const REGION_LABELS: Record<RedundancyRegion, string> = {
  greatBritain: 'England, Scotland or Wales',
  northernIreland: 'Northern Ireland',
};

export function readRedundancyInput(r: Reader): RedundancyFormInput {
  return {
    age: r.num('age'),
    yearsOfService: r.num('yearsOfService'),
    weeklyPay: r.num('weeklyPay'),
    region: r.text('region') === 'northernIreland' ? 'northernIreland' : 'greatBritain',
  };
}

export interface RedundancyView extends CalcView {
  amount: string;
  weeks: string;
  weeklyPayUsed: string;
  yearsCounted: string;
  capNote: string;
  showCapNote: boolean;
  notEligible: boolean;
  taxNote: string;
  bandsHtml: string;
}

const weeksText = (w: number) => `${Number.isInteger(w) ? w : w.toFixed(1)} ${w === 1 ? 'week' : 'weeks'}`;

export function buildRedundancyView(input: RedundancyFormInput, p: RedundancyPageParams): Computed<RedundancyView> {
  const errors = validateRedundancyInput(input);
  if (errors.length > 0) return { errors, view: null };

  const params = p.regions[input.region];
  const f = createFormatters(p.locale, p.currency);
  const r = calculateRedundancyPay(input, params);
  const cap = f.moneyWhole(params.weeklyPayCap);

  // Group counted years by weeks per year: e.g. "8 years at 1½ weeks".
  const bands = [...params.ageBands].sort((a, b) => b.fromAge - a.fromAge);
  const bandsHtml = bands
    .map((band, i) => {
      const upper = i === 0 ? null : bands[i - 1]!.fromAge;
      const years = r.rows.filter((row) => row.weeks === band.weeksPerYear).length;
      const label =
        upper === null ? `Years when you were ${band.fromAge} or older` : band.fromAge === 0 ? `Years when you were under ${upper}` : `Years when you were ${band.fromAge} to ${upper - 1}`;
      return `<tr><th scope="row">${label}</th><td>${years}</td><td>${weeksText(band.weeksPerYear)}</td><td>${weeksText(years * band.weeksPerYear)}</td></tr>`;
    })
    .join('');

  const summary = !r.eligible
    ? `You need at least ${params.minYearsService} full years with your employer to get statutory redundancy pay. Check your contract, as your employer may offer more.`
    : `Your statutory redundancy pay is ${f.money(r.amount)}: ${weeksText(r.weeks)} of pay at ${f.money(r.weeklyPayUsed)} a week${r.weeklyPayCapped ? ` (weekly pay is capped at ${cap})` : ''}. ${r.amount <= params.taxFreeLimit ? `It's tax-free because it's under ${f.moneyWhole(params.taxFreeLimit)}.` : ''}`.trim();

  return {
    errors: [],
    view: {
      amount: f.money(r.amount),
      weeks: weeksText(r.weeks),
      weeklyPayUsed: f.money(r.weeklyPayUsed),
      yearsCounted: `${r.yearsCounted} of ${input.yearsOfService}`,
      capNote: `Your weekly pay is above the ${cap} cap for ${input.region === 'northernIreland' ? 'Northern Ireland' : 'Great Britain'}, so ${cap} is used.`,
      showCapNote: r.weeklyPayCapped && r.eligible,
      notEligible: !r.eligible,
      taxNote: `Statutory redundancy pay under ${f.moneyWhole(params.taxFreeLimit)} is not taxable. Notice pay, holiday pay and any extra your employer pays may be taxed.`,
      bandsHtml,
      summary,
    },
  };
}
