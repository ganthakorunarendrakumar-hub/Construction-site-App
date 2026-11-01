-- BuildPulse cloud account provisioning migration for CHENINFRA-Production.
-- Run after the base schema and SUPABASE_AUTH_SETUP.sql.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS user_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS assigned_projects TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS employee_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN (
    'admin',
    'site_supervisor',
    'accountant',
    'worker',
    'project_manager',
    'site_engineer',
    'storekeeper',
    'management_viewer'
  ));

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_status_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_status_check CHECK (status IN ('active', 'inactive'));

CREATE UNIQUE INDEX IF NOT EXISTS profiles_user_id_unique
  ON public.profiles (upper(user_id))
  WHERE user_id IS NOT NULL AND user_id <> '';

CREATE OR REPLACE FUNCTION public.current_user_company_id()
RETURNS UUID AS $$
  SELECT company_id
  FROM public.profiles
  WHERE id = auth.uid() AND status = 'active'
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

