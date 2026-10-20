import { describe, expect, it } from 'vitest';
import { requireFigure } from '../../src/countries';
import { au } from '../../src/countries/au';
import { calculateAuStampDuty, dutyOnBands, validateAuStampDutyInput, type AuStampDutyInput } from '../../src/engines/auStampDuty';

/*
 * OUTSIDE CHECK (official examples and calculators, 20 Oct 2026):
 *   QLD (QRO worked examples, exact): $850,000 investment → $31,275; home concession $950,000 → $28,600 and $550,000 →
 *     $10,600; first home $795,000 → $19,890, $730,000 → $6,555, $650,000 → $0, $850,000 → $24,100 (home concession only)
 *   NSW (Revenue NSW First Home Buyers Assistance calculator): first home $850,000 → $9,796.75 duty, $22,640.25 saving
 *   VIC (SRO land transfer duty calculator): general $650,000 → $34,070; first home $650,000 → $11,356; $700,000 → $24,713
 *     (SRO rounds down to the dollar; ours are $11,356.67 and $24,713.33)
 *   NT (Territory Revenue Office example, I-SD-002): $140,000 → $3,388
 */

const p = requireFigure(au.au, 'au').stampDuty;
const base: AuStampDutyInput = { state: 'NSW', value: 850_000, buyer: 'investor', newHome: false };
const run = (x: Partial<AuStampDutyInput>) => calculateAuStampDuty({ ...base, ...x }, p);

describe('official examples', () => {
  it('Queensland', () => {
    expect(run({ state: 'QLD', value: 850_000 }).duty).toBeCloseTo(31_275, 6);
    expect(run({ state: 'QLD', value: 950_000, buyer: 'ownerOccupier' }).duty).toBeCloseTo(28_600, 6);
    expect(run({ state: 'QLD', value: 550_000, buyer: 'ownerOccupier' }).duty).toBeCloseTo(10_600, 6);
    expect(run({ state: 'QLD', value: 795_000, buyer: 'firstHome' }).duty).toBeCloseTo(19_890, 6);
    expect(run({ state: 'QLD', value: 730_000, buyer: 'firstHome' }).duty).toBeCloseTo(6_555, 6);
    expect(run({ state: 'QLD', value: 650_000, buyer: 'firstHome' }).duty).toBe(0);
    expect(run({ state: 'QLD', value: 850_000, buyer: 'firstHome' }).duty).toBeCloseTo(24_100, 6);
  });

  it('NSW first home concession', () => {
    const r = run({ buyer: 'firstHome' });
    expect(r.duty).toBeCloseTo(9_796.75, 2);
    expect(r.saving).toBeCloseTo(22_640.25, 2);
    expect(r.generalDuty).toBeCloseTo(32_437, 6);
  });

  it('Victoria general and first home', () => {
    expect(run({ state: 'VIC', value: 650_000 }).duty).toBeCloseTo(34_070, 6);
    expect(Math.floor(run({ state: 'VIC', value: 650_000, buyer: 'firstHome' }).duty)).toBe(11_356);
    expect(Math.floor(run({ state: 'VIC', value: 700_000, buyer: 'firstHome' }).duty)).toBe(24_713);
  });

  it('Northern Territory formula', () => {
    expect(run({ state: 'NT', value: 140_000 }).duty).toBeCloseTo(3_388, 2);
  });
});

describe('other rules', () => {
  it('NSW: exemption, minimum duty and premium rate', () => {
    expect(run({ value: 800_000, buyer: 'firstHome' }).duty).toBe(0);
    expect(run({ value: 1_000_000, buyer: 'firstHome' }).duty).toBeCloseTo(39_187, 6);
    expect(run({ value: 1_000 }).duty).toBe(20);
    expect(run({ value: 4_000_000 }).duty).toBeCloseTo(194_137 + 0.07 * 130_000, 6);
  });

  it('Victoria: PPR concession, flat 5.5% band and the $2m premium band', () => {
    expect(run({ state: 'VIC', value: 500_000, buyer: 'ownerOccupier' }).duty).toBeCloseTo(18_370 + 0.06 * 60_000, 6);
    expect(run({ state: 'VIC', value: 600_000, buyer: 'ownerOccupier' }).concession).toBe('none');
    expect(run({ state: 'VIC', value: 1_000_000 }).duty).toBeCloseTo(55_000, 6);
    expect(run({ state: 'VIC', value: 2_500_000 }).duty).toBeCloseTo(110_000 + 0.065 * 500_000, 6);
  });

  it('QLD first home (new home) and SA new home relief', () => {
    expect(run({ state: 'QLD', value: 1_500_000, buyer: 'firstHome', newHome: true }).duty).toBe(0);
    expect(run({ state: 'SA', value: 900_000, buyer: 'firstHome', newHome: true }).duty).toBe(0);
    expect(run({ state: 'SA', value: 600_000, buyer: 'firstHome' }).duty).toBeCloseTo(21_330 + 0.055 * 100_000, 6);
  });

  it('WA: first home owner rate and concessional rate; per $100 or part', () => {
    expect(run({ state: 'WA', value: 600_000, buyer: 'firstHome' }).duty).toBe(0);
    expect(run({ state: 'WA', value: 700_000, buyer: 'firstHome' }).duty).toBeCloseTo(16_150, 6);
    expect(run({ state: 'WA', value: 900_000, buyer: 'firstHome' }).duty).toBeCloseTo(28_453 + 0.0515 * 175_000, 6);
    expect(run({ state: 'WA', value: 180_000, buyer: 'ownerOccupier' }).duty).toBeCloseTo(1_800 + 0.0404 * 60_000, 6);
    expect(run({ state: 'WA', value: 500_050 }).duty).toBeCloseTo(11_115 + 0.0475 * 140_100, 6);
  });

  it('ACT owner-occupier, investor and Home Buyer Concession; TAS', () => {
    expect(run({ state: 'ACT', value: 800_000, buyer: 'ownerOccupier' }).duty).toBeCloseTo(19_208 + 0.059 * 50_000, 6);
    expect(run({ state: 'ACT', value: 800_000 }).duty).toBeCloseTo(22_200 + 0.059 * 50_000, 6);
    expect(run({ state: 'ACT', value: 2_000_000, buyer: 'ownerOccupier' }).duty).toBeCloseTo(90_800, 6);
    expect(run({ state: 'ACT', value: 800_000, buyer: 'firstHome' }).duty).toBe(0);
    expect(run({ state: 'TAS', value: 600_000 }).duty).toBeCloseTo(12_935 + 0.0425 * 225_000, 6);
    expect(run({ state: 'TAS', value: 2_000 }).duty).toBe(50);
  });

  it('NT bands above $525,000', () => {
    expect(run({ state: 'NT', value: 600_000 }).duty).toBeCloseTo(29_700, 6);
    expect(run({ state: 'NT', value: 4_000_000 }).duty).toBeCloseTo(230_000, 6);
    expect(run({ state: 'NT', value: 6_000_000 }).duty).toBeCloseTo(357_000, 6);
  });

  it('band helper and validation', () => {
    expect(dutyOnBands(75_050, p.qld.bands, true)).toBeCloseTo(1_050 + 0.035 * 100, 6);
    expect(validateAuStampDutyInput({ ...base, value: 0 }).map((e) => e.field)).toEqual(['value']);
    expect(validateAuStampDutyInput(base)).toEqual([]);
  });
});
