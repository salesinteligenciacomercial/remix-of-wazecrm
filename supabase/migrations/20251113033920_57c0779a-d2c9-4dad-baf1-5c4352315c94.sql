-- Etapa 1: Criar função segura para buscar role do usuário sem recursão RLS
CREATE OR REPLACE FUNCTION public.get_my_user_role()
RETURNS TABLE(role app_role, company_id uuid, company_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    ur.role,
    ur.company_id,
    c.name as company_name
  FROM public.user_roles ur
  LEFT JOIN public.companies c ON c.id = ur.company_id
  WHERE ur.user_id = auth.uid()
  LIMIT 1
$$;

-- Etapa 2: Recriar as políticas RLS sem recursão
DROP POLICY IF EXISTS "company_admins_view_company_roles" ON user_roles;
DROP POLICY IF EXISTS "super_admins_view_all_roles" ON user_roles;

-- Recriar política para super admins
CREATE POLICY "super_admins_view_all_roles" 
ON user_roles FOR SELECT 
USING (public.is_super_admin());

-- Recriar política para company admins sem recursão
CREATE POLICY "company_admins_view_company_roles" 
ON user_roles FOR SELECT 
USING (
  public.is_super_admin() OR 
  (company_id IN (
    SELECT ur.company_id 
    FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
      AND ur.role = 'company_admin'::app_role
  ))
);