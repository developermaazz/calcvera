/** Progressive tax helpers shared by tax engines. Pure: bands are passed in. */
import type { TaxBand } from '../countries/types';

/** Tax on `income` across marginal bands. Bands must be sorted and contiguous. */
export function taxOnBands(income: number, bands: TaxBand[]): number {
  let tax = 0;
  for (const band of bands) {
    if (income <= band.from) break;
    const top = band.to === null ? income : Math.min(income, band.to);
    tax += (top - band.from) * band.rate;
  }
  return tax;
}

/** Rate of the band that `income` falls in (the rate on the next dollar). */
export function marginalRateOnBands(income: number, bands: TaxBand[]): number {
  const band = bands.find((b) => income >= b.from && (b.to === null || income < b.to));
  return band?.rate ?? 0;
}

/** Linear phase-out: `max` up to `start`, falling to `minimum` at `end`. */
export function phasedAmount(income: number, max: number, phase?: { start: number; end: number; minimum: number }): number {
  if (!phase || income <= phase.start) return max;
  if (income >= phase.end) return phase.minimum;
  return max - ((max - phase.minimum) * (income - phase.start)) / (phase.end - phase.start);
}
