import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { DailyAttendanceRecord, Employee, Project, SalaryPaymentRecord, UserProfile, WorkerPayrollEditInput } from '../src/types/index.ts';

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

const [{ attendanceService, DuplicateAttendanceRecordError }, { dataService }, { authService }, { EditWorkerPayrollModal }] = await Promise.all([
  import('../src/services/attendanceService.ts'),
  import('../src/services/dataService.ts'),
  import('../src/services/authService.ts'),
  import('../src/components/EditWorkerPayrollModal.tsx')
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

test('activating an existing worker changes only employee status and preserves attendance and payment history', async () => {
  await withAttendanceHarness(async () => {
    const inactiveEmployee = { ...employee, company_id: 'company-test ', status: 'inactive' as const };
    values.set('buildpulse_employees_v1', JSON.stringify([inactiveEmployee]));
    const attendanceHistory = [{
      id: 'attendance-history-1',
      employee_id: employee.id,
      employee_code: employee.employee_code,
      status: 'Present'
    }];
    const paymentHistory = [
      { id: 'advance-history-1', employee_id: employee.id, payment_type: 'advance', amount: 500 },
      { id: 'payment-history-1', employee_id: employee.id, payment_type: 'salary', amount: 1200 }
    ];
    values.set('buildpulse_attendance_records_v1', JSON.stringify(attendanceHistory));
    values.set('buildpulse_salary_payments_v1', JSON.stringify(paymentHistory));
    const attendanceBefore = values.get('buildpulse_attendance_records_v1');
    const paymentsBefore = values.get('buildpulse_salary_payments_v1');

    const updated = await attendanceService.updateEmployee(employee.id, { status: 'active' });

    const { status, updated_at, ...updatedDetails } = updated;
    const { status: previousStatus, updated_at: previousUpdatedAt, ...previousDetails } = inactiveEmployee;
    assert.equal(status, 'active');
    assert.equal(previousStatus, 'inactive');
    assert.notEqual(updated_at, previousUpdatedAt);
    assert.deepEqual(JSON.parse(JSON.stringify(updatedDetails)), previousDetails);
    assert.equal(values.get('buildpulse_attendance_records_v1'), attendanceBefore);
    assert.equal(values.get('buildpulse_salary_payments_v1'), paymentsBefore);
    assert.equal(JSON.parse(values.get('buildpulse_employees_v1') || '[]').length, 1);
  });
});

test('employee activation enforces update role permissions and company ownership', async () => {
  await withAttendanceHarness(async () => {
    const inactiveEmployee = { ...employee, status: 'inactive' as const };
    values.set('buildpulse_employees_v1', JSON.stringify([inactiveEmployee]));
    const statusOnlyChange = { status: 'active' as const };

    dataTarget.getCurrentUser = () => ({ ...user, role: 'accountant', role_title: 'Accountant' });
    await assert.rejects(
      attendanceService.updateEmployee(employee.id, statusOnlyChange),
      /Only Administrators and Project Managers/i
    );

    dataTarget.getCurrentUser = () => ({ ...user, company_id: 'another-company' });
    await assert.rejects(attendanceService.updateEmployee(employee.id, statusOnlyChange), /Employee not found/i);
    assert.equal(JSON.parse(values.get('buildpulse_employees_v1') || '[]')[0].status, 'inactive');
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

test('payroll edits recalculate attendance and payment totals, preserve transaction IDs and attachments, and delete only the selected payment', async () => {
  await withAttendanceHarness(async () => {
    const attendance = (id: string, date: string, status: 'Present' | 'Absent', workingHours: number): DailyAttendanceRecord => ({
      id,
      company_id: 'company-test',
      group_id: 'group-1',
      group_name: 'Masons',
      project_id: 'project-1',
      project_name: 'Project One',
      attendance_source: 'group',
      employee_id: employee.id,
      employee_code: employee.employee_code,
      employee_name: employee.full_name,
      job_type: employee.job_type,
      date,
      status,
      working_hours: workingHours,
      overtime_hours: 0,
      salary_type: employee.salary_type,
      salary_rate: employee.salary_amount,
      payable_days: status === 'Present' ? 1 : 0,
      daily_earnings: status === 'Present' ? 1000 : 0,
      recorded_by: user.id,
      recorded_by_name: user.full_name,
      created_at: '2026-11-01T00:00:00.000Z',
      updated_at: '2026-11-01T00:00:00.000Z'
    });
    const payment = (id: string, amount: number, paymentType: SalaryPaymentRecord['payment_type'], date: string): SalaryPaymentRecord => ({
      id,
      company_id: 'company-test',
      group_id: 'group-1',
      employee_id: employee.id,
      employee_name: employee.full_name,
      employee_code: employee.employee_code,
      payment_date: date,
      amount,
      payment_method: 'Cash',
      payment_type: paymentType,
      recorded_by: user.id,
      recorded_by_name: user.full_name,
      created_at: '2026-11-01T00:00:00.000Z'
    });
    const invoice = { url: 'private/invoice.pdf', name: 'invoice.pdf', size: 120, type: 'application/pdf' };
    const dc = { url: 'private/dc.pdf', name: 'dc.pdf', size: 90, type: 'application/pdf' };
    const image = { url: 'private/payment.png', name: 'payment.png', size: 80, type: 'image/png' };
    const attendanceRows = [
      attendance('attendance-present', '2026-11-02', 'Present', 8),
      attendance('attendance-hours', '2026-11-03', 'Present', 6)
    ];
    const paymentRows: SalaryPaymentRecord[] = [
      payment('advance-5000', 5000, 'advance', '2026-11-02'),
      { ...payment('salary-10000', 10000, 'salary', '2026-11-03'), payment_method: 'Bank Transfer', attachments: { invoice, dc, images: [image] } },
      payment('bonus-500', 500, 'bonus', '2026-11-04'),
      payment('deduction-200', 200, 'deduction', '2026-11-04')
    ];
    values.set('buildpulse_attendance_records_v1', JSON.stringify(attendanceRows));
    values.set('buildpulse_salary_payments_v1', JSON.stringify(paymentRows));

    const edit: WorkerPayrollEditInput = {
      employee_id: employee.id,
      group_id: 'group-1',
      period_from: '2026-11-01',
      period_to: '2026-11-30',
      employee: {
        employee_code: employee.employee_code,
        full_name: employee.full_name,
        phone: employee.phone,
        address: employee.address,
        job_type: employee.job_type,
        salary_type: employee.salary_type,
        salary_amount: employee.salary_amount,
        standard_hours_per_day: 8.5,
        overtime_rate_per_hour: employee.overtime_rate_per_hour,
        remarks: employee.remarks
      },
      attendance: [
        { id: 'attendance-present', date: '2026-11-02', status: 'Absent', working_hours: 0, overtime_hours: 0, remarks: 'Corrected to absent' },
        { id: 'attendance-hours', date: '2026-11-05', status: 'Present', working_hours: 7.5, overtime_hours: 0, remarks: 'Hours corrected' }
      ],
      payments: [
        { id: 'advance-5000', amount: 3000, payment_date: '2026-11-02', payment_method: 'Cash', payment_type: 'advance' },
        { id: 'salary-10000', amount: 8000, payment_date: '2026-11-08', payment_method: 'UPI', payment_type: 'salary', reference_no: 'UPI-008', remarks: 'Corrected salary disbursement', attachments: { invoice, dc, images: [image] } },
        { id: 'bonus-500', amount: 750, payment_date: '2026-11-09', payment_method: 'Cash', payment_type: 'advance' },
        { id: 'deduction-200', amount: 200, payment_date: '2026-11-04', payment_method: 'Cash', payment_type: 'deduction' }
      ]
    };

    await attendanceService.updateWorkerPayroll(edit);

    const savedAttendance = await attendanceService.getAttendanceRecords({ employeeId: employee.id });
    assert.equal(savedAttendance.find(record => record.id === 'attendance-present')?.status, 'Absent');
    assert.equal(savedAttendance.find(record => record.id === 'attendance-hours')?.date, '2026-11-05');
    assert.equal(savedAttendance.find(record => record.id === 'attendance-hours')?.working_hours, 7.5);
    const savedPayments = await attendanceService.getPayments({ employeeId: employee.id });
    assert.deepEqual(savedPayments.map(record => record.id).sort(), paymentRows.map(record => record.id).sort());
    assert.equal(savedPayments.find(record => record.id === 'advance-5000')?.amount, 3000);
    assert.equal(savedPayments.find(record => record.id === 'salary-10000')?.amount, 8000);
    assert.equal(savedPayments.find(record => record.id === 'salary-10000')?.payment_date, '2026-11-08');
    assert.equal(savedPayments.find(record => record.id === 'salary-10000')?.payment_method, 'UPI');
    assert.equal(savedPayments.find(record => record.id === 'salary-10000')?.reference_no, 'UPI-008');
    assert.equal(savedPayments.find(record => record.id === 'salary-10000')?.remarks, 'Corrected salary disbursement');
    assert.equal(savedPayments.find(record => record.id === 'bonus-500')?.payment_type, 'advance');
    assert.deepEqual(savedPayments.find(record => record.id === 'salary-10000')?.attachments, { invoice, dc, images: [image] });
    const savedEmployee = await attendanceService.getEmployeeById(employee.id);
    assert.equal(savedEmployee?.standard_hours_per_day, 8.5);
    const reopenedEditor = renderToStaticMarkup(createElement(EditWorkerPayrollModal, {
      employee: savedEmployee!,
      groupId: 'group-1',
      period: { fromDate: '2026-11-01', toDate: '2026-11-30' },
      attendanceRecords: savedAttendance,
      paymentRecords: savedPayments,
      onUploadFile: async file => ({ url: file.name, name: file.name, size: file.size }),
      onDeletePayment: async () => undefined,
      onClose: () => undefined,
      onSubmit: async () => undefined
    }));
    assert.match(reopenedEditor, /value="8\.5"/);
    assert.match(reopenedEditor, /min="0\.1"/);
    assert.match(reopenedEditor, /step="0\.1"/);
    assert.match(reopenedEditor, /3,000/);
    assert.match(reopenedEditor, /8,000/);
    for (const standardHours of [8, 8.5, 9]) {
      const reopenedWithHours = renderToStaticMarkup(createElement(EditWorkerPayrollModal, {
        employee: { ...savedEmployee!, standard_hours_per_day: standardHours },
        groupId: 'group-1',
        period: { fromDate: '2026-11-01', toDate: '2026-11-30' },
        attendanceRecords: savedAttendance,
        paymentRecords: savedPayments,
        onUploadFile: async file => ({ url: file.name, name: file.name, size: file.size }),
        onDeletePayment: async () => undefined,
        onClose: () => undefined,
        onSubmit: async () => undefined
      }));
      assert.ok(reopenedWithHours.includes(`value="${standardHours}"`));
      assert.ok(reopenedWithHours.includes('step="0.1"'));
    }

    let summaries = await attendanceService.computeSalarySummaries({
      groupId: 'group-1', employeeId: employee.id, fromDate: '2026-11-01', toDate: '2026-11-30'
    });
    assert.equal(summaries[0].present_days, 1);
    assert.equal(summaries[0].absent_days, 1);
    assert.equal(summaries[0].total_payable_days, 1);
    assert.equal(summaries[0].total_working_hours, 7.5);
    assert.equal(summaries[0].gross_earnings, 1000);
    assert.equal(summaries[0].total_advances, 3750);
    assert.equal(summaries[0].total_deductions, 200);
    assert.equal(summaries[0].total_paid, 8000);
    assert.equal(summaries[0].net_payable_balance, -10950);

    await assert.rejects(
      attendanceService.updateWorkerPayroll({
        ...edit,
        payments: edit.payments.map(row => row.id === 'advance-5000' ? { ...row, amount: '' as unknown as number } : row)
      }),
      /empty amount cannot be treated as zero/i
    );
    assert.equal((await attendanceService.getPayments({ employeeId: employee.id })).find(row => row.id === 'advance-5000')?.amount, 3000);

    const originalGetCurrentUser = dataTarget.getCurrentUser;
    dataTarget.getCurrentUser = () => ({ ...user, role: 'accountant', role_title: 'Accountant' });
    await assert.rejects(
      attendanceService.deleteSalaryPayment('bonus-500', employee.id, 'group-1'),
      /Access Denied/i
    );
    dataTarget.getCurrentUser = originalGetCurrentUser;

    await attendanceService.deleteSalaryPayment('bonus-500', employee.id, 'group-1');
    const afterDelete = await attendanceService.getPayments({ employeeId: employee.id });
    assert.equal(afterDelete.some(record => record.id === 'bonus-500'), false);
    assert.equal(afterDelete.length, 3);
    summaries = await attendanceService.computeSalarySummaries({
      groupId: 'group-1', employeeId: employee.id, fromDate: '2026-11-01', toDate: '2026-11-30'
    });
    assert.equal(summaries[0].total_advances, 3000);
    assert.equal(summaries[0].total_paid, 8000);
    assert.equal(summaries[0].total_deductions, 200);
    assert.equal(summaries[0].net_payable_balance, -10200);
  });
});
