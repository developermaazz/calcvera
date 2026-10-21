/**
 * Zakat on wealth (Pakistan). Net zakatable assets = cash + bank balances + gold + silver + investments and trade goods
 * + money owed to you − debts due now. If net assets reach the nisab, zakat = rate × net assets.
 * Nisab options: the amount officially notified for the Zakat year; the value of the silver nisab weight at today's
 * silver price; or the gold nisab weight at today's gold price (the Ordinance uses gold only when all assets are gold).
 * Prices are per 10 grams. Pure: figures are passed in.
 */
import type { PkZakatConfig } from '../countries/types';
import { checkMoney, type FieldError } from './validation';

export type NisabBasis = 'official' | 'silver' | 'gold';

export interface ZakatInput {
  cash: number;
  bank: number;
  goldGrams: number;
  goldPricePer10g: number;
  silverGrams: number;
  silverPricePer10g: number;
  /** Shares, funds, business stock and other zakatable investments. */
  investments: number;
  /** Money owed to you that you expect to receive. */
  receivables: number;
  /** Debts and bills due now. */
  debts: number;
  nisabBasis: NisabBasis;
}

export interface ZakatResult {
  goldValue: number;
  silverValue: number;
  totalAssets: number;
  netAssets: number;
  nisab: number;
  aboveNisab: boolean;
  zakat: number;
  /** The gold nisab was chosen but there are assets other than gold. */
  goldNisabWithOtherAssets: boolean;
}

export function validateZakatInput(input: ZakatInput): FieldError[] {
  const errors: FieldError[] = [];
  for (const f of ['cash', 'bank', 'goldGrams', 'goldPricePer10g', 'silverGrams', 'silverPricePer10g', 'investments', 'receivables', 'debts'] as const) {
    checkMoney(errors, f, input[f], 10_000_000_000);
  }
  if (errors.length > 0) return errors;
  if ((input.goldGrams > 0 || input.nisabBasis === 'gold') && input.goldPricePer10g <= 0) errors.push({ field: 'goldPricePer10g', message: 'Enter today’s gold price per 10 grams.' });
  if ((input.silverGrams > 0 || input.nisabBasis === 'silver') && input.silverPricePer10g <= 0) errors.push({ field: 'silverPricePer10g', message: 'Enter today’s silver price per 10 grams.' });
  return errors;
}

export function calculateZakat(input: ZakatInput, p: PkZakatConfig): ZakatResult {
  const errors = validateZakatInput(input);
  if (errors.length > 0) throw new RangeError(errors.map((e) => `${e.field}: ${e.message}`).join(' '));
  const goldValue = (input.goldGrams * input.goldPricePer10g) / 10;
  const silverValue = (input.silverGrams * input.silverPricePer10g) / 10;
  const totalAssets = input.cash + input.bank + goldValue + silverValue + input.investments + input.receivables;
  const netAssets = Math.max(0, totalAssets - input.debts);
  const nisab =
    input.nisabBasis === 'official'
      ? p.officialNisab
      : input.nisabBasis === 'silver'
        ? (p.silverNisabGrams * input.silverPricePer10g) / 10
        : (p.goldNisabGrams * input.goldPricePer10g) / 10;
  const aboveNisab = netAssets >= nisab && netAssets > 0;
  return {
    goldValue,
    silverValue,
    totalAssets,
    netAssets,
    nisab,
    aboveNisab,
    zakat: aboveNisab ? netAssets * p.rate : 0,
    goldNisabWithOtherAssets: input.nisabBasis === 'gold' && totalAssets - goldValue > 0,
  };
}
