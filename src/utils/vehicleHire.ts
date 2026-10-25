import { VehicleHireBillingBasis, VehicleHireDateRule } from '../types';

const DAY_MS = 24 * 60 * 60 * 1000;

const dateOrdinal = (value: string): number => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Enter a valid date.');
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error('Enter a valid date.');
  }
  return Math.floor(date.getTime() / DAY_MS);
};

export const isValidVehicleHireDate = (value: string): boolean => {
  try {
    dateOrdinal(value);
    return true;
  } catch {
    return false;
  }
};

const addCalendarMonths = (date: Date, months: number): Date => {
  const result = new Date(date.getTime());
  const originalDay = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(originalDay, lastDay));
  return result;
};

export interface VehicleRentalCalculationInput {
  inDate: string;
  outDate: string;
  billingBasis: VehicleHireBillingBasis;
  dateRule: VehicleHireDateRule;
  rentPerMonth?: number;
  rentPerDay?: number;
}

export interface VehicleRentalCalculation {
  totalMonths: number;
  totalDays: number;
  billableDays: number;
  estimatedHireCost: number;
}

/**
 * Date-only rental arithmetic uses UTC calendar ordinals to avoid timezone shifts.
 * Daily basis charges billable days * daily rate. Monthly basis prorates the
 * monthly rate over a clearly defined 30-day billing month and never adds the
 * daily rate on top. Inclusive/exclusive out-date behavior is saved per rental.
 */
export const calculateVehicleRental = (input: VehicleRentalCalculationInput): VehicleRentalCalculation => {
  const startOrdinal = dateOrdinal(input.inDate);
  const outOrdinal = dateOrdinal(input.outDate);
  if (outOrdinal < startOrdinal) throw new Error('Out Date cannot be earlier than In Date.');
  const billableDays = outOrdinal - startOrdinal + (input.dateRule === 'inclusive' ? 1 : 0);
  if (billableDays <= 0) throw new Error('The selected billing rule produces no billable days.');

  const selectedRate = input.billingBasis === 'daily' ? input.rentPerDay : input.rentPerMonth;
  if (selectedRate === undefined || !Number.isFinite(selectedRate) || selectedRate < 0) {
    throw new Error(`Enter a valid non-negative ${input.billingBasis === 'daily' ? 'daily' : 'monthly'} rate.`);
  }
  for (const rate of [input.rentPerDay, input.rentPerMonth]) {
    if (rate !== undefined && (!Number.isFinite(rate) || rate < 0)) throw new Error('Rental rates cannot be negative or invalid.');
  }

  const startDate = new Date(startOrdinal * DAY_MS);
  const endBoundary = new Date((outOrdinal + 1) * DAY_MS);
  let totalMonths = Math.max(0,
    (endBoundary.getUTCFullYear() - startDate.getUTCFullYear()) * 12
      + endBoundary.getUTCMonth() - startDate.getUTCMonth()
  );
  while (totalMonths > 0 && addCalendarMonths(startDate, totalMonths).getTime() > endBoundary.getTime()) totalMonths -= 1;
  const totalDays = outOrdinal - startOrdinal + 1;
  const estimatedHireCost = input.billingBasis === 'daily'
    ? selectedRate * billableDays
    : selectedRate * billableDays / 30;

  return {
    totalMonths,
    totalDays,
    billableDays,
    estimatedHireCost: Math.round((estimatedHireCost + Number.EPSILON) * 100) / 100
  };
};

export const vehicleHirePeriodsOverlap = (
  first: Pick<VehicleRentalCalculationInput, 'inDate' | 'outDate' | 'dateRule'>,
  second: Pick<VehicleRentalCalculationInput, 'inDate' | 'outDate' | 'dateRule'>
): boolean => {
  try {
    const firstStart = dateOrdinal(first.inDate);
    const firstEnd = dateOrdinal(first.outDate) + (first.dateRule === 'inclusive' ? 1 : 0);
    const secondStart = dateOrdinal(second.inDate);
    const secondEnd = dateOrdinal(second.outDate) + (second.dateRule === 'inclusive' ? 1 : 0);
    return firstStart < secondEnd && secondStart < firstEnd;
  } catch {
    return false;
  }
};

export interface WorkingSessionInput {
  startTime: string;
  stopTime: string;
}

export interface CalculatedWorkingSession extends WorkingSessionInput {
  durationMinutes: number;
  startOffsetMinutes: number;
  stopOffsetMinutes: number;
}

const timeMinutes = (value: string): number => {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new Error('Enter valid session start and stop times.');
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
};

/** Blank session rows are ignored; half-filled, zero-length, and overlapping rows fail. */
export const calculateWorkingSessions = (sessions: WorkingSessionInput[]): CalculatedWorkingSession[] => {
  const filled = sessions.filter(session => session.startTime || session.stopTime);
  if (!filled.length) throw new Error('Add at least one complete working session.');

  let dayOffset = 0;
  let previousStart = -1;
  let previousStop = -1;
  const calculated = filled.map(session => {
    if (!session.startTime || !session.stopTime) throw new Error('Complete both start and stop times for each working session.');
    const rawStart = timeMinutes(session.startTime);
    const rawStop = timeMinutes(session.stopTime);

    if (previousStart >= 0 && (rawStart < previousStart || previousStop > 24 * 60)) dayOffset += 24 * 60;
    const startOffsetMinutes = rawStart + dayOffset;
    const stopOffsetMinutes = rawStop + dayOffset + (rawStop <= rawStart ? 24 * 60 : 0);
    if (stopOffsetMinutes <= startOffsetMinutes) throw new Error('A working session must have a positive duration.');

    const result = {
      ...session,
      startOffsetMinutes,
      stopOffsetMinutes,
      durationMinutes: stopOffsetMinutes - startOffsetMinutes
    };
    previousStart = rawStart;
    previousStop = rawStop <= rawStart ? rawStop + 24 * 60 : rawStop;
    return result;
  });

  for (let first = 0; first < calculated.length; first += 1) {
    for (let second = first + 1; second < calculated.length; second += 1) {
      const a = calculated[first];
      const b = calculated[second];
      if (a.startOffsetMinutes < b.stopOffsetMinutes && b.startOffsetMinutes < a.stopOffsetMinutes) {
        throw new Error('Working sessions overlap. Adjust the times to avoid counting hours twice.');
      }
    }
  }
  return calculated;
};

export const formatMinutesAsHours = (minutes: number): string => {
  if (!Number.isFinite(minutes) || minutes < 0) return '—';
  const wholeMinutes = Math.round(minutes);
  return `${Math.floor(wholeMinutes / 60)}h ${String(wholeMinutes % 60).padStart(2, '0')}m`;
};

export const formatIndianRupees = (amount: number): string =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amount);

export const isDateInsideRange = (date: string, fromDate?: string, toDate?: string): boolean =>
  (!fromDate || date >= fromDate) && (!toDate || date <= toDate);

export interface VehicleMovementHoursCandidate {
  id: string;
  workDate: string;
  totalWorkingMinutes: number;
  assetId?: string;
  sessions?: WorkingSessionInput[];
  legacy?: boolean;
}

/**
 * Sum valid, filtered movement hours once per record. New movement records must
 * still reference a registered vehicle and their saved total must agree with
 * the validated sessions. Legacy hire logs remain countable from their saved
 * working-hours value because they predate the registered-asset relationship.
 */
export const sumValidVehicleMovementMinutes = (
  records: readonly VehicleMovementHoursCandidate[],
  registeredAssetIds: ReadonlySet<string>,
  fromDate?: string,
  toDate?: string
): number => {
  const seen = new Set<string>();
  let total = 0;

  for (const record of records) {
    const id = record.id.trim();
    if (!id || seen.has(id) || !isValidVehicleHireDate(record.workDate)
      || !isDateInsideRange(record.workDate, fromDate, toDate)) continue;

    if (record.legacy) {
      if (!Number.isInteger(record.totalWorkingMinutes) || record.totalWorkingMinutes < 0) continue;
      seen.add(id);
      total += record.totalWorkingMinutes;
      continue;
    }

    if (!record.assetId || !registeredAssetIds.has(record.assetId)
      || !Array.isArray(record.sessions) || record.sessions.length === 0
      || !Number.isInteger(record.totalWorkingMinutes) || record.totalWorkingMinutes < 0) continue;

    try {
      const calculatedMinutes = calculateWorkingSessions(record.sessions)
        .reduce((sum, session) => sum + session.durationMinutes, 0);
      if (calculatedMinutes !== record.totalWorkingMinutes) continue;
      seen.add(id);
      total += calculatedMinutes;
    } catch {
      // Invalid or overlapping sessions are not included in the summary.
    }
  }

  return total;
};
