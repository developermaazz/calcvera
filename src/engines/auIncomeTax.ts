/**
 * Australian resident income tax: bands above the tax-free threshold, low income tax offset, and the
 * Medicare levy with the low-income reduction (shaded in at shadeInRate above the lower threshold until it
 * reaches the full rate). Not included: Medicare levy surcharge, HELP repayments, other offsets.
 * Pure: figures are passed in.
 */
import type { TaxBand } from '../countries/types';
import { taxOnBands } from './tax';

export interface AuTaxParams {
  taxFreeThreshold: number;
  /** Bands expressed as taxable income above the tax-free threshold. */
  bands: TaxBand[];
  lito: {
    maxOffset: number;
    firstTaperStart: number;
    firstTaperRate: number;
    secondTaperStart: number;
    secondTaperRate: number;
    cutOut: number;
  };
  medicare: { rate: number; lowIncomeThreshold: number; lowIncomeUpperThreshold: number; shadeInRate: number };
}

export interface AuTaxResult {
  incomeTax: number;
  lito: number;
  medicareLevy: number;
  total: number;
}

export function lowIncomeTaxOffset(income: number, l: AuTaxParams['lito']): number {
  if (income <= l.firstTaperStart) return l.maxOffset;
  const atSecond = l.maxOffset - l.firstTaperRate * (l.secondTaperStart - l.firstTaperStart);
  if (income <= l.secondTaperStart) return l.maxOffset - l.firstTaperRate * (income - l.firstTaperStart);
  if (income < l.cutOut) return Math.max(0, atSecond - l.secondTaperRate * (income - l.secondTaperStart));
  return 0;
}

export function medicareLevy(income: number, m: AuTaxParams['medicare']): number {
  if (income <= m.lowIncomeThreshold) return 0;
  return Math.min(m.rate * income, m.shadeInRate * (income - m.lowIncomeThreshold));
}

export function auIncomeTax(taxableIncome: number, p: AuTaxParams): AuTaxResult {
  const income = Math.max(0, taxableIncome);
  const gross = taxOnBands(Math.max(0, income - p.taxFreeThreshold), p.bands);
  const lito = Math.min(gross, lowIncomeTaxOffset(income, p.lito));
  const incomeTax = gross - lito;
  const levy = medicareLevy(income, p.medicare);
  return { incomeTax, lito, medicareLevy: levy, total: incomeTax + levy };
}
