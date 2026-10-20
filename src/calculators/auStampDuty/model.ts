/** Australian stamp duty calculator: form reading and display strings (build time and browser). */
import type { AuStampDutyConfig, AuStampDutyDefaults, AuState } from '../../countries/types';
import { AU_STATES, calculateAuStampDuty, validateAuStampDutyInput, type AuStampDutyInput, type AuStampDutyResult, type BuyerType } from '../../engines/auStampDuty';
import type { CalcView, Computed, Reader } from '../../lib/calcUi';
import { createFormatters } from '../../lib/format';

export interface AuStampDutyPageParams extends AuStampDutyConfig {
  locale: string;
  currency: string;
}

export const STATE_NAMES: Record<AuState, string> = {
  NSW: 'New South Wales',
  VIC: 'Victoria',
  QLD: 'Queensland',
  WA: 'Western Australia',
  SA: 'South Australia',
  TAS: 'Tasmania',
  ACT: 'Australian Capital Territory',
  NT: 'Northern Territory',
};

export const BUYERS: { value: BuyerType; label: string }[] = [
  { value: 'firstHome', label: 'First home buyer' },
  { value: 'ownerOccupier', label: 'Buying a home to live in' },
  { value: 'investor', label: 'Investor' },
];

export function stampDutyDefaults(d: AuStampDutyDefaults): AuStampDutyInput {
  return { state: 'NSW', value: d.value, buyer: 'ownerOccupier', newHome: false };
}

export function readStampDutyInput(r: Reader): AuStampDutyInput {
  const state = r.text('state') as AuState;
  const buyer = r.text('buyer') as BuyerType;
  return {
    state: AU_STATES.includes(state) ? state : 'NSW',
    value: r.num('value'),
    buyer: BUYERS.some((b) => b.value === buyer) ? buyer : 'firstHome',
    newHome: r.checked('newHome'),
  };
}

export interface StampDutyView extends CalcView {
  duty: string;
  dutySub: string;
  generalDuty: string;
  saving: string;
  effective: string;
  note: string;
  stateNote: string;
  hasStateNote: boolean;
}

const CONCESSION_NOTES: Record<AuStampDutyResult['concession'], string> = {
  none: '',
  nswFirstHomeExempt: 'First Home Buyers Assistance Scheme: no duty on a home worth $800,000 or less.',
  nswFirstHomeConcession: 'First Home Buyers Assistance Scheme: reduced duty on a home worth more than $800,000 and less than $1 million.',
  vicPpr: 'Principal place of residence concession: lower rates on a home worth up to $550,000 that you’ll live in.',
  vicFirstHomeExempt: 'First home buyer exemption: no duty on a home worth up to $600,000.',
  vicFirstHomeConcession: 'First home buyer concession: reduced duty on a home worth $600,001 to $750,000.',
  qldHome: 'Home concession: lower rates on a home you’ll live in.',
  qldFirstHome: 'First home concession: the home concession rate, less the first home concession amount for your price.',
  qldFirstNewHome: 'First home (new home) concession: no duty on a new home, with no value cap.',
  waConcessional: 'Concessional rate: for a home you’ll live in worth $200,000 or less.',
  waFirstHome: 'First home owner rate: no duty up to $600,000, then a reduced rate up to $800,000.',
  saFirstNewHome: 'First home buyer relief: no stamp duty on an eligible new home, regardless of value.',
  actOwner: 'Owner-occupier rates: lower duty on a home you’ll live in.',
  actHomeBuyer: 'Home Buyer Concession Scheme: no duty if you meet the eligibility rules, including not owning property in the last five years.',
};

const STATE_NOTES: Partial<Record<AuState, string>> = {
  TAS: 'Tasmania’s first home buyer exemption for established homes ended for transactions settling after 30 June 2026, so general rates apply.',
  NT: 'Northern Territory concessions, such as the house and land package exemption, have conditions and aren’t included here.',
  SA: 'South Australia’s first home buyer relief applies to new homes, off-the-plan apartments and vacant land to build on, not established homes.',
};

export function buildStampDutyView(input: AuStampDutyInput, p: AuStampDutyPageParams): Computed<StampDutyView> {
  const errors = validateAuStampDutyInput(input);
  if (errors.length > 0) return { errors, view: null };

  const f = createFormatters(p.locale, p.currency);
  const r = calculateAuStampDuty(input, p);
  const stateNote = STATE_NOTES[input.state] ?? '';
  const name = STATE_NAMES[input.state];
  const summary =
    r.saving > 0.005
      ? `On a ${f.money(input.value)} home in ${name}, you'd pay ${f.money(r.duty)} in stamp duty, saving ${f.money(r.saving)} on the general rate.`
      : `On a ${f.money(input.value)} property in ${name}, you'd pay ${f.money(r.duty)} in stamp duty, ${f.percent(Math.round(r.effectiveRate * 100) / 100)} of the value.`;

  return {
    errors: [],
    view: {
      duty: f.money(r.duty),
      dutySub: `${f.percent(Math.round(r.effectiveRate * 100) / 100)} of the value`,
      generalDuty: f.money(r.generalDuty),
      saving: r.saving > 0.005 ? f.money(r.saving) : 'None',
      effective: f.percent(Math.round(r.effectiveRate * 100) / 100),
      note: CONCESSION_NOTES[r.concession] || 'General rates apply.',
      stateNote,
      hasStateNote: stateNote !== '',
      summary,
    },
  };
}
