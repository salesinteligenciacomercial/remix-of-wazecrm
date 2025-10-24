-- Permitir que company_admin também crie subcontas (companies)
-- Remover política antiga
DROP POLICY IF EXISTS "Only super admins create companies" ON public.companies;

-- Criar nova política que permite super_admin E company_admin criarem companies
CREATE POLICY "Admins can create companies" 
ON public.companies 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) 
  OR has_role(auth.uid(), 'company_admin'::app_role)
);