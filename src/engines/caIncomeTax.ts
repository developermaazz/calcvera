/**
 * Canadian federal + provincial/territorial income tax on taxable income: bands, basic personal amount
 * credits (with phase-outs), Ontario surtax and the Quebec abatement. Other credits (CPP/QPP, EI, Canada
 * employment amount) and the Ontario Health Premium are not included; they barely change the tax saved by
 * a deduction, which is what the FHSA calculator uses this for. Pure: figures are passed in.
 */
import type { TaxBand } from '../countries/types';
import { phasedAmount, taxOnBands } from './tax';

export interface PhaseOut {
  start: number;
  end: number;
  minimum: number;
}

export interface CaTaxParams {
  federalBands: TaxBand[];
  federalBpa: number;
  federalBpaPhaseOut: PhaseOut;
  provinceBands: TaxBand[];
  provinceBpa: number;
  provinceBpaPhaseOut?: PhaseOut;
  /** Quebec abatement of basic federal tax (0 outside Quebec). */
  quebecAbatement: number;
  /** Ontario only. */
  ontarioSurtax?: { firstThreshold: number; firstRate: number; secondThreshold: number; secondRate: number };
}

export interface CaTaxResult {
  federal: number;
  provincial: number;
  total: number;
}

export function caIncomeTax(taxableIncome: number, p: CaTaxParams): CaTaxResult {
  const income = Math.max(0, taxableIncome);

  const federalCredit = (p.federalBands[0]?.rate ?? 0) * phasedAmount(income, p.federalBpa, p.federalBpaPhaseOut);
  let federal = Math.max(0, taxOnBands(income, p.federalBands) - federalCredit);
  federal -= federal * p.quebecAbatement;

  const provincialCredit = (p.provinceBands[0]?.rate ?? 0) * phasedAmount(income, p.provinceBpa, p.provinceBpaPhaseOut);
  let provincial = Math.max(0, taxOnBands(income, p.provinceBands) - provincialCredit);
  if (p.ontarioSurtax) {
    const s = p.ontarioSurtax;
    provincial +=
      s.firstRate * Math.max(0, provincial - s.firstThreshold) + s.secondRate * Math.max(0, provincial - s.secondThreshold);
  }

  return { federal, provincial, total: federal + provincial };
}
