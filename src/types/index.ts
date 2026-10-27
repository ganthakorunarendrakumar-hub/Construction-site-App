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

export type StockInventoryModuleId = 'cement_module' | 'steel_module' | 'sand_module' | 'bricks_module' | 'aggregate_module';

export interface CompanyStockBackgroundImage {
  id: string;
  name: string;
  url: string;
  size_bytes: number;
}

export interface CompanyStockBackgroundSlideshow {
  enabled: boolean;
  images: CompanyStockBackgroundImage[];
  transition_seconds: number;
  overlay_opacity: number;
  modules: StockInventoryModuleId[];
}

export interface Company {
  id: string;
  name: string;
  code: string;
  address?: string;
  gstin?: string;
  logo_url?: string;
  watermark_enabled?: boolean;
  watermark_opacity?: number;
  watermark_size?: number;
  stock_background_slideshow?: CompanyStockBackgroundSlideshow;
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

export type VehicleFuelType = 'diesel' | 'petrol' | 'electric' | 'other';
export type VehicleHireBillingBasis = 'daily' | 'monthly';
export type VehicleHireDateRule = 'inclusive' | 'exclusive';
export type VehicleAssetCondition = 'available' | 'maintenance';

export type VehicleHireBillingMethod = 'hour' | 'day' | 'trip' | 'month' | 'fixed_contract';
export type VehicleHireOperationalStatus = 'active' | 'cancelled';
export type VehicleHireDisplayStatus = 'Active' | 'Return Due' | 'Overdue' | 'Returned' | 'Cancelled';

export interface VehicleDealerRecord {
  id: string;
  company_id: string;
  dealer_id: string;
  name: string;
  contact_person: string;
  phone: string;
  address: string;
  email?: string;
  payment_details?: string;
  remarks?: string;
  status: 'active' | 'archived';
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

/** New dealer-backed hire contract; older VehicleRentalRecord entries remain readable unchanged. */
export interface VehicleHireContractRecord {
  id: string;
  company_id: string;
  hire_reference: string;
  dealer_id: string;
  project_id: string;
  project_name: string;
  site_id?: string;
  site_name: string;
  asset_id?: string;
  vehicle_type: string;
  registration_number?: string;
  vehicle_description: string;
  driver_name?: string;
  driver_phone?: string;
  start_at: string;
  expected_return_at: string;
  billing_method: VehicleHireBillingMethod;
  agreed_rate: number;
  initial_meter_reading?: number;
  initial_engine_hours?: number;
  advance_amount: number;
  advance_payment_id?: string;
  remarks?: string;
  attachments?: TransactionAttachments;
  status: VehicleHireOperationalStatus;
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface VehicleHireReturnRecord {
  id: string;
  company_id: string;
  hire_id: string;
  actual_return_at: string;
  final_meter_reading?: number;
  final_engine_hours?: number;
  billable_usage: number;
  return_condition: string;
  additional_charges: number;
  discount: number;
  final_bill: number;
  remarks?: string;
  attachments?: TransactionAttachments;
  revision_history: Array<{
    id: string;
    changed_by: string;
    changed_by_name: string;
    changed_at: string;
    reason: string;
    previous_values: Pick<VehicleHireReturnRecord, 'actual_return_at' | 'final_meter_reading' | 'final_engine_hours' | 'billable_usage' | 'return_condition' | 'additional_charges' | 'discount' | 'final_bill' | 'remarks'>;
  }>;
  finalized_by: string;
  finalized_by_name: string;
  created_at: string;
  updated_at: string;
}

export type VehicleDealerPaymentMethod = 'cash' | 'bank_transfer' | 'upi' | 'cheque' | 'other';
export type VehicleDealerPaymentType = 'advance' | 'partial' | 'full' | 'reversal';

export interface VehicleDealerPaymentRecord {
  id: string;
  company_id: string;
  dealer_id: string;
  hire_ids: string[];
  payment_date: string;
  amount: number;
  payment_type: VehicleDealerPaymentType;
  method: VehicleDealerPaymentMethod;
  transaction_reference?: string;
  receipt?: TransactionAttachments;
  remarks?: string;
  idempotency_key: string;
  reverses_payment_id?: string;
  reversal_reason?: string;
  revision_history?: Array<{
    id: string;
    changed_by: string;
    changed_by_name: string;
    changed_at: string;
    reason: string;
    previous_values: Pick<VehicleDealerPaymentRecord, 'dealer_id' | 'hire_ids' | 'payment_date' | 'amount' | 'payment_type' | 'method' | 'transaction_reference' | 'remarks'>;
  }>;
  created_by: string;
  created_by_name: string;
  created_at: string;
}

export type VehicleFuelPayer = 'company_direct' | 'driver_advance' | 'dealer_paid';

export interface VehicleDriverFuelAdvanceRecord {
  id: string;
  company_id: string;
  hire_id?: string;
  asset_id?: string;
  project_id: string;
  project_name: string;
  site_id?: string;
  site_name: string;
  driver_name: string;
  advance_date: string;
  amount: number;
  method: VehicleDealerPaymentMethod;
  transaction_reference?: string;
  idempotency_key: string;
  employee_id: string;
  employee_name: string;
  created_by: string;
  created_by_name: string;
  created_at: string;
}

export interface VehicleFuelEntryRecord {
  id: string;
  company_id: string;
  idempotency_key: string;
  hire_id?: string;
  asset_id?: string;
  dealer_id?: string;
  project_id: string;
  project_name: string;
  site_id?: string;
  site_name: string;
  fuel_date: string;
  fuel_type: VehicleFuelType;
  quantity_litres: number;
  price_per_litre: number;
  total_amount: number;
  meter_reading?: number;
  supplier: string;
  payer: VehicleFuelPayer;
  driver_advance_id?: string;
  driver_advance_amount: number;
  reimbursement_confirmed: boolean;
  reimbursement_confirmed_by?: string;
  reimbursement_confirmed_by_name?: string;
  reimbursement_confirmed_at?: string;
  status?: 'active' | 'voided';
  void_reason?: string;
  voided_by?: string;
  voided_by_name?: string;
  voided_at?: string;
  revision_history?: Array<{
    id: string;
    changed_by: string;
    changed_by_name: string;
    changed_at: string;
    reason: string;
    previous_values: Pick<VehicleFuelEntryRecord, 'project_id' | 'site_id' | 'site_name' | 'fuel_date' | 'fuel_type' | 'quantity_litres' | 'price_per_litre' | 'total_amount' | 'meter_reading' | 'supplier' | 'payer' | 'driver_advance_id' | 'reimbursement_confirmed' | 'notes'>;
  }>;
  receipt?: TransactionAttachments;
  employee_id: string;
  employee_name: string;
  notes?: string;
  created_by: string;
  created_by_name: string;
  created_at: string;
}

/** A registered company vehicle. New contract and movement records reference this stable asset ID. */
export interface VehicleAssetRecord {
  id: string;
  company_id: string;
  vehicle_equipment_id: string;
  vehicle_type: string;
  vehicle_category: string;
  vendor: string;
  model: string;
  fuel_type: VehicleFuelType;
  registration_number?: string;
  project_id: string;
  project_name: string;
  site_id?: string;
  site_name: string;
  condition: VehicleAssetCondition;
  remarks?: string;
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface VehicleTypeRecord {
  id: string;
  company_id: string;
  name: string;
  created_by: string;
  created_by_name: string;
  created_at: string;
}

/** A dated rental of a registered vehicle, with the chosen billing rule stored for auditability. */
export interface VehicleRentalRecord {
  id: string;
  company_id: string;
  asset_id: string;
  project_id: string;
  project_name: string;
  site_id?: string;
  site_name: string;
  in_date: string;
  out_date: string;
  billing_basis: VehicleHireBillingBasis;
  date_rule: VehicleHireDateRule;
  rent_per_month?: number;
  rent_per_day?: number;
  total_months: number;
  total_days: number;
  billable_days: number;
  estimated_hire_cost: number;
  remarks?: string;
  attachments?: TransactionAttachments;
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface VehicleWorkingSession {
  id: string;
  start_time: string;
  stop_time: string;
  duration_minutes: number;
}

/** Append-only vehicle movement/work record. Session durations are actual working time. */
export interface VehicleMovementRecord {
  id: string;
  company_id: string;
  asset_id: string;
  project_id: string;
  project_name: string;
  site_id?: string;
  site_name: string;
  operator_name: string;
  work_date: string;
  sessions: VehicleWorkingSession[];
  total_working_minutes: number;
  idle_minutes: number;
  scheduled_minutes: number;
  idle_reason?: string;
  remarks?: string;
  idempotency_key: string;
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

