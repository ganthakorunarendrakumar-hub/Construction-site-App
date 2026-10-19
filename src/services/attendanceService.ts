import { dataService } from './dataService';
import {
  AttendanceGroup,
  Employee,
  DailyAttendanceRecord,
  SalaryPaymentRecord,
  EmployeeSalarySummary,
  AttendanceStatus,
  SalaryType,
  EmployeeJobType,
  Project
} from '../types';

const STORAGE_KEYS = {
  GROUPS: 'buildpulse_attendance_groups_v1',
  EMPLOYEES: 'buildpulse_employees_v1',
  ATTENDANCE_RECORDS: 'buildpulse_attendance_records_v1',
  PAYMENTS: 'buildpulse_salary_payments_v1',
  AUDIT_LOGS: 'buildpulse_attendance_audit_v1'
};

// Seed realistic initial groups (e.g., Dan Group, Ram Group, and Shankar MEP Gang)
export const INITIAL_GROUPS: AttendanceGroup[] = [
  {
    id: 'grp-dan-01',
    company_id: 'comp-apex-01',
    name: 'Dan Group',
    leader_name: 'Daniel Murmu',
    leader_phone: '+91 98451 22334',
    project_id: 'proj-skyline-01',
    project_name: 'Skyline Commercial Hub',
    photo_url: 'https://images.unsplash.com/photo-1541888946425-d0fbb1861593?w=300&auto=format&fit=crop&q=80',
    remarks: 'Structural masonry, RCC casting, brickwork and blockwork skilled team',
    status: 'active',
    created_at: new Date('2026-09-01T08:00:00Z').toISOString(),
    updated_at: new Date('2026-09-01T08:00:00Z').toISOString(),
    created_by: 'usr-admin-01'
  },
  {
    id: 'grp-ram-02',
    company_id: 'comp-apex-01',
    name: 'Ram Group',
    leader_name: 'Ram Charan Yadav',
    leader_phone: '+91 97412 88990',
    project_id: 'proj-skyline-01',
    project_name: 'Skyline Commercial Hub',
    photo_url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=300&auto=format&fit=crop&q=80',
    remarks: 'Rebar reinforcement, bar bending, cutting, tying & shuttering gang',
    status: 'active',
    created_at: new Date('2026-09-01T08:30:00Z').toISOString(),
    updated_at: new Date('2026-09-01T08:30:00Z').toISOString(),
    created_by: 'usr-admin-01'
  },
  {
    id: 'grp-shankar-03',
    company_id: 'comp-apex-01',
    name: 'Shankar MEP Gang',
    leader_name: 'Shankar Gowda',
    leader_phone: '+91 94481 55667',
    project_id: 'proj-emerald-02',
    project_name: 'Emerald Bay Luxury Enclave',
    photo_url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=300&auto=format&fit=crop&q=80',
    remarks: 'Electrical conduits, plumbing pipe laying, HVAC routing & fixtures',
    status: 'active',
    created_at: new Date('2026-09-15T09:00:00Z').toISOString(),
    updated_at: new Date('2026-09-15T09:00:00Z').toISOString(),
    created_by: 'usr-admin-01'
  }
];

// Seed realistic initial employees across groups
export const INITIAL_EMPLOYEES: Employee[] = [
  // Dan Group Workers
  {
    id: 'emp-dan-001',
    company_id: 'comp-apex-01',
    employee_code: 'EMP-DAN-001',
    full_name: 'Daniel Murmu',
    photo_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    phone: '+91 98451 22334',
    address: 'Camp Shed #4, Skyline Project Site, Bengaluru',
    job_type: 'Supervisor',
    group_id: 'grp-dan-01',
    group_name: 'Dan Group',
    project_id: 'proj-skyline-01',
    project_name: 'Skyline Commercial Hub',
    joining_date: '2026-01-15',
    salary_type: 'daily_wage',
    salary_amount: 1100,
    standard_hours_per_day: 8,
    overtime_rate_per_hour: 200,
    status: 'active',
    remarks: 'Head mason & gang supervisor with 12 years high-rise experience',
    created_at: new Date('2026-09-01T08:00:00Z').toISOString(),
    updated_at: new Date('2026-09-01T08:00:00Z').toISOString()
  },
  {
    id: 'emp-dan-002',
    company_id: 'comp-apex-01',
    employee_code: 'EMP-DAN-002',
    full_name: 'Rameshwar Soren',
    photo_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
    phone: '+91 98452 33445',
    address: 'Labour Colony B-12, Whitefield, Bengaluru',
    job_type: 'Mason',
    group_id: 'grp-dan-01',
    group_name: 'Dan Group',
    project_id: 'proj-skyline-01',
    project_name: 'Skyline Commercial Hub',
    joining_date: '2026-02-01',
    salary_type: 'daily_wage',
    salary_amount: 900,
    standard_hours_per_day: 8,
    overtime_rate_per_hour: 170,
    status: 'active',
    remarks: 'Specialist in 8-inch solid concrete block masonry',
    created_at: new Date('2026-09-01T08:10:00Z').toISOString(),
    updated_at: new Date('2026-09-01T08:10:00Z').toISOString()
  },
  {
    id: 'emp-dan-003',
    company_id: 'comp-apex-01',
    employee_code: 'EMP-DAN-003',
    full_name: 'Bikram Hembram',
    photo_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&auto=format&fit=crop&q=80',
    phone: '+91 98453 44556',
    address: 'Site Camp Tent #2, Bengaluru',
    job_type: 'Labourer',
    group_id: 'grp-dan-01',
    group_name: 'Dan Group',
    project_id: 'proj-skyline-01',
    project_name: 'Skyline Commercial Hub',
    joining_date: '2026-02-15',
    salary_type: 'daily_wage',
    salary_amount: 650,
    standard_hours_per_day: 8,
    overtime_rate_per_hour: 120,
    status: 'active',
    remarks: 'Mortar mixing and material carrying helper',
    created_at: new Date('2026-09-01T08:15:00Z').toISOString(),
    updated_at: new Date('2026-09-01T08:15:00Z').toISOString()
  },
  {
    id: 'emp-dan-004',
    company_id: 'comp-apex-01',
    employee_code: 'EMP-DAN-004',
    full_name: 'Suraj Besra',
    photo_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&auto=format&fit=crop&q=80',
    phone: '+91 98454 55667',
    address: 'Site Camp Tent #2, Bengaluru',
    job_type: 'Labourer',
    group_id: 'grp-dan-01',
    group_name: 'Dan Group',
    project_id: 'proj-skyline-01',
    project_name: 'Skyline Commercial Hub',
    joining_date: '2026-03-01',
    salary_type: 'daily_wage',
    salary_amount: 650,
    standard_hours_per_day: 8,
    overtime_rate_per_hour: 120,
    status: 'active',
    remarks: 'Concrete vibrator handling & curing assistant',
    created_at: new Date('2026-09-01T08:20:00Z').toISOString(),
    updated_at: new Date('2026-09-01T08:20:00Z').toISOString()
  },

  // Ram Group Workers
  {
    id: 'emp-ram-001',
    company_id: 'comp-apex-01',
    employee_code: 'EMP-RAM-001',
    full_name: 'Ram Charan Yadav',
    photo_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&auto=format&fit=crop&q=80',
    phone: '+91 97412 88990',
    address: 'Site Yard Barracks #1, Bengaluru',
    job_type: 'Barbender',
    group_id: 'grp-ram-02',
    group_name: 'Ram Group',
    project_id: 'proj-skyline-01',
    project_name: 'Skyline Commercial Hub',
    joining_date: '2026-01-10',
    salary_type: 'daily_wage',
    salary_amount: 1050,
    standard_hours_per_day: 8,
    overtime_rate_per_hour: 190,
    status: 'active',
    remarks: 'Rebar master: beam, column cage fabrication and BBS specialist',
    created_at: new Date('2026-09-01T08:30:00Z').toISOString(),
    updated_at: new Date('2026-09-01T08:30:00Z').toISOString()
  },
  {
    id: 'emp-ram-002',
    company_id: 'comp-apex-01',
    employee_code: 'EMP-RAM-002',
    full_name: 'Dinesh Prasad Yadav',
    photo_url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=80',
    phone: '+91 97413 99001',
    address: 'Site Yard Barracks #1, Bengaluru',
    job_type: 'Barbender',
    group_id: 'grp-ram-02',
    group_name: 'Ram Group',
    project_id: 'proj-skyline-01',
    project_name: 'Skyline Commercial Hub',
    joining_date: '2026-01-20',
    salary_type: 'daily_wage',
    salary_amount: 850,
    standard_hours_per_day: 8,
    overtime_rate_per_hour: 160,
    status: 'active',
    remarks: 'TMT 25mm and 32mm heavy cutting and cold bending',
    created_at: new Date('2026-09-01T08:35:00Z').toISOString(),
    updated_at: new Date('2026-09-01T08:35:00Z').toISOString()
  },
  {
    id: 'emp-ram-003',
    company_id: 'comp-apex-01',
    employee_code: 'EMP-RAM-003',
    full_name: 'Santosh Kumar',
    photo_url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200&auto=format&fit=crop&q=80',
    phone: '+91 97414 11223',
    address: 'Site Yard Barracks #1, Bengaluru',
    job_type: 'Carpenter',
    group_id: 'grp-ram-02',
    group_name: 'Ram Group',
    project_id: 'proj-skyline-01',
    project_name: 'Skyline Commercial Hub',
    joining_date: '2026-02-10',
    salary_type: 'daily_wage',
    salary_amount: 950,
    standard_hours_per_day: 8,
    overtime_rate_per_hour: 180,
    status: 'active',
    remarks: 'Plywood & steel shuttering assembly, column staging props',
    created_at: new Date('2026-09-01T08:40:00Z').toISOString(),
    updated_at: new Date('2026-09-01T08:40:00Z').toISOString()
  },

  // Shankar MEP Gang Workers
  {
    id: 'emp-shk-001',
    company_id: 'comp-apex-01',
    employee_code: 'EMP-SHK-001',
    full_name: 'Shankar Gowda',
    photo_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    phone: '+91 94481 55667',
    address: 'Beach Road Enclave Site, Visakhapatnam',
    job_type: 'Electrician',
    group_id: 'grp-shankar-03',
    group_name: 'Shankar MEP Gang',
    project_id: 'proj-emerald-02',
    project_name: 'Emerald Bay Luxury Enclave',
    joining_date: '2026-02-01',
    salary_type: 'monthly_salary',
    salary_amount: 28000,
    standard_hours_per_day: 8,
    overtime_rate_per_hour: 220,
    status: 'active',
    remarks: 'Licensed Grade-A wireman and MEP site supervisor',
    created_at: new Date('2026-09-15T09:00:00Z').toISOString(),
    updated_at: new Date('2026-09-15T09:00:00Z').toISOString()
  },
  {
    id: 'emp-shk-002',
    company_id: 'comp-apex-01',
    employee_code: 'EMP-SHK-002',
    full_name: 'Mohammad Farooq',
    photo_url: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=200&auto=format&fit=crop&q=80',
    phone: '+91 94482 66778',
    address: 'Beach Road Enclave Site, Visakhapatnam',
    job_type: 'Plumber',
    group_id: 'grp-shankar-03',
    group_name: 'Shankar MEP Gang',
    project_id: 'proj-emerald-02',
    project_name: 'Emerald Bay Luxury Enclave',
    joining_date: '2026-02-15',
    salary_type: 'daily_wage',
    salary_amount: 900,
    standard_hours_per_day: 8,
    overtime_rate_per_hour: 170,
    status: 'active',
    remarks: 'High-pressure CPVC and drainage manifold installation',
    created_at: new Date('2026-09-15T09:05:00Z').toISOString(),
    updated_at: new Date('2026-09-15T09:05:00Z').toISOString()
  },

  // Individual / Direct Site Workers (Initially Ungrouped)
  {
    id: 'emp-ind-001',
    company_id: 'comp-apex-01',
    employee_code: 'EMP-IND-001',
    full_name: 'Govind Reddy',
    photo_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&auto=format&fit=crop&q=80',
    phone: '+91 98459 11223',
    address: 'Site Camp Quarter A-3, Whitefield, Bengaluru',
    job_type: 'Electrician',
    group_id: '',
    group_name: undefined,
    project_id: 'proj-skyline-01',
    project_name: 'Skyline Commercial Hub',
    joining_date: '2026-03-01',
    salary_type: 'daily_wage',
    salary_amount: 1000,
    standard_hours_per_day: 8,
    overtime_rate_per_hour: 190,
    status: 'active',
    remarks: 'Direct company electrician for tower crane power & switchgear',
    created_at: new Date('2026-09-01T09:00:00Z').toISOString(),
    updated_at: new Date('2026-09-01T09:00:00Z').toISOString()
  },
  {
    id: 'emp-ind-002',
    company_id: 'comp-apex-01',
    employee_code: 'EMP-IND-002',
    full_name: 'Anand Verma',
    photo_url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=80',
    phone: '+91 98450 77889',
    address: 'Marathahalli Labour Camp, Bengaluru',
    job_type: 'Welder',
    group_id: '',
    group_name: undefined,
    project_id: 'proj-skyline-01',
    project_name: 'Skyline Commercial Hub',
    joining_date: '2026-03-15',
    salary_type: 'daily_wage',
    salary_amount: 950,
    standard_hours_per_day: 8,
    overtime_rate_per_hour: 180,
    status: 'active',
    remarks: 'Certified structural arc & MIG welder for rebar couplers',
    created_at: new Date('2026-09-01T09:10:00Z').toISOString(),
    updated_at: new Date('2026-09-01T09:10:00Z').toISOString()
  }
];

// Seed realistic attendance records covering recent dates (Oct 10 - Oct 17, 2026)
export const INITIAL_ATTENDANCE_RECORDS: DailyAttendanceRecord[] = [
  // 2026-10-15: Dan Group
  {
    id: 'att-dan-20261015-01',
    company_id: 'comp-apex-01',
    group_id: 'grp-dan-01',
    group_name: 'Dan Group',
    project_id: 'proj-skyline-01',
    project_name: 'Skyline Commercial Hub',
    employee_id: 'emp-dan-001',
    employee_code: 'EMP-DAN-001',
    employee_name: 'Daniel Murmu',
    job_type: 'Supervisor',
    date: '2026-10-15',
    status: 'Present',
    check_in_time: '08:00',
    check_out_time: '18:00',
    working_hours: 10,
    overtime_hours: 2,
    salary_type: 'daily_wage',
    salary_rate: 1100,
    payable_days: 1,
    daily_earnings: 1500, // 1100 + (2 * 200)
    remarks: 'Supervised 3rd floor column concreting',
    recorded_by: 'usr-admin-01',
    recorded_by_name: 'Rajesh Sharma',
    created_at: new Date('2026-10-15T18:05:00Z').toISOString(),
    updated_at: new Date('2026-10-15T18:05:00Z').toISOString()
  },
  {
    id: 'att-dan-20261015-02',
    company_id: 'comp-apex-01',
    group_id: 'grp-dan-01',
    group_name: 'Dan Group',
    project_id: 'proj-skyline-01',
    project_name: 'Skyline Commercial Hub',
    employee_id: 'emp-dan-002',
    employee_code: 'EMP-DAN-002',
    employee_name: 'Rameshwar Soren',
    job_type: 'Mason',
    date: '2026-10-15',
    status: 'Present',
    check_in_time: '08:15',
    check_out_time: '17:15',
    working_hours: 9,
    overtime_hours: 1,
    salary_type: 'daily_wage',
    salary_rate: 900,
    payable_days: 1,
    daily_earnings: 1070, // 900 + (1 * 170)
    remarks: 'Basement wall blockwork',
    recorded_by: 'usr-admin-01',
    recorded_by_name: 'Rajesh Sharma',
    created_at: new Date('2026-10-15T18:05:00Z').toISOString(),
    updated_at: new Date('2026-10-15T18:05:00Z').toISOString()
  },
  {
    id: 'att-dan-20261015-03',
    company_id: 'comp-apex-01',
    group_id: 'grp-dan-01',
    group_name: 'Dan Group',
    project_id: 'proj-skyline-01',
    project_name: 'Skyline Commercial Hub',
    employee_id: 'emp-dan-003',
    employee_code: 'EMP-DAN-003',
    employee_name: 'Bikram Hembram',
    job_type: 'Labourer',
    date: '2026-10-15',
    status: 'Half Day',
    check_in_time: '08:00',
    check_out_time: '12:30',
    working_hours: 4.5,
    overtime_hours: 0,
    salary_type: 'daily_wage',
    salary_rate: 650,
    payable_days: 0.5,
    daily_earnings: 325, // 650 * 0.5
    remarks: 'Left after lunch due to fever',
    recorded_by: 'usr-admin-01',
    recorded_by_name: 'Rajesh Sharma',
    created_at: new Date('2026-10-15T18:05:00Z').toISOString(),
    updated_at: new Date('2026-10-15T18:05:00Z').toISOString()
  },
  {
    id: 'att-dan-20261015-04',
    company_id: 'comp-apex-01',
    group_id: 'grp-dan-01',
    group_name: 'Dan Group',
    project_id: 'proj-skyline-01',
    project_name: 'Skyline Commercial Hub',
    employee_id: 'emp-dan-004',
    employee_code: 'EMP-DAN-004',
    employee_name: 'Suraj Besra',
    job_type: 'Labourer',
    date: '2026-10-15',
    status: 'Present',
    check_in_time: '08:00',
    check_out_time: '17:00',
    working_hours: 9,
    overtime_hours: 1,
    salary_type: 'daily_wage',
    salary_rate: 650,
    payable_days: 1,
    daily_earnings: 770, // 650 + (1 * 120)
    remarks: 'Concrete vibrator assistance',
    recorded_by: 'usr-admin-01',
    recorded_by_name: 'Rajesh Sharma',
    created_at: new Date('2026-10-15T18:05:00Z').toISOString(),
    updated_at: new Date('2026-10-15T18:05:00Z').toISOString()
  },

  // 2026-10-16: Dan Group
  {
    id: 'att-dan-20261016-01',
    company_id: 'comp-apex-01',
    group_id: 'grp-dan-01',
    group_name: 'Dan Group',
    project_id: 'proj-skyline-01',
    project_name: 'Skyline Commercial Hub',
    employee_id: 'emp-dan-001',
    employee_code: 'EMP-DAN-001',
    employee_name: 'Daniel Murmu',
    job_type: 'Supervisor',
    date: '2026-10-16',
    status: 'Present',
    check_in_time: '08:00',
    check_out_time: '17:00',
    working_hours: 9,
    overtime_hours: 1,
    salary_type: 'daily_wage',
    salary_rate: 1100,
    payable_days: 1,
    daily_earnings: 1300,
    remarks: 'Staging check on floor 3',
    recorded_by: 'usr-admin-01',
    recorded_by_name: 'Rajesh Sharma',
    created_at: new Date('2026-10-16T17:30:00Z').toISOString(),
    updated_at: new Date('2026-10-16T17:30:00Z').toISOString()
  },
  {
    id: 'att-dan-20261016-02',
    company_id: 'comp-apex-01',
    group_id: 'grp-dan-01',
    group_name: 'Dan Group',
    project_id: 'proj-skyline-01',
    project_name: 'Skyline Commercial Hub',
    employee_id: 'emp-dan-002',
    employee_code: 'EMP-DAN-002',
    employee_name: 'Rameshwar Soren',
    job_type: 'Mason',
    date: '2026-10-16',
    status: 'Present',
    check_in_time: '08:00',
    check_out_time: '17:00',
    working_hours: 9,
    overtime_hours: 1,
    salary_type: 'daily_wage',
    salary_rate: 900,
    payable_days: 1,
    daily_earnings: 1070,
    remarks: 'Staircase shear wall plastering',
    recorded_by: 'usr-admin-01',
    recorded_by_name: 'Rajesh Sharma',
    created_at: new Date('2026-10-16T17:30:00Z').toISOString(),
    updated_at: new Date('2026-10-16T17:30:00Z').toISOString()
  },
  {
    id: 'att-dan-20261016-03',
    company_id: 'comp-apex-01',
    group_id: 'grp-dan-01',
    group_name: 'Dan Group',
    project_id: 'proj-skyline-01',
    project_name: 'Skyline Commercial Hub',
    employee_id: 'emp-dan-003',
    employee_code: 'EMP-DAN-003',
    employee_name: 'Bikram Hembram',
    job_type: 'Labourer',
    date: '2026-10-16',
    status: 'Absent',
    working_hours: 0,
    overtime_hours: 0,
    salary_type: 'daily_wage',
    salary_rate: 650,
    payable_days: 0,
    daily_earnings: 0,
    remarks: 'Medical leave informed',
    recorded_by: 'usr-admin-01',
    recorded_by_name: 'Rajesh Sharma',
    created_at: new Date('2026-10-16T17:30:00Z').toISOString(),
    updated_at: new Date('2026-10-16T17:30:00Z').toISOString()
  },
  {
    id: 'att-dan-20261016-04',
    company_id: 'comp-apex-01',
    group_id: 'grp-dan-01',
    group_name: 'Dan Group',
    project_id: 'proj-skyline-01',
    project_name: 'Skyline Commercial Hub',
    employee_id: 'emp-dan-004',
    employee_code: 'EMP-DAN-004',
    employee_name: 'Suraj Besra',
    job_type: 'Labourer',
    date: '2026-10-16',
    status: 'Present',
    check_in_time: '08:00',
    check_out_time: '17:00',
    working_hours: 9,
    overtime_hours: 1,
    salary_type: 'daily_wage',
    salary_rate: 650,
    payable_days: 1,
    daily_earnings: 770,
    remarks: 'Mortar delivery',
    recorded_by: 'usr-admin-01',
    recorded_by_name: 'Rajesh Sharma',
    created_at: new Date('2026-10-16T17:30:00Z').toISOString(),
    updated_at: new Date('2026-10-16T17:30:00Z').toISOString()
  },

  // 2026-10-16: Ram Group
  {
    id: 'att-ram-20261016-01',
    company_id: 'comp-apex-01',
    group_id: 'grp-ram-02',
    group_name: 'Ram Group',
    project_id: 'proj-skyline-01',
    project_name: 'Skyline Commercial Hub',
    employee_id: 'emp-ram-001',
    employee_code: 'EMP-RAM-001',
    employee_name: 'Ram Charan Yadav',
    job_type: 'Barbender',
    date: '2026-10-16',
    status: 'Present',
    check_in_time: '08:30',
    check_out_time: '18:30',
    working_hours: 10,
    overtime_hours: 2,
    salary_type: 'daily_wage',
    salary_rate: 1050,
    payable_days: 1,
    daily_earnings: 1430, // 1050 + (2 * 190)
    remarks: 'Completed girder reinforcement grid 4',
    recorded_by: 'usr-admin-01',
    recorded_by_name: 'Rajesh Sharma',
    created_at: new Date('2026-10-16T18:45:00Z').toISOString(),
    updated_at: new Date('2026-10-16T18:45:00Z').toISOString()
  },
  {
    id: 'att-ram-20261016-02',
    company_id: 'comp-apex-01',
    group_id: 'grp-ram-02',
    group_name: 'Ram Group',
    project_id: 'proj-skyline-01',
    project_name: 'Skyline Commercial Hub',
    employee_id: 'emp-ram-002',
    employee_code: 'EMP-RAM-002',
    employee_name: 'Dinesh Prasad Yadav',
    job_type: 'Barbender',
    date: '2026-10-16',
    status: 'Present',
    check_in_time: '08:30',
    check_out_time: '18:30',
    working_hours: 10,
    overtime_hours: 2,
    salary_type: 'daily_wage',
    salary_rate: 850,
    payable_days: 1,
    daily_earnings: 1170, // 850 + (2 * 160)
    remarks: 'Heavy cutting for slab stirrups',
    recorded_by: 'usr-admin-01',
    recorded_by_name: 'Rajesh Sharma',
    created_at: new Date('2026-10-16T18:45:00Z').toISOString(),
    updated_at: new Date('2026-10-16T18:45:00Z').toISOString()
  },
  {
    id: 'att-ram-20261016-03',
    company_id: 'comp-apex-01',
    group_id: 'grp-ram-02',
    group_name: 'Ram Group',
    project_id: 'proj-skyline-01',
    project_name: 'Skyline Commercial Hub',
    employee_id: 'emp-ram-003',
    employee_code: 'EMP-RAM-003',
    employee_name: 'Santosh Kumar',
    job_type: 'Carpenter',
    date: '2026-10-16',
    status: 'Present',
    check_in_time: '08:30',
    check_out_time: '17:30',
    working_hours: 9,
    overtime_hours: 1,
    salary_type: 'daily_wage',
    salary_rate: 950,
    payable_days: 1,
    daily_earnings: 1130, // 950 + 180
    remarks: 'Shuttering formwork erection for beam B2',
    recorded_by: 'usr-admin-01',
    recorded_by_name: 'Rajesh Sharma',
    created_at: new Date('2026-10-16T18:45:00Z').toISOString(),
    updated_at: new Date('2026-10-16T18:45:00Z').toISOString()
  }
];

// Seed sample advance / payment records
export const INITIAL_PAYMENTS: SalaryPaymentRecord[] = [
  {
    id: 'pay-001',
    company_id: 'comp-apex-01',
    group_id: 'grp-dan-01',
    employee_id: 'emp-dan-001',
    employee_name: 'Daniel Murmu',
    employee_code: 'EMP-DAN-001',
    payment_date: '2026-10-10',
    amount: 1500,
    payment_method: 'Cash',
    payment_type: 'advance',
    remarks: 'Emergency family medical advance',
    recorded_by: 'usr-admin-01',
    recorded_by_name: 'Rajesh Sharma',
    created_at: new Date('2026-10-10T12:00:00Z').toISOString()
  },
  {
    id: 'pay-002',
    company_id: 'comp-apex-01',
    group_id: 'grp-ram-02',
    employee_id: 'emp-ram-001',
    employee_name: 'Ram Charan Yadav',
    employee_code: 'EMP-RAM-001',
    payment_date: '2026-10-12',
    amount: 1000,
    payment_method: 'UPI',
    payment_type: 'advance',
    reference_no: 'UPI-774910291',
    remarks: 'Festival advance payment',
    recorded_by: 'usr-admin-01',
    recorded_by_name: 'Rajesh Sharma',
    created_at: new Date('2026-10-12T14:30:00Z').toISOString()
  }
];

class AttendanceService {
  private ensureInitialized() {
    if (!localStorage.getItem(STORAGE_KEYS.GROUPS)) {
      localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(INITIAL_GROUPS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.EMPLOYEES)) {
      localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(INITIAL_EMPLOYEES));
    } else {
      try {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.EMPLOYEES) || '[]');
        let updated = false;
        for (const emp of INITIAL_EMPLOYEES) {
          if (!stored.some((e: any) => e.id === emp.id)) {
            stored.push(emp);
            updated = true;
          }
        }
        if (updated) {
          localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(stored));
        }
      } catch {}
    }
    if (!localStorage.getItem(STORAGE_KEYS.ATTENDANCE_RECORDS)) {
      localStorage.setItem(STORAGE_KEYS.ATTENDANCE_RECORDS, JSON.stringify(INITIAL_ATTENDANCE_RECORDS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.PAYMENTS)) {
      localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(INITIAL_PAYMENTS));
    }
  }

  // ==========================================
  // 1. GROUPS CRUD
  // ==========================================
  public async getGroups(): Promise<AttendanceGroup[]> {
    this.ensureInitialized();
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.GROUPS);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  public async getGroupById(groupId: string): Promise<AttendanceGroup | null> {
    const groups = await this.getGroups();
    return groups.find(g => g.id === groupId) || null;
  }

  public async createGroup(input: {
    name: string;
    photo_url?: string;
    leader_name: string;
    leader_phone?: string;
    project_id?: string;
    remarks?: string;
  }): Promise<AttendanceGroup> {
    const currentUser = dataService.getCurrentUser();
    if (currentUser.role !== 'admin' && currentUser.role !== 'project_manager') {
      throw new Error('Access Denied: Only Administrators and Project Managers can create worker groups.');
    }

    const trimmedName = input.name.trim();
    if (!trimmedName) throw new Error('Group name is required.');
    if (!input.leader_name.trim()) throw new Error('Group leader/supervisor name is required.');

    const groups = await this.getGroups();
    if (groups.some(g => g.name.toLowerCase() === trimmedName.toLowerCase())) {
      throw new Error(`A group named "${trimmedName}" already exists. Please choose a different name.`);
    }

    let projectName = undefined;
    if (input.project_id && input.project_id !== 'all') {
      const proj = await dataService.getProjectById(input.project_id);
      projectName = proj?.name;
    }

    const newGroup: AttendanceGroup = {
      id: `grp-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      company_id: 'comp-apex-01',
      name: trimmedName,
      photo_url: input.photo_url,
      leader_name: input.leader_name.trim(),
      leader_phone: input.leader_phone?.trim(),
      project_id: input.project_id,
      project_name: projectName,
      remarks: input.remarks?.trim(),
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: currentUser.id
    };

    const updated = [newGroup, ...groups];
    localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(updated));
    this.recordAudit('create_group', newGroup.id, { name: newGroup.name });
    await dataService.persistCloudState();
    return newGroup;
  }

  public async updateGroup(groupId: string, input: {
    name: string;
    photo_url?: string;
    leader_name: string;
    leader_phone?: string;
    project_id?: string;
    remarks?: string;
    status?: 'active' | 'inactive';
  }): Promise<AttendanceGroup> {
    const currentUser = dataService.getCurrentUser();
    if (currentUser.role !== 'admin' && currentUser.role !== 'project_manager') {
      throw new Error('Access Denied: Only Administrators and Project Managers can edit worker groups.');
    }

    const groups = await this.getGroups();
    const idx = groups.findIndex(g => g.id === groupId);
    if (idx === -1) throw new Error('Group not found.');

    const trimmedName = input.name.trim();
    if (!trimmedName) throw new Error('Group name cannot be blank.');
    if (!input.leader_name.trim()) throw new Error('Supervisor/leader name cannot be blank.');

    if (groups.some((g, i) => i !== idx && g.name.toLowerCase() === trimmedName.toLowerCase())) {
      throw new Error(`Another group named "${trimmedName}" already exists.`);
    }

    let projectName = groups[idx].project_name;
    if (input.project_id && input.project_id !== groups[idx].project_id) {
      const proj = await dataService.getProjectById(input.project_id);
      projectName = proj?.name;
    }

    const updatedGroup: AttendanceGroup = {
      ...groups[idx],
      name: trimmedName,
      photo_url: input.photo_url !== undefined ? input.photo_url : groups[idx].photo_url,
      leader_name: input.leader_name.trim(),
      leader_phone: input.leader_phone !== undefined ? input.leader_phone.trim() : groups[idx].leader_phone,
      project_id: input.project_id !== undefined ? input.project_id : groups[idx].project_id,
      project_name: projectName,
      remarks: input.remarks !== undefined ? input.remarks.trim() : groups[idx].remarks,
      status: input.status || groups[idx].status,
      updated_at: new Date().toISOString()
    };

    groups[idx] = updatedGroup;
    localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(groups));

    // Also update denormalized group_name in employees
    if (groups[idx].name !== trimmedName) {
      const employees = await this.getEmployees();
      const updatedEmployees = employees.map(e => e.group_id === groupId ? { ...e, group_name: trimmedName } : e);
      localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(updatedEmployees));
    }

    this.recordAudit('update_group', groupId, { name: updatedGroup.name });
    await dataService.persistCloudState();
    return updatedGroup;
  }

  public async deleteGroup(groupId: string): Promise<void> {
    const currentUser = dataService.getCurrentUser();
    if (currentUser.role !== 'admin') {
      throw new Error('Access Denied: Only Company Administrators can delete groups.');
    }

    // Deletion protection rule: prevent accidental deletion of groups with historical records!
    const records = await this.getAttendanceRecords({ groupId });
    const employees = await this.getEmployees(groupId);

    if (records.length > 0 || employees.length > 0) {
      throw new Error(
        `Cannot delete this group: Group has ${employees.length} employee(s) and ${records.length} historical attendance record(s). To preserve historical attendance and wage ledger audits, please deactivate the group instead of deleting it.`
      );
    }

    const groups = await this.getGroups();
    const filtered = groups.filter(g => g.id !== groupId);
    localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(filtered));
    this.recordAudit('delete_group', groupId, {});
    await dataService.persistCloudState();
  }

  // ==========================================
  // 2. EMPLOYEES CRUD
  // ==========================================
  public async getEmployees(groupId?: string): Promise<Employee[]> {
    this.ensureInitialized();
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.EMPLOYEES);
      const all: Employee[] = stored ? JSON.parse(stored) : [];
      if (groupId === 'ungrouped' || groupId === 'individual') {
        return all.filter(e => !e.group_id || e.group_id === '' || e.group_id === 'ungrouped');
      }
      if (groupId && groupId !== 'all') {
        return all.filter(e => e.group_id === groupId);
      }
      return all;
    } catch {
      return [];
    }
  }

  public async getEmployeeById(employeeId: string): Promise<Employee | null> {
    const employees = await this.getEmployees();
    return employees.find(e => e.id === employeeId) || null;
  }

  public async createEmployee(input: {
    employee_code?: string;
    full_name: string;
    photo_url?: string;
    phone?: string;
    address?: string;
    job_type: EmployeeJobType | string;
    group_id?: string;
    project_id?: string;
    joining_date?: string;
    salary_type: SalaryType;
    salary_amount: number;
    standard_hours_per_day?: number;
    overtime_rate_per_hour?: number;
    status?: 'active' | 'inactive';
    remarks?: string;
  }): Promise<Employee> {
    const currentUser = dataService.getCurrentUser();
    if (currentUser.role !== 'admin' && currentUser.role !== 'project_manager') {
      throw new Error('Access Denied: Only Administrators and Project Managers can register employees.');
    }

    const trimmedName = input.full_name.trim();
    if (!trimmedName) throw new Error('Employee full name is required.');

    let targetGroup: AttendanceGroup | undefined = undefined;
    if (input.group_id && input.group_id !== 'ungrouped') {
      const groups = await this.getGroups();
      targetGroup = groups.find(g => g.id === input.group_id);
    }

    const employees = await this.getEmployees();

    // Auto-generate unique code if not provided
    let empCode = input.employee_code?.trim();
    if (!empCode) {
      const prefix = targetGroup
        ? (targetGroup.name.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'EMP')
        : 'IND';
      const seq = (employees.length + 1).toString().padStart(3, '0');
      empCode = `EMP-${prefix}-${seq}`;
    }

    // Verify code uniqueness
    if (employees.some(e => e.employee_code.toLowerCase() === empCode!.toLowerCase())) {
      throw new Error(`Employee ID / Code "${empCode}" is already in use.`);
    }

    const wage = Number(input.salary_amount);
    if (isNaN(wage) || wage <= 0) {
      throw new Error('Salary / Wage amount must be a positive number.');
    }

    let projectName = targetGroup?.project_name;
    const projId = input.project_id || targetGroup?.project_id;
    if (projId) {
      const p = await dataService.getProjectById(projId);
      projectName = p?.name;
    }

    const stdHours = Number(input.standard_hours_per_day) || 8;
    const otRate = input.overtime_rate_per_hour !== undefined
      ? Number(input.overtime_rate_per_hour)
      : Math.round((wage / stdHours) * 1.5);

    const newEmp: Employee = {
      id: `emp-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      company_id: 'comp-apex-01',
      employee_code: empCode,
      full_name: trimmedName,
      photo_url: input.photo_url,
      phone: input.phone?.trim(),
      address: input.address?.trim(),
      job_type: input.job_type || 'Labourer',
      group_id: targetGroup ? targetGroup.id : '',
      group_name: targetGroup ? targetGroup.name : undefined,
      project_id: projId,
      project_name: projectName,
      joining_date: input.joining_date || new Date().toISOString().split('T')[0],
      salary_type: input.salary_type || 'daily_wage',
      salary_amount: wage,
      standard_hours_per_day: stdHours,
      overtime_rate_per_hour: otRate,
      status: input.status || 'active',
      remarks: input.remarks?.trim(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const updated = [newEmp, ...employees];
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(updated));
    this.recordAudit('create_employee', newEmp.id, { name: newEmp.full_name, code: newEmp.employee_code, group: newEmp.group_name || 'Individual' });
    await dataService.persistCloudState();
    return newEmp;
  }

  public async updateEmployee(employeeId: string, input: {
    employee_code?: string;
    full_name: string;
    photo_url?: string;
    phone?: string;
    address?: string;
    job_type: EmployeeJobType | string;
    group_id?: string;
    project_id?: string;
    joining_date?: string;
    salary_type: SalaryType;
    salary_amount: number;
    standard_hours_per_day?: number;
    overtime_rate_per_hour?: number;
    status?: 'active' | 'inactive';
    remarks?: string;
  }): Promise<Employee> {
    const currentUser = dataService.getCurrentUser();
    if (currentUser.role !== 'admin' && currentUser.role !== 'project_manager') {
      throw new Error('Access Denied: Only Administrators and Project Managers can update employee records.');
    }

    const employees = await this.getEmployees();
    const idx = employees.findIndex(e => e.id === employeeId);
    if (idx === -1) throw new Error('Employee not found.');

    const trimmedName = input.full_name.trim();
    if (!trimmedName) throw new Error('Employee full name is required.');

    const empCode = input.employee_code?.trim() || employees[idx].employee_code;
    if (employees.some((e, i) => i !== idx && e.employee_code.toLowerCase() === empCode.toLowerCase())) {
      throw new Error(`Employee Code "${empCode}" is already in use by another worker.`);
    }

    const wage = Number(input.salary_amount);
    if (isNaN(wage) || wage <= 0) {
      throw new Error('Salary rate must be greater than zero.');
    }

    let targetGroupId = input.group_id !== undefined ? input.group_id : (employees[idx].group_id || '');
    let targetGroupName = employees[idx].group_name;
    if (input.group_id !== undefined) {
      if (input.group_id && input.group_id !== 'ungrouped') {
        const groups = await this.getGroups();
        const g = groups.find(grp => grp.id === input.group_id);
        if (g) targetGroupName = g.name;
      } else {
        targetGroupId = '';
        targetGroupName = undefined;
      }
    }

    const stdHours = Number(input.standard_hours_per_day) || employees[idx].standard_hours_per_day || 8;
    const otRate = input.overtime_rate_per_hour !== undefined
      ? Number(input.overtime_rate_per_hour)
      : employees[idx].overtime_rate_per_hour;

    const updatedEmp: Employee = {
      ...employees[idx],
      employee_code: empCode,
      full_name: trimmedName,
      photo_url: input.photo_url !== undefined ? input.photo_url : employees[idx].photo_url,
      phone: input.phone !== undefined ? input.phone.trim() : employees[idx].phone,
      address: input.address !== undefined ? input.address.trim() : employees[idx].address,
      job_type: input.job_type || employees[idx].job_type,
      group_id: targetGroupId,
      group_name: targetGroupName,
      project_id: input.project_id !== undefined ? input.project_id : employees[idx].project_id,
      joining_date: input.joining_date || employees[idx].joining_date,
      salary_type: input.salary_type,
      salary_amount: wage,
      standard_hours_per_day: stdHours,
      overtime_rate_per_hour: otRate,
      status: input.status || employees[idx].status,
      remarks: input.remarks !== undefined ? input.remarks.trim() : employees[idx].remarks,
      updated_at: new Date().toISOString()
    };

    employees[idx] = updatedEmp;
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
    this.recordAudit('update_employee', employeeId, { name: updatedEmp.full_name, group: targetGroupName || 'Individual' });
    await dataService.persistCloudState();
    return updatedEmp;
  }

  /**
   * Assigns an ungrouped or existing employee to a group without creating duplicate records.
   * Preserves all past attendance, salary, and payment history!
   */
  public async assignEmployeeToGroup(employeeId: string, groupId: string): Promise<Employee> {
    const employees = await this.getEmployees();
    const idx = employees.findIndex(e => e.id === employeeId);
    if (idx === -1) throw new Error('Employee not found.');

    const emp = employees[idx];
    let targetGroupId = '';
    let targetGroupName: string | undefined = undefined;
    let projId = emp.project_id;
    let projName = emp.project_name;

    if (groupId && groupId !== 'ungrouped') {
      const groups = await this.getGroups();
      const targetGroup = groups.find(g => g.id === groupId);
      if (!targetGroup) throw new Error('Selected group does not exist.');
      targetGroupId = targetGroup.id;
      targetGroupName = targetGroup.name;
      if (!projId && targetGroup.project_id) {
        projId = targetGroup.project_id;
        projName = targetGroup.project_name;
      }
    }

    const updatedEmp: Employee = {
      ...emp,
      group_id: targetGroupId,
      group_name: targetGroupName,
      project_id: projId,
      project_name: projName,
      updated_at: new Date().toISOString()
    };

    employees[idx] = updatedEmp;
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
    this.recordAudit('assign_employee_group', employeeId, {
      name: updatedEmp.full_name,
      newGroup: targetGroupName || 'Ungrouped / Individual'
    });
    await dataService.persistCloudState();
    return updatedEmp;
  }

  // ==========================================
  // 3. DAILY ATTENDANCE REGISTER
  // ==========================================
  public async getAttendanceRecords(filters?: {
    groupId?: string;
    employeeId?: string;
    date?: string;
    fromDate?: string;
    toDate?: string;
    status?: string;
  }): Promise<DailyAttendanceRecord[]> {
    this.ensureInitialized();
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ATTENDANCE_RECORDS);
      let records: DailyAttendanceRecord[] = stored ? JSON.parse(stored) : [];

      if (filters?.groupId && filters.groupId !== 'all') {
        records = records.filter(r => r.group_id === filters.groupId);
      }
      if (filters?.employeeId && filters.employeeId !== 'all') {
        records = records.filter(r => r.employee_id === filters.employeeId);
      }
      if (filters?.date) {
        records = records.filter(r => r.date === filters.date);
      }
      if (filters?.fromDate) {
        records = records.filter(r => r.date >= filters.fromDate!);
      }
      if (filters?.toDate) {
        records = records.filter(r => r.date <= filters.toDate!);
      }
      if (filters?.status && filters.status !== 'all') {
        records = records.filter(r => r.status === filters.status);
      }

      // Sort descending by date, then employee name
      records.sort((a, b) => {
        const dc = b.date.localeCompare(a.date);
        if (dc !== 0) return dc;
        return a.employee_name.localeCompare(b.employee_name);
      });

      return records;
    } catch {
      return [];
    }
  }

  /**
   * Helper to calculate working hours from check-in and check-out strings
   * Correctly handles overnight shifts!
   */
  public calculateHours(checkIn?: string, checkOut?: string): number {
    if (!checkIn || !checkOut) return 0;
    const [hIn, mIn] = checkIn.split(':').map(Number);
    const [hOut, mOut] = checkOut.split(':').map(Number);
    if (isNaN(hIn) || isNaN(mIn) || isNaN(hOut) || isNaN(mOut)) return 0;

    const inMinutes = hIn * 60 + mIn;
    let outMinutes = hOut * 60 + mOut;

    // Overnight shift handling: if out is earlier than in, assume next day morning (+24h)
    if (outMinutes < inMinutes) {
      outMinutes += 24 * 60;
    }

    const diffMinutes = outMinutes - inMinutes;
    return Math.max(0, Math.round((diffMinutes / 60) * 10) / 10);
  }

  /**
   * Calculates earnings for a worker's day based on their salary rule and status
   */
  public calculateDailyEarnings(
    status: AttendanceStatus,
    salaryType: SalaryType,
    salaryRate: number,
    overtimeHours = 0,
    overtimeRate = 0
  ): { payableDays: number; dailyEarnings: number } {
    let payableDays = 0;
    if (status === 'Present') {
      payableDays = 1;
    } else if (status === 'Half Day') {
      payableDays = 0.5;
    } else {
      payableDays = 0; // Absent, Leave, Weekly Off, Holiday unless admin paid rule
    }

    let basePay = 0;
    if (salaryType === 'daily_wage') {
      basePay = payableDays * salaryRate;
    } else if (salaryType === 'monthly_salary') {
      // Standard 30 days divisor for daily equivalent
      basePay = payableDays * (salaryRate / 30);
    } else if (salaryType === 'contract') {
      basePay = payableDays * salaryRate;
    }

    const otPay = overtimeHours * overtimeRate;
    const totalEarnings = Math.round(basePay + otPay);

    return { payableDays, dailyEarnings: totalEarnings };
  }

  /**
   * Saves daily attendance register for a group and date.
   * Prevents duplicates: updates existing records for that employee & date if present!
   */
  public async saveDailyAttendanceRegister(
    groupId: string,
    date: string,
    entries: Array<{
      employee_id: string;
      status: AttendanceStatus;
      check_in_time?: string;
      check_out_time?: string;
      working_hours?: number;
      overtime_hours?: number;
      photo_proof_url?: string;
      remarks?: string;
    }>
  ): Promise<DailyAttendanceRecord[]> {
    const currentUser = dataService.getCurrentUser();
    if (currentUser.role === 'management_viewer') {
      throw new Error('Access Denied: Management Viewers have read-only permissions.');
    }

    const groups = await this.getGroups();
    const group = groups.find(g => g.id === groupId);
    if (!group) throw new Error('Group not found.');

    const employees = await this.getEmployees(groupId);
    const empMap = new Map<string, Employee>();
    employees.forEach(e => empMap.set(e.id, e));

    const stored = localStorage.getItem(STORAGE_KEYS.ATTENDANCE_RECORDS);
    let allRecords: DailyAttendanceRecord[] = stored ? JSON.parse(stored) : [];

    const savedRecords: DailyAttendanceRecord[] = [];

    for (const entry of entries) {
      const emp = empMap.get(entry.employee_id);
      if (!emp) continue;

      // Calculate working hours
      let workingHours = entry.working_hours !== undefined
        ? Number(entry.working_hours)
        : this.calculateHours(entry.check_in_time, entry.check_out_time);

      if (entry.status === 'Present' && workingHours === 0) {
        workingHours = emp.standard_hours_per_day || 8;
      } else if (entry.status === 'Half Day' && workingHours === 0) {
        workingHours = (emp.standard_hours_per_day || 8) / 2;
      } else if (entry.status !== 'Present' && entry.status !== 'Half Day') {
        workingHours = 0;
      }

      // Calculate overtime hours
      let overtimeHours = entry.overtime_hours !== undefined ? Number(entry.overtime_hours) : 0;
      if (workingHours > emp.standard_hours_per_day && entry.overtime_hours === undefined) {
        overtimeHours = Math.max(0, workingHours - emp.standard_hours_per_day);
      }

      // Calculate earnings
      const { payableDays, dailyEarnings } = this.calculateDailyEarnings(
        entry.status,
        emp.salary_type,
        emp.salary_amount,
        overtimeHours,
        emp.overtime_rate_per_hour || 0
      );

      // Check if record exists for this employee + group + date
      const existingIdx = allRecords.findIndex(
        r => r.employee_id === emp.id && r.group_id === groupId && r.date === date
      );

      const record: DailyAttendanceRecord = {
        id: existingIdx !== -1
          ? allRecords[existingIdx].id
          : `att-${emp.id}-${date.replace(/-/g, '')}-${Math.random().toString(36).substring(2, 6)}`,
        company_id: 'comp-apex-01',
        group_id: groupId,
        group_name: group.name,
        project_id: group.project_id,
        project_name: group.project_name,
        employee_id: emp.id,
        employee_code: emp.employee_code,
        employee_name: emp.full_name,
        job_type: emp.job_type,
        date,
        status: entry.status,
        check_in_time: entry.check_in_time,
        check_out_time: entry.check_out_time,
        working_hours: workingHours,
        overtime_hours: overtimeHours,
        salary_type: emp.salary_type,
        salary_rate: emp.salary_amount,
        payable_days: payableDays,
        daily_earnings: dailyEarnings,
        photo_proof_url: entry.photo_proof_url,
        remarks: entry.remarks?.trim(),
        recorded_by: currentUser.id,
        recorded_by_name: currentUser.full_name,
        created_at: existingIdx !== -1 ? allRecords[existingIdx].created_at : new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (existingIdx !== -1) {
        allRecords[existingIdx] = record;
      } else {
        allRecords.push(record);
      }

      savedRecords.push(record);
    }

    localStorage.setItem(STORAGE_KEYS.ATTENDANCE_RECORDS, JSON.stringify(allRecords));
    this.recordAudit('save_attendance', `${groupId}_${date}`, { count: savedRecords.length, date });
    await dataService.persistCloudState();
    return savedRecords;
  }

  // ==========================================
  // 4. SALARY & PAYMENTS TRACKING
  // ==========================================
  public async getPayments(filters?: {
    groupId?: string;
    employeeId?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<SalaryPaymentRecord[]> {
    this.ensureInitialized();
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
      let list: SalaryPaymentRecord[] = stored ? JSON.parse(stored) : [];

      if (filters?.groupId && filters.groupId !== 'all') {
        list = list.filter(p => p.group_id === filters.groupId);
      }
      if (filters?.employeeId && filters.employeeId !== 'all') {
        list = list.filter(p => p.employee_id === filters.employeeId);
      }
      if (filters?.fromDate) {
        list = list.filter(p => p.payment_date >= filters.fromDate!);
      }
      if (filters?.toDate) {
        list = list.filter(p => p.payment_date <= filters.toDate!);
      }

      list.sort((a, b) => b.payment_date.localeCompare(a.payment_date));
      return list;
    } catch {
      return [];
    }
  }

  public async recordPayment(input: {
    group_id: string;
    employee_id: string;
    amount: number;
    payment_date: string;
    payment_method: 'Cash' | 'Bank Transfer' | 'UPI' | 'Cheque';
    payment_type?: 'salary' | 'advance' | 'bonus' | 'deduction';
    reference_no?: string;
    remarks?: string;
  }): Promise<SalaryPaymentRecord> {
    const currentUser = dataService.getCurrentUser();
    if (currentUser.role !== 'admin' && currentUser.role !== 'project_manager') {
      throw new Error('Access Denied: Only Administrators and Project Managers can disburse salary payments.');
    }

    const amt = Number(input.amount);
    if (isNaN(amt) || amt <= 0) {
      throw new Error('Payment amount must be greater than zero.');
    }

    const employee = await this.getEmployeeById(input.employee_id);
    if (!employee) throw new Error('Employee not found.');

    const newPayment: SalaryPaymentRecord = {
      id: `pay-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      company_id: 'comp-apex-01',
      group_id: input.group_id,
      employee_id: employee.id,
      employee_name: employee.full_name,
      employee_code: employee.employee_code,
      payment_date: input.payment_date || new Date().toISOString().split('T')[0],
      amount: amt,
      payment_method: input.payment_method,
      payment_type: input.payment_type || 'salary',
      reference_no: input.reference_no?.trim(),
      remarks: input.remarks?.trim(),
      recorded_by: currentUser.id,
      recorded_by_name: currentUser.full_name,
      created_at: new Date().toISOString()
    };

    const stored = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
    const all: SalaryPaymentRecord[] = stored ? JSON.parse(stored) : [];
    all.unshift(newPayment);
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(all));

    this.recordAudit('record_payment', newPayment.id, {
      employee: employee.full_name,
      amount: amt,
      type: newPayment.payment_type
    });

    await dataService.persistCloudState();

    return newPayment;
  }

  /**
   * Computes salary and payable balances for workers in a period or cumulative
   */
  public async computeSalarySummaries(params: {
    groupId?: string;
    employeeId?: string;
    fromDate?: string;
    toDate?: string;
    upToDate?: string;
  }): Promise<EmployeeSalarySummary[]> {
    const employees = await this.getEmployees(params.groupId);
    const targetEmployees = params.employeeId && params.employeeId !== 'all'
      ? employees.filter(e => e.id === params.employeeId)
      : employees;

    // Filter attendance records
    let records = await this.getAttendanceRecords({
      groupId: params.groupId,
      employeeId: params.employeeId,
      fromDate: params.fromDate,
      toDate: params.toDate || params.upToDate
    });

    // Filter payment records
    let payments = await this.getPayments({
      groupId: params.groupId,
      employeeId: params.employeeId,
      fromDate: params.fromDate,
      toDate: params.toDate || params.upToDate
    });

    const summaries: EmployeeSalarySummary[] = targetEmployees.map(emp => {
      const empRecords = records.filter(r => r.employee_id === emp.id);
      const empPayments = payments.filter(p => p.employee_id === emp.id);

      let presentDays = 0;
      let halfDays = 0;
      let absentDays = 0;
      let leaveDays = 0;
      let weeklyOffDays = 0;
      let holidayDays = 0;
      let totalPayableDays = 0;
      let totalWorkingHours = 0;
      let totalOvertimeHours = 0;
      let grossEarnings = 0;

      for (const r of empRecords) {
        if (r.status === 'Present') presentDays++;
        else if (r.status === 'Half Day') halfDays++;
        else if (r.status === 'Absent') absentDays++;
        else if (r.status === 'Leave') leaveDays++;
        else if (r.status === 'Weekly Off') weeklyOffDays++;
        else if (r.status === 'Holiday') holidayDays++;

        totalPayableDays += (r.payable_days || 0);
        totalWorkingHours += (r.working_hours || 0);
        totalOvertimeHours += (r.overtime_hours || 0);
        grossEarnings += (r.daily_earnings || 0);
      }

      let totalAdvances = 0;
      let totalDeductions = 0;
      let totalPaid = 0;

      for (const p of empPayments) {
        if (p.payment_type === 'advance') totalAdvances += p.amount;
        else if (p.payment_type === 'deduction') totalDeductions += p.amount;
        else totalPaid += p.amount; // salary & bonus
      }

      const netPayableBalance = grossEarnings - (totalPaid + totalAdvances + totalDeductions);

      return {
        employee_id: emp.id,
        employee_code: emp.employee_code,
        employee_name: emp.full_name,
        photo_url: emp.photo_url,
        job_type: emp.job_type,
        group_id: emp.group_id || '',
        group_name: emp.group_name || 'Individual / Direct Worker',
        project_name: emp.project_name || 'Skyline Commercial Hub',
        salary_type: emp.salary_type,
        salary_rate: emp.salary_amount,
        standard_hours: emp.standard_hours_per_day || 8,
        overtime_rate: emp.overtime_rate_per_hour || 0,
        present_days: presentDays,
        half_days: halfDays,
        absent_days: absentDays,
        leave_days: leaveDays,
        weekly_off_days: weeklyOffDays,
        holiday_days: holidayDays,
        total_payable_days: totalPayableDays,
        total_working_hours: Math.round(totalWorkingHours * 10) / 10,
        total_overtime_hours: Math.round(totalOvertimeHours * 10) / 10,
        gross_earnings: grossEarnings,
        total_advances: totalAdvances,
        total_deductions: totalDeductions,
        total_paid: totalPaid,
        net_payable_balance: netPayableBalance,
        attendance_count: empRecords.length
      };
    });

    summaries.sort((a, b) => a.employee_name.localeCompare(b.employee_name));
    return summaries;
  }

  // ==========================================
  // 5. CSV EXPORT HELPERS (RFC 4180 COMPLIANT)
  // ==========================================
  public generateAttendanceCsv(params: {
    reportType: 'date_range' | 'up_to_date';
    fromDate?: string;
    toDate?: string;
    upToDate?: string;
    groupName: string;
    summaries: EmployeeSalarySummary[];
    records: DailyAttendanceRecord[];
    payments: SalaryPaymentRecord[];
  }): string {
    const lines: string[] = [];
    const escapeCsv = (str?: string | number | null) => {
      if (str === undefined || str === null) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    lines.push(escapeCsv('CHEN INFRA - BUILDPULSE ERP'));
    lines.push(
      params.reportType === 'date_range'
        ? escapeCsv(`GROUP ATTENDANCE & PAYROLL REPORT (${params.fromDate} to ${params.toDate})`)
        : escapeCsv(`CUMULATIVE ATTENDANCE & PAYROLL REPORT (UP TO ${params.upToDate})`)
    );
    lines.push(`"Group Scope:",${escapeCsv(params.groupName)}`);
    lines.push(
      params.reportType === 'date_range'
        ? `"Date Range:",${escapeCsv(`${params.fromDate} to ${params.toDate}`)}`
        : `"Report Up To Date:",${escapeCsv(params.upToDate)}`
    );
    lines.push(`"Export Generated:",${escapeCsv(new Date().toLocaleString())}`);
    lines.push('');

    // SECTION 1: SUMMARY AGGREGATE
    lines.push(escapeCsv('EMPLOYEE ATTENDANCE & SALARY SUMMARY'));
    lines.push(
      '"Group Name","Employee ID","Employee Name","Job Type","Salary Type","Rate / Wage","Present Days","Half Days","Absent Days","Leave Days","Payable Days","Total Hours","Overtime Hours","Gross Earnings","Advances","Deductions","Amount Paid","Remaining Balance"'
    );

    for (const s of params.summaries) {
      lines.push(
        [
          escapeCsv(s.group_name),
          escapeCsv(s.employee_code),
          escapeCsv(s.employee_name),
          escapeCsv(s.job_type),
          escapeCsv(s.salary_type === 'daily_wage' ? 'Daily Wage' : s.salary_type === 'monthly_salary' ? 'Monthly' : 'Contract'),
          s.salary_rate,
          s.present_days,
          s.half_days,
          s.absent_days,
          s.leave_days,
          s.total_payable_days,
          s.total_working_hours,
          s.total_overtime_hours,
          s.gross_earnings,
          s.total_advances,
          s.total_deductions,
          s.total_paid,
          s.net_payable_balance
        ].join(',')
      );
    }
    lines.push('');

    // SECTION 2: ITEMIZED DAILY ATTENDANCE LEDGER
    lines.push(escapeCsv('ITEMIZED DAILY ATTENDANCE RECORDS'));
    lines.push(
      '"Group Name","Project / Site","Employee ID","Employee Name","Job Type","Attendance Date","Attendance Status","Check-in Time","Check-out Time","Working Hours","Overtime Hours","Salary Type","Daily Wage or Monthly Salary","Payable Days","Estimated Earnings","Deductions","Advances","Amount Paid","Remaining Balance","Remarks"'
    );

    const empSummaryMap = new Map<string, EmployeeSalarySummary>();
    params.summaries.forEach(s => empSummaryMap.set(s.employee_id, s));

    for (const r of params.records) {
      const empSum = empSummaryMap.get(r.employee_id);
      lines.push(
        [
          escapeCsv(r.group_name),
          escapeCsv(r.project_name || 'Main Site'),
          escapeCsv(r.employee_code),
          escapeCsv(r.employee_name),
          escapeCsv(r.job_type),
          escapeCsv(r.date),
          escapeCsv(r.status),
          escapeCsv(r.check_in_time || '—'),
          escapeCsv(r.check_out_time || '—'),
          r.working_hours,
          r.overtime_hours,
          escapeCsv(r.salary_type),
          r.salary_rate,
          r.payable_days,
          r.daily_earnings,
          empSum?.total_deductions || 0,
          empSum?.total_advances || 0,
          empSum?.total_paid || 0,
          empSum?.net_payable_balance || 0,
          escapeCsv(r.remarks || '—')
        ].join(',')
      );
    }

    return lines.join('\r\n');
  }

  public downloadCsv(filename: string, content: string): void {
    const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // ==========================================
  // AUDIT LOGGING
  // ==========================================
  private recordAudit(action: string, entityId: string, details: any) {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
      const logs = stored ? JSON.parse(stored) : [];
      const user = dataService.getCurrentUser();
      logs.unshift({
        id: `aud-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
        user_id: user.id,
        user_name: user.full_name,
        user_role: user.role,
        action,
        entity_id: entityId,
        details,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(logs.slice(0, 150)));
    } catch {}
  }
}

export const attendanceService = new AttendanceService();
