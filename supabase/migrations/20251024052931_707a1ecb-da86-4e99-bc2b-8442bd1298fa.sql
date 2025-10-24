-- Fix overly permissive RLS policies on companies table
-- Drop dangerous policies that allow any authenticated user to do everything
DROP POLICY IF EXISTS "allow_all_authenticated_select_companies" ON public.companies;
DROP POLICY IF EXISTS "allow_all_authenticated_insert_companies" ON public.companies;
DROP POLICY IF EXISTS "allow_all_authenticated_update_companies" ON public.companies;
DROP POLICY IF EXISTS "allow_all_authenticated_delete_companies" ON public.companies;

-- Create secure, role-based policies

-- Super admins can view all companies
CREATE POLICY "Super admins view all companies"
ON public.companies FOR SELECT
USING (has_role(auth.uid(), 'super_admin'));

-- Company members can view their own company
CREATE POLICY "Company members view their companies"
ON public.companies FOR SELECT
USING (
  id IN (
    SELECT company_id 
    FROM user_roles 
    WHERE user_id = auth.uid()
  )
);

-- Only super admins can create companies
CREATE POLICY "Only super admins create companies"
ON public.companies FOR INSERT
WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Super admins and company admins can update their company
CREATE POLICY "Admins update their company"
ON public.companies FOR UPDATE
USING (
  has_role(auth.uid(), 'super_admin') OR
  (has_role(auth.uid(), 'company_admin') AND 
   id = get_user_company_id(auth.uid()))
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin') OR
  (has_role(auth.uid(), 'company_admin') AND 
   id = get_user_company_id(auth.uid()))
);

-- Only super admins can delete companies
CREATE POLICY "Only super admins delete companies"
ON public.companies FOR DELETE
USING (has_role(auth.uid(), 'super_admin'));