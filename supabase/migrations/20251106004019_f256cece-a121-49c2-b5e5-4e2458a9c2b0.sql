-- Promover jeovauzumak@gmail.com a super_admin e tornar empresa mestre

-- Garantir que a empresa existe e está marcada como master
DO $$
DECLARE
  v_user_id uuid;
  v_company_id uuid;
  v_email text := 'jeovauzumak@gmail.com';
BEGIN
  -- Buscar user_id
  SELECT id INTO v_user_id FROM auth.users WHERE email ILIKE v_email;
  
  IF v_user_id IS NOT NULL THEN
    -- Buscar ou criar company
    SELECT ur.company_id INTO v_company_id 
    FROM public.user_roles ur 
    WHERE ur.user_id = v_user_id 
    LIMIT 1;
    
    IF v_company_id IS NULL THEN
      -- Criar nova empresa
      INSERT INTO public.companies (name, is_master_account, parent_company_id, created_by)
      VALUES (
        UPPER(SPLIT_PART(v_email, '@', 1)),
        true,
        null,
        v_user_id
      )
      RETURNING id INTO v_company_id;
    ELSE
      -- Atualizar empresa existente para ser master
      UPDATE public.companies
      SET is_master_account = true, 
          parent_company_id = null
      WHERE id = v_company_id;
    END IF;
    
    -- Garantir role de super_admin
    INSERT INTO public.user_roles (user_id, company_id, role)
    VALUES (v_user_id, v_company_id, 'super_admin'::app_role)
    ON CONFLICT (user_id, company_id) 
    DO UPDATE SET role = 'super_admin'::app_role;
    
    RAISE NOTICE 'Usuário % promovido a super_admin na empresa %', v_email, v_company_id;
  ELSE
    RAISE NOTICE 'Usuário % não encontrado', v_email;
  END IF;
END $$;

-- Criar função RPC para auto-elevação
CREATE OR REPLACE FUNCTION public.elevate_self_to_super_admin()
RETURNS json 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public 
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text; 
  v_company_id uuid; 
  v_name text;
BEGIN
  IF v_user_id IS NULL THEN 
    RAISE EXCEPTION 'NO_AUTH'; 
  END IF;
  
  SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;
  
  IF LOWER(v_email) NOT IN ('jeovauzumak@gmail.com', 'jeovauzuak@gmail.com') THEN 
    RAISE EXCEPTION 'FORBIDDEN_EMAIL'; 
  END IF;

  SELECT company_id INTO v_company_id 
  FROM public.user_roles 
  WHERE user_id = v_user_id 
  LIMIT 1;
  
  IF v_company_id IS NULL THEN
    v_name := UPPER(SPLIT_PART(v_email, '@', 1));
    INSERT INTO public.companies(name, is_master_account, parent_company_id, created_by)
    VALUES (v_name, true, null, v_user_id) 
    RETURNING id INTO v_company_id;
  ELSE
    UPDATE public.companies 
    SET is_master_account = true, 
        parent_company_id = null 
    WHERE id = v_company_id;
  END IF;

  INSERT INTO public.user_roles(user_id, company_id, role)
  VALUES (v_user_id, v_company_id, 'super_admin'::app_role)
  ON CONFLICT (user_id, company_id) 
  DO UPDATE SET role = 'super_admin'::app_role;

  RETURN json_build_object(
    'success', true,
    'company_id', v_company_id, 
    'role', 'super_admin'
  );
END;
$$;