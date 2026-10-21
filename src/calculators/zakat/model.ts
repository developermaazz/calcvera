/** Pakistan zakat calculator: form reading and display strings (build time and browser). */
import type { PkZakatConfig, PkZakatDefaults } from '../../countries/types';
import { calculateZakat, validateZakatInput, type NisabBasis, type ZakatInput } from '../../engines/zakat';
import type { CalcView, Computed, Reader } from '../../lib/calcUi';
import { createFormatters, escapeHtml } from '../../lib/format';

export interface ZakatPageParams extends PkZakatConfig {
  locale: string;
  currency: string;
}

export function zakatDefaults(d: PkZakatDefaults): ZakatInput {
  return { cash: d.cash, bank: 0, goldGrams: 0, goldPricePer10g: 0, silverGrams: 0, silverPricePer10g: 0, investments: 0, receivables: 0, debts: 0, nisabBasis: 'official' };
}

export function readZakatInput(r: Reader): ZakatInput {
  const basis = r.text('nisabBasis') as NisabBasis;
  return {
    cash: r.num('cash', 0),
    bank: r.num('bank', 0),
    goldGrams: r.num('goldGrams', 0),
    goldPricePer10g: r.num('goldPricePer10g', 0),
    silverGrams: r.num('silverGrams', 0),
    silverPricePer10g: r.num('silverPricePer10g', 0),
    investments: r.num('investments', 0),
    receivables: r.num('receivables', 0),
    debts: r.num('debts', 0),
    nisabBasis: basis === 'silver' || basis === 'gold' ? basis : 'official',
  };
}

export interface ZakatView extends CalcView {
  zakat: string;
  zakatSub: string;
  netAssets: string;
  nisab: string;
  status: string;
  assetRows: string;
  notes: string;
  hasNotes: boolean;
}

export function buildZakatView(input: ZakatInput, p: ZakatPageParams): Computed<ZakatView> {
  const errors = validateZakatInput(input);
  if (errors.length > 0) return { errors, view: null };

  const f = createFormatters(p.locale, p.currency);
  const r = calculateZakat(input, p);
  const lines: [string, number][] = [
    ['Cash', input.cash],
    ['Bank balances', input.bank],
    ['Gold', r.goldValue],
    ['Silver', r.silverValue],
    ['Investments and trade goods', input.investments],
    ['Money owed to you', input.receivables],
  ];
  const assetRows =
    lines.filter(([, v]) => v > 0).map(([l, v]) => `<tr><th scope="row">${l}</th><td>${f.money(v)}</td></tr>`).join('') +
    (input.debts > 0 ? `<tr><th scope="row">Less debts due now</th><td>− ${f.money(input.debts)}</td></tr>` : '') +
    `<tr class="total-row"><th scope="row">Net zakatable assets</th><td>${f.money(r.netAssets)}</td></tr>`;

  const notes: string[] = [];
  if (r.goldNisabWithOtherAssets) notes.push('The Zakat and Ushr Ordinance uses the gold nisab only when all your zakatable assets are gold. With other assets, the silver nisab applies.');
  if (input.nisabBasis === 'official') notes.push(`The official nisab of ${f.moneyWhole(p.officialNisab)} was notified for Zakat year ${p.officialZakatYear}, for deduction from bank accounts. For your own calculation, you can use today's silver price instead.`);

  const basisLabel = input.nisabBasis === 'official' ? `official nisab (${p.officialZakatYear})` : input.nisabBasis === 'silver' ? `${p.silverNisabGrams} grams of silver` : `${p.goldNisabGrams} grams of gold`;
  const summary = r.aboveNisab
    ? `Your net zakatable assets of ${f.money(r.netAssets)} are above the nisab of ${f.money(r.nisab)}, so zakat of ${f.money(r.zakat)} (2.5%) is due.`
    : `Your net zakatable assets of ${f.money(r.netAssets)} are below the nisab of ${f.money(r.nisab)}, so no zakat is due on this calculation.`;

  return {
    errors: [],
    view: {
      zakat: f.money(r.zakat),
      zakatSub: r.aboveNisab ? `2.5% of ${f.money(r.netAssets)}` : 'Below the nisab',
      netAssets: f.money(r.netAssets),
      nisab: f.money(r.nisab),
      status: r.aboveNisab ? 'Zakat is due' : 'Not due',
      assetRows,
      notes: notes.map((n) => `<li>${escapeHtml(n)}</li>`).join(''),
      hasNotes: notes.length > 0,
      summary: `${summary} Nisab basis: ${basisLabel}.`,
    },
  };
}
