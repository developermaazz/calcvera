/**
 * Australian transfer (stamp) duty on buying a home, by state, for an investor, an owner-occupier or a first home
 * buyer. Concessions included:
 *   NSW: First Home Buyers Assistance Scheme (exempt, then a linear concession to the upper threshold).
 *   VIC: principal place of residence concession (to pprUpTo); first home buyer exemption, then a linear reduction.
 *   QLD: home concession rates; first home concession amounts; first home (new home) exemption.
 *   WA: concessional rate for a low-value home; first home owner rate.
 *   SA: first home buyer relief on eligible new homes.
 *   ACT: owner-occupier rates; Home Buyer Concession Scheme exemption.
 * TAS and NT: general rates only. Foreign purchaser surcharges aren't included. Pure: figures are passed in.
 */
import type { AuStampDutyConfig, AuState, DutyBand } from '../countries/types';
import { checkRange, type FieldError } from './validation';

export type BuyerType = 'firstHome' | 'ownerOccupier' | 'investor';

export interface AuStampDutyInput {
  state: AuState;
  value: number;
  buyer: BuyerType;
  /** A new home (not previously occupied): matters for QLD and SA first home buyers. */
  newHome: boolean;
}

export interface AuStampDutyResult {
  /** Duty at the general rate, with no concession. */
  generalDuty: number;
  duty: number;
  /** generalDuty − duty. */
  saving: number;
  /** Which concession applied, if any. */
  concession:
    | 'none'
    | 'nswFirstHomeExempt'
    | 'nswFirstHomeConcession'
    | 'vicPpr'
    | 'vicFirstHomeExempt'
    | 'vicFirstHomeConcession'
    | 'qldHome'
    | 'qldFirstHome'
    | 'qldFirstNewHome'
    | 'waConcessional'
    | 'waFirstHome'
    | 'saFirstNewHome'
    | 'actOwner'
    | 'actHomeBuyer';
  /** duty ÷ value × 100. */
  effectiveRate: number;
}

export const AU_STATES: AuState[] = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'];

/** Duty on a value from a band schedule; roundUp charges the excess per $100 "or part of $100". */
export function dutyOnBands(value: number, bands: DutyBand[], roundUp = false): number {
  let band: DutyBand | undefined;
  for (const b of bands) if (value > b.from || (b.from === 0 && value >= 0)) band = b;
  if (!band) return 0;
  if (band.flat) return band.rate * value;
  const excess = value - band.from;
  const charged = roundUp ? Math.ceil(excess / 100 - 1e-9) * 100 : excess;
  return band.base + band.rate * charged;
}

export function validateAuStampDutyInput(input: AuStampDutyInput): FieldError[] {
  const errors: FieldError[] = [];
  checkRange(errors, 'value', input.value, {
    min: 1,
    max: 1_000_000_000,
    empty: 'Enter the property value.',
    range: 'Enter a value between 1 and 1,000,000,000.',
  });
  if (!AU_STATES.includes(input.state)) errors.push({ field: 'state', message: 'Choose a state or territory.' });
  if (!['firstHome', 'ownerOccupier', 'investor'].includes(input.buyer)) errors.push({ field: 'buyer', message: 'Choose who is buying.' });
  return errors;
}

export function calculateAuStampDuty(input: AuStampDutyInput, p: AuStampDutyConfig): AuStampDutyResult {
  const errors = validateAuStampDutyInput(input);
  if (errors.length > 0) throw new RangeError(errors.map((e) => `${e.field}: ${e.message}`).join(' '));

  const v = input.value;
  const up = p.roundUpTo100.includes(input.state);
  const general = (bands: DutyBand[]) => dutyOnBands(v, bands, up);
  const owner = input.buyer !== 'investor';
  const first = input.buyer === 'firstHome';
  let generalDuty = 0;
  let duty = 0;
  let concession: AuStampDutyResult['concession'] = 'none';

  switch (input.state) {
    case 'NSW': {
      const d = (x: number) => Math.max(p.nsw.minimum, dutyOnBands(x, p.nsw.bands));
      generalDuty = d(v);
      duty = generalDuty;
      const fh = p.nsw.firstHome;
      if (first && v <= fh.exemptUpTo) {
        duty = 0;
        concession = 'nswFirstHomeExempt';
      } else if (first && v < fh.concessionBelow) {
        duty = (d(fh.concessionBelow) * (v - fh.exemptUpTo)) / (fh.concessionBelow - fh.exemptUpTo);
        concession = 'nswFirstHomeConcession';
      }
      break;
    }
    case 'VIC': {
      generalDuty = general(p.vic.bands);
      duty = generalDuty;
      const fh = p.vic.firstHome;
      if (first && v <= fh.exemptUpTo) {
        duty = 0;
        concession = 'vicFirstHomeExempt';
      } else if (first && v < fh.concessionUpTo) {
        duty = (generalDuty * (v - fh.exemptUpTo)) / (fh.concessionUpTo - fh.exemptUpTo);
        concession = 'vicFirstHomeConcession';
      } else if (owner && v <= p.vic.pprUpTo) {
        duty = general(p.vic.pprBands);
        concession = 'vicPpr';
      }
      break;
    }
    case 'QLD': {
      generalDuty = general(p.qld.bands);
      duty = generalDuty;
      if (first && input.newHome) {
        duty = 0;
        concession = 'qldFirstNewHome';
      } else if (owner) {
        duty = general(p.qld.homeBands);
        concession = 'qldHome';
        const tier = first ? p.qld.firstHomeConcession.find((t) => v < t.below) : undefined;
        if (tier) {
          duty = Math.max(0, duty - tier.amount);
          concession = 'qldFirstHome';
        }
      }
      break;
    }
    case 'WA': {
      generalDuty = general(p.wa.bands);
      duty = generalDuty;
      const fh = p.wa.firstHome;
      if (first && v <= fh.upTo) {
        duty = v <= fh.exemptUpTo ? 0 : fh.rate * Math.ceil((v - fh.exemptUpTo) / 100 - 1e-9) * 100;
        concession = 'waFirstHome';
      } else if (owner && v <= p.wa.concessionalUpTo) {
        duty = general(p.wa.concessionalBands);
        concession = 'waConcessional';
      }
      break;
    }
    case 'SA':
      generalDuty = general(p.sa.bands);
      duty = generalDuty;
      if (first && input.newHome) {
        duty = 0;
        concession = 'saFirstNewHome';
      }
      break;
    case 'TAS':
      generalDuty = general(p.tas.bands);
      duty = generalDuty;
      break;
    case 'ACT':
      generalDuty = general(p.act.investorBands);
      duty = generalDuty;
      if (first) {
        duty = 0;
        concession = 'actHomeBuyer';
      } else if (owner) {
        duty = general(p.act.ownerBands);
        concession = 'actOwner';
      }
      break;
    case 'NT': {
      const n = p.nt;
      generalDuty = v <= n.formulaUpTo ? n.a * (v / 1_000) ** 2 + n.b * (v / 1_000) : dutyOnBands(v, n.bands);
      duty = generalDuty;
      break;
    }
  }

  return { generalDuty, duty, saving: generalDuty - duty, concession, effectiveRate: (duty / v) * 100 };
}
