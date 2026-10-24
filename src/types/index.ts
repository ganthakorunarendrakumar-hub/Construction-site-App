export type UserRole = 
  | 'admin'
  | 'site_supervisor'
  | 'accountant'
  | 'worker'
  | 'project_manager'
  | 'site_engineer'
  | 'storekeeper'
  | 'management_viewer';

export interface UserProfile {
  id: string;
  auth_uid?: string;
  user_id?: string;
  email: string;
  full_name: string;
  role: UserRole;
  role_title: string;
  company_id: string;
  avatar_url?: string;
  phone?: string;
  assigned_projects?: string[];
  employee_id?: string;
  status?: 'active' | 'inactive';
}

export interface AuthAccount {
  auth_uid: string;
  user_id: string;
  email: string;
  full_name: string;
  role: UserRole;
  role_title: string;
  company_id: string;
  phone?: string;
  avatar_url?: string;
  assigned_projects?: string[];
  employee_id?: string;
  status: 'active' | 'inactive';
  password_hash: string;
  password_salt: string;
  failed_attempts: number;
  lockout_until?: string | null;
  must_change_password?: boolean;
  password_reset_code?: string;
  password_reset_expires?: string;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface UserSession {
  token: string;
  auth_uid: string;
  user_id: string;
  email: string;
  full_name: string;
  role: UserRole;
  role_title: string;
  company_id: string;
  assigned_projects: string[];
  employee_id?: string;
  login_at: string;
  expires_at: number;
}

export interface Company {
  id: string;
  name: string;
  code: string;
  address?: string;
  gstin?: string;
  logo_url?: string;
  created_at: string;
  updated_at: string;
}

export type ProjectStatus = 'planning' | 'in_progress' | 'on_hold' | 'completed';

export interface Project {
  id: string;
  company_id: string;
  name: string;
  code: string;
  client_name: string;
  address: string;
  location: string;
  description: string;
  start_date: string;
  expected_completion_date: string;
  actual_completion_date?: string;
  project_manager_id: string;
  project_manager_name: string;
  status: ProjectStatus;
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  completed_by?: string;
  reopened_at?: string;
  reopened_by?: string;
}

export interface CementBrand {
  id: string;
  company_id: string;
  brand_name: string;
  code: string;
  is_active: boolean;
  display_order: number;
}

export interface MaterialLocation {
  id: string;
  company_id: string;
  project_id: string;
  name: string;
  code: string;
  description?: string;
}

export type TransactionType = 'receipt' | 'usage' | 'damage' | 'return' | 'opening_stock';

export interface TransactionAttachment {
  url: string;
  name: string;
  size: number;
  type?: string;
}

export interface TransactionAttachments {
  invoice?: TransactionAttachment;
  dc?: TransactionAttachment;
  images: TransactionAttachment[];
}

export interface MaterialTransaction {
  id: string;
  company_id: string;
  project_id: string;
  location_id: string;
  location_name: string;
  category: 'cement';
  brand_id: string;
  brand_name: string;
  transaction_date: string;
  transaction_type: TransactionType;
  quantity_bags: number;
  // Specific quantities recorded for ease of reading:
  received_qty: number;
  used_qty: number;
  damaged_qty: number;
  supplier_name?: string;
  invoice_number?: string;
  challan_number?: string;
  remarks?: string;
  attachment_url?: string;
  attachment_name?: string;
  attachment_size?: number;
  attachments?: TransactionAttachments;
  created_by: string;
  created_by_name: string;
  created_by_role: UserRole;
  created_at: string;
  updated_at?: string;
  approval_status: 'approved' | 'pending' | 'rejected';
  running_balance?: number;
  is_reversal?: boolean;
  reversal_of_id?: string;
  reversal_reason?: string;
}

export interface BrandStockSummary {
  brand_id: string;
  brand_name: string;
  opening_stock: number;
  total_received: number;
  total_used: number;
  total_damaged: number;
  total_returns: number;
  available_stock: number;
}

export interface ProjectStockMetrics {
  projectId: string;
  totalAvailableBags: number;
  totalReceivedBags: number;
  totalUsedBags: number;
  totalDamagedBags: number;
  activeBrandsCount: number;
  brandSummaries: BrandStockSummary[];
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConnected: boolean;
  lastChecked?: string;
  error?: string;
}

export type StandardCategoryKey = 
  | 'cement'
  | 'steel'
  | 'sand'
  | 'bricks'
  | 'aggregate'
  | 'safety_ppe'
  | 'hand_tools'
  | 'measuring_tools'
  | 'masonry_tools'
  | 'fasteners'
  | 'shuttering_scaffolding'
  | 'power_tools'
  | 'electrical'
  | 'plumbing'
  | string;

export interface SteelBrand {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
}

export interface MaterialCategoryDef {
  id: string;
  name: string;
  description: string;
  iconName: string;
  is_core: boolean;
  is_reusable: boolean;
  default_unit: string;
  allowed_units: string[];
}

export interface MaterialItem {
  id: string;
  category_id: string;
  name: string;
  code: string;
  default_unit: string;
  supported_units: string[];
  min_stock_alert: number;
  is_reusable: boolean;
  specification?: string;
  diameter?: string;
  brand?: string;
  aliases?: string[];
  subcategory?: string;
}

export type ExtendedTransactionType = TransactionType | 'issue' | 'adjustment';

export interface GenericMaterialTransaction {
  id: string;
  company_id: string;
  project_id: string;
  location_id: string;
  location_name: string;
  category: StandardCategoryKey;
  item_id?: string;
  item_name: string;
  subcategory?: string;
  brand_name?: string;
  diameter_or_size?: string;
  unit: string;
  transaction_date: string;
  transaction_type: ExtendedTransactionType;
  quantity: number;
  received_qty: number;
  used_qty: number;
  damaged_qty: number;
  return_qty: number;
  equipment_condition?: 'good' | 'fair' | 'damaged' | 'maintenance';
  issued_to?: string;
  supplier_name?: string;
  invoice_number?: string;
  challan_number?: string;
  remarks?: string;
  attachment_url?: string;
  attachment_name?: string;
  attachment_size?: number;
  attachments?: TransactionAttachments;
  idempotency_key?: string;
  created_by: string;
  created_by_name: string;
  created_by_role: UserRole;
  created_at: string;
  updated_at?: string;
  approval_status: 'approved' | 'pending' | 'rejected';
  running_balance?: number;
  is_reversal?: boolean;
  reversal_of_id?: string;
  reversal_reason?: string;
}

export interface ItemStockSummary {
  key: string;
  item_id?: string;
  item_name: string;
  category: StandardCategoryKey;
  subcategory?: string;
  brand_name?: string;
  diameter_or_size?: string;
  unit: string;
  opening_stock: number;
  total_received: number;
  total_used: number;
  total_damaged: number;
  total_returns: number;
  available_stock: number;
  min_stock_alert: number;
  is_low_stock: boolean;
  is_reusable: boolean;
  in_use_stock?: number;
}

export interface CategoryStockMetrics {
  categoryId: string;
  categoryName: string;
  totalItemsCount: number;
  lowStockItemsCount: number;
  totalAvailableAggregate: number;
  items: ItemStockSummary[];
}

// ==========================================
// GROUP-BASED ATTENDANCE & PAYROLL TYPES
// ==========================================
export type EmployeeJobType = 
  | 'Labourer'
  | 'Mason'
  | 'Carpenter'
  | 'Electrician'
  | 'Plumber'
  | 'Welder'
  | 'Barbender'
  | 'Painter'
  | 'Supervisor'
  | 'Other';

export type SalaryType = 'daily_wage' | 'monthly_salary' | 'contract';

export type AttendanceStatus = 
  | 'Present'
  | 'Absent'
  | 'Half Day'
  | 'Leave'
  | 'Weekly Off'
  | 'Holiday'
  | 'Not Marked';

export interface AttendanceGroup {
  id: string;
  company_id: string;
  name: string;
  photo_url?: string;
  leader_name: string;
  leader_phone?: string;
  project_id?: string;
  project_name?: string;
  remarks?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface VehicleHireRecord {
  id: string;
  company_id: string;
  project_id: string;
  project_name: string;
  vehicle_category: string;
  vehicle_type: string;
  vehicle_identifier: string;
  vendor: string;
  operator?: string;
  hire_date: string;
  start_time: string;
  stop_time: string;
  idle_minutes: number;
  idle_reason?: string;
  fuel_type: 'petrol' | 'diesel';
  fuel_litres?: number;
  working_hours: number;
  remarks?: string;
  attachments?: TransactionAttachments;
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface MachineryHireRecord {
  id: string;
  company_id: string;
  project_id: string;
  project_name: string;
  machinery_category: string;
  machinery_type: string;
  equipment_identifier: string;
  vendor: string;
  location: string;
  quantity: number;
  received_date: string;
  returned_date?: string;
  rent_per_day: number;
  remarks?: string;
  attachments?: TransactionAttachments;
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface EmployeeDocuments {
  aadhaar_pdf?: TransactionAttachment;
  aadhaar_front?: TransactionAttachment;
  aadhaar_back?: TransactionAttachment;
}

export interface Employee {
  id: string;
  company_id: string;
  employee_code: string;
  full_name: string;
  photo_url?: string;
  documents?: EmployeeDocuments;
  phone?: string;
  address?: string;
  job_type: EmployeeJobType | string;
  group_id?: string;
  group_name?: string;
  project_id?: string;
  project_name?: string;
  joining_date: string;
  salary_type: SalaryType;
  salary_amount: number;
  standard_hours_per_day: number;
  overtime_rate_per_hour?: number;
  status: 'active' | 'inactive';
  remarks?: string;
  created_at: string;
  updated_at: string;
}

export interface DailyAttendanceRecord {
  id: string;
  company_id: string;
  group_id?: string;
  group_name?: string;
  project_id?: string;
  project_name?: string;
  employee_id: string;
  employee_code: string;
  employee_name: string;
  job_type: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  check_in_time?: string;
  check_out_time?: string;
  working_hours: number;
  overtime_hours: number;
  salary_type: SalaryType;
  salary_rate: number;
  payable_days: number;
  daily_earnings: number;
  photo_proof_url?: string;
  remarks?: string;
  recorded_by: string;
  recorded_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface SalaryPaymentRecord {
  id: string;
  company_id: string;
  group_id?: string;
  employee_id: string;
  employee_name: string;
  employee_code: string;
  payment_date: string;
  amount: number;
  payment_method: 'Cash' | 'Bank Transfer' | 'UPI' | 'Cheque';
  payment_type: 'salary' | 'advance' | 'bonus' | 'deduction';
  reference_no?: string;
  remarks?: string;
  attachments?: TransactionAttachments;
  recorded_by: string;
  recorded_by_name: string;
  created_at: string;
}

export interface EmployeeSalarySummary {
  employee_id: string;
  employee_code: string;
  employee_name: string;
  photo_url?: string;
  job_type: string;
  group_id?: string;
  group_name: string;
  project_name: string;
  salary_type: SalaryType;
  salary_rate: number;
  standard_hours: number;
  overtime_rate: number;
  present_days: number;
  half_days: number;
  absent_days: number;
  leave_days: number;
  weekly_off_days: number;
  holiday_days: number;
  total_payable_days: number;
  total_working_hours: number;
  total_overtime_hours: number;
  gross_earnings: number;
  total_advances: number;
  total_deductions: number;
  total_paid: number;
  net_payable_balance: number;
  attendance_count: number;
}

