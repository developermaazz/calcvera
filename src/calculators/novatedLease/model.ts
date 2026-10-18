/** Novated lease calculator (Australia): defaults, form reading and display strings (build time and browser). */
import {
  calculateNovatedLease,
  validateNovatedLeaseInput,
  type NovatedLeaseInput,
  type NovatedLeaseParams,
} from '../../engines/novatedLease';
import type { CalcView, Computed, Reader } from '../../lib/calcUi';
import { stackedBarChart } from '../../lib/charts';
import { createFormatters } from '../../lib/format';

export interface NovatedLeasePageParams {
  locale: string;
  currency: string;
  taxYear: string;
  lease: NovatedLeaseParams;
  fbtYear: string;
  /** ISO date the EV exemption changes for new leases. */
  evChangesOn: string;
  medicareThresholdsYear: string;
}

export const NOVATED_DEFAULTS: NovatedLeaseInput = {
  salary: 90_000,
  carPrice: 55_000,
  termYears: 3,
  interestRatePercent: 8,
  runningCostsAnnual: 4_000,
  isElectric: false,
};

export function readNovatedLeaseInput(r: Reader): NovatedLeaseInput {
  return {
    salary: r.num('salary'),
    carPrice: r.num('carPrice'),
    termYears: r.num('termYears'),
    interestRatePercent: r.num('interestRatePercent'),
    runningCostsAnnual: r.num('runningCostsAnnual', 0),
    isElectric: r.checked('isElectric'),
  };
}

export interface NovatedLeaseView extends CalcView {
  takeHomeYear: string;
  takeHomeMonth: string;
  preTax: string;
  postTax: string;
  leasePayment: string;
  residual: string;
  leaseTotal: string;
  buyTotal: string;
  verdictLabel: string;
  verdictAmount: string;
  fbtNote: string;
  evOverThreshold: boolean;
  chartSvg: string;
}

export function buildNovatedLeaseView(input: NovatedLeaseInput, p: NovatedLeasePageParams): Computed<NovatedLeaseView> {
  const errors = validateNovatedLeaseInput(input);
  if (errors.length > 0) return { errors, view: null };

  const f = createFormatters(p.locale, p.currency);
  const r = calculateNovatedLease(input, p.lease);
  const years = `${input.termYears} ${input.termYears === 1 ? 'year' : 'years'}`;
  const residualWithGst = r.residual * (1 + p.lease.gstRate);
  const saves = r.savings >= 0;

  const fbtNote = r.fbtExempt
    ? 'Eligible electric car: exempt from fringe benefits tax, so the whole package comes out of your pre-tax salary. It still appears on your income statement as a reportable fringe benefit.'
    : `Fringe benefits tax is removed with a post-tax contribution of ${f.money(r.postTaxDeduction)} a year (the employee contribution method). The rest is paid from your pre-tax salary.`;

  const chartSvg = stackedBarChart({
    data: [
      {
        label: 'Novated lease',
        values: [r.takeHomeReduction * input.termYears, residualWithGst],
        tooltip: `Novated lease: ${f.money(r.takeHomeReduction * input.termYears)} less take-home pay + ${f.money(residualWithGst)} residual`,
      },
      {
        label: 'Buy outright',
        values: [input.carPrice, input.runningCostsAnnual * input.termYears],
        tooltip: `Buy outright: ${f.money(input.carPrice)} car + ${f.money(input.runningCostsAnnual * input.termYears)} running costs`,
      },
    ],
    seriesClasses: ['chart-s1', 'chart-s2'],
    formatAxis: f.moneyCompact,
    ariaLabel: `Over ${years}: novated lease costs ${f.money(r.leaseTotalCost)}, buying outright costs ${f.money(r.buyOutrightCost)}.`,
  });

  const summary = `A novated lease would cut your take-home pay by about ${f.money(r.takeHomeReduction / 12)} a month. Over ${years}, including the ${f.money(residualWithGst)} residual, it ${
    saves ? `costs ${f.money(r.savings)} less` : `costs ${f.money(-r.savings)} more`
  } than buying the car outright and paying the running costs from your take-home pay.`;

  return {
    errors: [],
    view: {
      takeHomeYear: f.money(r.takeHomeReduction),
      takeHomeMonth: f.money(r.takeHomeReduction / 12),
      preTax: f.money(r.preTaxDeduction),
      postTax: f.money(r.postTaxDeduction),
      leasePayment: f.money(r.monthlyLeasePayment),
      residual: `${f.money(r.residual)} (${f.percent(r.residualPercent * 100)})`,
      leaseTotal: f.money(r.leaseTotalCost),
      buyTotal: f.money(r.buyOutrightCost),
      verdictLabel: saves ? 'Lease saves you' : 'Lease costs you more by',
      verdictAmount: f.money(Math.abs(r.savings)),
      fbtNote,
      evOverThreshold: input.isElectric && !r.fbtExempt,
      chartSvg,
      summary,
    },
  };
}
