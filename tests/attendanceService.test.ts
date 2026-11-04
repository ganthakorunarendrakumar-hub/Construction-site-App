import test from 'node:test';
import assert from 'node:assert/strict';
import type { DailyAttendanceRecord, Employee, Project, UserProfile } from '../src/types/index.ts';

const values = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => { values.set(key, String(value)); },
  removeItem: (key: string) => { values.delete(key); },
  clear: () => values.clear(),
  key: (index: number) => Array.from(values.keys())[index] ?? null,
  get length() { return values.size; }
};
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: localStorageMock });

const [{ attendanceService, DuplicateAttendanceRecordError }, { dataService }, { authService }] = await Promise.all([
  import('../src/services/attendanceService.ts'),
  import('../src/services/dataService.ts'),
  import('../src/services/authService.ts')
]);

const user: UserProfile = {
  id: 'admin-test',
  user_id: 'ADMIN-TEST',
  email: 'admin@example.test',
  full_name: 'Test Administrator',
  role: 'admin',
  role_title: 'Company Administrator',
  company_id: 'company-test'
};

const employee: Employee = {
  id: 'employee-1',
  company_id: 'company-test',
  employee_code: 'EMP-001',
  full_name: 'Test Worker',
  job_type: 'Mason',
  group_id: 'group-1',
  group_name: 'Masons',
  project_id: 'project-1',
  project_name: 'Project One',
  joining_date: '2026-01-01',
  salary_type: 'daily_wage',
  salary_amount: 1000,
  standard_hours_per_day: 8,
  overtime_rate_per_hour: 100,
  status: 'active',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z'
};

const project = (id: string, name = id): Project => ({
  id,
  company_id: 'company-test',
  name,
  code: id.toUpperCase(),
  client_name: 'Client',
  address: `${name} address`,
  location: `${name} location`,
  description: '',
  start_date: '2026-01-01',
  expected_completion_date: '2027-01-01',
  project_manager_id: 'manager-1',
  project_manager_name: 'Manager',
  status: 'in_progress',
  created_by: 'admin-test',
  created_by_name: 'Test Administrator',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z'
});

const group = {
  id: 'group-1', company_id: 'company-test', name: 'Masons', leader_name: 'Leader',
  project_id: 'project-1', project_name: 'Project One', status: 'active' as const,
  created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z'
};

const defaultInput = {
  employee_id: employee.id,
  project_id: 'project-1',
  site_id: 'site-1',
  date: '2026-11-04',
  status: 'Present' as const,
  working_hours: 8,
  overtime_hours: 2,
  remarks: 'Recorded by the site supervisor'
};

const serviceTarget = attendanceService as unknown as Record<string, unknown>;
const dataTarget = dataService as unknown as Record<string, unknown>;
const authTarget = authService as unknown as Record<string, unknown>;

const withAttendanceHarness = async (run: (state: { allow: boolean; cloudConnected: boolean; cloudConfigured: boolean; events: string[] }) => Promise<void>) => {
  const oldData = new Map<string, unknown>();
  const oldAuth = authTarget.canPerformAction;
  for (const key of ['getCurrentUser', 'getProjectById', 'getMaterialLocations', 'persistCloudState', 'syncCloudState', 'isCloudConfigured', 'isCloudConnected']) {
    oldData.set(key, dataTarget[key]);
  }
  const state = { allow: true, cloudConnected: false, cloudConfigured: false, events: [] as string[] };
  dataTarget.getCurrentUser = () => user;
  dataTarget.getProjectById = async (id: string) => [project('project-1', 'Project One'), project('project-2', 'Project Two')].find(item => item.id === id) || null;
  dataTarget.getMaterialLocations = async (projectId: string) => projectId === 'project-1'
    ? [{ id: 'site-1', company_id: 'company-test', project_id: projectId, name: 'North Site', code: 'N' }]
    : [];
  dataTarget.persistCloudState = async () => { state.events.push('persist'); };
  dataTarget.syncCloudState = async () => { state.events.push('sync'); };
  dataTarget.isCloudConfigured = () => state.cloudConfigured;
  dataTarget.isCloudConnected = () => state.cloudConnected;
  authTarget.canPerformAction = (_action: string, projectId?: string) => state.allow && Boolean(projectId);

  const reset = () => {
    values.clear();
    values.set('buildpulse_employees_v1', JSON.stringify([employee]));
    values.set('buildpulse_attendance_groups_v1', JSON.stringify([group]));
    values.set('buildpulse_attendance_records_v1', JSON.stringify([]));
    values.set('buildpulse_salary_payments_v1', JSON.stringify([]));
    values.set('buildpulse_attendance_audit_v1', JSON.stringify([]));
  };
  reset();
  try {
    await run(state);
  } finally {
    values.clear();
    for (const [key, value] of oldData) {
      if (value === undefined) delete dataTarget[key];
      else dataTarget[key] = value;
    }
    if (oldAuth === undefined) delete authTarget.canPerformAction;
    else authTarget.canPerformAction = oldAuth;
  }
};

test('individual attendance persists in the shared ledger, syncs through app state, and contributes to monthly payroll and CSV', async () => {
  await withAttendanceHarness(async state => {
    state.cloudConfigured = true;
    state.cloudConnected = true;
    values.set('buildpulse_projects_v1', JSON.stringify([project('project-1', 'Project One')]));
    const record = await attendanceService.saveIndividualAttendance(defaultInput);

    assert.equal(record.attendance_source, 'individual');
    assert.equal(record.group_id, 'group-1');
    assert.equal(record.site_id, 'site-1');
    assert.equal(record.site_name, 'North Site');
    assert.equal(record.company_id, 'company-test');
    assert.deepEqual(state.events, ['sync', 'persist']);

    const persisted = JSON.parse(values.get('buildpulse_attendance_records_v1') || '[]') as DailyAttendanceRecord[];
    assert.equal(persisted.length, 1);
    assert.equal(persisted[0].id, record.id);
    const afterReload = await attendanceService.getAttendanceRecords({ employeeId: employee.id });
    assert.equal(afterReload.length, 1);
    assert.equal(afterReload[0].site_name, 'North Site');

    const summaries = await attendanceService.computeSalarySummaries({
      groupId: 'group-1', employeeId: employee.id, fromDate: '2026-11-01', toDate: '2026-11-30'
    });
    assert.equal(summaries.length, 1);
    assert.equal(summaries[0].attendance_count, 1);
    assert.equal(summaries[0].gross_earnings, 1200);
    assert.equal(summaries[0].total_working_hours, 8);
    assert.equal(summaries[0].total_overtime_hours, 2);

    const csv = attendanceService.generateAttendanceCsv({
      reportType: 'date_range', fromDate: '2026-11-01', toDate: '2026-11-30',
      groupName: 'All Groups', summaries, records: persisted, payments: []
    });
    assert.match(csv, /Project One \/ North Site/);
    assert.match(csv, /2026-11-04/);
  });
});

test('duplicate employee/project/date attendance returns the existing row for review without adding another record', async () => {
  await withAttendanceHarness(async () => {
    values.set('buildpulse_projects_v1', JSON.stringify([project('project-1', 'Project One')]));
    const original = await attendanceService.saveIndividualAttendance(defaultInput);
    await assert.rejects(
      attendanceService.saveIndividualAttendance({ ...defaultInput, status: 'Half Day', working_hours: 4 }),
      (error: unknown) => error instanceof DuplicateAttendanceRecordError && error.existingRecord.id === original.id
    );
    const stored = JSON.parse(values.get('buildpulse_attendance_records_v1') || '[]') as DailyAttendanceRecord[];
    assert.equal(stored.length, 1);
    assert.equal(stored[0].status, 'Present');
  });
});

test('an employee may have a separate record for a different project on the same date', async () => {
  await withAttendanceHarness(async () => {
    values.set('buildpulse_projects_v1', JSON.stringify([project('project-1', 'Project One'), project('project-2', 'Project Two')]));
    await attendanceService.saveIndividualAttendance(defaultInput);
    const second = await attendanceService.saveIndividualAttendance({
      ...defaultInput, project_id: 'project-2', site_id: undefined, working_hours: 6, overtime_hours: 0
    });
    assert.equal(second.project_id, 'project-2');
    assert.equal(second.site_name, 'Project Two location');
    const stored = JSON.parse(values.get('buildpulse_attendance_records_v1') || '[]') as DailyAttendanceRecord[];
    assert.equal(stored.length, 2);
  });
});

test('editing preserves record ID and creation timestamp, and salary counts the edited row once', async () => {
  await withAttendanceHarness(async () => {
    values.set('buildpulse_projects_v1', JSON.stringify([project('project-1', 'Project One')]));
    const original = await attendanceService.saveIndividualAttendance(defaultInput);
    const revised = await attendanceService.saveIndividualAttendance({
      ...defaultInput, status: 'Half Day', working_hours: 4, overtime_hours: 0
    }, original.id);
    assert.equal(revised.id, original.id);
    assert.equal(revised.created_at, original.created_at);
    assert.equal(revised.status, 'Half Day');
    const summaries = await attendanceService.computeSalarySummaries({ employeeId: employee.id });
    assert.equal(summaries[0].attendance_count, 1);
    assert.equal(summaries[0].gross_earnings, 500);
    assert.equal((JSON.parse(values.get('buildpulse_attendance_records_v1') || '[]') as DailyAttendanceRecord[]).length, 1);
  });
});

test('attendance permissions are enforced for both saves and deletion', async () => {
  await withAttendanceHarness(async state => {
    values.set('buildpulse_projects_v1', JSON.stringify([project('project-1', 'Project One')]));
    state.allow = false;
    await assert.rejects(attendanceService.saveIndividualAttendance(defaultInput), /Access Denied/i);
    assert.equal(JSON.parse(values.get('buildpulse_attendance_records_v1') || '[]').length, 0);

    state.allow = true;
    const saved = await attendanceService.saveIndividualAttendance(defaultInput);
    state.allow = false;
    await assert.rejects(attendanceService.deleteIndividualAttendance(saved.id), /Access Denied/i);
    assert.equal(JSON.parse(values.get('buildpulse_attendance_records_v1') || '[]').length, 1);

    state.allow = true;
    await attendanceService.deleteIndividualAttendance(saved.id);
    assert.equal(JSON.parse(values.get('buildpulse_attendance_records_v1') || '[]').length, 0);
  });
});

test('configured but disconnected cloud mode refuses to save a local-only attendance record', async () => {
  await withAttendanceHarness(async state => {
    values.set('buildpulse_projects_v1', JSON.stringify([project('project-1', 'Project One')]));
    state.cloudConfigured = true;
    state.cloudConnected = false;
    await assert.rejects(attendanceService.saveIndividualAttendance(defaultInput), /not connected.*not saved/i);
    assert.equal(JSON.parse(values.get('buildpulse_attendance_records_v1') || '[]').length, 0);
    assert.deepEqual(state.events, []);
  });
});

test('a group attendance record blocks a second individual row for the same project/date', async () => {
  await withAttendanceHarness(async () => {
    values.set('buildpulse_projects_v1', JSON.stringify([project('project-1', 'Project One')]));
    const groupRecord: DailyAttendanceRecord = {
      id: 'group-attendance-1', company_id: 'company-test', group_id: 'group-1', group_name: 'Masons',
      project_id: 'project-1', project_name: 'Project One', employee_id: employee.id,
      employee_code: employee.employee_code, employee_name: employee.full_name, job_type: employee.job_type,
      date: defaultInput.date, status: 'Present', working_hours: 8, overtime_hours: 0,
      salary_type: employee.salary_type, salary_rate: employee.salary_amount, payable_days: 1,
      daily_earnings: 1000, recorded_by: user.id, recorded_by_name: user.full_name,
      created_at: '2026-11-04T18:00:00.000Z', updated_at: '2026-11-04T18:00:00.000Z'
    };
    values.set('buildpulse_attendance_records_v1', JSON.stringify([groupRecord]));
    await assert.rejects(
      attendanceService.saveIndividualAttendance(defaultInput),
      (error: unknown) => error instanceof DuplicateAttendanceRecordError && error.existingRecord.id === groupRecord.id
    );
    assert.equal(JSON.parse(values.get('buildpulse_attendance_records_v1') || '[]').length, 1);
  });
});

test('the existing group register updates an individual-source row in place and retains its site details', async () => {
  await withAttendanceHarness(async () => {
    values.set('buildpulse_projects_v1', JSON.stringify([project('project-1', 'Project One')]));
    const individual = await attendanceService.saveIndividualAttendance(defaultInput);
    const groupResult = await attendanceService.saveDailyAttendanceRegister('group-1', defaultInput.date, [{
      employee_id: employee.id,
      status: 'Half Day',
      working_hours: 4,
      overtime_hours: 0,
      remarks: 'Updated from group register'
    }]);

    assert.equal(groupResult.length, 1);
    assert.equal(groupResult[0].id, individual.id);
    assert.equal(groupResult[0].attendance_source, 'individual');
    assert.equal(groupResult[0].site_id, 'site-1');
    assert.equal(groupResult[0].site_name, 'North Site');
    assert.equal((JSON.parse(values.get('buildpulse_attendance_records_v1') || '[]') as DailyAttendanceRecord[]).length, 1);
  });
});
