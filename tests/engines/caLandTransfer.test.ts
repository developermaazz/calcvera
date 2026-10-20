import { describe, expect, it } from 'vitest';
import { requireFigure } from '../../src/countries';
import { ca } from '../../src/countries/ca';
import { calculateCaLandTransfer, tax, validateCaLandTransferInput, type CaLandTransferInput } from '../../src/engines/caLandTransfer';

/*
 * OUTSIDE CHECK (official worked examples, read 20 Oct 2026), all exact:
 *   Ontario.ca: $400,000 → $4,475 ($275 + $1,950 + $2,250)
 *   gov.bc.ca first time home buyers' table: $835,000 → tax $14,700, payable $6,700; $850,000 → $15,000, exemption
 *     $3,200, payable $11,800; $860,000 → $15,200, no exemption; $500,000 → $8,000, fully exempt
 *   montreal.ca 2026 example: $700,000 → $9,349.00
 *   quebec.ca 2026 example: $350,000 → $3,361 ($3,360.50 before rounding to the dollar)
 */

const p = requireFigure(ca.ca, 'ca').landTransfer;
const base: CaLandTransferInput = { province: 'ON', price: 400_000, assessedValue: 0, firstTimeBuyer: false, newBuild: false, inCity: false, municipalRatePercent: 1.5 };
const run = (x: Partial<CaLandTransferInput>) => calculateCaLandTransfer({ ...base, ...x }, p);

describe('official examples', () => {
  it('Ontario $400,000', () => {
    expect(run({}).total).toBeCloseTo(4_475, 6);
  });

  it('BC first-time buyer table', () => {
    expect(run({ province: 'BC', price: 835_000 }).total).toBeCloseTo(14_700, 6);
    expect(run({ province: 'BC', price: 835_000, firstTimeBuyer: true }).total).toBeCloseTo(6_700, 6);
    const r = run({ province: 'BC', price: 850_000, firstTimeBuyer: true });
    expect(r.provincialTax).toBeCloseTo(15_000, 6);
    expect(r.relief).toBeCloseTo(3_200, 6);
    expect(r.total).toBeCloseTo(11_800, 6);
    expect(run({ province: 'BC', price: 860_000, firstTimeBuyer: true }).total).toBeCloseTo(15_200, 6);
    expect(run({ province: 'BC', price: 500_000, firstTimeBuyer: true }).total).toBe(0);
  });

  it('Montréal $700,000 and Quebec $350,000 (2026)', () => {
    expect(run({ province: 'QC', price: 700_000, inCity: true }).total).toBeCloseTo(9_349, 6);
    expect(run({ province: 'QC', price: 350_000 }).total).toBeCloseTo(3_360.5, 6);
  });
});

describe('rebates, cities and other provinces', () => {
  it('Toronto: municipal tax and both first-time rebates', () => {
    const r = run({ price: 700_000, inCity: true });
    expect(r.provincialTax).toBeCloseTo(10_475, 6);
    expect(r.municipalTax).toBeCloseTo(10_475, 6);
    const ft = run({ price: 700_000, inCity: true, firstTimeBuyer: true });
    expect(ft.relief).toBeCloseTo(4_000 + 4_475, 6);
    expect(ft.total).toBeCloseTo(20_950 - 8_475, 6);
    // Under $368,000, Ontario's refund covers the whole tax.
    expect(run({ price: 368_000, firstTimeBuyer: true }).total).toBeCloseTo(0, 6);
  });

  it('Toronto luxury tiers and BC further tax', () => {
    expect(tax(3_500_000, p.toronto.bands)).toBeCloseTo(tax(3_000_000, p.toronto.bands) + 500_000 * 0.044, 6);
    expect(run({ province: 'BC', price: 4_000_000 }).total).toBeCloseTo(2_000 + 36_000 + 60_000 + 20_000, 6);
  });

  it('BC newly built home exemption', () => {
    expect(run({ province: 'BC', price: 1_000_000, newBuild: true }).total).toBe(0);
    const r = run({ province: 'BC', price: 1_125_000, newBuild: true });
    expect(r.relief).toBeCloseTo(r.provincialTax * 0.5, 6);
  });

  it('Manitoba, New Brunswick, Nova Scotia and PEI', () => {
    expect(run({ province: 'MB', price: 300_000 }).total).toBeCloseTo(300 + 600 + 750 + 2_000, 6);
    expect(run({ province: 'NB', price: 300_000, assessedValue: 320_000 }).total).toBeCloseTo(3_200, 6);
    expect(run({ province: 'NS', price: 400_000, municipalRatePercent: 1.5 }).total).toBeCloseTo(6_000, 6);
    expect(run({ province: 'PE', price: 300_000 }).total).toBeCloseTo(3_000, 6);
    expect(run({ province: 'PE', price: 300_000, firstTimeBuyer: true }).total).toBe(0);
    expect(run({ province: 'PE', price: 30_000 }).total).toBe(0);
  });

  it('effective rate and validation', () => {
    expect(run({}).effectiveRate).toBeCloseTo((4_475 / 400_000) * 100, 8);
    expect(validateCaLandTransferInput({ ...base, price: 0, assessedValue: -1 }).map((e) => e.field)).toEqual(['price', 'assessedValue']);
    expect(validateCaLandTransferInput(base)).toEqual([]);
  });
});
