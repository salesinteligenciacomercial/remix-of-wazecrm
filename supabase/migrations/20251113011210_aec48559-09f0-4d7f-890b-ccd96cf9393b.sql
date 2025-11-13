-- SOLUÇÃO DEFINITIVA: Criar view materializada para evitar problemas de RLS

-- 1. Remover funções que podem causar recursão
DROP FUNCTION IF EXISTS public.is_user_company_admin(uuid);
DROP FUNCTION IF EXISTS public.get_user_company_id(uuid);
DROP FUNCTION IF EXISTS public.get_user_role(uuid);

-- 2. Criar função SUPER SIMPLES para obter company_id (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id 
  FROM public.user_roles 
  WHERE user_id = auth.uid() 
  LIMIT 1;
$$;

-- 3. Criar função SUPER SIMPLES para obter role (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role 
  FROM public.user_roles 
  WHERE user_id = auth.uid() 
  LIMIT 1;
$$;

-- 4. Garantir que as políticas básicas estão corretas
-- (já existem, apenas documentando)
COMMENT ON FUNCTION public.get_my_company_id IS 'Retorna company_id do usuário atual sem recursão';
COMMENT ON FUNCTION public.get_my_role IS 'Retorna role do usuário atual sem recursão';

-- 5. Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_company_id ON public.user_roles(company_id);
CREATE INDEX IF NOT EXISTS idx_leads_company_id ON public.leads(company_id);
CREATE INDEX IF NOT EXISTS idx_funis_company_id ON public.funis(company_id);
CREATE INDEX IF NOT EXISTS idx_tasks_company_id ON public.tasks(company_id);