import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  Company,
  UserProfile,
  UserRole,
  Project,
  CementBrand,
  MaterialLocation,
  MaterialTransaction,
  ProjectStockMetrics,
  BrandStockSummary,
  SupabaseConfig,
  TransactionType,
  ProjectStatus,
  SteelBrand,
  MaterialCategoryDef,
  MaterialItem,
  GenericMaterialTransaction,
  ItemStockSummary,
  CategoryStockMetrics,
  ExtendedTransactionType,
  StandardCategoryKey,
  VehicleHireRecord,
  MachineryHireRecord
} from '../types';
import {
  INITIAL_STEEL_BRANDS,
  INITIAL_STEEL_SIZES,
  INITIAL_SAND_TYPES,
  INITIAL_BRICKS_TYPES,
  INITIAL_AGGREGATE_SIZES,
  INITIAL_CATEGORIES,
  INITIAL_ITEMS_BY_CATEGORY,
  REGULAR_SITE_USE_DETAILED_ITEMS
} from './materialCatalog';
import { getLocalDateString } from '../utils/dateUtils';

const generateUuid = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

// Default standard Indian Cement Brands specified in Section 8:
export const INITIAL_CEMENT_BRANDS = [
  { id: 'brand-1', name: 'Dalmia Bharat / Dalmia Cement', code: 'DALMIA', order: 1 },
  { id: 'brand-2', name: 'UltraTech Cement', code: 'ULTRATECH', order: 2 },
  { id: 'brand-3', name: 'The Ramco Cements Ltd.', code: 'RAMCO', order: 3 },
  { id: 'brand-4', name: 'India Cements Ltd.', code: 'INDIACEM', order: 4 },
  { id: 'brand-5', name: 'Nagarjuna / Maha Cement', code: 'MAHA', order: 5 },
  { id: 'brand-6', name: 'Penna Cement', code: 'PENNA', order: 6 },
  { id: 'brand-7', name: 'Orient Cement', code: 'ORIENT', order: 7 },
  { id: 'brand-8', name: 'ACC and Ambuja Cements', code: 'ACC-AMBUJA', order: 8 },
  { id: 'brand-9', name: 'JSW Cement', code: 'JSW', order: 9 },
  { id: 'brand-10', name: 'Deccan Cements', code: 'DECCAN', order: 10 },
  { id: 'brand-11', name: 'Other', code: 'OTHER', order: 11 },
];

export const PRESET_USERS: Record<UserRole, UserProfile> = {
  admin: {
    id: 'auth-usr-admin-01',
    auth_uid: 'auth-usr-admin-01',
    user_id: 'CHEN-ADM-01',
    email: 'admin@cheninfra.com',
    full_name: 'Rajesh Sharma',
    role: 'admin',
    role_title: 'Company Administrator',
    company_id: 'comp-apex-01',
    phone: '+91 98450 11223',
    status: 'active'
  },
  site_supervisor: {
    id: 'auth-usr-sup-02',
    auth_uid: 'auth-usr-sup-02',
    user_id: 'CHEN-SUP-02',
    email: 'supervisor.ananya@cheninfra.com',
    full_name: 'Ananya Rao',
    role: 'site_supervisor',
    role_title: 'Site Supervisor',
    company_id: 'comp-apex-01',
    phone: '+91 97410 77889',
    assigned_projects: ['proj-skyline-01'],
    status: 'active'
  },
  accountant: {
    id: 'auth-usr-acc-03',
    auth_uid: 'auth-usr-acc-03',
    user_id: 'CHEN-ACC-03',
    email: 'accountant.kavita@cheninfra.com',
    full_name: 'Kavita Sundaram',
    role: 'accountant',
    role_title: 'Chief Accountant',
    company_id: 'comp-apex-01',
    phone: '+91 98190 66778',
    assigned_projects: ['proj-skyline-01', 'proj-emerald-02'],
    status: 'active'
  },
  worker: {
    id: 'auth-usr-wrk-04',
    auth_uid: 'auth-usr-wrk-04',
    user_id: 'CHEN-WRK-04',
    email: 'worker.daniel@cheninfra.com',
    full_name: 'Daniel Murmu',
    role: 'worker',
    role_title: 'Site Worker / Specialist',
    company_id: 'comp-apex-01',
    phone: '+91 98452 33441',
    assigned_projects: ['proj-skyline-01'],
    employee_id: 'emp-dan-001',
    status: 'active'
  },
  project_manager: {
    id: 'usr-pm-02',
    auth_uid: 'usr-pm-02',
    user_id: 'CHEN-PM-06',
    email: 'pm.vikram@cheninfra.com',
    full_name: 'Vikram Patel',
    role: 'project_manager',
    role_title: 'Senior Project Manager',
    company_id: 'comp-apex-01',
    phone: '+91 98200 44556',
    status: 'active'
  },
  site_engineer: {
    id: 'usr-se-03',
    auth_uid: 'usr-se-03',
    user_id: 'CHEN-ENG-07',
    email: 'engineer.suresh@cheninfra.com',
    full_name: 'Suresh Nambiar',
    role: 'site_engineer',
    role_title: 'Site Engineer',
    company_id: 'comp-apex-01',
    phone: '+91 97410 77880',
    status: 'active'
  },
  storekeeper: {
    id: 'auth-usr-str-05',
    auth_uid: 'auth-usr-str-05',
    user_id: 'CHEN-STR-05',
    email: 'storekeeper.manoj@cheninfra.com',
    full_name: 'Manoj Kumar',
    role: 'storekeeper',
    role_title: 'Materials Storekeeper',
    company_id: 'comp-apex-01',
    phone: '+91 94480 33221',
    assigned_projects: ['proj-skyline-01'],
    status: 'active'
  },
  management_viewer: {
    id: 'usr-mv-05',
    auth_uid: 'usr-mv-05',
    user_id: 'CHEN-AUD-08',
    email: 'auditor.raman@cheninfra.com',
    full_name: 'Ramanathan Iyer',
    role: 'management_viewer',
    role_title: 'Management Auditor / Viewer',
    company_id: 'comp-apex-01',
    phone: '+91 98190 66779',
    status: 'active'
  }
};

const STORAGE_KEYS = {
  SUPABASE_CONFIG: 'buildpulse_supabase_config_v1',
  CURRENT_USER_ROLE: 'buildpulse_current_role_v1',
  COMPANY: 'buildpulse_company_v1',
  PROJECTS: 'buildpulse_projects_v1',
  CEMENT_BRANDS: 'buildpulse_cement_brands_v1',
  LOCATIONS: 'buildpulse_locations_v1',
  TRANSACTIONS: 'buildpulse_transactions_v1',
  AUDIT_LOGS: 'buildpulse_audit_logs_v1',
  CATEGORIES: 'buildpulse_categories_v2',
  STEEL_BRANDS: 'buildpulse_steel_brands_v2',
  STEEL_SIZES: 'buildpulse_steel_sizes_v2',
  SAND_TYPES: 'buildpulse_sand_types_v2',
  BRICK_TYPES: 'buildpulse_brick_types_v2',
  AGGREGATE_SIZES: 'buildpulse_aggregate_sizes_v2',
  CATEGORY_ITEMS: 'buildpulse_category_items_v2',
  GENERIC_TRANSACTIONS: 'buildpulse_generic_transactions_v2',
  VEHICLE_HIRE: 'buildpulse_vehicle_hire_v1',
  MACHINERY_HIRE: 'buildpulse_machinery_hire_v1',
};

export const INITIAL_REGULAR_SITE_USE_TRANSACTIONS: GenericMaterialTransaction[] = [
  // General Site Supplies
  {
    id: 'gtx-rsu-001',
    company_id: 'comp-apex-01',
    project_id: 'proj-skyline-01',
    location_id: 'loc-skyline-main',
    location_name: 'Main Site Cement Yard',
    category: 'regular_site_use',
    item_name: 'Sponges',
    subcategory: 'General Site Supplies',
    unit: 'Nos',
    transaction_date: '2026-10-06',
    transaction_type: 'receipt',
    quantity: 50,
    received_qty: 50,
    used_qty: 0,
    damaged_qty: 0,
    return_qty: 0,
    supplier_name: 'Sri Balaji Site Hardware & Consumables',
    invoice_number: 'INV-SP-109',
    remarks: 'High-density plastering & finishing sponges delivered to store',
    created_by: 'usr-sk-04',
    created_by_name: 'Manoj Kumar',
    created_by_role: 'storekeeper',
    approval_status: 'approved',
    created_at: new Date('2026-10-06T09:00:00Z').toISOString()
  },
  {
    id: 'gtx-rsu-002',
    company_id: 'comp-apex-01',
    project_id: 'proj-skyline-01',
    location_id: 'loc-skyline-main',
    location_name: 'Main Site Cement Yard',
    category: 'regular_site_use',
    item_name: 'Sponges',
    subcategory: 'General Site Supplies',
    unit: 'Nos',
    transaction_date: '2026-10-09',
    transaction_type: 'usage',
    quantity: 15,
    received_qty: 0,
    used_qty: 15,
    damaged_qty: 0,
    return_qty: 0,
    remarks: 'Issued for 3rd floor plaster wall smoothing and tile cleaning',
    created_by: 'usr-se-03',
    created_by_name: 'Ananya Rao',
    created_by_role: 'site_engineer',
    approval_status: 'approved',
    created_at: new Date('2026-10-09T14:00:00Z').toISOString()
  },
  {
    id: 'gtx-rsu-003',
    company_id: 'comp-apex-01',
    project_id: 'proj-skyline-01',
    location_id: 'loc-skyline-main',
    location_name: 'Main Site Cement Yard',
    category: 'regular_site_use',
    item_name: 'Cement Tubs',
    subcategory: 'General Site Supplies',
    unit: 'Nos',
    transaction_date: '2026-10-05',
    transaction_type: 'receipt',
    quantity: 30,
    received_qty: 30,
    used_qty: 0,
    damaged_qty: 0,
    return_qty: 0,
    supplier_name: 'Sri Balaji Site Hardware & Consumables',
    invoice_number: 'INV-TB-441',
    remarks: 'Heavy-duty HDPE mortar & concrete mixing tubs',
    created_by: 'usr-sk-04',
    created_by_name: 'Manoj Kumar',
    created_by_role: 'storekeeper',
    approval_status: 'approved',
    created_at: new Date('2026-10-05T10:00:00Z').toISOString()
  },
  {
    id: 'gtx-rsu-004',
    company_id: 'comp-apex-01',
    project_id: 'proj-skyline-01',
    location_id: 'loc-skyline-main',
    location_name: 'Main Site Cement Yard',
    category: 'regular_site_use',
    item_name: 'Cement Tubs',
    subcategory: 'General Site Supplies',
    unit: 'Nos',
    transaction_date: '2026-10-08',
    transaction_type: 'issue',
    quantity: 10,
    received_qty: 0,
    used_qty: 10,
    damaged_qty: 0,
    return_qty: 0,
    issued_to: 'Masonry Gang 1 (Suresh)',
    equipment_condition: 'good',
    remarks: 'Issued for mortar mixing on Level 2 blockwork',
    created_by: 'usr-sk-04',
    created_by_name: 'Manoj Kumar',
    created_by_role: 'storekeeper',
    approval_status: 'approved',
    created_at: new Date('2026-10-08T11:00:00Z').toISOString()
  },
  // Hand Tools & Masonry Tools
  {
    id: 'gtx-rsu-005',
    company_id: 'comp-apex-01',
    project_id: 'proj-skyline-01',
    location_id: 'loc-skyline-main',
    location_name: 'Main Site Cement Yard',
    category: 'regular_site_use',
    item_name: 'Hammers',
    subcategory: 'Hand Tools & Masonry Tools',
    unit: 'Nos',
    transaction_date: '2026-10-04',
    transaction_type: 'receipt',
    quantity: 25,
    received_qty: 25,
    used_qty: 0,
    damaged_qty: 0,
    return_qty: 0,
    supplier_name: 'Apex Tools Corporation',
    invoice_number: 'ATC-889',
    remarks: 'Drop-forged claw and ball-peen site hammers with fiberglass handles',
    created_by: 'usr-sk-04',
    created_by_name: 'Manoj Kumar',
    created_by_role: 'storekeeper',
    approval_status: 'approved',
    created_at: new Date('2026-10-04T09:30:00Z').toISOString()
  },
  {
    id: 'gtx-rsu-006',
    company_id: 'comp-apex-01',
    project_id: 'proj-skyline-01',
    location_id: 'loc-skyline-main',
    location_name: 'Main Site Cement Yard',
    category: 'regular_site_use',
    item_name: 'Hammers',
    subcategory: 'Hand Tools & Masonry Tools',
    unit: 'Nos',
    transaction_date: '2026-10-07',
    transaction_type: 'issue',
    quantity: 8,
    received_qty: 0,
    used_qty: 8,
    damaged_qty: 0,
    return_qty: 0,
    issued_to: 'Carpentry & Shuttering Crew',
    equipment_condition: 'good',
    remarks: 'Issued for shuttering formwork fixing on Grid C',
    created_by: 'usr-sk-04',
    created_by_name: 'Manoj Kumar',
    created_by_role: 'storekeeper',
    approval_status: 'approved',
    created_at: new Date('2026-10-07T10:00:00Z').toISOString()
  },
  {
    id: 'gtx-rsu-007',
    company_id: 'comp-apex-01',
    project_id: 'proj-skyline-01',
    location_id: 'loc-skyline-main',
    location_name: 'Main Site Cement Yard',
    category: 'regular_site_use',
    item_name: 'Thapi',
    subcategory: 'Hand Tools & Masonry Tools',
    unit: 'Nos',
    transaction_date: '2026-10-05',
    transaction_type: 'receipt',
    quantity: 20,
    received_qty: 20,
    used_qty: 0,
    damaged_qty: 0,
    return_qty: 0,
    supplier_name: 'Apex Tools Corporation',
    invoice_number: 'ATC-890',
    remarks: 'Masonry plastering finishing trowels (Thapi)',
    created_by: 'usr-sk-04',
    created_by_name: 'Manoj Kumar',
    created_by_role: 'storekeeper',
    approval_status: 'approved',
    created_at: new Date('2026-10-05T11:00:00Z').toISOString()
  },
  {
    id: 'gtx-rsu-008',
    company_id: 'comp-apex-01',
    project_id: 'proj-skyline-01',
    location_id: 'loc-skyline-main',
    location_name: 'Main Site Cement Yard',
    category: 'regular_site_use',
    item_name: 'Thapi',
    subcategory: 'Hand Tools & Masonry Tools',
    unit: 'Nos',
    transaction_date: '2026-10-08',
    transaction_type: 'issue',
    quantity: 6,
    received_qty: 0,
    used_qty: 6,
    damaged_qty: 0,
    return_qty: 0,
    issued_to: 'Plastering Team B',
    equipment_condition: 'good',
    remarks: 'Issued for corridor wall plastering',
    created_by: 'usr-sk-04',
    created_by_name: 'Manoj Kumar',
    created_by_role: 'storekeeper',
    approval_status: 'approved',
    created_at: new Date('2026-10-08T14:30:00Z').toISOString()
  },
  {
    id: 'gtx-rsu-009',
    company_id: 'comp-apex-01',
    project_id: 'proj-skyline-01',
    location_id: 'loc-skyline-main',
    location_name: 'Main Site Cement Yard',
    category: 'regular_site_use',
    item_name: 'Kharni',
    subcategory: 'Hand Tools & Masonry Tools',
    unit: 'Nos',
    transaction_date: '2026-10-05',
    transaction_type: 'receipt',
    quantity: 20,
    received_qty: 20,
    used_qty: 0,
    damaged_qty: 0,
    return_qty: 0,
    supplier_name: 'Apex Tools Corporation',
    invoice_number: 'ATC-890',
    remarks: 'Pointed bricklaying trowels (Kharni)',
    created_by: 'usr-sk-04',
    created_by_name: 'Manoj Kumar',
    created_by_role: 'storekeeper',
    approval_status: 'approved',
    created_at: new Date('2026-10-05T11:00:00Z').toISOString()
  },
  {
    id: 'gtx-rsu-010',
    company_id: 'comp-apex-01',
    project_id: 'proj-skyline-01',
    location_id: 'loc-skyline-main',
    location_name: 'Main Site Cement Yard',
    category: 'regular_site_use',
    item_name: 'Kharni',
    subcategory: 'Hand Tools & Masonry Tools',
    unit: 'Nos',
    transaction_date: '2026-10-08',
    transaction_type: 'issue',
    quantity: 6,
    received_qty: 0,
    used_qty: 6,
    damaged_qty: 0,
    return_qty: 0,
    issued_to: 'Bricklaying Gang 1',
    equipment_condition: 'good',
    remarks: 'Issued for exterior AAC block wall construction',
    created_by: 'usr-sk-04',
    created_by_name: 'Manoj Kumar',
    created_by_role: 'storekeeper',
    approval_status: 'approved',
    created_at: new Date('2026-10-08T15:00:00Z').toISOString()
  },
  {
    id: 'gtx-rsu-011',
    company_id: 'comp-apex-01',
    project_id: 'proj-skyline-01',
    location_id: 'loc-skyline-main',
    location_name: 'Main Site Cement Yard',
    category: 'regular_site_use',
    item_name: 'Spade (Para) – Big',
    subcategory: 'Hand Tools & Masonry Tools',
    unit: 'Nos',
    transaction_date: '2026-10-04',
    transaction_type: 'receipt',
    quantity: 15,
    received_qty: 15,
    used_qty: 0,
    damaged_qty: 0,
    return_qty: 0,
    supplier_name: 'Apex Tools Corporation',
    invoice_number: 'ATC-891',
    remarks: 'Heavy-duty steel batching spades with hardwood shafts',
    created_by: 'usr-sk-04',
    created_by_name: 'Manoj Kumar',
    created_by_role: 'storekeeper',
    approval_status: 'approved',
    created_at: new Date('2026-10-04T10:00:00Z').toISOString()
  },
  {
    id: 'gtx-rsu-012',
    company_id: 'comp-apex-01',
    project_id: 'proj-skyline-01',
    location_id: 'loc-skyline-main',
    location_name: 'Main Site Cement Yard',
    category: 'regular_site_use',
    item_name: 'Spade (Para) – Big',
    subcategory: 'Hand Tools & Masonry Tools',
    unit: 'Nos',
    transaction_date: '2026-10-07',
    transaction_type: 'issue',
    quantity: 5,
    received_qty: 0,
    used_qty: 5,
    damaged_qty: 0,
    return_qty: 0,
    issued_to: 'Sand & Aggregate Batching Crew',
    equipment_condition: 'good',
    remarks: 'Issued for mixer hopper feeding',
    created_by: 'usr-sk-04',
    created_by_name: 'Manoj Kumar',
    created_by_role: 'storekeeper',
    approval_status: 'approved',
    created_at: new Date('2026-10-07T12:00:00Z').toISOString()
  },
  // Safety Items & Workwear
  {
    id: 'gtx-rsu-013',
    company_id: 'comp-apex-01',
    project_id: 'proj-skyline-01',
    location_id: 'loc-skyline-main',
    location_name: 'Main Site Cement Yard',
    category: 'regular_site_use',
    item_name: 'Orange Helmets',
    subcategory: 'Safety Items & Workwear',
    unit: 'Nos',
    transaction_date: '2026-10-03',
    transaction_type: 'receipt',
    quantity: 50,
    received_qty: 50,
    used_qty: 0,
    damaged_qty: 0,
    return_qty: 0,
    supplier_name: 'Karam Industrial Safety Equipment',
    invoice_number: 'INV-SAFE-332',
    remarks: 'High-visibility orange helmets with ISI mark and chin straps',
    created_by: 'usr-sk-04',
    created_by_name: 'Manoj Kumar',
    created_by_role: 'storekeeper',
    approval_status: 'approved',
    created_at: new Date('2026-10-03T10:00:00Z').toISOString()
  },
  {
    id: 'gtx-rsu-014',
    company_id: 'comp-apex-01',
    project_id: 'proj-skyline-01',
    location_id: 'loc-skyline-main',
    location_name: 'Main Site Cement Yard',
    category: 'regular_site_use',
    item_name: 'Orange Helmets',
    subcategory: 'Safety Items & Workwear',
    unit: 'Nos',
    transaction_date: '2026-10-06',
    transaction_type: 'issue',
    quantity: 25,
    received_qty: 0,
    used_qty: 25,
    damaged_qty: 0,
    return_qty: 0,
    issued_to: 'General Site Labor Force',
    equipment_condition: 'good',
    remarks: 'Mandatory PPE distribution for basement concrete batching',
    created_by: 'usr-sk-04',
    created_by_name: 'Manoj Kumar',
    created_by_role: 'storekeeper',
    approval_status: 'approved',
    created_at: new Date('2026-10-06T08:30:00Z').toISOString()
  },
  {
    id: 'gtx-rsu-015',
    company_id: 'comp-apex-01',
    project_id: 'proj-skyline-01',
    location_id: 'loc-skyline-main',
    location_name: 'Main Site Cement Yard',
    category: 'regular_site_use',
    item_name: 'White Helmets',
    subcategory: 'Safety Items & Workwear',
    unit: 'Nos',
    transaction_date: '2026-10-03',
    transaction_type: 'receipt',
    quantity: 20,
    received_qty: 20,
    used_qty: 0,
    damaged_qty: 0,
    return_qty: 0,
    supplier_name: 'Karam Industrial Safety Equipment',
    invoice_number: 'INV-SAFE-332',
    remarks: 'Engineers, supervisors and visitor white helmets',
    created_by: 'usr-sk-04',
    created_by_name: 'Manoj Kumar',
    created_by_role: 'storekeeper',
    approval_status: 'approved',
    created_at: new Date('2026-10-03T10:00:00Z').toISOString()
  },
  {
    id: 'gtx-rsu-016',
    company_id: 'comp-apex-01',
    project_id: 'proj-skyline-01',
    location_id: 'loc-skyline-main',
    location_name: 'Main Site Cement Yard',
    category: 'regular_site_use',
    item_name: 'White Helmets',
    subcategory: 'Safety Items & Workwear',
    unit: 'Nos',
    transaction_date: '2026-10-06',
    transaction_type: 'issue',
    quantity: 8,
    received_qty: 0,
    used_qty: 8,
    damaged_qty: 0,
    return_qty: 0,
    issued_to: 'Site Engineering Staff & MEP Inspectors',
    equipment_condition: 'good',
    remarks: 'Assigned to site engineers and client inspection reps',
    created_by: 'usr-sk-04',
    created_by_name: 'Manoj Kumar',
    created_by_role: 'storekeeper',
    approval_status: 'approved',
    created_at: new Date('2026-10-06T08:45:00Z').toISOString()
  },
  {
    id: 'gtx-rsu-017',
    company_id: 'comp-apex-01',
    project_id: 'proj-skyline-01',
    location_id: 'loc-skyline-main',
    location_name: 'Main Site Cement Yard',
    category: 'regular_site_use',
    item_name: 'Orange Jackets',
    subcategory: 'Safety Items & Workwear',
    unit: 'Nos',
    transaction_date: '2026-10-03',
    transaction_type: 'receipt',
    quantity: 50,
    received_qty: 50,
    used_qty: 0,
    damaged_qty: 0,
    return_qty: 0,
    supplier_name: 'Karam Industrial Safety Equipment',
    invoice_number: 'INV-SAFE-332',
    remarks: 'Fluorescent orange reflective safety vests with reflective tape',
    created_by: 'usr-sk-04',
    created_by_name: 'Manoj Kumar',
    created_by_role: 'storekeeper',
    approval_status: 'approved',
    created_at: new Date('2026-10-03T10:00:00Z').toISOString()
  },
  {
    id: 'gtx-rsu-018',
    company_id: 'comp-apex-01',
    project_id: 'proj-skyline-01',
    location_id: 'loc-skyline-main',
    location_name: 'Main Site Cement Yard',
    category: 'regular_site_use',
    item_name: 'Orange Jackets',
    subcategory: 'Safety Items & Workwear',
    unit: 'Nos',
    transaction_date: '2026-10-06',
    transaction_type: 'issue',
    quantity: 25,
    received_qty: 0,
    used_qty: 25,
    damaged_qty: 0,
    return_qty: 0,
    issued_to: 'Ground Excavation Gang',
    equipment_condition: 'good',
    remarks: 'Night shift high-visibility vests',
    created_by: 'usr-sk-04',
    created_by_name: 'Manoj Kumar',
    created_by_role: 'storekeeper',
    approval_status: 'approved',
    created_at: new Date('2026-10-06T09:00:00Z').toISOString()
  },
  // Electrical Accessories
  {
    id: 'gtx-rsu-019',
    company_id: 'comp-apex-01',
    project_id: 'proj-skyline-01',
    location_id: 'loc-skyline-main',
    location_name: 'Main Site Cement Yard',
    category: 'regular_site_use',
    item_name: 'Power Sockets',
    subcategory: 'Electrical Accessories',
    unit: 'Nos',
    transaction_date: '2026-10-04',
    transaction_type: 'receipt',
    quantity: 30,
    received_qty: 30,
    used_qty: 0,
    damaged_qty: 0,
    return_qty: 0,
    supplier_name: 'Havells / Anchor Electrical Distributors',
    invoice_number: 'EL-9902',
    remarks: '16A / 6A multi-pin industrial temporary distribution sockets',
    created_by: 'usr-sk-04',
    created_by_name: 'Manoj Kumar',
    created_by_role: 'storekeeper',
    approval_status: 'approved',
    created_at: new Date('2026-10-04T12:00:00Z').toISOString()
  },
  {
    id: 'gtx-rsu-020',
    company_id: 'comp-apex-01',
    project_id: 'proj-skyline-01',
    location_id: 'loc-skyline-main',
    location_name: 'Main Site Cement Yard',
    category: 'regular_site_use',
    item_name: 'Electrical Tape',
    subcategory: 'Electrical Accessories',
    unit: 'Rolls',
    transaction_date: '2026-10-04',
    transaction_type: 'receipt',
    quantity: 40,
    received_qty: 40,
    used_qty: 0,
    damaged_qty: 0,
    return_qty: 0,
    supplier_name: 'Havells / Anchor Electrical Distributors',
    invoice_number: 'EL-9902',
    remarks: 'Flame retardant PVC electrical tape rolls (Black & Red)',
    created_by: 'usr-sk-04',
    created_by_name: 'Manoj Kumar',
    created_by_role: 'storekeeper',
    approval_status: 'approved',
    created_at: new Date('2026-10-04T12:00:00Z').toISOString()
  },
  // Site Equipment & Other Supplies
  {
    id: 'gtx-rsu-021',
    company_id: 'comp-apex-01',
    project_id: 'proj-skyline-01',
    location_id: 'loc-skyline-main',
    location_name: 'Main Site Cement Yard',
    category: 'regular_site_use',
    item_name: 'Ladders',
    subcategory: 'Site Equipment & Other Supplies',
    unit: 'Nos',
    transaction_date: '2026-10-02',
    transaction_type: 'receipt',
    quantity: 6,
    received_qty: 6,
    used_qty: 0,
    damaged_qty: 0,
    return_qty: 0,
    supplier_name: 'Metro Scaffolding & Ladder Works',
    invoice_number: 'MSL-101',
    remarks: 'Heavy-duty 10-step aluminium A-type self-supporting ladders',
    created_by: 'usr-sk-04',
    created_by_name: 'Manoj Kumar',
    created_by_role: 'storekeeper',
    approval_status: 'approved',
    created_at: new Date('2026-10-02T10:00:00Z').toISOString()
  },
  {
    id: 'gtx-rsu-022',
    company_id: 'comp-apex-01',
    project_id: 'proj-skyline-01',
    location_id: 'loc-skyline-main',
    location_name: 'Main Site Cement Yard',
    category: 'regular_site_use',
    item_name: 'Ladders',
    subcategory: 'Site Equipment & Other Supplies',
    unit: 'Nos',
    transaction_date: '2026-10-06',
    transaction_type: 'issue',
    quantity: 2,
    received_qty: 0,
    used_qty: 2,
    damaged_qty: 0,
    return_qty: 0,
    issued_to: 'Electrical Subcontractor Gang',
    equipment_condition: 'good',
    remarks: 'Issued for overhead cable tray installation in parking bay',
    created_by: 'usr-sk-04',
    created_by_name: 'Manoj Kumar',
    created_by_role: 'storekeeper',
    approval_status: 'approved',
    created_at: new Date('2026-10-06T11:00:00Z').toISOString()
  },
  // Painting Supplies
  {
    id: 'gtx-rsu-023',
    company_id: 'comp-apex-01',
    project_id: 'proj-skyline-01',
    location_id: 'loc-skyline-main',
    location_name: 'Main Site Cement Yard',
    category: 'regular_site_use',
    item_name: 'Paint Brushes',
    subcategory: 'Painting Supplies',
    unit: 'Nos',
    transaction_date: '2026-10-07',
    transaction_type: 'receipt',
    quantity: 30,
    received_qty: 30,
    used_qty: 0,
    damaged_qty: 0,
    return_qty: 0,
    supplier_name: 'Asian Paints Authorized Site Dealer',
    invoice_number: 'AP-5521',
    remarks: '2-inch, 3-inch, and 4-inch brush set for primer and touch-ups',
    created_by: 'usr-sk-04',
    created_by_name: 'Manoj Kumar',
    created_by_role: 'storekeeper',
    approval_status: 'approved',
    created_at: new Date('2026-10-07T14:00:00Z').toISOString()
  },
  {
    id: 'gtx-rsu-024',
    company_id: 'comp-apex-01',
    project_id: 'proj-skyline-01',
    location_id: 'loc-skyline-main',
    location_name: 'Main Site Cement Yard',
    category: 'regular_site_use',
    item_name: 'Paint Brushes',
    subcategory: 'Painting Supplies',
    unit: 'Nos',
    transaction_date: '2026-10-09',
    transaction_type: 'usage',
    quantity: 10,
    received_qty: 0,
    used_qty: 10,
    damaged_qty: 0,
    return_qty: 0,
    remarks: 'Issued to painters for boundary wall metal primer coat',
    created_by: 'usr-se-03',
    created_by_name: 'Ananya Rao',
    created_by_role: 'site_engineer',
    approval_status: 'approved',
    created_at: new Date('2026-10-09T16:00:00Z').toISOString()
  }
];

class DataService {
  private supabase: SupabaseClient | null = null;
  private config: SupabaseConfig = {
    url: '',
    anonKey: '',
    isConnected: false
  };

  private currentUser: UserProfile = PRESET_USERS.admin;
  private cloudStateSyncTimer: ReturnType<typeof setTimeout> | null = null;
  private isRestoringCloudState = false;
  private storageSyncInstalled = false;

  constructor() {
    this.initSupabaseClient();
    this.initCurrentUser();
    this.seedDefaultDataIfEmpty();
  }

  // ==========================================
  // CONFIG & CONNECTION MANAGEMENT
  // ==========================================
  private initSupabaseClient() {
    // Check env vars first, then localStorage
    const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
    const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

    let storedConfig: Partial<SupabaseConfig> = {};
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SUPABASE_CONFIG);
      if (saved) storedConfig = JSON.parse(saved);
    } catch (e) {
      console.warn('Could not read stored Supabase config', e);
    }

    const url = envUrl || storedConfig.url || '';
    const anonKey = envKey || storedConfig.anonKey || '';

    this.config = {
      url,
      anonKey,
      isConnected: false,
      lastChecked: storedConfig.lastChecked,
      error: storedConfig.error
    };

    if (url && anonKey) {
      this.installCloudStateSync();
      try {
        this.supabase = createClient(url, anonKey);
        this.checkLiveConnection();
      } catch (err: any) {
        console.error('Failed to instantiate Supabase client', err);
        this.config.error = err.message || 'Invalid Supabase credentials';
      }
    }
  }

  public async checkLiveConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.config.url || !this.config.anonKey) {
      this.config.isConnected = false;
      return { success: false, message: 'Supabase credentials not configured yet.' };
    }

    try {
      if (!this.supabase) {
        this.supabase = createClient(this.config.url, this.config.anonKey);
      }
      
      // Probe table or auth health check
      const { data, error } = await this.supabase.from('companies').select('id').limit(1);

      if (error && error.code !== 'PGRST116') {
        // Even if table doesn't exist yet, we check error code
        const isConnected = !error.message.includes('FetchError') && !error.message.includes('network');
        this.config.isConnected = isConnected;
        this.config.lastChecked = new Date().toISOString();
        if (!isConnected) {
          this.config.error = error.message;
          return { success: false, message: `Connection failed: ${error.message}` };
        }
      }

      this.config.isConnected = true;
      this.config.lastChecked = new Date().toISOString();
      this.config.error = undefined;
      this.saveConfigToStorage();
      return { success: true, message: 'Successfully connected to Supabase PostgreSQL!' };
    } catch (err: any) {
      this.config.isConnected = false;
      this.config.error = err.message || 'Unknown network error';
      this.saveConfigToStorage();
      return { success: false, message: `Connection test failed: ${err.message}` };
    }
  }

  public saveConfig(url: string, anonKey: string): Promise<{ success: boolean; message: string }> {
    this.config.url = url.trim();
    this.config.anonKey = anonKey.trim();
    this.saveConfigToStorage();

    if (this.config.url && this.config.anonKey) {
      this.supabase = createClient(this.config.url, this.config.anonKey);
      return this.checkLiveConnection();
    } else {
      this.supabase = null;
      this.config.isConnected = false;
      return Promise.resolve({ success: false, message: 'Cleared Supabase configuration.' });
    }
  }

  private saveConfigToStorage() {
    try {
      localStorage.setItem(STORAGE_KEYS.SUPABASE_CONFIG, JSON.stringify(this.config));
    } catch (e) {
      console.warn('Failed to save config to localStorage', e);
    }
  }

  public getConfig(): SupabaseConfig {
    return { ...this.config };
  }

  public isCloudConnected(): boolean {
    return this.config.isConnected;
  }

  /**
   * Signs the current browser into Supabase Auth so RLS policies can identify
   * the user that is reading or writing shared company data.
   */
  public async signInWithSupabase(email: string, password: string): Promise<UserProfile> {
    if (!this.supabase || !this.config.isConnected) {
      throw new Error('Supabase is not connected. Configure the cloud database first.');
    }

    const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      throw new Error(error?.message || 'Supabase authentication failed.');
    }

    const { data: profile, error: profileError } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError || !profile) {
      await this.supabase.auth.signOut();
      throw new Error(profileError?.message || 'No Supabase profile exists for this user.');
    }

    const cloudUser: UserProfile = {
      id: profile.id,
      auth_uid: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      role: profile.role,
      role_title: profile.role_title || 'Team Member',
      company_id: profile.company_id,
      avatar_url: profile.avatar_url,
      phone: profile.phone,
      status: 'active'
    };

    this.currentUser = cloudUser;
    await this.syncCloudState();
    return cloudUser;
  }

  public async signOutFromSupabase(): Promise<void> {
    if (this.supabase) {
      await this.supabase.auth.signOut();
    }
  }

  /** Shared state bridge for modules that still use localStorage internally. */
  private getCloudStateSnapshot(): Record<string, string> {
    const excluded = new Set([
      STORAGE_KEYS.SUPABASE_CONFIG,
      STORAGE_KEYS.CURRENT_USER_ROLE,
      'buildpulse_auth_accounts_v1',
      'buildpulse_auth_session_v1'
    ]);
    const state: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('buildpulse_') && !excluded.has(key)) {
        const value = localStorage.getItem(key);
        if (value !== null) state[key] = value;
      }
    }
    return state;
  }

  private installCloudStateSync(): void {
    if (this.storageSyncInstalled || typeof window === 'undefined') return;
    this.storageSyncInstalled = true;
    const storage = window.localStorage;
    const originalSetItem = storage.setItem.bind(storage);
    storage.setItem = (key: string, value: string) => {
      originalSetItem(key, value);
      if (!this.isRestoringCloudState && key.startsWith('buildpulse_')) {
        this.queueCloudStateSync();
      }
    };
  }

  private queueCloudStateSync(): void {
    if (!this.supabase || !this.config.isConnected || this.isRestoringCloudState) return;
    if (this.cloudStateSyncTimer) clearTimeout(this.cloudStateSyncTimer);
    this.cloudStateSyncTimer = setTimeout(() => {
      void this.pushCloudState();
    }, 500);
  }

  private async pushCloudState(): Promise<void> {
    if (!this.supabase || !this.config.isConnected || !this.currentUser.company_id) return;
    const { error } = await this.supabase.from('app_state').upsert({
      company_id: this.currentUser.company_id,
      state: this.getCloudStateSnapshot(),
      updated_at: new Date().toISOString()
    }, { onConflict: 'company_id' });
    if (error) console.error('Cloud state sync failed:', error.message);
  }

  public async syncCloudState(): Promise<void> {
    if (!this.supabase || !this.config.isConnected || !this.currentUser.company_id) return;
    this.installCloudStateSync();
    const { data, error } = await this.supabase
      .from('app_state')
      .select('state')
      .eq('company_id', this.currentUser.company_id)
      .maybeSingle();
    if (error) throw new Error(`Cloud state read failed: ${error.message}`);

    if (data?.state && Object.keys(data.state).length > 0) {
      this.isRestoringCloudState = true;
      try {
        Object.entries(data.state as Record<string, string>).forEach(([key, value]) => {
          localStorage.setItem(key, value);
        });
      } finally {
        this.isRestoringCloudState = false;
      }
    } else {
      await this.pushCloudState();
    }
  }

  /** Persist the current local collection snapshot immediately. */
  public async persistCloudState(): Promise<void> {
    await this.pushCloudState();
  }

  // ==========================================
  // AUTH & ROLES
  // ==========================================
  private initCurrentUser() {
    try {
      const savedRole = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ROLE) as UserRole;
      if (savedRole && PRESET_USERS[savedRole]) {
        this.currentUser = PRESET_USERS[savedRole];
      } else {
        this.currentUser = PRESET_USERS.admin;
      }
    } catch (e) {
      this.currentUser = PRESET_USERS.admin;
    }
  }

  public getCurrentUser(): UserProfile {
    return { ...this.currentUser };
  }

  public setCurrentUser(user: UserProfile): UserProfile {
    this.currentUser = { ...user };
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ROLE, user.role);
    } catch (e) {}
    return this.getCurrentUser();
  }

  public switchRole(role: UserRole): UserProfile {
    if (PRESET_USERS[role]) {
      this.currentUser = PRESET_USERS[role];
      try {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ROLE, role);
      } catch (e) {}
    }
    return this.getCurrentUser();
  }

  // ==========================================
  // SEEDING DEFAULT DATA FOR IMMEDIATE TESTING
  // ==========================================
  private seedDefaultDataIfEmpty() {
    // Business/demo records are intentionally not seeded in the application.
    // Required catalog defaults remain available through their respective
    // getters, while projects, locations, and ledgers start empty for a new
    // local installation. Existing stored data is left untouched.
    return;

    /* Legacy demo seed data retained below for historical reference only.
       It is unreachable and must not be re-enabled in production. */
    /*
    try {
      if (!localStorage.getItem(STORAGE_KEYS.COMPANY)) {
        const defaultCompany: Company = {
          id: 'comp-apex-01',
          name: 'CHEN INFRA',
          code: 'CHEN',
          address: 'Plot 42, Outer Ring Road, Tech Corridor, Bengaluru, KA 560103',
          gstin: '29AAACA1234F1Z8',
          created_at: new Date('2026-01-10').toISOString(),
          updated_at: new Date().toISOString()
        };
        localStorage.setItem(STORAGE_KEYS.COMPANY, JSON.stringify(defaultCompany));
      }

      if (!localStorage.getItem(STORAGE_KEYS.CEMENT_BRANDS)) {
        const defaultBrands: CementBrand[] = INITIAL_CEMENT_BRANDS.map(b => ({
          id: b.id,
          company_id: 'comp-apex-01',
          brand_name: b.name,
          code: b.code,
          is_active: true,
          display_order: b.order
        }));
        localStorage.setItem(STORAGE_KEYS.CEMENT_BRANDS, JSON.stringify(defaultBrands));
      }

      if (!localStorage.getItem(STORAGE_KEYS.PROJECTS)) {
        const initialProjects: Project[] = [
          {
            id: 'proj-skyline-01',
            company_id: 'comp-apex-01',
            name: 'Skyline Commercial Tower - Phase 1',
            code: 'PRJ-2026-001',
            client_name: 'Brigade Prestige Realty Group',
            address: 'Survey No. 88, Financial District',
            location: 'Hyderabad, Telangana',
            description: 'G+24 high-rise commercial office complex with multi-tier underground parking and RCC core wall system.',
            start_date: '2026-01-15',
            expected_completion_date: '2027-08-30',
            project_manager_id: 'usr-pm-02',
            project_manager_name: 'Vikram Patel',
            status: 'in_progress',
            created_by: 'usr-admin-01',
            created_by_name: 'Rajesh Sharma',
            created_at: new Date('2026-01-15T09:00:00Z').toISOString(),
            updated_at: new Date('2026-01-15T09:00:00Z').toISOString()
          },
          {
            id: 'proj-emerald-02',
            company_id: 'comp-apex-01',
            name: 'Emerald Bay Luxury Enclave',
            code: 'PRJ-2026-002',
            client_name: 'Godrej Coastal Ventures',
            address: 'Beach Front Road, Sector 4',
            location: 'Visakhapatnam, Andhra Pradesh',
            description: 'Premium beachfront villas and luxury clubhouse featuring weather-resistant marine concrete.',
            start_date: '2026-02-01',
            expected_completion_date: '2027-03-31',
            project_manager_id: 'usr-pm-02',
            project_manager_name: 'Vikram Patel',
            status: 'in_progress',
            created_by: 'usr-admin-01',
            created_by_name: 'Rajesh Sharma',
            created_at: new Date('2026-02-01T10:00:00Z').toISOString(),
            updated_at: new Date('2026-02-01T10:00:00Z').toISOString()
          },
          {
            id: 'proj-metro-03',
            company_id: 'comp-apex-01',
            name: 'Metro Viaduct Pillar Reinforcement',
            code: 'PRJ-2025-089',
            client_name: 'Urban Transport Corporation',
            address: 'Pillar #120 to #180, North Corridor',
            location: 'Bengaluru, Karnataka',
            description: 'Structural retrofitting and viaduct pier encasing with micro-concrete and high-grade OPC cement.',
            start_date: '2025-06-01',
            expected_completion_date: '2026-02-15',
            actual_completion_date: '2026-02-12',
            project_manager_id: 'usr-pm-02',
            project_manager_name: 'Vikram Patel',
            status: 'completed',
            created_by: 'usr-admin-01',
            created_by_name: 'Rajesh Sharma',
            created_at: new Date('2025-06-01T08:00:00Z').toISOString(),
            updated_at: new Date('2026-02-12T17:30:00Z').toISOString(),
            completed_at: new Date('2026-02-12T17:30:00Z').toISOString(),
            completed_by: 'usr-admin-01'
          }
        ];
        localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(initialProjects));
      }

      if (!localStorage.getItem(STORAGE_KEYS.LOCATIONS)) {
        const initialLocations: MaterialLocation[] = [
          {
            id: 'loc-skyline-main',
            company_id: 'comp-apex-01',
            project_id: 'proj-skyline-01',
            name: 'Main Site Cement Yard',
            code: 'LOC-SKY-01',
            description: 'Covered raised platform near Batching Plant 1'
          },
          {
            id: 'loc-skyline-silo',
            company_id: 'comp-apex-01',
            project_id: 'proj-skyline-01',
            name: 'Tower A Basement Shed',
            code: 'LOC-SKY-02',
            description: 'Moisture-sealed basement storage'
          },
          {
            id: 'loc-emerald-yard',
            company_id: 'comp-apex-01',
            project_id: 'proj-emerald-02',
            name: 'Central Warehouse Shed B',
            code: 'LOC-EME-01',
            description: 'Main material storehouse with forklift ramp'
          }
        ];
        localStorage.setItem(STORAGE_KEYS.LOCATIONS, JSON.stringify(initialLocations));
      }

      if (!localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)) {
        // Initial sample transactions matching the test workflow:
        // Receipt of 100 bags of UltraTech
        // Usage of 25 bags
        // Damage of 3 bags
        // Result: 72 bags available!
        const initialTx: MaterialTransaction[] = [
          {
            id: 'tx-001',
            company_id: 'comp-apex-01',
            project_id: 'proj-skyline-01',
            location_id: 'loc-skyline-main',
            location_name: 'Main Site Cement Yard',
            category: 'cement',
            brand_id: 'brand-2', // UltraTech
            brand_name: 'UltraTech Cement',
            transaction_date: '2026-10-10',
            transaction_type: 'receipt',
            quantity_bags: 100,
            received_qty: 100,
            used_qty: 0,
            damaged_qty: 0,
            supplier_name: 'Balaji Building Supplies Ltd.',
            invoice_number: 'INV-2026-9811',
            challan_number: 'DC-BLR-4019',
            remarks: '53-grade OPC cement batch. Moisture test verified clean upon delivery.',
            created_by: 'usr-sk-04',
            created_by_name: 'Manoj Kumar',
            created_by_role: 'storekeeper',
            approval_status: 'approved',
            created_at: new Date('2026-10-10T09:30:00Z').toISOString(),
            updated_at: new Date('2026-10-10T09:30:00Z').toISOString()
          },
          {
            id: 'tx-002',
            company_id: 'comp-apex-01',
            project_id: 'proj-skyline-01',
            location_id: 'loc-skyline-main',
            location_name: 'Main Site Cement Yard',
            category: 'cement',
            brand_id: 'brand-2',
            brand_name: 'UltraTech Cement',
            transaction_date: '2026-10-12',
            transaction_type: 'usage',
            quantity_bags: 25,
            received_qty: 0,
            used_qty: 25,
            damaged_qty: 0,
            supplier_name: '',
            invoice_number: '',
            challan_number: 'REQ-SLAB-P1',
            remarks: 'Issued for 3rd floor column pouring and shear wall grid C.',
            created_by: 'usr-se-03',
            created_by_name: 'Ananya Rao',
            created_by_role: 'site_engineer',
            approval_status: 'approved',
            created_at: new Date('2026-10-12T14:15:00Z').toISOString(),
            updated_at: new Date('2026-10-12T14:15:00Z').toISOString()
          },
          {
            id: 'tx-003',
            company_id: 'comp-apex-01',
            project_id: 'proj-skyline-01',
            location_id: 'loc-skyline-main',
            location_name: 'Main Site Cement Yard',
            category: 'cement',
            brand_id: 'brand-2',
            brand_name: 'UltraTech Cement',
            transaction_date: '2026-10-14',
            transaction_type: 'damage',
            quantity_bags: 3,
            received_qty: 0,
            used_qty: 0,
            damaged_qty: 3,
            supplier_name: '',
            invoice_number: '',
            challan_number: '',
            remarks: 'Heavy rain seepage at east tarp corner caused lump formation; bags deemed unserviceable.',
            created_by: 'usr-se-03',
            created_by_name: 'Ananya Rao',
            created_by_role: 'site_engineer',
            approval_status: 'approved',
            created_at: new Date('2026-10-14T11:00:00Z').toISOString(),
            updated_at: new Date('2026-10-14T11:00:00Z').toISOString()
          },
          {
            id: 'tx-004',
            company_id: 'comp-apex-01',
            project_id: 'proj-skyline-01',
            location_id: 'loc-skyline-silo',
            location_name: 'Tower A Basement Shed',
            category: 'cement',
            brand_id: 'brand-1', // Dalmia
            brand_name: 'Dalmia Bharat / Dalmia Cement',
            transaction_date: '2026-10-11',
            transaction_type: 'receipt',
            quantity_bags: 60,
            received_qty: 60,
            used_qty: 0,
            damaged_qty: 0,
            supplier_name: 'Dalmia Authorized Depot Hub',
            invoice_number: 'DAL-88741',
            challan_number: 'CH-DAL-990',
            remarks: 'PPC cement for internal wall masonry and plaster work.',
            created_by: 'usr-sk-04',
            created_by_name: 'Manoj Kumar',
            created_by_role: 'storekeeper',
            approval_status: 'approved',
            created_at: new Date('2026-10-11T16:00:00Z').toISOString(),
            updated_at: new Date('2026-10-11T16:00:00Z').toISOString()
          }
        ];
        localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(initialTx));
      }

      // Seed Material Categories & Custom Catalogs
      if (!localStorage.getItem(STORAGE_KEYS.CATEGORIES)) {
        localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(INITIAL_CATEGORIES));
      }

      if (!localStorage.getItem(STORAGE_KEYS.STEEL_BRANDS)) {
        localStorage.setItem(STORAGE_KEYS.STEEL_BRANDS, JSON.stringify(INITIAL_STEEL_BRANDS));
      }

      if (!localStorage.getItem(STORAGE_KEYS.STEEL_SIZES)) {
        localStorage.setItem(STORAGE_KEYS.STEEL_SIZES, JSON.stringify(INITIAL_STEEL_SIZES));
      }

      if (!localStorage.getItem(STORAGE_KEYS.SAND_TYPES)) {
        localStorage.setItem(STORAGE_KEYS.SAND_TYPES, JSON.stringify(INITIAL_SAND_TYPES));
      }

      if (!localStorage.getItem(STORAGE_KEYS.BRICK_TYPES)) {
        localStorage.setItem(STORAGE_KEYS.BRICK_TYPES, JSON.stringify(INITIAL_BRICKS_TYPES));
      }

      if (!localStorage.getItem(STORAGE_KEYS.AGGREGATE_SIZES)) {
        localStorage.setItem(STORAGE_KEYS.AGGREGATE_SIZES, JSON.stringify(INITIAL_AGGREGATE_SIZES));
      }

      if (!localStorage.getItem(STORAGE_KEYS.CATEGORY_ITEMS)) {
        const itemsList: MaterialItem[] = [];
        for (const [catKey, names] of Object.entries(INITIAL_ITEMS_BY_CATEGORY)) {
          const catDef = INITIAL_CATEGORIES.find(c => c.id === catKey);
          names.forEach((name, idx) => {
            itemsList.push({
              id: `item-${catKey}-${idx + 1}`,
              category_id: catKey,
              name,
              code: `${catKey.substring(0, 3).toUpperCase()}-${(idx + 1).toString().padStart(3, '0')}`,
              default_unit: catDef?.default_unit || 'Nos',
              supported_units: catDef?.allowed_units || ['Nos'],
              min_stock_alert: 5,
              is_reusable: catDef?.is_reusable || false
            });
          });
        }
        localStorage.setItem(STORAGE_KEYS.CATEGORY_ITEMS, JSON.stringify(itemsList));
      }

      // Seed Generic Transactions for Steel, Sand, Bricks, Aggregate, and Safety
      if (!localStorage.getItem(STORAGE_KEYS.GENERIC_TRANSACTIONS)) {
        const initialGenericTx: GenericMaterialTransaction[] = [
          // Steel transactions (Tata Tiscon 12mm)
          {
            id: 'gtx-stl-001',
            company_id: 'comp-apex-01',
            project_id: 'proj-skyline-01',
            location_id: 'loc-skyline-main',
            location_name: 'Main Site Cement Yard',
            category: 'steel',
            item_name: 'Tata Tiscon',
            brand_name: 'Tata Tiscon',
            diameter_or_size: '12 mm',
            unit: 'kg',
            transaction_date: '2026-10-08',
            transaction_type: 'receipt',
            quantity: 5000,
            received_qty: 5000,
            used_qty: 0,
            damaged_qty: 0,
            return_qty: 0,
            supplier_name: 'Tata Steel Authorized Stockist',
            invoice_number: 'INV-ST-881',
            challan_number: 'DC-ST-101',
            remarks: 'Fe 550D TMT Grade batch for 3rd floor slab beams',
            created_by: 'usr-sk-04',
            created_by_name: 'Manoj Kumar',
            created_by_role: 'storekeeper',
            approval_status: 'approved',
            running_balance: 5000,
            created_at: new Date('2026-10-08T10:00:00Z').toISOString(),
            updated_at: new Date('2026-10-08T10:00:00Z').toISOString()
          },
          {
            id: 'gtx-stl-002',
            company_id: 'comp-apex-01',
            project_id: 'proj-skyline-01',
            location_id: 'loc-skyline-main',
            location_name: 'Main Site Cement Yard',
            category: 'steel',
            item_name: 'Tata Tiscon',
            brand_name: 'Tata Tiscon',
            diameter_or_size: '12 mm',
            unit: 'kg',
            transaction_date: '2026-10-10',
            transaction_type: 'usage',
            quantity: 1200,
            received_qty: 0,
            used_qty: 1200,
            damaged_qty: 0,
            return_qty: 0,
            remarks: 'Cut and bent for beam grid B1-B8 reinforcement',
            created_by: 'usr-se-03',
            created_by_name: 'Ananya Rao',
            created_by_role: 'site_engineer',
            approval_status: 'approved',
            running_balance: 3800,
            created_at: new Date('2026-10-10T14:00:00Z').toISOString(),
            updated_at: new Date('2026-10-10T14:00:00Z').toISOString()
          },
          {
            id: 'gtx-stl-003',
            company_id: 'comp-apex-01',
            project_id: 'proj-skyline-01',
            location_id: 'loc-skyline-main',
            location_name: 'Main Site Cement Yard',
            category: 'steel',
            item_name: 'Tata Tiscon',
            brand_name: 'Tata Tiscon',
            diameter_or_size: '12 mm',
            unit: 'kg',
            transaction_date: '2026-10-12',
            transaction_type: 'damage',
            quantity: 50,
            received_qty: 0,
            used_qty: 0,
            damaged_qty: 50,
            return_qty: 0,
            remarks: 'Off-cut end scrap unusable for structural cages',
            created_by: 'usr-se-03',
            created_by_name: 'Ananya Rao',
            created_by_role: 'site_engineer',
            approval_status: 'approved',
            running_balance: 3750,
            created_at: new Date('2026-10-12T16:00:00Z').toISOString(),
            updated_at: new Date('2026-10-12T16:00:00Z').toISOString()
          },
          // Steel (JSW Neosteel 16mm)
          {
            id: 'gtx-stl-004',
            company_id: 'comp-apex-01',
            project_id: 'proj-skyline-01',
            location_id: 'loc-skyline-main',
            location_name: 'Main Site Cement Yard',
            category: 'steel',
            item_name: 'JSW Neosteel',
            brand_name: 'JSW Neosteel',
            diameter_or_size: '16 mm',
            unit: 'kg',
            transaction_date: '2026-10-09',
            transaction_type: 'receipt',
            quantity: 8000,
            received_qty: 8000,
            used_qty: 0,
            damaged_qty: 0,
            return_qty: 0,
            supplier_name: 'JSW Commercial Infra Supply',
            invoice_number: 'JSW-0992',
            challan_number: 'DC-JSW-77',
            remarks: 'Heavy column starter bars',
            created_by: 'usr-sk-04',
            created_by_name: 'Manoj Kumar',
            created_by_role: 'storekeeper',
            approval_status: 'approved',
            running_balance: 8000,
            created_at: new Date('2026-10-09T11:00:00Z').toISOString(),
            updated_at: new Date('2026-10-09T11:00:00Z').toISOString()
          },
          // Sand (River Sand)
          {
            id: 'gtx-snd-001',
            company_id: 'comp-apex-01',
            project_id: 'proj-skyline-01',
            location_id: 'loc-skyline-main',
            location_name: 'Main Site Cement Yard',
            category: 'sand',
            item_name: 'River Sand',
            unit: 'cft',
            transaction_date: '2026-10-07',
            transaction_type: 'receipt',
            quantity: 800,
            received_qty: 800,
            used_qty: 0,
            damaged_qty: 0,
            return_qty: 0,
            supplier_name: 'Cauvery River Sand Agency',
            invoice_number: 'SND-4410',
            challan_number: 'TRIP-881',
            remarks: 'Silt content tested < 4%, washed natural river sand',
            created_by: 'usr-sk-04',
            created_by_name: 'Manoj Kumar',
            created_by_role: 'storekeeper',
            approval_status: 'approved',
            running_balance: 800,
            created_at: new Date('2026-10-07T09:00:00Z').toISOString(),
            updated_at: new Date('2026-10-07T09:00:00Z').toISOString()
          },
          {
            id: 'gtx-snd-002',
            company_id: 'comp-apex-01',
            project_id: 'proj-skyline-01',
            location_id: 'loc-skyline-main',
            location_name: 'Main Site Cement Yard',
            category: 'sand',
            item_name: 'River Sand',
            unit: 'cft',
            transaction_date: '2026-10-11',
            transaction_type: 'usage',
            quantity: 250,
            received_qty: 0,
            used_qty: 250,
            damaged_qty: 0,
            return_qty: 0,
            remarks: 'Internal wall plaster batch 1:4 mix',
            created_by: 'usr-se-03',
            created_by_name: 'Ananya Rao',
            created_by_role: 'site_engineer',
            approval_status: 'approved',
            running_balance: 550,
            created_at: new Date('2026-10-11T15:00:00Z').toISOString(),
            updated_at: new Date('2026-10-11T15:00:00Z').toISOString()
          },
          // Bricks (Fly Ash Bricks)
          {
            id: 'gtx-brk-001',
            company_id: 'comp-apex-01',
            project_id: 'proj-skyline-01',
            location_id: 'loc-skyline-main',
            location_name: 'Main Site Cement Yard',
            category: 'bricks',
            item_name: 'Fly Ash Bricks',
            unit: 'Nos',
            transaction_date: '2026-10-06',
            transaction_type: 'receipt',
            quantity: 15000,
            received_qty: 15000,
            used_qty: 0,
            damaged_qty: 0,
            return_qty: 0,
            supplier_name: 'Sri Krishna Brick Kilns & AAC',
            invoice_number: 'BRK-9901',
            challan_number: 'DC-BRK-51',
            remarks: 'Class 10.0 compressive strength verified',
            created_by: 'usr-sk-04',
            created_by_name: 'Manoj Kumar',
            created_by_role: 'storekeeper',
            approval_status: 'approved',
            running_balance: 15000,
            created_at: new Date('2026-10-06T08:30:00Z').toISOString(),
            updated_at: new Date('2026-10-06T08:30:00Z').toISOString()
          },
          {
            id: 'gtx-brk-002',
            company_id: 'comp-apex-01',
            project_id: 'proj-skyline-01',
            location_id: 'loc-skyline-main',
            location_name: 'Main Site Cement Yard',
            category: 'bricks',
            item_name: 'Fly Ash Bricks',
            unit: 'Nos',
            transaction_date: '2026-10-13',
            transaction_type: 'usage',
            quantity: 4500,
            received_qty: 0,
            used_qty: 4500,
            damaged_qty: 0,
            return_qty: 0,
            remarks: 'Masonry partitions on 2nd floor flat 201-204',
            created_by: 'usr-se-03',
            created_by_name: 'Ananya Rao',
            created_by_role: 'site_engineer',
            approval_status: 'approved',
            running_balance: 10500,
            created_at: new Date('2026-10-13T17:00:00Z').toISOString(),
            updated_at: new Date('2026-10-13T17:00:00Z').toISOString()
          },
          // Aggregate (20 mm)
          {
            id: 'gtx-agg-001',
            company_id: 'comp-apex-01',
            project_id: 'proj-skyline-01',
            location_id: 'loc-skyline-main',
            location_name: 'Main Site Cement Yard',
            category: 'aggregate',
            item_name: '20 mm',
            diameter_or_size: '20 mm',
            unit: 'tonnes',
            transaction_date: '2026-10-08',
            transaction_type: 'receipt',
            quantity: 25,
            received_qty: 25,
            used_qty: 0,
            damaged_qty: 0,
            return_qty: 0,
            supplier_name: 'Hills Stone Crushers & Quarries',
            invoice_number: 'QY-221',
            challan_number: 'TRIP-AG-9',
            remarks: 'Crushed granite aggregate 20mm nominal',
            created_by: 'usr-sk-04',
            created_by_name: 'Manoj Kumar',
            created_by_role: 'storekeeper',
            approval_status: 'approved',
            running_balance: 25,
            created_at: new Date('2026-10-08T11:30:00Z').toISOString(),
            updated_at: new Date('2026-10-08T11:30:00Z').toISOString()
          },
          // Safety (Safety helmets)
          {
            id: 'gtx-sft-001',
            company_id: 'comp-apex-01',
            project_id: 'proj-skyline-01',
            location_id: 'loc-skyline-main',
            location_name: 'Main Site Cement Yard',
            category: 'safety_ppe',
            item_name: 'Safety helmets',
            unit: 'Nos',
            transaction_date: '2026-10-05',
            transaction_type: 'receipt',
            quantity: 100,
            received_qty: 100,
            used_qty: 0,
            damaged_qty: 0,
            return_qty: 0,
            supplier_name: 'Karam Industrial Safety Equipment',
            invoice_number: 'PPE-551',
            remarks: 'Yellow & white ISI marked construction safety helmets',
            created_by: 'usr-sk-04',
            created_by_name: 'Manoj Kumar',
            created_by_role: 'storekeeper',
            approval_status: 'approved',
            running_balance: 100,
            created_at: new Date('2026-10-05T10:00:00Z').toISOString(),
            updated_at: new Date('2026-10-05T10:00:00Z').toISOString()
          },
          {
            id: 'gtx-sft-002',
            company_id: 'comp-apex-01',
            project_id: 'proj-skyline-01',
            location_id: 'loc-skyline-main',
            location_name: 'Main Site Cement Yard',
            category: 'safety_ppe',
            item_name: 'Safety helmets',
            unit: 'Nos',
            transaction_date: '2026-10-10',
            transaction_type: 'usage',
            quantity: 45,
            received_qty: 0,
            used_qty: 45,
            damaged_qty: 0,
            return_qty: 0,
            remarks: 'Issued to Gang 1 Barbenders & Carpenters on shift',
            created_by: 'usr-sk-04',
            created_by_name: 'Manoj Kumar',
            created_by_role: 'storekeeper',
            approval_status: 'approved',
            running_balance: 55,
            created_at: new Date('2026-10-10T08:00:00Z').toISOString(),
            updated_at: new Date('2026-10-10T08:00:00Z').toISOString()
          }
        ];
        initialGenericTx.push(...INITIAL_REGULAR_SITE_USE_TRANSACTIONS);
        localStorage.setItem(STORAGE_KEYS.GENERIC_TRANSACTIONS, JSON.stringify(initialGenericTx));
      } else {
        // Ensure Regular Site-Use Materials initial transactions are present if category is newly loaded
        try {
          const currentRaw = localStorage.getItem(STORAGE_KEYS.GENERIC_TRANSACTIONS);
          if (currentRaw) {
            const currentTxs: GenericMaterialTransaction[] = JSON.parse(currentRaw);
            if (!currentTxs.some(t => t.category === 'regular_site_use')) {
              currentTxs.push(...INITIAL_REGULAR_SITE_USE_TRANSACTIONS);
              localStorage.setItem(STORAGE_KEYS.GENERIC_TRANSACTIONS, JSON.stringify(currentTxs));
            }
          }
        } catch (e) {}
      }
    } catch (e) {
      console.error('Error during data seeding', e);
    }
    */
  }

  // ==========================================
  // COMPANY OPERATIONS
  // ==========================================
  public async getCompany(): Promise<Company> {
    if (this.supabase && this.config.isConnected) {
      try {
        const { data, error } = await this.supabase.from('companies').select('*').limit(1).single();
        if (data && !error) return data;
      } catch (e) {}
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEYS.COMPANY);
      if (stored) return JSON.parse(stored);
    } catch (e) {}

    return {
      id: 'comp-apex-01',
      name: 'Apex Horizon Builders & Infrastructure',
      code: 'AHBI',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  public async updateCompanyName(newName: string): Promise<Company> {
    if (this.currentUser.role !== 'admin') {
      throw new Error('Only Company Administrators have permission to edit company details.');
    }

    const trimmed = newName.trim();
    if (!trimmed) throw new Error('Company name cannot be blank.');

    const company = await this.getCompany();
    const updated: Company = {
      ...company,
      name: trimmed,
      updated_at: new Date().toISOString()
    };

    if (this.supabase && this.config.isConnected) {
      try {
        await this.supabase.from('companies').update({ name: trimmed, updated_at: updated.updated_at }).eq('id', company.id);
      } catch (e) {}
    }

    localStorage.setItem(STORAGE_KEYS.COMPANY, JSON.stringify(updated));
    this.recordAuditLog('update_company_name', 'companies', company.id, { old: company.name, new: trimmed });
    return updated;
  }

  // ==========================================
  // PROJECT OPERATIONS
  // ==========================================
  public async getProjects(filter?: { status?: ProjectStatus | 'all'; search?: string }): Promise<Project[]> {
    let projects: Project[] = [];
    let cloudQuerySucceeded = false;

    if (this.supabase && this.config.isConnected) {
      try {
        let query = this.supabase.from('projects').select('*').order('created_at', { ascending: false });
        if (filter?.status && filter.status !== 'all') {
          query = query.eq('status', filter.status);
        }
        const { data, error } = await query;
        if (data && !error) {
          projects = data;
          cloudQuerySucceeded = true;
        }
      } catch (e) {}
    }

    if (projects.length === 0 && !cloudQuerySucceeded) {
      try {
        const stored = localStorage.getItem(STORAGE_KEYS.PROJECTS);
        projects = stored ? JSON.parse(stored) : [];
      } catch (e) {
        projects = [];
      }
    }

    // Apply client filters if any
    let result = projects;
    if (filter?.status && filter.status !== 'all') {
      result = result.filter(p => p.status === filter.status);
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase().trim();
      result = result.filter(
        p =>
          p.name.toLowerCase().includes(q) ||
          p.code.toLowerCase().includes(q) ||
          p.client_name.toLowerCase().includes(q) ||
          p.location.toLowerCase().includes(q) ||
          p.project_manager_name.toLowerCase().includes(q)
      );
    }

    return result;
  }

  public async getProjectById(id: string): Promise<Project | null> {
    const all = await this.getProjects();
    return all.find(p => p.id === id) || null;
  }

  public async createProject(projectInput: Omit<Project, 'id' | 'company_id' | 'created_by' | 'created_by_name' | 'created_at' | 'updated_at'>): Promise<Project> {
    // RBAC: Only Admin and Project Manager can create projects
    if (this.currentUser.role !== 'admin' && this.currentUser.role !== 'project_manager') {
      throw new Error('Access Denied: Only Company Administrators and Project Managers can create projects.');
    }

    // Validation
    if (!projectInput.name || !projectInput.name.trim()) {
      throw new Error('Project name is required.');
    }
    if (!projectInput.code || !projectInput.code.trim()) {
      throw new Error('Unique project code is required.');
    }
    if (!projectInput.start_date) {
      throw new Error('Start date is required.');
    }
    if (!projectInput.expected_completion_date) {
      throw new Error('Expected completion date is required.');
    }
    if (projectInput.expected_completion_date < projectInput.start_date) {
      throw new Error('Expected completion date cannot be earlier than start date.');
    }
    const today = getLocalDateString();
    const effectiveStatus = projectInput.status || 'in_progress';
    if (effectiveStatus === 'in_progress' && projectInput.start_date > today) {
      throw new Error("An ongoing project's start date cannot be in the future.");
    }
    if (effectiveStatus === 'planning' && projectInput.start_date < today) {
      throw new Error("A planning project's start date cannot be in the past.");
    }

    const company = await this.getCompany();
    const existing = await this.getProjects();

    // Check duplicate code
    const isDuplicate = existing.some(
      p => p.code.trim().toUpperCase() === projectInput.code.trim().toUpperCase()
    );
    if (isDuplicate) {
      throw new Error(`Project code "${projectInput.code.trim().toUpperCase()}" already exists in ${company.name}. Please enter a unique code.`);
    }

    const newProject: Project = {
      ...projectInput,
      id: generateUuid(),
      company_id: company.id,
      code: projectInput.code.trim().toUpperCase(),
      name: projectInput.name.trim(),
      client_name: projectInput.client_name.trim(),
      address: projectInput.address.trim(),
      location: projectInput.location.trim(),
      status: effectiveStatus,
      created_by: this.currentUser.id,
      created_by_name: this.currentUser.full_name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (this.supabase && this.config.isConnected) {
      try {
        const cloudProject = {
          ...newProject,
          project_manager_id: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(newProject.project_manager_id)
            ? newProject.project_manager_id
            : null
        };
        const { error } = await this.supabase.from('projects').insert([cloudProject]);
        if (error) {
          throw new Error(error.message);
        }
      } catch (err: any) {
        throw new Error(`Cloud project save failed: ${err.message}`);
      }
    }

    // Save in storage
    const updatedList = [newProject, ...existing];
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(updatedList));

    // Also automatically create a default material location for the new project
    await this.addMaterialLocation(newProject.id, 'Main Site Yard', 'LOC-01', 'Primary site staging & cement storage');

    this.recordAuditLog('create_project', 'projects', newProject.id, { name: newProject.name, code: newProject.code });
    return newProject;
  }

  public async updateProject(
    projectId: string,
    projectInput: Omit<Project, 'id' | 'company_id' | 'created_by' | 'created_by_name' | 'created_at' | 'updated_at' | 'completed_at' | 'completed_by' | 'actual_completion_date' | 'reopened_at' | 'reopened_by'>
  ): Promise<Project> {
    if (this.currentUser.role !== 'admin' && this.currentUser.role !== 'project_manager') {
      throw new Error('Access Denied: Only Company Administrators and Project Managers can edit projects.');
    }

    if (!projectInput.name || !projectInput.name.trim()) {
      throw new Error('Project name is required.');
    }
    if (!projectInput.code || !projectInput.code.trim()) {
      throw new Error('Unique project code is required.');
    }
    if (!projectInput.client_name || !projectInput.client_name.trim()) {
      throw new Error('Client or Customer name is required.');
    }
    if (!projectInput.location || !projectInput.location.trim()) {
      throw new Error('Location (City, State) is required.');
    }
    if (!projectInput.start_date) {
      throw new Error('Start date is required.');
    }
    if (!projectInput.expected_completion_date) {
      throw new Error('Expected completion date is required.');
    }
    if (projectInput.expected_completion_date < projectInput.start_date) {
      throw new Error('Expected completion date cannot be earlier than start date.');
    }
    const today = getLocalDateString();
    const effectiveStatus = projectInput.status || 'in_progress';
    if (effectiveStatus === 'in_progress' && projectInput.start_date > today) {
      throw new Error("An ongoing project's start date cannot be in the future.");
    }
    if (effectiveStatus === 'planning' && projectInput.start_date < today) {
      throw new Error("A planning project's start date cannot be in the past.");
    }

    const projects = await this.getProjects();
    const projectIndex = projects.findIndex(p => p.id === projectId);
    if (projectIndex === -1) throw new Error('Project not found.');

    const isDuplicateCode = projects.some(
      p => p.id !== projectId && p.code.trim().toUpperCase() === projectInput.code.trim().toUpperCase()
    );
    if (isDuplicateCode) {
      throw new Error(`Project code "${projectInput.code.trim().toUpperCase()}" already exists. Please enter a unique code.`);
    }

    const existing = projects[projectIndex];
    const updated: Project = {
      ...existing,
      ...projectInput,
      status: effectiveStatus,
      id: existing.id,
      company_id: existing.company_id,
      created_by: existing.created_by,
      created_by_name: existing.created_by_name,
      created_at: existing.created_at,
      code: projectInput.code.trim().toUpperCase(),
      name: projectInput.name.trim(),
      client_name: projectInput.client_name.trim(),
      address: projectInput.address.trim(),
      location: projectInput.location.trim(),
      description: projectInput.description.trim(),
      project_manager_name: projectInput.project_manager_name.trim(),
      updated_at: new Date().toISOString()
    };

    if (this.supabase && this.config.isConnected) {
      try {
        const cloudProject = {
          name: updated.name,
          code: updated.code,
          client_name: updated.client_name,
          address: updated.address,
          location: updated.location,
          description: updated.description,
          start_date: updated.start_date,
          expected_completion_date: updated.expected_completion_date,
          project_manager_id: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(updated.project_manager_id)
            ? updated.project_manager_id
            : null,
          status: updated.status,
          updated_at: updated.updated_at
        };
        const { error } = await this.supabase.from('projects').update(cloudProject).eq('id', projectId);
        if (error) throw new Error(error.message);
      } catch (err: any) {
        throw new Error(`Cloud project update failed: ${err.message}`);
      }
    }

    projects[projectIndex] = updated;
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
    this.recordAuditLog('update_project', 'projects', updated.id, {
      name: updated.name,
      code: updated.code
    });
    return updated;
  }

  public async markProjectCompleted(projectId: string): Promise<Project> {
    if (this.currentUser.role !== 'admin' && this.currentUser.role !== 'project_manager') {
      throw new Error('Access Denied: Only Administrators and Project Managers can mark a project as completed.');
    }

    const projects = await this.getProjects();
    const projectIndex = projects.findIndex(p => p.id === projectId);
    if (projectIndex === -1) throw new Error('Project not found.');

    const project = projects[projectIndex];
    if (project.status === 'completed') {
      return project;
    }

    const updated: Project = {
      ...project,
      status: 'completed',
      actual_completion_date: getLocalDateString(),
      completed_at: new Date().toISOString(),
      completed_by: this.currentUser.id,
      updated_at: new Date().toISOString()
    };

    if (this.supabase && this.config.isConnected) {
      try {
        await this.supabase.from('projects').update({
          status: 'completed',
          actual_completion_date: updated.actual_completion_date,
          completed_at: updated.completed_at,
          completed_by: updated.completed_by,
          updated_at: updated.updated_at
        }).eq('id', projectId);
      } catch (e) {}
    }

    projects[projectIndex] = updated;
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));

    this.recordAuditLog('mark_project_completed', 'projects', projectId, { project_name: project.name });
    return updated;
  }

  public async reopenProject(projectId: string, reason: string): Promise<Project> {
    // Only administrator can reopen a completed project
    if (this.currentUser.role !== 'admin') {
      throw new Error('Access Denied: Only Company Administrators are authorized to reopen a completed project.');
    }

    if (!reason || !reason.trim()) {
      throw new Error('Audit reason is required when reopening a completed project.');
    }

    const projects = await this.getProjects();
    const projectIndex = projects.findIndex(p => p.id === projectId);
    if (projectIndex === -1) throw new Error('Project not found.');

    const project = projects[projectIndex];
    const updated: Project = {
      ...project,
      status: 'in_progress',
      reopened_at: new Date().toISOString(),
      reopened_by: this.currentUser.id,
      updated_at: new Date().toISOString()
    };

    if (this.supabase && this.config.isConnected) {
      try {
        await this.supabase.from('projects').update({
          status: 'in_progress',
          reopened_at: updated.reopened_at,
          reopened_by: updated.reopened_by,
          updated_at: updated.updated_at
        }).eq('id', projectId);
      } catch (e) {}
    }

    projects[projectIndex] = updated;
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));

    this.recordAuditLog('reopen_project', 'projects', projectId, {
      project_name: project.name,
      reason: reason.trim(),
      reopened_by: this.currentUser.full_name
    });

    return updated;
  }

  // ==========================================
  // CEMENT BRANDS & LOCATIONS
  // ==========================================
  public async getCementBrands(): Promise<CementBrand[]> {
    if (this.supabase && this.config.isConnected) {
      const { data, error } = await this.supabase
        .from('cement_brands')
        .select('*')
        .order('display_order', { ascending: true });
      if (error) throw new Error(`Cloud brand read failed: ${error.message}`);
      if (data && data.length > 0) return data;

      const company = await this.getCompany();
      const cloudBrands: CementBrand[] = INITIAL_CEMENT_BRANDS.map(b => ({
        id: generateUuid(),
        company_id: company.id,
        brand_name: b.name,
        code: b.code,
        is_active: true,
        display_order: b.order
      }));
      const { error: seedError } = await this.supabase.from('cement_brands').insert(cloudBrands);
      if (seedError) throw new Error(`Cloud brand setup failed: ${seedError.message}`);
      return cloudBrands;
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CEMENT_BRANDS);
      if (stored) return JSON.parse(stored);
    } catch (e) {}

    return INITIAL_CEMENT_BRANDS.map(b => ({
      id: b.id,
      company_id: 'comp-apex-01',
      brand_name: b.name,
      code: b.code,
      is_active: true,
      display_order: b.order
    }));
  }

  public async addCementBrand(brandName: string): Promise<CementBrand> {
    if (this.currentUser.role !== 'admin') {
      throw new Error('Access Denied: Only Company Administrators can add new cement brands to master catalog.');
    }

    const trimmed = brandName.trim();
    if (!trimmed) throw new Error('Brand name cannot be empty.');

    const brands = await this.getCementBrands();
    if (brands.some(b => b.brand_name.toLowerCase() === trimmed.toLowerCase())) {
      throw new Error(`Cement brand "${trimmed}" already exists.`);
    }

    const newBrand: CementBrand = {
      id: generateUuid(),
      company_id: (await this.getCompany()).id,
      brand_name: trimmed,
      code: trimmed.substring(0, 6).toUpperCase().replace(/[^A-Z0-9]/g, ''),
      is_active: true,
      display_order: brands.length + 1
    };

    if (this.supabase && this.config.isConnected) {
      const { error } = await this.supabase.from('cement_brands').insert([newBrand]);
      if (error) throw new Error(`Cloud brand save failed: ${error.message}`);
    }

    const updatedList = [...brands, newBrand];
    localStorage.setItem(STORAGE_KEYS.CEMENT_BRANDS, JSON.stringify(updatedList));
    this.recordAuditLog('add_cement_brand', 'cement_brands', newBrand.id, { brand_name: trimmed });
    return newBrand;
  }

  public async getMaterialLocations(projectId: string): Promise<MaterialLocation[]> {
    if (this.supabase && this.config.isConnected) {
      const { data, error } = await this.supabase
        .from('material_locations')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });
      if (error) throw new Error(`Cloud location read failed: ${error.message}`);
      if (data) return data;
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEYS.LOCATIONS);
      const all: MaterialLocation[] = stored ? JSON.parse(stored) : [];
      return all.filter(l => l.project_id === projectId);
    } catch (e) {
      return [];
    }
  }

  public async addMaterialLocation(projectId: string, name: string, code?: string, description?: string): Promise<MaterialLocation> {
    const stored = localStorage.getItem(STORAGE_KEYS.LOCATIONS);
    const all: MaterialLocation[] = stored ? JSON.parse(stored) : [];

    const newLoc: MaterialLocation = {
      id: generateUuid(),
      company_id: (await this.getCompany()).id,
      project_id: projectId,
      name: name.trim(),
      code: code ? code.trim() : 'LOC-' + (all.length + 1).toString().padStart(2, '0'),
      description: description?.trim()
    };

    if (this.supabase && this.config.isConnected) {
      const { error } = await this.supabase.from('material_locations').insert([newLoc]);
      if (error) throw new Error(`Cloud location save failed: ${error.message}`);
    }

    all.push(newLoc);
    localStorage.setItem(STORAGE_KEYS.LOCATIONS, JSON.stringify(all));
    return newLoc;
  }

  // ==========================================
  // CEMENT MATERIAL TRANSACTIONS & STOCK LEDGER
  // ==========================================
  public async getCementTransactions(projectId: string, filters?: {
    brandId?: string;
    transactionType?: TransactionType | 'all';
    search?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<MaterialTransaction[]> {
    let transactions: MaterialTransaction[] = [];
    let cloudQuerySucceeded = false;

    if (this.supabase && this.config.isConnected) {
      try {
        let query = this.supabase
          .from('material_transactions')
          .select('*')
          .eq('project_id', projectId)
          .order('transaction_date', { ascending: false })
          .order('created_at', { ascending: false });

        if (filters?.brandId && filters.brandId !== 'all') {
          query = query.eq('brand_id', filters.brandId);
        }
        if (filters?.transactionType && filters.transactionType !== 'all') {
          query = query.eq('transaction_type', filters.transactionType);
        }
        const { data, error } = await query;
        if (data && !error) {
          transactions = data;
          cloudQuerySucceeded = true;
        }
      } catch (e) {
        throw e;
      }
    }

    if (transactions.length === 0 && !cloudQuerySucceeded) {
      try {
        const stored = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
        const all: MaterialTransaction[] = stored ? JSON.parse(stored) : [];
        transactions = all.filter(t => t.project_id === projectId);
      } catch (e) {
        transactions = [];
      }
    }

    // Apply filters
    let filtered = transactions;
    if (filters?.brandId && filters.brandId !== 'all') {
      filtered = filtered.filter(t => t.brand_id === filters.brandId);
    }
    if (filters?.transactionType && filters.transactionType !== 'all') {
      filtered = filtered.filter(t => t.transaction_type === filters.transactionType);
    }
    if (filters?.startDate) {
      filtered = filtered.filter(t => t.transaction_date >= filters.startDate!);
    }
    if (filters?.endDate) {
      filtered = filtered.filter(t => t.transaction_date <= filters.endDate!);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase().trim();
      filtered = filtered.filter(
        t =>
          t.brand_name.toLowerCase().includes(q) ||
          t.supplier_name?.toLowerCase().includes(q) ||
          t.invoice_number?.toLowerCase().includes(q) ||
          t.challan_number?.toLowerCase().includes(q) ||
          t.location_name.toLowerCase().includes(q) ||
          t.created_by_name.toLowerCase().includes(q) ||
          t.remarks?.toLowerCase().includes(q)
      );
    }

    // Sort descending by date, then created_at
    filtered.sort((a, b) => {
      const dateCmp = new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime();
      if (dateCmp !== 0) return dateCmp;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return filtered;
  }

  /**
   * Core Cloud Inventory Ledger Calculation:
   * Available stock = Opening stock + Total receipts + Valid returns - Total usage - Total damaged quantity - Other deductions
   * Calculated separately per brand to avoid mixing balances!
   */
  public async calculateCementStock(projectId: string): Promise<ProjectStockMetrics> {
    const brands = await this.getCementBrands();
    const stored = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    const all: MaterialTransaction[] = stored ? JSON.parse(stored) : [];
    const projectTransactions = all.filter(t => t.project_id === projectId && !t.is_reversal);

    let totalAvailableBags = 0;
    let totalReceivedBags = 0;
    let totalUsedBags = 0;
    let totalDamagedBags = 0;

    const brandSummaries: BrandStockSummary[] = brands.map(brand => {
      const brandTx = projectTransactions.filter(t => t.brand_id === brand.id);

      let opening = 0;
      let received = 0;
      let used = 0;
      let damaged = 0;
      let returns = 0;

      for (const tx of brandTx) {
        if (tx.transaction_type === 'opening_stock') {
          opening += tx.quantity_bags;
        } else if (tx.transaction_type === 'receipt') {
          received += (tx.received_qty || tx.quantity_bags);
        } else if (tx.transaction_type === 'usage') {
          used += (tx.used_qty || tx.quantity_bags);
        } else if (tx.transaction_type === 'damage') {
          damaged += (tx.damaged_qty || tx.quantity_bags);
        } else if (tx.transaction_type === 'return') {
          returns += tx.quantity_bags;
        }
      }

      // Available stock = Opening stock + Total receipts + Valid returns - Total usage - Total damaged quantity
      const available = opening + received - returns - used - damaged;

      totalAvailableBags += available;
      totalReceivedBags += received + opening;
      totalUsedBags += used;
      totalDamagedBags += damaged;

      return {
        brand_id: brand.id,
        brand_name: brand.brand_name,
        opening_stock: opening,
        total_received: received,
        total_used: used,
        total_damaged: damaged,
        total_returns: returns,
        available_stock: available
      };
    });

    const activeBrandsCount = brandSummaries.filter(b => b.available_stock > 0 || b.total_received > 0).length;

    return {
      projectId,
      totalAvailableBags,
      totalReceivedBags,
      totalUsedBags,
      totalDamagedBags,
      activeBrandsCount,
      brandSummaries
    };
  }

  public async recordCementTransaction(txInput: {
    projectId: string;
    locationId: string;
    locationName: string;
    brandId: string;
    brandName: string;
    transactionDate: string;
    transactionType: TransactionType;
    quantityBags: number;
    supplierName?: string;
    invoiceNumber?: string;
    challanNumber?: string;
    remarks?: string;
    attachmentUrl?: string;
    attachmentName?: string;
    attachmentSize?: number;
    attachments?: import('../types').TransactionAttachments;
  }): Promise<MaterialTransaction> {
    // 1. RBAC Permissions Verification
    const role = this.currentUser.role;
    if (role === 'management_viewer') {
      throw new Error('Access Denied: Management Viewers have read-only permissions and cannot submit material transactions.');
    }

    if (role === 'site_engineer' && (txInput.transactionType === 'receipt' || txInput.transactionType === 'opening_stock')) {
      throw new Error('Access Denied: Site Engineers / Supervisors are permitted to record usage and damage, not material receipts.');
    }

    if (role === 'storekeeper' && txInput.transactionType === 'damage') {
      // Storekeepers record receipts & returns
    }

    // 2. Validate Project Status
    const project = await this.getProjectById(txInput.projectId);
    if (!project) throw new Error('Project does not exist.');
    if (project.status === 'completed' && role !== 'admin') {
      throw new Error('This project is completed and locked. Only Company Administrators can record audited corrections on completed projects.');
    }

    // 3. Positive Whole Numbers Validation
    const qty = Math.floor(Number(txInput.quantityBags));
    if (isNaN(qty) || qty <= 0) {
      throw new Error('Quantity must be a positive whole integer of bags (greater than 0).');
    }

    if (!txInput.transactionDate) {
      throw new Error('Transaction date is required.');
    }

    if (!txInput.brandId || !txInput.brandName) {
      throw new Error('Please select a valid cement brand.');
    }

    // 4. Stock Availability Check (Prevent negative balance unless opening stock or receipt)
    const currentStock = await this.calculateCementStock(txInput.projectId);
    const brandStock = currentStock.brandSummaries.find(b => b.brand_id === txInput.brandId);
    const availableBefore = brandStock ? brandStock.available_stock : 0;

    if (txInput.transactionType === 'usage' || txInput.transactionType === 'damage' || txInput.transactionType === 'return') {
      if (qty > availableBefore) {
        throw new Error(
          `Insufficient stock: Cannot record ${qty} bags of ${txInput.brandName}. Only ${availableBefore} bags are currently available in inventory.`
        );
      }
    }

    // 5. Build Transaction Record with Server-authoritative Audit fields
    const company = await this.getCompany();
    const newTx: MaterialTransaction = {
      id: generateUuid(),
      company_id: company.id,
      project_id: txInput.projectId,
      location_id: txInput.locationId,
      location_name: txInput.locationName || 'Main Site Storage',
      category: 'cement',
      brand_id: txInput.brandId,
      brand_name: txInput.brandName,
      transaction_date: txInput.transactionDate,
      transaction_type: txInput.transactionType,
      quantity_bags: qty,
      received_qty: txInput.transactionType === 'receipt' ? qty : 0,
      used_qty: txInput.transactionType === 'usage' ? qty : 0,
      damaged_qty: txInput.transactionType === 'damage' ? qty : 0,
      supplier_name: txInput.supplierName?.trim(),
      invoice_number: txInput.invoiceNumber?.trim(),
      challan_number: txInput.challanNumber?.trim(),
      remarks: txInput.remarks?.trim(),
      attachment_url: txInput.attachmentUrl,
      attachment_name: txInput.attachmentName,
      attachment_size: txInput.attachmentSize,
      attachments: txInput.attachments,
      // Authenticated user snapshot (cannot be spoofed)
      created_by: this.currentUser.id,
      created_by_name: this.currentUser.full_name,
      created_by_role: this.currentUser.role,
      approval_status: 'approved',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Calculate resulting running balance for this brand
    if (txInput.transactionType === 'receipt' || txInput.transactionType === 'opening_stock') {
      newTx.running_balance = availableBefore + qty;
    } else {
      newTx.running_balance = availableBefore - qty;
    }

    if (this.supabase && this.config.isConnected) {
      // Keep the structured attachment bundle in local persistence until the
      // remote schema has an attachments column; legacy attachment columns
      // continue to be sent to Supabase unchanged.
      const { attachments: _attachments, ...cloudTransaction } = newTx;
      const { error } = await this.supabase.from('material_transactions').insert([cloudTransaction]);
      if (error) throw new Error(`Cloud transaction save failed: ${error.message}`);
    }

    // Save to persistent storage
    const stored = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    const all: MaterialTransaction[] = stored ? JSON.parse(stored) : [];
    all.push(newTx);
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(all));

    this.recordAuditLog('record_material_transaction', 'material_transactions', newTx.id, {
      project_id: txInput.projectId,
      brand: txInput.brandName,
      type: txInput.transactionType,
      bags: qty
    });

    return newTx;
  }

  // Audited reversal for corrections (immutable ledger rule)
  public async reverseTransaction(txId: string, reason: string): Promise<MaterialTransaction> {
    if (this.currentUser.role !== 'admin') {
      throw new Error('Access Denied: Only Company Administrators are authorized to reverse an approved transaction.');
    }

    if (!reason || !reason.trim()) {
      throw new Error('Correction reason is mandatory for audited ledger reversal.');
    }

    const stored = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    const all: MaterialTransaction[] = stored ? JSON.parse(stored) : [];
    const origIndex = all.findIndex(t => t.id === txId);
    if (origIndex === -1) throw new Error('Transaction not found.');

    const orig = all[origIndex];
    if (orig.is_reversal) throw new Error('Cannot reverse an already reversed transaction.');

    // Invert the movement
    let invertedType: TransactionType = 'usage';
    if (orig.transaction_type === 'usage' || orig.transaction_type === 'damage') {
      invertedType = 'receipt';
    } else if (orig.transaction_type === 'receipt') {
      invertedType = 'return';
    }

    const reversalTx: MaterialTransaction = {
      id: 'tx-rev-' + Math.random().toString(36).substring(2, 9),
      company_id: orig.company_id,
      project_id: orig.project_id,
      location_id: orig.location_id,
      location_name: orig.location_name,
      category: 'cement',
      brand_id: orig.brand_id,
      brand_name: orig.brand_name,
          transaction_date: getLocalDateString(),
      transaction_type: invertedType,
      quantity_bags: orig.quantity_bags,
      received_qty: invertedType === 'receipt' ? orig.quantity_bags : 0,
      used_qty: invertedType === 'usage' ? orig.quantity_bags : 0,
      damaged_qty: 0,
      remarks: `REVERSAL of #${orig.id.slice(0, 8)}: ${reason.trim()}`,
      created_by: this.currentUser.id,
      created_by_name: this.currentUser.full_name,
      created_by_role: this.currentUser.role,
      approval_status: 'approved',
      is_reversal: true,
      reversal_of_id: orig.id,
      reversal_reason: reason.trim(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    all[origIndex].is_reversal = true;
    all[origIndex].reversal_reason = reason.trim();
    all.push(reversalTx);
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(all));

    this.recordAuditLog('reverse_transaction', 'material_transactions', orig.id, {
      reversed_tx_id: orig.id,
      reason: reason.trim()
    });

    return reversalTx;
  }

  // ==========================================
  // FILE STORAGE (Supabase Storage / Client-side)
  // ==========================================
  public async uploadAttachment(file: File, projectId: string): Promise<{ url: string; name: string; size: number }> {
    // File validation
    const maxSizeBytes = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSizeBytes) {
      throw new Error(`File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum allowed attachment size is 10MB.`);
    }

    const allowedMime = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedMime.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|pdf)$/i)) {
      throw new Error('Unsupported file format. Please attach PDF, JPG, JPEG, or PNG files.');
    }

    const fileExt = file.name.split('.').pop() || 'bin';
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `comp-apex-01/${projectId}/documents_${Date.now()}_${sanitizedName}`;

    // If Supabase Storage is connected, upload to 'construction-docs' bucket
    if (this.supabase && this.config.isConnected) {
      try {
        const { data, error } = await this.supabase.storage
          .from('construction-docs')
          .upload(storagePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (!error && data) {
          const { data: publicData } = this.supabase.storage
            .from('construction-docs')
            .getPublicUrl(storagePath);

          return {
            url: publicData.publicUrl || storagePath,
            name: file.name,
            size: file.size
          };
        }
      } catch (err) {
        console.warn('Supabase storage upload failed, using client data URL', err);
      }
    }

    // Fallback: Read file to persistent Data URL for immediate offline testing
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          url: reader.result as string,
          name: file.name,
          size: file.size
        });
      };
      reader.onerror = () => reject(new Error('Failed to read file for storage'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Uploads a sensitive employee document without exposing a public URL.
   * The returned storage path is resolved through createSignedUrl when it is
   * opened. The local fallback remains a data URL because localStorage is the
   * supported offline persistence mechanism for this application.
   */
  public async uploadPrivateAttachment(file: File, projectId: string): Promise<{ url: string; name: string; size: number; type?: string }> {
    const maxSizeBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      throw new Error('Aadhaar document is too large. Maximum allowed size is 5MB.');
    }
    const allowedMime = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedMime.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|webp|pdf)$/i)) {
      throw new Error('Unsupported Aadhaar format. Please attach PDF, JPG, JPEG, PNG, or WEBP.');
    }

    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `comp-apex-01/${projectId}/private_employee_documents_${Date.now()}_${sanitizedName}`;
    if (this.supabase && this.config.isConnected) {
      try {
        const { data, error } = await this.supabase.storage
          .from('construction-docs')
          .upload(storagePath, file, { cacheControl: '3600', upsert: false });
        if (!error && data) {
          return { url: storagePath, name: file.name, size: file.size, type: file.type };
        }
        if (error) throw error;
      } catch (err) {
        console.warn('Private document upload failed, using client data URL', err);
      }
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ url: reader.result as string, name: file.name, size: file.size, type: file.type });
      reader.onerror = () => reject(new Error('Failed to read Aadhaar document for storage'));
      reader.readAsDataURL(file);
    });
  }

  /** Resolve a saved attachment reference before it is used by a viewer. */
  public async resolveAttachmentUrl(reference: string): Promise<string> {
    const value = reference.trim();
    if (!value) throw new Error('Attachment reference is empty.');
    const isSupabaseStorageReference = value.includes('/storage/v1/object/');
    if (value.startsWith('data:') || value.startsWith('blob:') || value.startsWith('/') || (/^https?:\/\//i.test(value) && !isSupabaseStorageReference)) {
      return value;
    }

    if (this.supabase && this.config.isConnected) {
      let path = value;
      const storageMarker = '/storage/v1/object/';
      const markerIndex = value.indexOf(storageMarker);
      if (markerIndex >= 0) {
        const afterMarker = value.slice(markerIndex + storageMarker.length);
        const parts = afterMarker.split('/');
        if (parts.length >= 3) path = parts.slice(2).join('/').split('?')[0];
      } else if (path.startsWith('construction-docs/')) {
        path = path.slice('construction-docs/'.length);
      }

      const { data, error } = await this.supabase.storage
        .from('construction-docs')
        .createSignedUrl(path, 3600);
      if (!error && data?.signedUrl) return data.signedUrl;
      throw new Error(error?.message || 'The saved attachment could not be opened.');
    }

    throw new Error('The saved attachment reference is not a complete local or public URL.');
  }

  // ==========================================
  // EXTENDED MATERIAL CATEGORIES & CATALOGS
  // ==========================================
  public async getCategories(): Promise<MaterialCategoryDef[]> {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      if (stored) {
        const storedCats: MaterialCategoryDef[] = JSON.parse(stored);
        let changed = false;
        const merged = [...storedCats];
        for (const initCat of INITIAL_CATEGORIES) {
          if (!merged.some(c => c.id === initCat.id)) {
            merged.push(initCat);
            changed = true;
          }
        }
        if (changed) {
          localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(merged));
        }
        return merged;
      }
    } catch (e) {}
    return INITIAL_CATEGORIES;
  }

  public async addCategory(cat: { name: string; description: string; default_unit: string; is_reusable: boolean; allowed_units: string[] }): Promise<MaterialCategoryDef> {
    if (this.currentUser.role !== 'admin') {
      throw new Error('Access Denied: Only Company Administrators can register new material categories.');
    }
    const cats = await this.getCategories();
    const id = 'cat_' + cat.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    if (cats.some(c => c.id === id || c.name.toLowerCase() === cat.name.toLowerCase())) {
      throw new Error(`Category "${cat.name}" already exists.`);
    }
    const newCat: MaterialCategoryDef = {
      id,
      name: cat.name.trim(),
      description: cat.description.trim() || 'Custom material & equipment category',
      iconName: cat.is_reusable ? 'Wrench' : 'Package',
      is_core: false,
      is_reusable: cat.is_reusable,
      default_unit: cat.default_unit || 'Nos',
      allowed_units: cat.allowed_units.length > 0 ? cat.allowed_units : [cat.default_unit || 'Nos']
    };
    const updated = [...cats, newCat];
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(updated));
    this.recordAuditLog('add_material_category', 'categories', newCat.id, { name: newCat.name });
    return newCat;
  }

  // Steel Brands & Diameters
  public async getSteelBrands(): Promise<SteelBrand[]> {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.STEEL_BRANDS);
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return INITIAL_STEEL_BRANDS;
  }

  public async addSteelBrand(brandName: string): Promise<SteelBrand> {
    if (this.currentUser.role !== 'admin') {
      throw new Error('Access Denied: Only Company Administrators can add steel brands.');
    }
    const brands = await this.getSteelBrands();
    const trimmed = brandName.trim();
    if (brands.some(b => b.name.toLowerCase() === trimmed.toLowerCase())) {
      throw new Error(`Steel brand "${trimmed}" already exists.`);
    }
    const newBrand: SteelBrand = {
      id: 'sb-' + Math.random().toString(36).substring(2, 7),
      name: trimmed,
      code: trimmed.substring(0, 6).toUpperCase().replace(/[^A-Z0-9]/g, ''),
      is_active: true
    };
    const updated = [...brands, newBrand];
    localStorage.setItem(STORAGE_KEYS.STEEL_BRANDS, JSON.stringify(updated));
    this.recordAuditLog('add_steel_brand', 'steel_brands', newBrand.id, { name: trimmed });
    return newBrand;
  }

  public async getSteelSizes(): Promise<string[]> {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.STEEL_SIZES);
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return INITIAL_STEEL_SIZES;
  }

  public async addSteelSize(sizeName: string): Promise<string[]> {
    if (this.currentUser.role !== 'admin') {
      throw new Error('Access Denied: Only Company Administrators can configure steel sizes.');
    }
    const sizes = await this.getSteelSizes();
    let trimmed = sizeName.trim();
    if (!trimmed.toLowerCase().includes('mm')) {
      trimmed = `${trimmed} mm`;
    }
    if (sizes.includes(trimmed)) {
      throw new Error(`Steel diameter "${trimmed}" already exists.`);
    }
    const updated = [...sizes, trimmed];
    localStorage.setItem(STORAGE_KEYS.STEEL_SIZES, JSON.stringify(updated));
    this.recordAuditLog('add_steel_size', 'steel_sizes', trimmed, { size: trimmed });
    return updated;
  }

  // Sand Types
  public async getSandTypes(): Promise<string[]> {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SAND_TYPES);
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return INITIAL_SAND_TYPES;
  }

  public async addSandType(name: string): Promise<string[]> {
    if (this.currentUser.role !== 'admin') {
      throw new Error('Access Denied: Only Company Administrators can add sand types.');
    }
    const types = await this.getSandTypes();
    const trimmed = name.trim();
    if (types.some(t => t.toLowerCase() === trimmed.toLowerCase())) {
      throw new Error(`Sand type "${trimmed}" already exists.`);
    }
    const updated = [...types, trimmed];
    localStorage.setItem(STORAGE_KEYS.SAND_TYPES, JSON.stringify(updated));
    this.recordAuditLog('add_sand_type', 'sand_types', trimmed, { name: trimmed });
    return updated;
  }

  // Brick Types
  public async getBrickTypes(): Promise<string[]> {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.BRICK_TYPES);
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return INITIAL_BRICKS_TYPES;
  }

  public async addBrickType(name: string): Promise<string[]> {
    if (this.currentUser.role !== 'admin') {
      throw new Error('Access Denied: Only Company Administrators can add brick types.');
    }
    const types = await this.getBrickTypes();
    const trimmed = name.trim();
    if (types.some(t => t.toLowerCase() === trimmed.toLowerCase())) {
      throw new Error(`Brick type "${trimmed}" already exists.`);
    }
    const updated = [...types, trimmed];
    localStorage.setItem(STORAGE_KEYS.BRICK_TYPES, JSON.stringify(updated));
    this.recordAuditLog('add_brick_type', 'brick_types', trimmed, { name: trimmed });
    return updated;
  }

  // Aggregate Sizes
  public async getAggregateSizes(): Promise<string[]> {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.AGGREGATE_SIZES);
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return INITIAL_AGGREGATE_SIZES;
  }

  public async addAggregateSize(sizeName: string): Promise<string[]> {
    if (this.currentUser.role !== 'admin') {
      throw new Error('Access Denied: Only Company Administrators can configure aggregate sizes.');
    }
    const sizes = await this.getAggregateSizes();
    let trimmed = sizeName.trim();
    if (!trimmed.toLowerCase().includes('mm')) {
      trimmed = `${trimmed} mm`;
    }
    if (sizes.includes(trimmed)) {
      throw new Error(`Aggregate size "${trimmed}" already exists.`);
    }
    const updated = [...sizes, trimmed];
    localStorage.setItem(STORAGE_KEYS.AGGREGATE_SIZES, JSON.stringify(updated));
    this.recordAuditLog('add_aggregate_size', 'aggregate_sizes', trimmed, { size: trimmed });
    return updated;
  }

  // Category Items (for equipment, tools, and specialized categories)
  public async getCategoryItems(categoryId: string): Promise<MaterialItem[]> {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CATEGORY_ITEMS);
      let all: MaterialItem[] = stored ? JSON.parse(stored) : [];

      const initNames = INITIAL_ITEMS_BY_CATEGORY[categoryId] || [];
      const cats = await this.getCategories();
      const catDef = cats.find(c => c.id === categoryId);
      let changed = false;

      for (let idx = 0; idx < initNames.length; idx++) {
        const name = initNames[idx];
        const existing = all.find(i => i.category_id === categoryId && i.name.toLowerCase() === name.toLowerCase());

        let detailedSeed = undefined;
        if (categoryId === 'regular_site_use') {
          detailedSeed = REGULAR_SITE_USE_DETAILED_ITEMS.find(d => d.name.toLowerCase() === name.toLowerCase());
        }

        if (!existing) {
          const defaultUnit = detailedSeed?.default_unit || catDef?.default_unit || 'Nos';
          const isReusable = detailedSeed !== undefined ? detailedSeed.is_reusable : (catDef?.is_reusable || false);
          const minStockAlert = detailedSeed?.min_stock_alert || 5;

          all.push({
            id: `item-${categoryId}-${idx + 1}-${Math.random().toString(36).substring(2, 6)}`,
            category_id: categoryId,
            name,
            code: `${categoryId.substring(0, 3).toUpperCase()}-${(all.filter(i => i.category_id === categoryId).length + 1).toString().padStart(3, '0')}`,
            default_unit: defaultUnit,
            supported_units: catDef?.allowed_units || [defaultUnit],
            min_stock_alert: minStockAlert,
            is_reusable: isReusable,
            subcategory: detailedSeed?.subcategory,
            specification: detailedSeed?.specification
          });
          changed = true;
        } else if (detailedSeed) {
          // If already in storage from prior run, make sure subcategory and reusable are up to date
          if (!existing.subcategory && detailedSeed.subcategory) {
            existing.subcategory = detailedSeed.subcategory;
            changed = true;
          }
          if (!existing.specification && detailedSeed.specification) {
            existing.specification = detailedSeed.specification;
            changed = true;
          }
          if (existing.is_reusable !== detailedSeed.is_reusable) {
            existing.is_reusable = detailedSeed.is_reusable;
            changed = true;
          }
        }
      }

      if (changed) {
        localStorage.setItem(STORAGE_KEYS.CATEGORY_ITEMS, JSON.stringify(all));
      }

      return all.filter(i => i.category_id === categoryId);
    } catch (e) {
      return [];
    }
  }

  public async addCategoryItem(itemInput: {
    categoryId: string;
    name: string;
    defaultUnit?: string;
    minStock?: number;
    isReusable?: boolean;
    specification?: string;
    brand?: string;
    subcategory?: string;
  }): Promise<MaterialItem> {
    if (this.currentUser.role !== 'admin' && this.currentUser.role !== 'project_manager') {
      throw new Error('Access Denied: Only Administrators and Project Managers can register new material items.');
    }
    const stored = localStorage.getItem(STORAGE_KEYS.CATEGORY_ITEMS);
    const all: MaterialItem[] = stored ? JSON.parse(stored) : [];
    const trimmed = itemInput.name.trim();

    if (all.some(i => i.category_id === itemInput.categoryId && i.name.toLowerCase() === trimmed.toLowerCase())) {
      throw new Error(`Item "${trimmed}" already exists in this category.`);
    }

    const cats = await this.getCategories();
    const catDef = cats.find(c => c.id === itemInput.categoryId);

    const newItem: MaterialItem = {
      id: `item-${itemInput.categoryId}-${Math.random().toString(36).substring(2, 7)}`,
      category_id: itemInput.categoryId,
      name: trimmed,
      code: `${itemInput.categoryId.substring(0, 3).toUpperCase()}-${(all.length + 1).toString().padStart(3, '0')}`,
      default_unit: itemInput.defaultUnit || catDef?.default_unit || 'Nos',
      supported_units: catDef?.allowed_units || [itemInput.defaultUnit || 'Nos'],
      min_stock_alert: itemInput.minStock !== undefined ? itemInput.minStock : 5,
      is_reusable: itemInput.isReusable !== undefined ? itemInput.isReusable : (catDef?.is_reusable || false),
      specification: itemInput.specification,
      brand: itemInput.brand,
      subcategory: itemInput.subcategory
    };

    all.push(newItem);
    localStorage.setItem(STORAGE_KEYS.CATEGORY_ITEMS, JSON.stringify(all));
    this.recordAuditLog('add_category_item', 'category_items', newItem.id, { name: trimmed, category: itemInput.categoryId });
    return newItem;
  }

  public async updateCategoryItem(itemInput: {
    id: string;
    categoryId: string;
    name: string;
    defaultUnit?: string;
    minStock?: number;
    isReusable?: boolean;
    specification?: string;
    brand?: string;
    subcategory?: string;
  }): Promise<MaterialItem> {
    if (this.currentUser.role !== 'admin' && this.currentUser.role !== 'project_manager') {
      throw new Error('Access Denied: Only Administrators and Project Managers can edit material items.');
    }
    const stored = localStorage.getItem(STORAGE_KEYS.CATEGORY_ITEMS);
    const all: MaterialItem[] = stored ? JSON.parse(stored) : [];
    const index = all.findIndex(i => i.id === itemInput.id);
    if (index === -1) {
      throw new Error('Material item not found.');
    }
    const trimmed = itemInput.name.trim();
    if (!trimmed) throw new Error('Material name cannot be empty.');

    if (all.some((i, idx) => idx !== index && i.category_id === itemInput.categoryId && i.name.toLowerCase() === trimmed.toLowerCase())) {
      throw new Error(`Another item named "${trimmed}" already exists in this category.`);
    }

    const updated: MaterialItem = {
      ...all[index],
      name: trimmed,
      default_unit: itemInput.defaultUnit || all[index].default_unit,
      min_stock_alert: itemInput.minStock !== undefined ? itemInput.minStock : all[index].min_stock_alert,
      is_reusable: itemInput.isReusable !== undefined ? itemInput.isReusable : all[index].is_reusable,
      specification: itemInput.specification !== undefined ? itemInput.specification : all[index].specification,
      brand: itemInput.brand !== undefined ? itemInput.brand : all[index].brand,
      subcategory: itemInput.subcategory !== undefined ? itemInput.subcategory : all[index].subcategory
    };

    all[index] = updated;
    localStorage.setItem(STORAGE_KEYS.CATEGORY_ITEMS, JSON.stringify(all));
    this.recordAuditLog('edit_category_item', 'category_items', updated.id, { name: trimmed, category: itemInput.categoryId });
    return updated;
  }

  // ==========================================
  // GENERIC MATERIAL TRANSACTIONS & STOCK LEDGER
  // ==========================================
  public async getGenericTransactions(
    projectId: string,
    category?: string,
    filters?: {
      itemName?: string;
      brandName?: string;
      diameterOrSize?: string;
      transactionType?: string;
      startDate?: string;
      endDate?: string;
      search?: string;
    }
  ): Promise<GenericMaterialTransaction[]> {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.GENERIC_TRANSACTIONS);
      const all: GenericMaterialTransaction[] = stored ? JSON.parse(stored) : [];
      let filtered = all.filter(t => t.project_id === projectId);

      if (category && category !== 'all') {
        filtered = filtered.filter(t => t.category === category);
      }

      if (filters?.itemName && filters.itemName !== 'all') {
        filtered = filtered.filter(t => t.item_name === filters.itemName);
      }

      if (filters?.brandName && filters.brandName !== 'all') {
        filtered = filtered.filter(t => t.brand_name === filters.brandName);
      }

      if (filters?.diameterOrSize && filters.diameterOrSize !== 'all') {
        filtered = filtered.filter(t => t.diameter_or_size === filters.diameterOrSize);
      }

      if (filters?.transactionType && filters.transactionType !== 'all') {
        filtered = filtered.filter(t => t.transaction_type === filters.transactionType);
      }

      if (filters?.startDate) {
        filtered = filtered.filter(t => t.transaction_date >= filters.startDate!);
      }

      if (filters?.endDate) {
        filtered = filtered.filter(t => t.transaction_date <= filters.endDate!);
      }

      if (filters?.search) {
        const q = filters.search.toLowerCase().trim();
        filtered = filtered.filter(
          t =>
            t.item_name.toLowerCase().includes(q) ||
            t.brand_name?.toLowerCase().includes(q) ||
            t.diameter_or_size?.toLowerCase().includes(q) ||
            t.supplier_name?.toLowerCase().includes(q) ||
            t.invoice_number?.toLowerCase().includes(q) ||
            t.challan_number?.toLowerCase().includes(q) ||
            t.remarks?.toLowerCase().includes(q) ||
            t.created_by_name.toLowerCase().includes(q)
        );
      }

      // Sort descending by date, then created_at
      filtered.sort((a, b) => {
        const dc = new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime();
        if (dc !== 0) return dc;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      return filtered;
    } catch (e) {
      return [];
    }
  }

  /**
   * Helper to compute an item's current stock key
   */
  private makeStockKey(t: { category: string; item_name: string; brand_name?: string; diameter_or_size?: string; unit: string }): string {
    return `${t.category}::${t.item_name}::${t.brand_name || ''}::${t.diameter_or_size || ''}::${t.unit}`;
  }

  public async calculateCategoryStock(projectId: string, category: string): Promise<CategoryStockMetrics> {
    const categories = await this.getCategories();
    const catDef = categories.find(c => c.id === category);
    const categoryName = catDef ? catDef.name : category;
    const isReusable = catDef ? catDef.is_reusable : false;

    const stored = localStorage.getItem(STORAGE_KEYS.GENERIC_TRANSACTIONS);
    const all: GenericMaterialTransaction[] = stored ? JSON.parse(stored) : [];
    const txList = all.filter(t => t.project_id === projectId && t.category === category && !t.is_reversal);

    // Map by unique key
    const summaryMap = new Map<string, ItemStockSummary>();

    // Fetch catalog items first to inherit item-level is_reusable, subcategory, and alerts
    const catItems = await this.getCategoryItems(category);
    const itemMap = new Map<string, MaterialItem>();
    catItems.forEach(i => itemMap.set(i.name.toLowerCase(), i));

    for (const tx of txList) {
      const key = this.makeStockKey(tx);
      let summary = summaryMap.get(key);

      if (!summary) {
        const itemInfo = itemMap.get(tx.item_name.toLowerCase());
        const itemReusable = itemInfo ? itemInfo.is_reusable : isReusable;
        summary = {
          key,
          item_id: tx.item_id || itemInfo?.id,
          item_name: tx.item_name,
          category: tx.category,
          subcategory: tx.subcategory || itemInfo?.subcategory,
          brand_name: tx.brand_name,
          diameter_or_size: tx.diameter_or_size,
          unit: tx.unit,
          opening_stock: 0,
          total_received: 0,
          total_used: 0,
          total_damaged: 0,
          total_returns: 0,
          available_stock: 0,
          min_stock_alert: itemInfo?.min_stock_alert || 5,
          is_low_stock: false,
          is_reusable: itemReusable
        };
        summaryMap.set(key, summary);
      }

      if (tx.transaction_type === 'opening_stock') {
        summary.opening_stock += tx.quantity;
      } else if (tx.transaction_type === 'receipt') {
        summary.total_received += (tx.received_qty || tx.quantity);
      } else if (tx.transaction_type === 'usage' || tx.transaction_type === 'issue') {
        summary.total_used += (tx.used_qty || tx.quantity);
      } else if (tx.transaction_type === 'damage') {
        summary.total_damaged += (tx.damaged_qty || tx.quantity);
      } else if (tx.transaction_type === 'return') {
        summary.total_returns += (tx.return_qty || tx.quantity);
      } else if (tx.transaction_type === 'adjustment') {
        summary.total_received += (tx.received_qty || tx.quantity);
      }
    }

    // Populate catalog items that might have 0 transactions yet (for any category)
    for (const item of catItems) {
      const dummyKey = this.makeStockKey({ category, item_name: item.name, unit: item.default_unit });
      if (!summaryMap.has(dummyKey)) {
        summaryMap.set(dummyKey, {
          key: dummyKey,
          item_id: item.id,
          item_name: item.name,
          category,
          subcategory: item.subcategory,
          unit: item.default_unit,
          opening_stock: 0,
          total_received: 0,
          total_used: 0,
          total_damaged: 0,
          total_returns: 0,
          available_stock: 0,
          min_stock_alert: item.min_stock_alert || 5,
          is_low_stock: true,
          is_reusable: item.is_reusable,
          in_use_stock: 0
        });
      } else {
        const existing = summaryMap.get(dummyKey);
        if (existing) {
          if (!existing.subcategory && item.subcategory) existing.subcategory = item.subcategory;
          if (existing.is_reusable !== item.is_reusable) existing.is_reusable = item.is_reusable;
          if (item.min_stock_alert) existing.min_stock_alert = item.min_stock_alert;
        }
      }
    }

    let totalAvailable = 0;
    let lowStockCount = 0;
    const itemsList: ItemStockSummary[] = [];

    summaryMap.forEach((summary) => {
      // Formula: Available = Opening + Received - Returns - Used/Issued - Damaged
      // For reusable tools: Available in yard = Opening + Received + Returns - Issued - Damaged
      if (summary.is_reusable) {
        summary.in_use_stock = Math.max(0, summary.total_used - summary.total_returns);
        summary.available_stock = summary.opening_stock + summary.total_received + summary.total_returns - summary.total_used - summary.total_damaged;
      } else {
        summary.in_use_stock = 0;
        summary.available_stock = summary.opening_stock + summary.total_received - summary.total_returns - summary.total_used - summary.total_damaged;
      }

      summary.is_low_stock = summary.available_stock <= summary.min_stock_alert;
      if (summary.is_low_stock) lowStockCount++;
      totalAvailable += summary.available_stock;
      itemsList.push(summary);
    });

    itemsList.sort((a, b) => a.item_name.localeCompare(b.item_name));

    return {
      categoryId: category,
      categoryName,
      totalItemsCount: itemsList.length,
      lowStockItemsCount: lowStockCount,
      totalAvailableAggregate: totalAvailable,
      items: itemsList
    };
  }

  public async recordGenericTransaction(txInput: {
    projectId: string;
    locationId: string;
    locationName: string;
    category: StandardCategoryKey;
    subcategory?: string;
    itemId?: string;
    itemName: string;
    brandName?: string;
    diameterOrSize?: string;
    unit: string;
    transactionDate: string;
    transactionType: ExtendedTransactionType;
    quantity: number;
    supplierName?: string;
    invoiceNumber?: string;
    challanNumber?: string;
    remarks?: string;
    attachmentUrl?: string;
    attachmentName?: string;
    attachmentSize?: number;
    attachments?: import('../types').TransactionAttachments;
    equipment_condition?: 'good' | 'fair' | 'damaged' | 'maintenance';
    issued_to?: string;
    idempotency_key?: string;
  }): Promise<GenericMaterialTransaction> {
    const role = this.currentUser.role;
    if (role === 'management_viewer') {
      throw new Error('Access Denied: Management Viewers have read-only permissions and cannot submit material transactions.');
    }

    const stored = localStorage.getItem(STORAGE_KEYS.GENERIC_TRANSACTIONS);
    const all: GenericMaterialTransaction[] = stored ? JSON.parse(stored) : [];

    // Idempotency & Duplicate submission protection
    if (txInput.idempotency_key) {
      const existing = all.find(t => t.idempotency_key === txInput.idempotency_key);
      if (existing) {
        return existing;
      }
    } else {
      // Rapid duplicate click protection: within 2 seconds with exact same parameters
      const recent = all.find(t =>
        t.project_id === txInput.projectId &&
        t.category === txInput.category &&
        t.item_name === txInput.itemName.trim() &&
        t.transaction_type === txInput.transactionType &&
        t.quantity === Number(txInput.quantity) &&
        (Date.now() - new Date(t.created_at).getTime()) < 2000
      );
      if (recent) {
        return recent;
      }
    }

    const project = await this.getProjectById(txInput.projectId);
    if (!project) throw new Error('Project not found.');
    if (project.status === 'completed' && role !== 'admin') {
      throw new Error('This project is completed and locked. Only Company Administrators can record audited corrections.');
    }

    const qty = Number(txInput.quantity);
    if (isNaN(qty) || qty <= 0) {
      throw new Error('Quantity must be a positive number greater than zero.');
    }

    if (!txInput.transactionDate) {
      throw new Error('Transaction date is required.');
    }

    if (!txInput.itemName || !txInput.itemName.trim()) {
      throw new Error('Item or Material name is required.');
    }

    if (!txInput.unit || !txInput.unit.trim()) {
      throw new Error('Measurement unit is required.');
    }

    // Role restrictions:
    // Storekeepers: receipts, returns, opening_stock
    // Site Engineers: usage, issue, damage
    if (role === 'site_engineer' && (txInput.transactionType === 'receipt' || txInput.transactionType === 'opening_stock')) {
      throw new Error('Access Denied: Site Engineers / Supervisors are permitted to record usage, issues, and damages, not new stock receipts.');
    }

    // Stock availability validation: prevent overdraft for deductions
    const currentStock = await this.calculateCategoryStock(txInput.projectId, txInput.category);
    const key = this.makeStockKey({
      category: txInput.category,
      item_name: txInput.itemName.trim(),
      brand_name: txInput.brandName?.trim(),
      diameter_or_size: txInput.diameterOrSize?.trim(),
      unit: txInput.unit.trim()
    });

    const stockItem = currentStock.items.find(i => i.key === key);
    const currentAvailable = stockItem ? stockItem.available_stock : 0;

    if (txInput.transactionType === 'usage' || txInput.transactionType === 'issue' || txInput.transactionType === 'damage') {
      if (qty > currentAvailable) {
        throw new Error(
          `Insufficient stock balance: Cannot record ${qty} ${txInput.unit} of ${txInput.itemName}${txInput.brandName ? ` (${txInput.brandName})` : ''}. Only ${currentAvailable} ${txInput.unit} currently available in stock.`
        );
      }
    }

    const company = await this.getCompany();
    const catItemsForSub = await this.getCategoryItems(txInput.category);
    const matchedItem = catItemsForSub.find(i => i.name.toLowerCase() === txInput.itemName.trim().toLowerCase());
    const subcategory = txInput.subcategory || matchedItem?.subcategory;

    const newTx: GenericMaterialTransaction = {
      id: 'gtx-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now().toString(36),
      company_id: company.id,
      project_id: txInput.projectId,
      location_id: txInput.locationId,
      location_name: txInput.locationName || 'Main Site Storage Yard',
      category: txInput.category,
      item_id: txInput.itemId || matchedItem?.id,
      item_name: txInput.itemName.trim(),
      subcategory,
      brand_name: txInput.brandName?.trim(),
      diameter_or_size: txInput.diameterOrSize?.trim(),
      unit: txInput.unit.trim(),
      transaction_date: txInput.transactionDate,
      transaction_type: txInput.transactionType,
      quantity: qty,
      received_qty: (txInput.transactionType === 'receipt' || txInput.transactionType === 'opening_stock' || txInput.transactionType === 'adjustment') ? qty : 0,
      used_qty: (txInput.transactionType === 'usage' || txInput.transactionType === 'issue') ? qty : 0,
      damaged_qty: txInput.transactionType === 'damage' ? qty : 0,
      return_qty: txInput.transactionType === 'return' ? qty : 0,
      equipment_condition: txInput.equipment_condition,
      issued_to: txInput.issued_to?.trim(),
      supplier_name: txInput.supplierName?.trim(),
      invoice_number: txInput.invoiceNumber?.trim(),
      challan_number: txInput.challanNumber?.trim(),
      remarks: txInput.remarks?.trim(),
      attachment_url: txInput.attachmentUrl,
      attachment_name: txInput.attachmentName,
      attachment_size: txInput.attachmentSize,
      attachments: txInput.attachments,
      idempotency_key: txInput.idempotency_key,
      created_by: this.currentUser.id,
      created_by_name: this.currentUser.full_name,
      created_by_role: this.currentUser.role,
      approval_status: 'approved',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (txInput.transactionType === 'receipt' || txInput.transactionType === 'opening_stock') {
      newTx.running_balance = currentAvailable + qty;
    } else {
      newTx.running_balance = currentAvailable - qty;
    }

    all.push(newTx);
    localStorage.setItem(STORAGE_KEYS.GENERIC_TRANSACTIONS, JSON.stringify(all));

    this.recordAuditLog('record_material_transaction', txInput.category, newTx.id, {
      project_id: txInput.projectId,
      item: txInput.itemName,
      brand: txInput.brandName,
      type: txInput.transactionType,
      qty,
      unit: txInput.unit
    });

    return newTx;
  }

  public async reverseGenericTransaction(txId: string, reason: string): Promise<GenericMaterialTransaction> {
    if (this.currentUser.role !== 'admin') {
      throw new Error('Access Denied: Only Company Administrators are authorized to reverse an approved transaction.');
    }
    if (!reason || !reason.trim()) {
      throw new Error('Mandatory: An audited correction reason is required for transaction reversal.');
    }
    const stored = localStorage.getItem(STORAGE_KEYS.GENERIC_TRANSACTIONS);
    const all: GenericMaterialTransaction[] = stored ? JSON.parse(stored) : [];
    const origIndex = all.findIndex(t => t.id === txId);
    if (origIndex === -1) throw new Error('Transaction not found.');

    const orig = all[origIndex];
    if (orig.is_reversal) throw new Error('Cannot reverse an already reversed transaction.');

    let invertedType: ExtendedTransactionType = 'usage';
    if (orig.transaction_type === 'usage' || orig.transaction_type === 'issue' || orig.transaction_type === 'damage') {
      invertedType = 'receipt';
    } else if (orig.transaction_type === 'receipt') {
      invertedType = 'return';
    }

    const reversalTx: GenericMaterialTransaction = {
      id: 'gtx-rev-' + Math.random().toString(36).substring(2, 9),
      company_id: orig.company_id,
      project_id: orig.project_id,
      location_id: orig.location_id,
      location_name: orig.location_name,
      category: orig.category,
      item_id: orig.item_id,
      item_name: orig.item_name,
      brand_name: orig.brand_name,
      diameter_or_size: orig.diameter_or_size,
      unit: orig.unit,
      transaction_date: getLocalDateString(),
      transaction_type: invertedType,
      quantity: orig.quantity,
      received_qty: invertedType === 'receipt' ? orig.quantity : 0,
      used_qty: invertedType === 'usage' ? orig.quantity : 0,
      damaged_qty: 0,
      return_qty: invertedType === 'return' ? orig.quantity : 0,
      remarks: `REVERSAL of #${orig.id.slice(0, 8)}: ${reason.trim()}`,
      created_by: this.currentUser.id,
      created_by_name: this.currentUser.full_name,
      created_by_role: this.currentUser.role,
      approval_status: 'approved',
      is_reversal: true,
      reversal_of_id: orig.id,
      reversal_reason: reason.trim(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    all[origIndex].is_reversal = true;
    all[origIndex].reversal_reason = reason.trim();
    all.push(reversalTx);
    localStorage.setItem(STORAGE_KEYS.GENERIC_TRANSACTIONS, JSON.stringify(all));

    this.recordAuditLog('reverse_transaction', orig.category, orig.id, {
      reversed_tx_id: orig.id,
      reason: reason.trim()
    });

    return reversalTx;
  }

  public exportCategoryReportCsv(stockMetrics: CategoryStockMetrics, transactions: GenericMaterialTransaction[]): string {
    const lines: string[] = [];
    lines.push(`Category Stock Report - ${stockMetrics.categoryName}`);
    lines.push(`Exported Date,${new Date().toISOString()}`);
    lines.push('');
    lines.push('Item Name,Brand,Size / Diameter,Unit,Opening Stock,Received,Used / Issued,Damaged / Missing,Returns,Available Balance,Min Stock,Status');

    for (const item of stockMetrics.items) {
      const status = item.is_low_stock ? 'LOW STOCK' : 'ADEQUATE';
      lines.push(
        `"${item.item_name}","${item.brand_name || '—'}","${item.diameter_or_size || '—'}","${item.unit}",${item.opening_stock},${item.total_received},${item.total_used},${item.total_damaged},${item.total_returns},${item.available_stock},${item.min_stock_alert},"${status}"`
      );
    }

    lines.push('');
    lines.push('Transaction History Ledger');
    lines.push('Date,Item,Brand,Size / Diameter,Type,Quantity,Unit,Running Stock,Supplier,Invoice #,Challan #,Recorded By,Remarks');

    for (const tx of transactions) {
      lines.push(
        `"${tx.transaction_date}","${tx.item_name}","${tx.brand_name || '—'}","${tx.diameter_or_size || '—'}","${tx.transaction_type}",${tx.quantity},"${tx.unit}",${tx.running_balance ?? '—'},"${tx.supplier_name || '—'}","${tx.invoice_number || '—'}","${tx.challan_number || '—'}","${tx.created_by_name}","${tx.remarks || '—'}"`
      );
    }

    return lines.join('\n');
  }

  // ==========================================
  // VEHICLE & MACHINERY HIRE
  // ==========================================
  private canManageHire(): boolean {
    return ['admin', 'project_manager', 'site_supervisor'].includes(this.currentUser.role);
  }

  public async getVehicleHireRecords(projectId: string): Promise<VehicleHireRecord[]> {
    const stored = localStorage.getItem(STORAGE_KEYS.VEHICLE_HIRE);
    return (stored ? JSON.parse(stored) : [])
      .filter((record: VehicleHireRecord) => record.project_id === projectId)
      .sort((a: VehicleHireRecord, b: VehicleHireRecord) => b.hire_date.localeCompare(a.hire_date) || b.created_at.localeCompare(a.created_at));
  }

  public async saveVehicleHireRecord(input: Omit<VehicleHireRecord, 'id' | 'company_id' | 'project_name' | 'created_by' | 'created_by_name' | 'created_at' | 'updated_at'> & { id?: string }): Promise<VehicleHireRecord> {
    if (!this.canManageHire()) throw new Error('Access Denied: You do not have permission to manage vehicle hire.');
    const project = await this.getProjectById(input.project_id);
    if (!project) throw new Error('Project not found.');
    const stored = localStorage.getItem(STORAGE_KEYS.VEHICLE_HIRE);
    const all: VehicleHireRecord[] = stored ? JSON.parse(stored) : [];
    const now = new Date().toISOString();
    const existingIndex = input.id ? all.findIndex(record => record.id === input.id) : -1;
    const record: VehicleHireRecord = {
      ...input,
      id: existingIndex >= 0 ? all[existingIndex].id : `vh-${generateUuid()}`,
      company_id: existingIndex >= 0 ? all[existingIndex].company_id : project.company_id,
      project_name: project.name,
      created_by: existingIndex >= 0 ? all[existingIndex].created_by : this.currentUser.id,
      created_by_name: existingIndex >= 0 ? all[existingIndex].created_by_name : this.currentUser.full_name,
      created_at: existingIndex >= 0 ? all[existingIndex].created_at : now,
      updated_at: now
    };
    if (existingIndex >= 0) all[existingIndex] = record; else all.push(record);
    localStorage.setItem(STORAGE_KEYS.VEHICLE_HIRE, JSON.stringify(all));
    this.recordAuditLog(existingIndex >= 0 ? 'update_vehicle_hire' : 'create_vehicle_hire', 'vehicle_hire', record.id, { project_id: record.project_id });
    return record;
  }

  public async getMachineryHireRecords(projectId: string): Promise<MachineryHireRecord[]> {
    const stored = localStorage.getItem(STORAGE_KEYS.MACHINERY_HIRE);
    return (stored ? JSON.parse(stored) : [])
      .filter((record: MachineryHireRecord) => record.project_id === projectId)
      .sort((a: MachineryHireRecord, b: MachineryHireRecord) => b.received_date.localeCompare(a.received_date) || b.created_at.localeCompare(a.created_at));
  }

  public async saveMachineryHireRecord(input: Omit<MachineryHireRecord, 'id' | 'company_id' | 'project_name' | 'created_by' | 'created_by_name' | 'created_at' | 'updated_at'> & { id?: string }): Promise<MachineryHireRecord> {
    if (!this.canManageHire()) throw new Error('Access Denied: You do not have permission to manage machinery hire.');
    const project = await this.getProjectById(input.project_id);
    if (!project) throw new Error('Project not found.');
    const stored = localStorage.getItem(STORAGE_KEYS.MACHINERY_HIRE);
    const all: MachineryHireRecord[] = stored ? JSON.parse(stored) : [];
    const now = new Date().toISOString();
    const existingIndex = input.id ? all.findIndex(record => record.id === input.id) : -1;
    const record: MachineryHireRecord = {
      ...input,
      id: existingIndex >= 0 ? all[existingIndex].id : `mh-${generateUuid()}`,
      company_id: existingIndex >= 0 ? all[existingIndex].company_id : project.company_id,
      project_name: project.name,
      created_by: existingIndex >= 0 ? all[existingIndex].created_by : this.currentUser.id,
      created_by_name: existingIndex >= 0 ? all[existingIndex].created_by_name : this.currentUser.full_name,
      created_at: existingIndex >= 0 ? all[existingIndex].created_at : now,
      updated_at: now
    };
    if (existingIndex >= 0) all[existingIndex] = record; else all.push(record);
    localStorage.setItem(STORAGE_KEYS.MACHINERY_HIRE, JSON.stringify(all));
    this.recordAuditLog(existingIndex >= 0 ? 'update_machinery_hire' : 'create_machinery_hire', 'machinery_hire', record.id, { project_id: record.project_id });
    return record;
  }

  // ==========================================
  // AUDIT LOG
  // ==========================================
  private recordAuditLog(action: string, entityType: string, entityId: string, details: any) {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
      const logs = stored ? JSON.parse(stored) : [];
      logs.unshift({
        id: 'aud-' + Math.random().toString(36).substring(2, 9),
        user_id: this.currentUser.id,
        user_name: this.currentUser.full_name,
        user_role: this.currentUser.role,
        action,
        entity_type: entityType,
        entity_id: entityId,
        details,
        created_at: new Date().toISOString()
      });
      // Keep last 100 logs
      localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(logs.slice(0, 100)));
    } catch (e) {}
  }
}

export const dataService = new DataService();
