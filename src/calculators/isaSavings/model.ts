/** UK ISA savings calculator: form reading and display strings (build time and browser). */
import type { IsaDefaults } from '../../countries/types';
import { calculateIsaSavings, validateIsaInput, type IsaInput, type IsaParams, type TaxBand } from '../../engines/isaSavings';
import type { CalcView, Computed, Reader } from '../../lib/calcUi';
import { stackedBarChart } from '../../lib/charts';
import { createFormatters, escapeHtml } from '../../lib/format';

export interface IsaPageParams extends IsaParams {
  locale: string;
  currency: string;
  taxYear: string;
  startingRateLimit: number;
}

export const BAND_LABELS: Record<TaxBand, string> = { basic: 'Basic rate (20%)', higher: 'Higher rate (40%)', additional: 'Additional rate (45%)' };

export function isaDefaults(d: IsaDefaults): IsaInput {
  return { ...d, taxBand: 'basic' };
}

export function readIsaInput(r: Reader): IsaInput {
  const band = r.text('taxBand');
  return {
    startingBalance: r.num('startingBalance', 0),
    monthlyDeposit: r.num('monthlyDeposit', 0),
    ratePercent: r.num('ratePercent'),
    years: r.num('years'),
    taxBand: (band === 'higher' || band === 'additional' ? band : 'basic') as TaxBand,
  };
}

export interface IsaView extends CalcView {
  balanceLabel: string;
  balance: string;
  balanceSub: string;
  allowanceUsed: string;
  taxOutside: string;
  advantage: string;
  notes: string;
  chartSvg: string;
  yearRows: string;
}

export function buildIsaView(input: IsaInput, p: IsaPageParams): Computed<IsaView> {
  const errors = validateIsaInput(input);
  if (errors.length > 0) return { errors, view: null };

  const f = createFormatters(p.locale, p.currency);
  const r = calculateIsaSavings(input, p);
  const yearsText = `${input.years} ${input.years === 1 ? 'year' : 'years'}`;

  let paidIn = input.startingBalance;
  let earned = 0;
  const chartSvg = stackedBarChart({
    data: r.years.map((y) => {
      paidIn += y.deposits;
      earned += y.interest;
      return {
        label: String(y.year),
        values: [paidIn, earned],
        tooltip: `Year ${y.year}: ${f.money(y.balance)} (paid in ${f.money(paidIn)}, interest ${f.money(earned)})`,
      };
    }),
    seriesClasses: ['chart-s1', 'chart-s3'],
    formatAxis: f.moneyCompact,
    ariaLabel: `ISA balance at the end of each of ${input.years} years, reaching ${f.money(r.finalBalance)}: ${f.money(r.totalDeposits)} paid in and ${f.money(r.totalInterest)} interest. Full figures are in the table.`,
  });
  const yearRows = r.years
    .map((y) => `<tr><th scope="row">${y.year}</th><td>${f.money(y.deposits)}</td><td>${f.money(y.interest)}</td><td>${f.money(y.balance)}</td><td>${f.money(y.taxableBalance)}</td><td>${f.money(y.taxDue)}</td></tr>`)
    .join('');

  const notes: string[] = [];
  if (r.overAllowance > 0) {
    notes.push(`You'd pay in ${f.money(r.yearlyDeposits)} a year, ${f.money(r.overAllowance)} more than the ${f.moneyWhole(p.isaAllowance)} ISA allowance for ${p.taxYear}. Only ${f.moneyWhole(p.isaAllowance)} can go into ISAs each tax year.`);
  }
  if (r.totalTax === 0) {
    notes.push(`At this rate, your interest stays within your ${f.moneyWhole(p.personalSavingsAllowance[input.taxBand])} Personal Savings Allowance every year, so a normal savings account would be tax-free too. An ISA keeps it tax-free if your savings or rates grow.`);
  }
  notes.push(`If your other income is low, you may also get up to ${f.moneyWhole(p.startingRateLimit)} of interest tax-free under the starting rate for savings, which this comparison leaves out.`);

  const summary = `Saving ${f.money(input.monthlyDeposit)} a month${input.startingBalance > 0 ? ` on top of ${f.money(input.startingBalance)}` : ''} at ${f.percent(input.ratePercent)} for ${yearsText} grows to ${f.money(r.finalBalance)} in an ISA. In a normal savings account, ${r.totalTax > 0 ? `you'd pay ${f.money(r.totalTax)} in tax as a ${input.taxBand}-rate taxpayer and end up with ${f.money(r.taxableFinalBalance)}` : 'you would pay no tax at this level'}.`;

  return {
    errors: [],
    view: {
      balanceLabel: `ISA balance after ${yearsText}`,
      balance: f.money(r.finalBalance),
      balanceSub: `${f.money(r.totalDeposits)} paid in · ${f.money(r.totalInterest)} interest`,
      allowanceUsed: `${f.money(Math.min(r.yearlyDeposits, p.isaAllowance))} of ${f.moneyWhole(p.isaAllowance)}`,
      taxOutside: f.money(r.totalTax),
      advantage: f.money(r.isaAdvantage),
      notes: notes.map((n) => `<li>${escapeHtml(n)}</li>`).join(''),
      chartSvg,
      yearRows,
      summary,
    },
  };
}
