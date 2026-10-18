/**
 * UK Inheritance Tax on death estates. Covers the nil-rate band (less gifts in the last 7 years),
 * residence nil-rate band with taper, spouse and charity exemptions, transferred allowances and the
 * 36% charity rate (HMRC baseline: chargeable estate − nil-rate band + charity gifts; IHTM45010).
 * Out of scope: tax on the gifts themselves, taper relief on gifts, business/agricultural relief,
 * downsizing addition. Pure: figures are passed in.
 */
import { checkMoney, checkPercent, type FieldError } from './validation';

export interface InheritanceTaxParams {
  nilRateBand: number;
  residenceNilRateBand: number;
  taperThreshold: number;
  taperRate: number;
  standardRate: number;
  charityReducedRate: number;
  charityQualifyingShare: number;
  maxTransferableShare: number;
}

export type MaritalStatus = 'single' | 'married' | 'widowed';

export interface InheritanceTaxInput {
  estateValue: number;
  debtsAndFuneral: number;
  /** Gifts in the last 7 years that count against the nil-rate band. */
  giftsLast7Years: number;
  homeToDescendants: boolean;
  /** Value of the home (or share) passing to direct descendants, less any mortgage on it. */
  homeValue: number;
  maritalStatus: MaritalStatus;
  /** Married: amount left to the spouse or civil partner (exempt). */
  leftToSpouse: number;
  /** Widowed: share of a late spouse's nil-rate band that was unused, 0–100. */
  transferredNrbPercent: number;
  /** Widowed: share of a late spouse's residence nil-rate band that was unused, 0–100. */
  transferredRnrbPercent: number;
  /** Share of the net estate left to charity, 0–100. */
  charityPercent: number;
}

export interface InheritanceTaxResult {
  netEstate: number;
  spouseExempt: number;
  charityExempt: number;
  nilRateBand: number;
  /** Nil-rate band left after gifts. */
  nilRateBandAvailable: number;
  giftsExceedNilRateBand: boolean;
  residenceBandMax: number;
  residenceBandTaper: number;
  /** Residence nil-rate band actually used (after taper and limited to the home's value). */
  residenceBandUsed: number;
  taxableAmount: number;
  rate: number;
  charityRateApplies: boolean;
  /** Charity gifts needed for the 36% rate (10% of the baseline amount). */
  charityNeededForReducedRate: number;
  tax: number;
}

export function validateInheritanceTaxInput(input: InheritanceTaxInput): FieldError[] {
  const errors: FieldError[] = [];
  checkMoney(errors, 'estateValue', input.estateValue, 1_000_000_000);
  checkMoney(errors, 'debtsAndFuneral', input.debtsAndFuneral, 1_000_000_000);
  checkMoney(errors, 'giftsLast7Years', input.giftsLast7Years, 1_000_000_000);
  if (input.homeToDescendants) checkMoney(errors, 'homeValue', input.homeValue, 1_000_000_000);
  if (input.maritalStatus === 'married') checkMoney(errors, 'leftToSpouse', input.leftToSpouse, 1_000_000_000);
  if (input.maritalStatus === 'widowed') {
    checkPercent(errors, 'transferredNrbPercent', input.transferredNrbPercent);
    checkPercent(errors, 'transferredRnrbPercent', input.transferredRnrbPercent);
  }
  checkPercent(errors, 'charityPercent', input.charityPercent);

  if (errors.length === 0) {
    const net = Math.max(0, input.estateValue - input.debtsAndFuneral);
    if (input.homeToDescendants && input.homeValue > input.estateValue) {
      errors.push({ field: 'homeValue', message: 'The home cannot be worth more than the whole estate.' });
    }
    const spouse = input.maritalStatus === 'married' ? input.leftToSpouse : 0;
    if (spouse + (net * input.charityPercent) / 100 > net + 1e-6) {
      errors.push({
        field: input.maritalStatus === 'married' ? 'leftToSpouse' : 'charityPercent',
        message: 'Gifts to your spouse and charity add up to more than the estate after debts.',
      });
    }
  }
  return errors;
}

export function calculateInheritanceTax(input: InheritanceTaxInput, p: InheritanceTaxParams): InheritanceTaxResult {
  const errors = validateInheritanceTaxInput(input);
  if (errors.length > 0) throw new RangeError(errors.map((e) => e.message).join(' '));

  const netEstate = Math.max(0, input.estateValue - input.debtsAndFuneral);
  const spouseExempt = input.maritalStatus === 'married' ? Math.min(input.leftToSpouse, netEstate) : 0;
  const charityExempt = (netEstate * input.charityPercent) / 100;
  const chargeable = Math.max(0, netEstate - spouseExempt - charityExempt);

  const widowed = input.maritalStatus === 'widowed';
  const nrbShare = widowed ? Math.min(input.transferredNrbPercent / 100, p.maxTransferableShare) : 0;
  const rnrbShare = widowed ? Math.min(input.transferredRnrbPercent / 100, p.maxTransferableShare) : 0;

  const nilRateBand = p.nilRateBand * (1 + nrbShare);
  const nilRateBandAvailable = Math.max(0, nilRateBand - input.giftsLast7Years);

  // Taper uses the net estate before exemptions and reliefs.
  const residenceBandMax = input.homeToDescendants ? p.residenceNilRateBand * (1 + rnrbShare) : 0;
  const residenceBandTaper = Math.max(0, (netEstate - p.taperThreshold) * p.taperRate);
  const residenceBandUsed = input.homeToDescendants
    ? Math.min(Math.max(0, residenceBandMax - residenceBandTaper), input.homeValue, chargeable)
    : 0;

  const taxableAmount = Math.max(0, chargeable - nilRateBandAvailable - residenceBandUsed);

  // 10% test: baseline = chargeable estate − nil-rate band available + charity gifts.
  const baseline = Math.max(0, chargeable - nilRateBandAvailable) + charityExempt;
  const charityNeededForReducedRate = baseline * p.charityQualifyingShare;
  const charityRateApplies = charityExempt > 0 && charityExempt >= charityNeededForReducedRate - 1e-6;
  const rate = charityRateApplies ? p.charityReducedRate : p.standardRate;

  return {
    netEstate,
    spouseExempt,
    charityExempt,
    nilRateBand,
    nilRateBandAvailable,
    giftsExceedNilRateBand: input.giftsLast7Years > nilRateBand,
    residenceBandMax,
    residenceBandTaper,
    residenceBandUsed,
    taxableAmount,
    rate,
    charityRateApplies,
    charityNeededForReducedRate,
    tax: taxableAmount * rate,
  };
}
