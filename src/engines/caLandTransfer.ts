/**
 * Canadian land transfer tax by province (and Toronto, Montréal, Nova Scotia municipalities), with first-time buyer
 * rebates and exemptions where the province offers them:
 *   ON: provincial bands, refund up to firstTimeRefundMax; Toronto adds the municipal tax, rebate up to firstTimeRebateMax.
 *   BC: bands + further tax on residential value over the threshold; first-time buyer or newly built home exemption.
 *   MB: bands. QC: provincial bands (or Montréal's), on the greater of price and market value.
 *   NB, PE: a flat rate on the greater of price and assessed value; PE exempts first-time buyers and low values.
 *   NS: the municipal deed transfer tax rate.
 * Pure: figures are passed in.
 */
import type { CaLandTransferConfig, CaLandTransferProvince, RateBand } from '../countries/types';
import { checkMoney, checkPercent, checkRange, type FieldError } from './validation';

export interface CaLandTransferInput {
  province: CaLandTransferProvince;
  price: number;
  /** Assessed or market value, used when higher than the price (QC, NB, PE). 0 if unknown. */
  assessedValue: number;
  firstTimeBuyer: boolean;
  /** BC: newly built home. */
  newBuild: boolean;
  /** ON: in the City of Toronto. QC: in Montréal. */
  inCity: boolean;
  /** NS: municipal deed transfer tax rate, %. */
  municipalRatePercent: number;
}

export interface CaLandTransferLine {
  label: string;
  amount: number;
}

export interface CaLandTransferResult {
  /** Value the tax is based on. */
  basis: number;
  provincialTax: number;
  municipalTax: number;
  /** First-time buyer refunds, rebates and exemptions (positive). */
  relief: number;
  total: number;
  /** total ÷ price × 100. */
  effectiveRate: number;
  lines: CaLandTransferLine[];
}

export function tax(value: number, bands: RateBand[]): number {
  let t = 0;
  for (const b of bands) {
    if (value <= b.from) break;
    t += ((b.to === null ? value : Math.min(value, b.to)) - b.from) * b.rate;
  }
  return t;
}

export function validateCaLandTransferInput(input: CaLandTransferInput): FieldError[] {
  const errors: FieldError[] = [];
  checkRange(errors, 'price', input.price, {
    min: 1,
    max: 1_000_000_000,
    empty: 'Enter the purchase price.',
    range: 'Enter a price between 1 and 1,000,000,000.',
  });
  checkMoney(errors, 'assessedValue', input.assessedValue, 1_000_000_000);
  checkPercent(errors, 'municipalRatePercent', input.municipalRatePercent, 10);
  if (!['ON', 'BC', 'MB', 'QC', 'NB', 'NS', 'PE'].includes(input.province)) errors.push({ field: 'province', message: 'Choose a province.' });
  return errors;
}

export function calculateCaLandTransfer(input: CaLandTransferInput, p: CaLandTransferConfig): CaLandTransferResult {
  const errors = validateCaLandTransferInput(input);
  if (errors.length > 0) throw new RangeError(errors.map((e) => `${e.field}: ${e.message}`).join(' '));

  const usesAssessed = input.province === 'QC' || input.province === 'NB' || input.province === 'PE';
  const basis = usesAssessed ? Math.max(input.price, input.assessedValue) : input.price;
  const lines: CaLandTransferLine[] = [];
  let provincialTax = 0;
  let municipalTax = 0;
  let relief = 0;

  switch (input.province) {
    case 'ON': {
      provincialTax = tax(basis, p.ontario.bands);
      lines.push({ label: 'Ontario land transfer tax', amount: provincialTax });
      if (input.firstTimeBuyer) {
        const refund = Math.min(provincialTax, p.ontario.firstTimeRefundMax);
        relief += refund;
        lines.push({ label: 'Ontario first-time buyer refund', amount: -refund });
      }
      if (input.inCity) {
        municipalTax = tax(basis, p.toronto.bands);
        lines.push({ label: 'Toronto municipal land transfer tax', amount: municipalTax });
        if (input.firstTimeBuyer) {
          const rebate = Math.min(municipalTax, p.toronto.firstTimeRebateMax);
          relief += rebate;
          lines.push({ label: 'Toronto first-time buyer rebate', amount: -rebate });
        }
      }
      break;
    }
    case 'BC': {
      const b = p.bc;
      provincialTax = tax(basis, b.bands) + b.furtherRate * Math.max(0, basis - b.furtherThreshold);
      lines.push({ label: 'BC property transfer tax', amount: provincialTax });
      const ft = b.firstTime;
      const firstTime = !input.firstTimeBuyer
        ? 0
        : basis <= ft.fullExemptionValue
          ? provincialTax
          : basis <= ft.flatUpTo
            ? ft.exemptionAmount
            : basis < ft.phaseOutTo
              ? (ft.exemptionAmount * (ft.phaseOutTo - basis)) / (ft.phaseOutTo - ft.flatUpTo)
              : 0;
      const nb = b.newBuild;
      const newBuild = !input.newBuild
        ? 0
        : basis < nb.fullExemptionBelow
          ? provincialTax
          : basis < nb.phaseOutTo
            ? (provincialTax * (nb.phaseOutTo - basis)) / (nb.phaseOutTo - nb.fullExemptionBelow)
            : 0;
      // You claim one exemption: the larger.
      const exemption = Math.min(provincialTax, Math.max(firstTime, newBuild));
      if (exemption > 0) {
        relief += exemption;
        lines.push({ label: newBuild >= firstTime ? 'Newly built home exemption' : 'First-time home buyers’ exemption', amount: -exemption });
      }
      break;
    }
    case 'MB':
      provincialTax = tax(basis, p.manitoba.bands);
      lines.push({ label: 'Manitoba land transfer tax', amount: provincialTax });
      break;
    case 'QC':
      // Transfer duties are municipal in Quebec; Montréal sets its own higher brackets.
      municipalTax = tax(basis, input.inCity ? p.montreal.bands : p.quebec.bands);
      lines.push({ label: input.inCity ? 'Montréal property transfer duties' : 'Property transfer duties (welcome tax)', amount: municipalTax });
      break;
    case 'NB':
      provincialTax = basis * p.newBrunswick.rate;
      lines.push({ label: 'New Brunswick real property transfer tax', amount: provincialTax });
      break;
    case 'NS':
      municipalTax = input.price * (input.municipalRatePercent / 100);
      lines.push({ label: 'Municipal deed transfer tax', amount: municipalTax });
      break;
    case 'PE': {
      provincialTax = basis <= p.pei.lowValueExemptUpTo ? 0 : basis * p.pei.rate;
      lines.push({ label: 'PEI real property transfer tax', amount: provincialTax });
      if (input.firstTimeBuyer && provincialTax > 0) {
        relief += provincialTax;
        lines.push({ label: 'First-time home buyer exemption', amount: -provincialTax });
      }
      break;
    }
  }

  const total = Math.max(0, provincialTax + municipalTax - relief);
  return { basis, provincialTax, municipalTax, relief, total, effectiveRate: (total / input.price) * 100, lines };
}
