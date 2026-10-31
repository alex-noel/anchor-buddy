import type { CostEstimate, Place, SearchRequest, TariffBand, VesselProfile } from './types.ts';
import { validateTariff } from './validation.ts';

function dateKey(instant: number, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);
  return `${parts.find((p) => p.type === 'year')!.value}-${parts.find((p) => p.type === 'month')!.value}-${parts.find((p) => p.type === 'day')!.value}`;
}

export function localDate(instant: string, timezone: string): string {
  return dateKey(Date.parse(instant), timezone);
}

function dateOrdinal(key: string): number {
  return Date.parse(`${key}T12:00:00Z`) / 86_400_000;
}
const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function estimateCost(
  place: Place,
  vessel: VesselProfile,
  search: SearchRequest,
): CostEstimate {
  const unknown = (note: string): CostEstimate => ({
    status: 'unknown',
    currency: place.tariff?.currency ?? null,
    total: null,
    items: [],
    notes: [note, 'An estimate does not establish berth availability.'],
    sourceIds: place.tariff?.sourceIds ?? place.sourceIds,
  });
  if (place.feeStatus === 'free')
    return {
      status: 'free',
      currency: null,
      total: 0,
      items: [],
      notes: ['Published as free; availability and overnight permission are assessed separately.'],
      sourceIds: place.sourceIds,
    };
  if (place.feeStatus === 'unknown' || !place.tariff)
    return unknown('No verified published tariff. Contact the operator.');
  const tariff = place.tariff;
  if (validateTariff(tariff).length)
    return unknown('Published tariff structure is invalid or incomplete.');
  if (
    !tariff.currency ||
    !Number.isFinite(tariff.taxRate) ||
    tariff.taxRate < 0 ||
    tariff.taxRate > 1 ||
    !Array.isArray(tariff.bands) ||
    !tariff.bands.length ||
    !Array.isArray(tariff.extras)
  )
    return unknown('Tariff rules are incomplete.');
  if (
    !Number.isFinite(Date.parse(tariff.verifiedAt)) ||
    !Number.isFinite(Date.parse(tariff.validUntil)) ||
    Date.parse(tariff.validUntil) < Date.parse(search.departure)
  )
    return unknown('Published tariff is not verified through departure.');
  let arrivalDay: string, departureDay: string;
  try {
    arrivalDay = localDate(search.arrival, tariff.timezone);
    departureDay = localDate(search.departure, tariff.timezone);
  } catch {
    return unknown('Tariff timezone is invalid.');
  }
  const nights = Math.max(1, Math.round(dateOrdinal(departureDay) - dateOrdinal(arrivalDay)));
  const departureTime = new Intl.DateTimeFormat('en-GB', {
    timeZone: tariff.timezone,
    hourCycle: 'h23',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(Date.parse(search.departure));
  const days = Math.max(
    1,
    Math.round(dateOrdinal(departureDay) - dateOrdinal(arrivalDay)) +
      (departureTime === '00:00:00' ? 0 : 1),
  );
  const hours = Math.max(
    1,
    Math.ceil((Date.parse(search.departure) - Date.parse(search.arrival)) / 3_600_000),
  );
  if (
    !Number.isFinite(hours) ||
    hours <= 0 ||
    !Number.isFinite(vessel.lengthM) ||
    vessel.lengthM <= 0
  )
    return unknown('Valid vessel dimensions and stay dates are required.');
  if (
    tariff.multihullMultiplier !== undefined &&
    (!Number.isFinite(tariff.multihullMultiplier) || tariff.multihullMultiplier < 1)
  )
    return unknown('Invalid multihull tariff rule.');
  if (
    tariff.beamSurcharge &&
    (!Number.isFinite(tariff.beamSurcharge.aboveM) ||
      !Number.isFinite(tariff.beamSurcharge.multiplier) ||
      tariff.beamSurcharge.multiplier < 1)
  )
    return unknown('Invalid beam tariff rule.');
  if (
    tariff.minimumStayCharge !== undefined &&
    (!Number.isFinite(tariff.minimumStayCharge) || tariff.minimumStayCharge < 0)
  )
    return unknown('Invalid minimum stay charge.');
  const items: CostEstimate['items'] = [];
  const findBand = (day: string): TariffBand | null => {
    const matches = tariff.bands.filter(
      (band) => day >= band.validFrom.slice(0, 10) && day <= band.validUntil.slice(0, 10),
    );
    return matches.length === 1 ? matches[0]! : null;
  };
  const first = findBand(arrivalDay);
  if (!first) return unknown('No unambiguous tariff for arrival.');
  const periods = first.period === 'hour' ? hours : first.period === 'day' ? days : nights;
  for (let index = 0; index < periods; index++) {
    const day =
      first.period === 'hour'
        ? dateKey(Date.parse(search.arrival) + index * 3_600_000, tariff.timezone)
        : new Date((dateOrdinal(arrivalDay) + index) * 86_400_000).toISOString().slice(0, 10);
    const band = findBand(day);
    if (!band || band.period !== first.period)
      return unknown('A stay crosses missing, overlapping or incompatible seasonal tariff bands.');
    if (
      !['flat', 'per_metre', 'per_foot'].includes(band.basis) ||
      !['night', 'day', 'hour'].includes(band.period) ||
      !Number.isFinite(band.rate) ||
      band.rate < 0 ||
      (band.minCharge !== undefined && (!Number.isFinite(band.minCharge) || band.minCharge < 0)) ||
      (band.minBillableLengthM !== undefined &&
        (!Number.isFinite(band.minBillableLengthM) || band.minBillableLengthM < 0))
    )
      return unknown('Invalid published tariff band.');
    if (
      band.maxLengthM !== undefined &&
      (!Number.isFinite(band.maxLengthM) || vessel.lengthM > band.maxLengthM)
    )
      return unknown('Vessel falls outside the published price band.');
    const billableLength = Math.max(vessel.lengthM, band.minBillableLengthM ?? 0);
    const quantity =
      band.basis === 'flat'
        ? 1
        : band.basis === 'per_foot'
          ? billableLength / 0.3048
          : billableLength;
    const amount = roundMoney(Math.max(band.minCharge ?? 0, quantity * band.rate));
    items.push({ label: `${band.label} · ${day}`, quantity, unitPrice: band.rate, amount });
  }
  let berthSubtotal = roundMoney(items.reduce((sum, item) => sum + item.amount, 0));
  if (tariff.multihullMultiplier && ['catamaran', 'trimaran'].includes(vessel.type)) {
    const amount = roundMoney(berthSubtotal * (tariff.multihullMultiplier - 1));
    items.push({ label: 'Multihull supplement', quantity: 1, unitPrice: amount, amount });
    berthSubtotal += amount;
  }
  if (tariff.beamSurcharge && vessel.beamM > tariff.beamSurcharge.aboveM) {
    const amount = roundMoney(berthSubtotal * (tariff.beamSurcharge.multiplier - 1));
    items.push({ label: 'Beam supplement', quantity: 1, unitPrice: amount, amount });
    berthSubtotal += amount;
  }
  if (tariff.minimumStayCharge && berthSubtotal < tariff.minimumStayCharge) {
    const amount = roundMoney(tariff.minimumStayCharge - berthSubtotal);
    items.push({ label: 'Minimum stay charge adjustment', quantity: 1, unitPrice: amount, amount });
    berthSubtotal += amount;
  }
  let taxable = berthSubtotal;
  for (const extra of tariff.extras) {
    if (
      !Number.isFinite(extra.amount) ||
      extra.amount < 0 ||
      !['night', 'stay'].includes(extra.per)
    )
      return unknown('Invalid extra charge.');
    if (!extra.required) continue;
    const quantity = extra.per === 'night' ? nights : 1;
    const amount = roundMoney(quantity * extra.amount);
    items.push({ label: extra.label, quantity, unitPrice: extra.amount, amount });
    if (extra.taxable) taxable += amount;
  }
  if (tariff.taxRate > 0) {
    const amount = roundMoney(taxable * tariff.taxRate);
    items.push({ label: 'Published taxes', quantity: 1, unitPrice: amount, amount });
  }
  const notes = ['Estimate in the source currency. Berth availability is not guaranteed.'];
  const optional = tariff.extras.filter((extra) => !extra.required);
  if (optional.length)
    notes.push(`Optional extras excluded: ${optional.map((extra) => extra.label).join(', ')}.`);
  return {
    status: 'paid',
    currency: tariff.currency,
    total: roundMoney(items.reduce((sum, item) => sum + item.amount, 0)),
    items,
    notes,
    sourceIds: tariff.sourceIds,
  };
}
