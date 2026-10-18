/** UK stamp duty (SDLT) calculator: form reading and display strings (build time and browser). */
import {
  calculatePropertyTax,
  validatePropertyTaxInput,
  type BuyerType,
  type PropertyTaxInput,
  type PropertyTaxParams,
} from '../../engines/propertyTax';
import type { CalcView, Computed, Reader } from '../../lib/calcUi';
import { createFormatters } from '../../lib/format';

export interface StampDutyParams extends PropertyTaxParams {
  locale: string;
  currency: string;
}

export const BUYER_TYPES: { value: BuyerType; label: string }[] = [
  { value: 'standard', label: 'Moving home or buying my only home' },
  { value: 'firstTime', label: 'First-time buyer' },
  { value: 'additional', label: 'Buying an additional property (second home, buy-to-let)' },
];

export function readStampDutyInput(r: Reader): PropertyTaxInput {
  const type = r.text('buyerType') as BuyerType;
  return {
    price: r.num('price'),
    buyerType: BUYER_TYPES.some((b) => b.value === type) ? type : 'standard',
    nonResident: r.checked('nonResident'),
  };
}

export interface StampDutyView extends CalcView {
  tax: string;
  effectiveRate: string;
  saving: string;
  hasSaving: boolean;
  rowsHtml: string;
  notesHtml: string;
  hasNotes: boolean;
}

export function buildStampDutyView(input: PropertyTaxInput, p: StampDutyParams): Computed<StampDutyView> {
  const errors = validatePropertyTaxInput(input);
  if (errors.length > 0) return { errors, view: null };

  const f = createFormatters(p.locale, p.currency);
  const r = calculatePropertyTax(input, p);

  const rowsHtml = r.rows
    .map((row) => {
      const range = row.to === null ? `Over ${f.moneyWhole(row.from)}` : `${f.moneyWhole(row.from)} to ${f.moneyWhole(row.to)}`;
      return `<tr><th scope="row">${range}</th><td>${f.percent(row.rate * 100)}</td><td>${f.money(row.portion)}</td><td>${f.money(row.tax)}</td></tr>`;
    })
    .join('');

  const saving = r.firstTimeReliefApplied ? r.standardTax - r.tax : 0;
  const notes: string[] = [];
  if (r.firstTimeOverLimit) {
    notes.push(`First-time buyer relief only applies up to ${f.moneyWhole(p.firstTimeBuyerMaxPrice)}. Above that, the standard rates apply to the whole price.`);
  }
  if (r.additionalSurchargeApplied) {
    notes.push(
      `Includes the ${f.percent(p.additionalPropertySurcharge * 100)} surcharge on additional properties. If you're replacing your main home and sell the old one within 3 years, you can usually claim the surcharge back.`,
    );
  }
  if (input.buyerType === 'additional' && !r.additionalSurchargeApplied) {
    notes.push(`The higher rates for additional properties don't apply to purchases under ${f.moneyWhole(p.additionalPropertyMinPrice)}.`);
  }
  if (r.nonResidentSurchargeApplied) {
    notes.push(`Includes the ${f.percent(p.nonResidentSurcharge * 100)} surcharge for buyers who aren't UK resident.`);
  }
  const notesHtml = notes.map((n) => `<li>${n}</li>`).join('');

  let summary = `Stamp Duty on a ${f.moneyWhole(input.price)} property is ${f.money(r.tax)}, ${f.percent(r.effectiveRate * 100)} of the price.`;
  if (r.tax < 0.005) summary = `No Stamp Duty is due on a ${f.moneyWhole(input.price)} property${r.firstTimeReliefApplied ? ' with first-time buyer relief' : ''}.`;
  if (saving > 0.005) summary += ` First-time buyer relief saves you ${f.money(saving)}.`;
  const surcharges = [
    r.additionalSurchargeApplied ? `the ${f.percent(p.additionalPropertySurcharge * 100)} surcharge for additional properties` : '',
    r.nonResidentSurchargeApplied ? `the ${f.percent(p.nonResidentSurcharge * 100)} surcharge for non-UK residents` : '',
  ].filter(Boolean);
  if (surcharges.length > 0) summary += ` This includes ${surcharges.join(' and ')}.`;

  return {
    errors: [],
    view: {
      tax: f.money(r.tax),
      effectiveRate: f.percent(r.effectiveRate * 100),
      saving: f.money(saving),
      hasSaving: saving > 0.005,
      rowsHtml,
      notesHtml,
      hasNotes: notes.length > 0,
      summary,
    },
  };
}
