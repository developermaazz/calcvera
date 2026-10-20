/** Builds the take-home pay params from the Australia config, reading every pending figure with requireFigure. */
import { requireFigure, type CountryConfig } from '../../countries';
import type { AuTaxParams } from '../../engines/auIncomeTax';
import type { AuTakeHomeParams } from '../../engines/auTakeHome';

export function auTaxParams(country: CountryConfig): AuTaxParams {
  const c = requireFigure(country.au, `${country.code}.au`);
  const l = c.lowIncomeTaxOffset;
  const m = c.medicareLevy;
  return {
    taxFreeThreshold: country.incomeTax.allowance,
    bands: country.incomeTax.bands,
    lito: {
      maxOffset: requireFigure(l.maxOffset, 'lito.maxOffset'),
      firstTaperStart: requireFigure(l.firstTaperStart, 'lito.firstTaperStart'),
      firstTaperRate: requireFigure(l.firstTaperRate, 'lito.firstTaperRate'),
      secondTaperStart: requireFigure(l.secondTaperStart, 'lito.secondTaperStart'),
      secondTaperRate: requireFigure(l.secondTaperRate, 'lito.secondTaperRate'),
      cutOut: requireFigure(l.cutOut, 'lito.cutOut'),
    },
    medicare: {
      rate: requireFigure(m.rate, 'medicareLevy.rate'),
      lowIncomeThreshold: requireFigure(m.lowIncomeThreshold, 'medicareLevy.lowIncomeThreshold'),
      lowIncomeUpperThreshold: requireFigure(m.lowIncomeUpperThreshold, 'medicareLevy.lowIncomeUpperThreshold'),
      shadeInRate: requireFigure(m.shadeInRate, 'medicareLevy.shadeInRate'),
    },
  };
}

export function auTakeHomeParams(country: CountryConfig): AuTakeHomeParams & { medicareThresholdsYear: string } {
  const c = requireFigure(country.au, `${country.code}.au`);
  return {
    tax: auTaxParams(country),
    super: c.super,
    help: c.help,
    mls: c.mls,
    medicareThresholdsYear: requireFigure(c.medicareLevy.thresholdsIncomeYear, 'medicareLevy.thresholdsIncomeYear'),
  };
}
