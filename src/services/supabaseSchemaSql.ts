export const SUPABASE_SCHEMA_SQL = `-- ==============================================================================
-- BUILDPULSE CONSTRUCTION ERP - PHASE 1 DATABASE MIGRATION
-- Database: PostgreSQL (Supabase Compatible)
-- Features: Multi-tenant Companies, Projects, Cement Brands, Material Stock Ledger,
--           Row Level Security (RLS), Immutable Audit Trail, Supabase Storage
-- ==============================================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Companies table
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    address TEXT,
    gstin VARCHAR(50),
    logo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. User Profiles table (Linked to auth.users in Supabase)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE RESTRICT,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'project_manager', 'site_engineer', 'storekeeper', 'management_viewer')),
    role_title VARCHAR(100),
    avatar_url TEXT,
    phone VARCHAR(30),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Projects table
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    location VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    expected_completion_date DATE NOT NULL,
    actual_completion_date DATE,
    project_manager_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    project_manager_name VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('planning', 'in_progress', 'on_hold', 'completed')),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_by_name VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reopened_at TIMESTAMPTZ,
    reopened_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    CONSTRAINT unique_project_code_per_company UNIQUE (company_id, code)
);

-- Indexing for rapid queries
CREATE INDEX IF NOT EXISTS idx_projects_company ON public.projects(company_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_code ON public.projects(code);

-- 5. Cement Brands Master table
CREATE TABLE IF NOT EXISTS public.cement_brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    brand_name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT true,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_brand_per_company UNIQUE (company_id, brand_name)
);

CREATE INDEX IF NOT EXISTS idx_cement_brands_company ON public.cement_brands(company_id);

-- 6. Material Storage Locations (Site Warehouse, Silo, Shed, etc.)
CREATE TABLE IF NOT EXISTS public.material_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_location_per_project UNIQUE (project_id, name)
);

CREATE INDEX IF NOT EXISTS idx_locations_project ON public.material_locations(project_id);

-- 7. Material Transactions (The Immutable Cloud Stock Ledger)
CREATE TABLE IF NOT EXISTS public.material_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    location_id UUID REFERENCES public.material_locations(id) ON DELETE SET NULL,
    location_name VARCHAR(255) NOT NULL DEFAULT 'Main Site Storage',
    category VARCHAR(50) NOT NULL DEFAULT 'cement' CHECK (category IN ('cement', 'steel', 'sand', 'bricks', 'aggregate')),
    brand_id UUID REFERENCES public.cement_brands(id) ON DELETE RESTRICT,
    brand_name VARCHAR(255) NOT NULL,
    transaction_date DATE NOT NULL,
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('receipt', 'usage', 'damage', 'return', 'opening_stock')),
    quantity_bags INT NOT NULL CHECK (quantity_bags > 0),
    received_qty INT NOT NULL DEFAULT 0,
    used_qty INT NOT NULL DEFAULT 0,
    damaged_qty INT NOT NULL DEFAULT 0,
    supplier_name VARCHAR(255),
    invoice_number VARCHAR(100),
    challan_number VARCHAR(100),
    remarks TEXT,
    attachment_url TEXT,
    attachment_name VARCHAR(255),
    attachment_size BIGINT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_by_name VARCHAR(255) NOT NULL,
    created_by_role VARCHAR(50) NOT NULL,
    approval_status VARCHAR(50) NOT NULL DEFAULT 'approved' CHECK (approval_status IN ('approved', 'pending', 'rejected')),
    is_reversal BOOLEAN NOT NULL DEFAULT false,
    reversal_of_id UUID REFERENCES public.material_transactions(id) ON DELETE SET NULL,
    reversal_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_mat_trans_proj ON public.material_transactions(project_id);
CREATE INDEX IF NOT EXISTS idx_mat_trans_brand ON public.material_transactions(brand_id);
CREATE INDEX IF NOT EXISTS idx_mat_trans_date ON public.material_transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_mat_trans_created_at ON public.material_transactions(created_at DESC);

-- 8. Audit Log Table for tracking corrections, status changes, and critical actions
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    user_name VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cement_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to fetch current authenticated user profile
CREATE OR REPLACE FUNCTION public.current_user_profile()
RETURNS public.profiles AS $$
    SELECT * FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Projects Policy: Company members can view; only admins & PMs can insert/update
CREATE POLICY "Users can view projects in their company"
    ON public.projects FOR SELECT
    USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Admins and PMs can create projects"
    ON public.projects FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'project_manager')
        )
    );

CREATE POLICY "Admins and PMs can update projects"
    ON public.projects FOR UPDATE
    USING (
        company_id IN (
            SELECT company_id FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'project_manager')
        )
    );

-- Transactions Policy:
-- All company members can read transactions in their projects
CREATE POLICY "Users can view material transactions in their company"
    ON public.material_transactions FOR SELECT
    USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- Insert permissions by role:
-- Storekeeper: receipts & returns
-- Site Engineer: usage & damage
-- Admin & PM: any transaction
CREATE POLICY "Authorized staff can insert material transactions"
    ON public.material_transactions FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM public.profiles 
            WHERE id = auth.uid() AND (
                role IN ('admin', 'project_manager') OR
                (role = 'storekeeper' AND transaction_type IN ('receipt', 'return', 'opening_stock')) OR
                (role = 'site_engineer' AND transaction_type IN ('usage', 'damage'))
            )
        )
    );

-- Transactions are IMMUTABLE: Ordinary UPDATE/DELETE disabled! Corrections must be reversals.
CREATE POLICY "Only admins can mark transaction reversals"
    ON public.material_transactions FOR UPDATE
    USING (
        company_id IN (
            SELECT company_id FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ==============================================================================
-- 10. STORAGE BUCKET CONFIGURATION (Supabase Storage)
-- ==============================================================================
-- Run in Supabase SQL editor:
-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('construction-docs', 'construction-docs', false) 
-- ON CONFLICT (id) DO NOTHING;

-- CREATE POLICY "Allow authenticated read on construction-docs"
-- ON storage.objects FOR SELECT TO authenticated
-- USING (bucket_id = 'construction-docs');

-- CREATE POLICY "Allow authenticated upload on construction-docs"
-- ON storage.objects FOR INSERT TO authenticated
-- WITH CHECK (bucket_id = 'construction-docs');
`;
