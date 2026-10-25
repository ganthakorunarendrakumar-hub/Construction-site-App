import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateVehicleRental, calculateWorkingSessions, formatMinutesAsHours, isValidVehicleHireDate, sumValidVehicleMovementMinutes, vehicleHirePeriodsOverlap } from '../src/utils/vehicleHire.ts';
import { mergeVehicleTypeOptions, VEHICLE_TYPES } from '../src/utils/hireCatalog.ts';

const localStorageValues = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (key: string) => localStorageValues.get(key) ?? null,
    setItem: (key: string, value: string) => { localStorageValues.set(key, String(value)); },
    removeItem: (key: string) => { localStorageValues.delete(key); },
    clear: () => localStorageValues.clear(),
    key: (index: number) => Array.from(localStorageValues.keys())[index] ?? null,
    get length() { return localStorageValues.size; }
  }
});
const { dataService, PRESET_USERS } = await import('../src/services/dataService.ts');

test('vehicle dropdown catalog contains the requested 18 unique vehicle types', () => {
  assert.deepEqual(VEHICLE_TYPES, [
    'Excavators', 'JCB', 'Road Rollers / Compactors', 'Tractor', 'Bulldozers',
    'Backhoe Loaders', 'Skid Steer Loaders', 'Motor Graders', 'Wheel Loaders',
    'Dump Trucks', 'Articulated Haulers', 'Scrapers', 'Cranes (Tower & Mobile)',
    'Forklifts', 'Telehandlers', 'Boom Lifts & Scissor Lifts',
    'Concrete Mixer (Ajax)', 'Concrete Pump Trucks'
  ]);
  assert.equal(VEHICLE_TYPES.length, 18);
  assert.equal(new Set(VEHICLE_TYPES).size, 18);
  assert.equal(VEHICLE_TYPES.filter(type => type === 'Dump Trucks').length, 1);
  assert.equal(VEHICLE_TYPES.includes('JCB'), true);
});

test('shared vehicle type options trim names and reject case-insensitive duplicates', () => {
  const options = mergeVehicleTypeOptions(VEHICLE_TYPES, ['  Transit Mixer  ', 'transit mixer', '  ', 'JCB']);
  assert.equal(options.length, 19);
  assert.equal(options[18], 'Transit Mixer');
  assert.equal(options.filter(type => type.toLocaleLowerCase() === 'dump trucks').length, 1);
});

test('authorized custom vehicle types persist and unauthorized roles cannot add them', async () => {
  localStorageValues.clear();
  dataService.setCurrentUser(PRESET_USERS.admin);
  assert.equal((await dataService.getVehicleTypes()).length, 18);

  assert.equal(await dataService.addVehicleType('  Transit Mixer  '), 'Transit Mixer');
  assert.equal((await dataService.getVehicleTypes()).at(-1), 'Transit Mixer');
  assert.match(localStorageValues.get('buildpulse_vehicle_types_v1') || '', /Transit Mixer/);
  await assert.rejects(dataService.addVehicleType('transit mixer'), /already exists/i);
  await assert.rejects(dataService.addVehicleType('   '), /enter a vehicle type/i);

  dataService.setCurrentUser({ ...PRESET_USERS.admin, role: 'storekeeper' });
  await assert.rejects(dataService.addVehicleType('Water Tanker'), /permission/i);
  dataService.setCurrentUser(PRESET_USERS.admin);
});

test('legacy vehicle movement rows load only for the current company and requested project', async () => {
  localStorageValues.clear();
  dataService.setCurrentUser(PRESET_USERS.admin);
  localStorageValues.set('buildpulse_vehicle_hire_v1', JSON.stringify([
    { id: 'current-row', company_id: PRESET_USERS.admin.company_id, project_id: 'project-1', hire_date: '2026-10-25', created_at: '2026-10-25T08:00:00Z' },
    { id: 'other-company', company_id: 'another-company', project_id: 'project-1', hire_date: '2026-10-25', created_at: '2026-10-25T09:00:00Z' },
    { id: 'other-project', company_id: PRESET_USERS.admin.company_id, project_id: 'project-2', hire_date: '2026-10-25', created_at: '2026-10-25T10:00:00Z' }
  ]));

  assert.deepEqual((await dataService.getVehicleHireRecords('project-1')).map(record => record.id), ['current-row']);
});

test('date-only parsing validates local calendar values without timezone conversion', () => {
  assert.equal(isValidVehicleHireDate('2026-10-25'), true);
  assert.equal(isValidVehicleHireDate('2026-02-30'), false);
  assert.equal(isValidVehicleHireDate('25-10-2026'), false);
});

test('daily rental billing shows an inclusive date period and calculates days and cost', () => {
  assert.deepEqual(calculateVehicleRental({
    inDate: '2026-10-01', outDate: '2026-10-03', billingBasis: 'daily', dateRule: 'inclusive', rentPerDay: 250
  }), { totalMonths: 0, totalDays: 3, billableDays: 3, estimatedHireCost: 750 });
});

test('exclusive out date is not charged', () => {
  assert.deepEqual(calculateVehicleRental({
    inDate: '2026-10-01', outDate: '2026-10-03', billingBasis: 'daily', dateRule: 'exclusive', rentPerDay: 250
  }), { totalMonths: 0, totalDays: 3, billableDays: 2, estimatedHireCost: 500 });
});

test('monthly billing prorates by a 30-day billing month without adding the daily rate', () => {
  assert.deepEqual(calculateVehicleRental({
    inDate: '2026-10-01', outDate: '2026-10-30', billingBasis: 'monthly', dateRule: 'inclusive', rentPerDay: 250, rentPerMonth: 3000
  }), { totalMonths: 0, totalDays: 30, billableDays: 30, estimatedHireCost: 3000 });
  assert.deepEqual(calculateVehicleRental({
    inDate: '2026-10-01', outDate: '2026-10-31', billingBasis: 'monthly', dateRule: 'inclusive', rentPerMonth: 3000
  }), { totalMonths: 1, totalDays: 31, billableDays: 31, estimatedHireCost: 3100 });
});

test('date and selected rate validation reject invalid ranges and negative or missing rates', () => {
  assert.throws(() => calculateVehicleRental({ inDate: '2026-10-04', outDate: '2026-10-03', billingBasis: 'daily', dateRule: 'inclusive', rentPerDay: 100 }), /Out Date/);
  assert.throws(() => calculateVehicleRental({ inDate: '2026-02-30', outDate: '2026-03-02', billingBasis: 'daily', dateRule: 'inclusive', rentPerDay: 100 }), /valid date/i);
  assert.throws(() => calculateVehicleRental({ inDate: '2026-10-01', outDate: '2026-10-02', billingBasis: 'daily', dateRule: 'inclusive', rentPerDay: -1 }), /valid non-negative daily rate/i);
  assert.throws(() => calculateVehicleRental({ inDate: '2026-10-01', outDate: '2026-10-02', billingBasis: 'monthly', dateRule: 'inclusive', rentPerDay: 200 }), /monthly rate/i);
});

test('hire periods for a vehicle may touch at an exclusive return boundary but cannot overlap', () => {
  const first = { inDate: '2026-10-01', outDate: '2026-10-03', dateRule: 'exclusive' as const };
  assert.equal(vehicleHirePeriodsOverlap(first, { inDate: '2026-10-03', outDate: '2026-10-05', dateRule: 'inclusive' }), false);
  assert.equal(vehicleHirePeriodsOverlap({ ...first, dateRule: 'inclusive' }, { inDate: '2026-10-03', outDate: '2026-10-05', dateRule: 'inclusive' }), true);
  assert.equal(vehicleHirePeriodsOverlap(first, { inDate: '2026-10-02', outDate: '2026-10-04', dateRule: 'inclusive' }), true);
});

test('multiple regular and overnight sessions sum actual work time', () => {
  const sessions = calculateWorkingSessions([
    { startTime: '08:00', stopTime: '10:00' },
    { startTime: '10:30', stopTime: '12:00' },
    { startTime: '13:00', stopTime: '17:00' }
  ]);
  assert.equal(sessions.reduce((sum, session) => sum + session.durationMinutes, 0), 450);

  const overnight = calculateWorkingSessions([
    { startTime: '22:00', stopTime: '02:00' },
    { startTime: '03:00', stopTime: '05:00' }
  ]);
  assert.equal(overnight.reduce((sum, session) => sum + session.durationMinutes, 0), 360);
  assert.equal(formatMinutesAsHours(overnight[0].durationMinutes), '4h 00m');
});

test('blank session rows are ignored but incomplete, invalid and overlapping sessions fail', () => {
  assert.equal(calculateWorkingSessions([
    { startTime: '08:00', stopTime: '09:00' }, { startTime: '', stopTime: '' }
  ]).length, 1);
  assert.throws(() => calculateWorkingSessions([{ startTime: '08:00', stopTime: '' }]), /Complete both/);
  assert.throws(() => calculateWorkingSessions([{ startTime: '25:00', stopTime: '26:00' }]), /valid session/);
  assert.throws(() => calculateWorkingSessions([
    { startTime: '08:00', stopTime: '10:00' }, { startTime: '09:30', stopTime: '11:00' }
  ]), /overlap/);
});

test('vehicle working-hour summary returns zero when there are no valid movement records', () => {
  const assets = new Set(['asset-1']);
  assert.equal(sumValidVehicleMovementMinutes([], assets), 0);
  assert.equal(sumValidVehicleMovementMinutes([
    { id: 'orphan', assetId: 'deleted-asset', workDate: '2026-10-25', totalWorkingMinutes: 60, sessions: [{ startTime: '08:00', stopTime: '09:00' }] },
    { id: 'invalid-date', assetId: 'asset-1', workDate: '2026-02-30', totalWorkingMinutes: 60, sessions: [{ startTime: '08:00', stopTime: '09:00' }] },
    { id: 'invalid-session', assetId: 'asset-1', workDate: '2026-10-25', totalWorkingMinutes: 0, sessions: [{ startTime: '08:00', stopTime: '09:00' }] }
  ], assets), 0);
});

test('vehicle working-hour summary includes valid legacy rows and linked movements once within the date range', () => {
  const assets = new Set(['asset-1']);
  const rows = [
    { id: 'move-1', assetId: 'asset-1', workDate: '2026-10-24', totalWorkingMinutes: 240, sessions: [{ startTime: '08:00', stopTime: '12:00' }] },
    { id: 'move-1', assetId: 'asset-1', workDate: '2026-10-24', totalWorkingMinutes: 240, sessions: [{ startTime: '08:00', stopTime: '12:00' }] },
    { id: 'move-2', assetId: 'asset-1', workDate: '2026-10-25', totalWorkingMinutes: 120, sessions: [{ startTime: '22:00', stopTime: '00:00' }] },
    { id: 'legacy-1', workDate: '2026-10-25', totalWorkingMinutes: 240, legacy: true },
    { id: 'outside-range', assetId: 'asset-1', workDate: '2026-10-23', totalWorkingMinutes: 60, sessions: [{ startTime: '08:00', stopTime: '09:00' }] }
  ];

  const selectedRangeMinutes = sumValidVehicleMovementMinutes(rows, assets, '2026-10-24', '2026-10-25');
  assert.equal(selectedRangeMinutes, 600);
  assert.equal((selectedRangeMinutes / 60).toFixed(2), '10.00');
  assert.equal(sumValidVehicleMovementMinutes(rows, assets, '2026-10-24', '2026-10-24'), 240);
});

test('two valid legacy work records can total 10 hours when no current assets are registered', () => {
  const records = [
    { id: 'legacy-1', workDate: '2026-10-24', totalWorkingMinutes: 240, legacy: true },
    { id: 'legacy-2', workDate: '2026-10-25', totalWorkingMinutes: 360, legacy: true }
  ];
  const minutes = sumValidVehicleMovementMinutes(records, new Set());
  assert.equal(minutes, 600);
  assert.equal((minutes / 60).toFixed(2), '10.00');
});
