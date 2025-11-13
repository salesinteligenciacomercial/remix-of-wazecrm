-- Garantir que não existem políticas duplicadas
-- Remover qualquer variação de políticas problemáticas
DROP POLICY IF EXISTS "company_admins_view_company_roles" ON public.user_roles;
DROP POLICY IF EXISTS "company_admins_view_roles_safe" ON public.user_roles;
DROP POLICY IF EXISTS "Company admins view company roles" ON public.user_roles;

-- Recriar apenas a política segura
CREATE POLICY "company_admins_can_view_company_roles" ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (
    -- Usar funções SECURITY DEFINER para evitar recursão
    public.is_user_company_admin(auth.uid()) = true
    AND company_id = public.get_user_company_id(auth.uid())
  );

COMMENT ON POLICY "company_admins_can_view_company_roles" ON public.user_roles IS 'Company admins podem ver roles de sua empresa (sem recursão)';