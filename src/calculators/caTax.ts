/** Builds federal + provincial tax params for each province from the Canada config (shared by Canadian calculators). */
import { requireFigure, type CountryConfig } from '../countries';
import type { CaTaxParams } from '../engines/caIncomeTax';

export function caTaxParamsByProvince(country: CountryConfig): Record<string, CaTaxParams> {
  const c = requireFigure(country.ca, 'Canada figures');
  const lastFederal = country.incomeTax.bands.at(-1);
  const fourthFederal = country.incomeTax.bands.at(-2);
  if (!lastFederal || !fourthFederal) throw new Error('Federal bands missing');
  const surtax = c.extras.ontarioSurtax;

  const out: Record<string, CaTaxParams> = {};
  for (const prov of c.provinces) {
    out[prov.code] = {
      federalBands: country.incomeTax.bands,
      federalBpa: country.incomeTax.allowance,
      // Federal BPA phases from the 4th bracket threshold to the 5th (CRA T4127).
      federalBpaPhaseOut: {
        start: fourthFederal.from,
        end: lastFederal.from,
        minimum: requireFigure(c.extras.basicPersonalAmountMinimum, 'extras.basicPersonalAmountMinimum'),
      },
      provinceBands: requireFigure(prov.bands, `provinces.${prov.code}.bands`),
      provinceBpa: requireFigure(prov.basicPersonalAmount, `provinces.${prov.code}.basicPersonalAmount`),
      provinceBpaPhaseOut: prov.basicPersonalAmountPhaseOut,
      quebecAbatement: prov.code === 'QC' ? requireFigure(c.extras.quebecAbatement, 'extras.quebecAbatement') : 0,
      ontarioSurtax:
        prov.code === 'ON'
          ? {
              firstThreshold: requireFigure(surtax.firstThreshold, 'ontarioSurtax.firstThreshold'),
              firstRate: requireFigure(surtax.firstRate, 'ontarioSurtax.firstRate'),
              secondThreshold: requireFigure(surtax.secondThreshold, 'ontarioSurtax.secondThreshold'),
              secondRate: requireFigure(surtax.secondRate, 'ontarioSurtax.secondRate'),
            }
          : undefined,
    };
  }
  return out;
}
