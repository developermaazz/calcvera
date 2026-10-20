/** Canadian land transfer tax calculator: form reading and display strings (build time and browser). */
import type { CaLandTransferConfig, CaLandTransferDefaults, CaLandTransferProvince } from '../../countries/types';
import { calculateCaLandTransfer, validateCaLandTransferInput, type CaLandTransferInput } from '../../engines/caLandTransfer';
import type { CalcView, Computed, Reader } from '../../lib/calcUi';
import { createFormatters, escapeHtml } from '../../lib/format';

export interface LandTransferPageParams extends CaLandTransferConfig {
  locale: string;
  currency: string;
}

export const LTT_PROVINCES: { value: CaLandTransferProvince; label: string }[] = [
  { value: 'ON', label: 'Ontario' },
  { value: 'BC', label: 'British Columbia' },
  { value: 'QC', label: 'Quebec' },
  { value: 'MB', label: 'Manitoba' },
  { value: 'NS', label: 'Nova Scotia' },
  { value: 'NB', label: 'New Brunswick' },
  { value: 'PE', label: 'Prince Edward Island' },
];

export function landTransferDefaults(d: CaLandTransferDefaults, p: CaLandTransferConfig): CaLandTransferInput {
  return { province: 'ON', price: d.price, assessedValue: 0, firstTimeBuyer: false, newBuild: false, inCity: false, municipalRatePercent: p.novaScotia.defaultMunicipalRate * 100 };
}

export function readLandTransferInput(r: Reader): CaLandTransferInput {
  const province = (LTT_PROVINCES.some((x) => x.value === r.text('province')) ? r.text('province') : 'ON') as CaLandTransferProvince;
  return {
    province,
    price: r.num('price'),
    assessedValue: r.num('assessedValue', 0),
    firstTimeBuyer: r.checked('firstTimeBuyer'),
    newBuild: r.checked('newBuild'),
    inCity: province === 'ON' ? r.checked('inToronto') : province === 'QC' ? r.checked('inMontreal') : false,
    municipalRatePercent: r.num('municipalRatePercent', 0),
  };
}

export interface LandTransferView extends CalcView {
  total: string;
  totalSub: string;
  beforeRelief: string;
  relief: string;
  effective: string;
  lineRows: string;
  note: string;
}

const NOTES: Record<CaLandTransferProvince, string> = {
  ON: 'First-time buyers get up to $4,000 back from Ontario, and up to $4,475 from Toronto. Rates shown are for a home with one or two single-family residences.',
  BC: 'First-time buyers and buyers of newly built homes may be exempt from some or all of the tax if they meet the conditions. Tax is based on fair market value.',
  QC: 'Transfer duties ("welcome tax") are charged by your municipality on the higher of the price and the market value. Outside Montréal, some municipalities set a higher rate above $500,000.',
  MB: 'Land transfer tax is based on the fair market value of the property.',
  NS: 'Deed transfer tax is set by each municipality. Check your municipality’s rate.',
  NB: 'Tax is 1% of the higher of the price and the assessed value.',
  PE: 'Tax is 1% of the higher of the price and the assessed value. Eligible first-time buyers who will live in the home are exempt.',
};

export function buildLandTransferView(input: CaLandTransferInput, p: LandTransferPageParams): Computed<LandTransferView> {
  const errors = validateCaLandTransferInput(input);
  if (errors.length > 0) return { errors, view: null };

  const f = createFormatters(p.locale, p.currency);
  const r = calculateCaLandTransfer(input, p);
  const lineRows =
    r.lines.map((l) => `<tr><th scope="row">${escapeHtml(l.label)}</th><td>${l.amount < 0 ? '− ' : ''}${f.money(Math.abs(l.amount))}</td></tr>`).join('') +
    `<tr class="total-row"><th scope="row">Total to pay</th><td>${f.money(r.total)}</td></tr>`;
  const name = LTT_PROVINCES.find((x) => x.value === input.province)!.label;
  const place = input.province === 'ON' && input.inCity ? 'Toronto' : input.province === 'QC' && input.inCity ? 'Montréal' : name;

  const summary =
    r.relief > 0
      ? `On a ${f.money(input.price)} home in ${place}, you'd pay ${f.money(r.total)} in land transfer tax after ${f.money(r.relief)} of first-time buyer relief.`
      : `On a ${f.money(input.price)} home in ${place}, you'd pay ${f.money(r.total)} in land transfer tax, ${f.percent(Math.round(r.effectiveRate * 100) / 100)} of the price.`;

  return {
    errors: [],
    view: {
      total: f.money(r.total),
      totalSub: `${f.percent(Math.round(r.effectiveRate * 100) / 100)} of the price`,
      beforeRelief: f.money(r.provincialTax + r.municipalTax),
      relief: r.relief > 0 ? `− ${f.money(r.relief)}` : 'None',
      effective: f.percent(Math.round(r.effectiveRate * 100) / 100),
      lineRows,
      note: NOTES[input.province],
      summary,
    },
  };
}
