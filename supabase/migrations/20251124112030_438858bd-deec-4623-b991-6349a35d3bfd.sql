-- Criar política para Super Admins verem todas as empresas
CREATE POLICY "Super admins view all companies"
ON public.companies
FOR SELECT
USING (
  is_super_admin()
);

-- Criar política para usuários verem subcontas (empresas filhas)
CREATE POLICY "Users view child companies"
ON public.companies
FOR SELECT
USING (
  parent_company_id IN (
    SELECT company_id
    FROM public.user_roles
    WHERE user_id = auth.uid()
  )
);

-- Criar política para Super Admins gerenciarem todas as empresas
CREATE POLICY "Super admins manage all companies"
ON public.companies
FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- Criar política para usuários gerenciarem subcontas
CREATE POLICY "Users manage child companies"
ON public.companies
FOR ALL
USING (
  parent_company_id IN (
    SELECT company_id
    FROM public.user_roles
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  parent_company_id IN (
    SELECT company_id
    FROM public.user_roles
    WHERE user_id = auth.uid()
  )
);