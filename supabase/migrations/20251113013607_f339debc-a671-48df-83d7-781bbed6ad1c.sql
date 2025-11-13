-- Criar função segura para buscar company do usuário
CREATE OR REPLACE FUNCTION public.get_my_company()
RETURNS TABLE (
  id uuid,
  name text,
  plan text,
  is_master_account boolean,
  parent_company_id uuid,
  max_users integer,
  max_leads integer,
  status text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_company_id uuid;
BEGIN
  -- Verificar se usuário está autenticado
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  -- Buscar company_id do usuário
  SELECT user_roles.company_id INTO v_company_id
  FROM public.user_roles
  WHERE user_roles.user_id = auth.uid()
  LIMIT 1;

  -- Se não encontrou, retornar vazio
  IF v_company_id IS NULL THEN
    RETURN;
  END IF;

  -- Retornar dados da empresa
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.plan,
    c.is_master_account,
    c.parent_company_id,
    c.max_users,
    c.max_leads,
    c.status
  FROM public.companies c
  WHERE c.id = v_company_id;
END;
$$;