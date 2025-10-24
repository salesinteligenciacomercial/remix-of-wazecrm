-- Check and fix the RLS policies for companies table
-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Super admins full access to companies" ON public.companies;
DROP POLICY IF EXISTS "Company admins update their companies" ON public.companies;
DROP POLICY IF EXISTS "Only super admins can delete companies" ON public.companies;
DROP POLICY IF EXISTS "Authenticated users can create companies" ON public.companies;
DROP POLICY IF EXISTS "Authenticated users view companies" ON public.companies;
DROP POLICY IF EXISTS "Users can view companies" ON public.companies;
DROP POLICY IF EXISTS "Company admins view companies" ON public.companies;
DROP POLICY IF EXISTS "Company admins can create companies" ON public.companies;

-- Create simple permissive policies for testing
CREATE POLICY "allow_all_authenticated_select_companies"
ON public.companies
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "allow_all_authenticated_insert_companies"
ON public.companies
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "allow_all_authenticated_update_companies"
ON public.companies
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "allow_all_authenticated_delete_companies"
ON public.companies
FOR DELETE
TO authenticated
USING (true);