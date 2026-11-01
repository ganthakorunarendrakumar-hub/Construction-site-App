-- BuildPulse secure Supabase Auth bootstrap.
-- Run this once in Supabase SQL Editor after creating the admin Auth user.

-- Create the company used by the first administrator.
INSERT INTO public.companies (name, code, address)
VALUES ('CHEN INFRA', 'CHEN', 'India')
ON CONFLICT (code) DO NOTHING;

-- Keep the cloud ledger aligned with the application stock calculations.
ALTER TABLE public.material_transactions
  ADD COLUMN IF NOT EXISTS running_balance INTEGER;

-- Shared state for modules that use client-side collections (attendance,
-- category catalogs, generic material ledgers, and related app settings).
CREATE TABLE IF NOT EXISTS public.app_state (
  company_id UUID PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.app_state ENABLE ROW LEVEL SECURITY;

-- Allow signed-in users to read company/profile data needed by the app.
-- Use a SECURITY DEFINER helper so policies never recursively query profiles.
CREATE OR REPLACE FUNCTION public.current_user_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Remove the original policies from the first schema run before replacing them
-- with non-recursive policies.
DROP POLICY IF EXISTS "Users can view projects in their company" ON public.projects;
DROP POLICY IF EXISTS "Admins and PMs can create projects" ON public.projects;
DROP POLICY IF EXISTS "Admins and PMs can update projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view material transactions in their company" ON public.material_transactions;
DROP POLICY IF EXISTS "Authorized staff can insert material transactions" ON public.material_transactions;
DROP POLICY IF EXISTS "Only admins can mark transaction reversals" ON public.material_transactions;
DROP POLICY IF EXISTS "Authenticated users can view their company" ON public.companies;
DROP POLICY IF EXISTS "Company admins can update their company" ON public.companies;
DROP POLICY IF EXISTS "Users can view their company profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view company material locations" ON public.material_locations;
DROP POLICY IF EXISTS "Admins and PMs can create material locations" ON public.material_locations;
DROP POLICY IF EXISTS "Users can view company cement brands" ON public.cement_brands;
DROP POLICY IF EXISTS "Admins can create cement brands" ON public.cement_brands;
DROP POLICY IF EXISTS "Users can read company app state" ON public.app_state;
DROP POLICY IF EXISTS "Users can write company app state" ON public.app_state;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'companies'
      AND policyname = 'Authenticated users can view their company'
  ) THEN
    CREATE POLICY "Authenticated users can view their company"
      ON public.companies FOR SELECT TO authenticated
      USING (id = public.current_user_company_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'companies'
      AND policyname = 'Company admins can update their company'
  ) THEN
    CREATE POLICY "Company admins can update their company"
      ON public.companies FOR UPDATE TO authenticated
      USING (id = public.current_user_company_id())
      WITH CHECK (id = public.current_user_company_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
      AND policyname = 'Users can view their company profiles'
  ) THEN
    CREATE POLICY "Users can view their company profiles"
      ON public.profiles FOR SELECT TO authenticated
      USING (company_id = public.current_user_company_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'material_locations'
      AND policyname = 'Users can view company material locations'
  ) THEN
    CREATE POLICY "Users can view company material locations"
      ON public.material_locations FOR SELECT TO authenticated
      USING (company_id = public.current_user_company_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'material_locations'
      AND policyname = 'Admins and PMs can create material locations'
  ) THEN
    CREATE POLICY "Admins and PMs can create material locations"
      ON public.material_locations FOR INSERT TO authenticated
      WITH CHECK (company_id = public.current_user_company_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'cement_brands'
      AND policyname = 'Users can view company cement brands'
  ) THEN
    CREATE POLICY "Users can view company cement brands"
      ON public.cement_brands FOR SELECT TO authenticated
      USING (company_id = public.current_user_company_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'cement_brands'
      AND policyname = 'Admins can create cement brands'
  ) THEN
    CREATE POLICY "Admins can create cement brands"
      ON public.cement_brands FOR INSERT TO authenticated
      WITH CHECK (company_id = public.current_user_company_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'app_state'
      AND policyname = 'Users can read company app state'
  ) THEN
    CREATE POLICY "Users can read company app state"
      ON public.app_state FOR SELECT TO authenticated
      USING (company_id = public.current_user_company_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'app_state'
      AND policyname = 'Users can write company app state'
  ) THEN
    CREATE POLICY "Users can write company app state"
      ON public.app_state FOR ALL TO authenticated
      USING (company_id = public.current_user_company_id())
      WITH CHECK (company_id = public.current_user_company_id());
  END IF;
END $$;

-- Non-recursive policies for the main application tables.
CREATE POLICY "Users can view projects in their company"
  ON public.projects FOR SELECT TO authenticated
  USING (company_id = public.current_user_company_id());

CREATE POLICY "Admins and PMs can create projects"
  ON public.projects FOR INSERT TO authenticated
  WITH CHECK (company_id = public.current_user_company_id());

CREATE POLICY "Admins and PMs can update projects"
  ON public.projects FOR UPDATE TO authenticated
  USING (company_id = public.current_user_company_id())
  WITH CHECK (company_id = public.current_user_company_id());

CREATE POLICY "Users can view material transactions in their company"
  ON public.material_transactions FOR SELECT TO authenticated
  USING (company_id = public.current_user_company_id());

CREATE POLICY "Authorized staff can insert material transactions"
  ON public.material_transactions FOR INSERT TO authenticated
  WITH CHECK (company_id = public.current_user_company_id());

CREATE POLICY "Only admins can mark transaction reversals"
  ON public.material_transactions FOR UPDATE TO authenticated
  USING (company_id = public.current_user_company_id())
  WITH CHECK (company_id = public.current_user_company_id());

-- Automatically create the application profile whenever a Supabase Auth user
-- is created. The first user is an administrator of the CHEN company.
CREATE OR REPLACE FUNCTION public.handle_new_buildpulse_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, company_id, full_name, email, role, role_title)
  SELECT
    NEW.id,
    c.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    'admin',
    'Company Administrator'
  FROM public.companies c
  WHERE c.code = 'CHEN'
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created_buildpulse ON auth.users;
CREATE TRIGGER on_auth_user_created_buildpulse
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_buildpulse_user();

-- Bootstrap an already-created admin user if the trigger was installed later.
INSERT INTO public.profiles (id, company_id, full_name, email, role, role_title)
SELECT
  u.id,
  c.id,
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  u.email,
  'admin',
  'Company Administrator'
FROM auth.users u
CROSS JOIN public.companies c
WHERE c.code = 'CHEN'
  AND u.email = 'admin@cheninfra.com'
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
