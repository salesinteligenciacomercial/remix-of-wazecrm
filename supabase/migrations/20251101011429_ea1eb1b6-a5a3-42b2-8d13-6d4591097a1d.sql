-- 1) Garantir company_id em funis está preenchido
UPDATE public.funis f
SET company_id = ur.company_id
FROM public.user_roles ur
WHERE ur.user_id = f.owner_id
  AND f.company_id IS NULL;

-- 2) Remover todas as políticas antigas de funis
DROP POLICY IF EXISTS "Company users manage funis" ON public.funis;
DROP POLICY IF EXISTS "company_funis_select" ON public.funis;
DROP POLICY IF EXISTS "company_funis_insert" ON public.funis;
DROP POLICY IF EXISTS "company_funis_update" ON public.funis;
DROP POLICY IF EXISTS "company_funis_delete" ON public.funis;

-- 3) Criar políticas RLS específicas para FUNIS
CREATE POLICY "company_funis_select"
ON public.funis
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.company_id = funis.company_id
  )
);

CREATE POLICY "company_funis_insert"
ON public.funis
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.company_id = funis.company_id
  )
);

CREATE POLICY "company_funis_update"
ON public.funis
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.company_id = funis.company_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.company_id = funis.company_id
  )
);

CREATE POLICY "company_funis_delete"
ON public.funis
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.company_id = funis.company_id
  )
);

-- 4) Remover todas as políticas antigas de etapas
DROP POLICY IF EXISTS "Company users manage etapas" ON public.etapas;
DROP POLICY IF EXISTS "company_etapas_select" ON public.etapas;
DROP POLICY IF EXISTS "company_etapas_insert" ON public.etapas;
DROP POLICY IF EXISTS "company_etapas_update" ON public.etapas;
DROP POLICY IF EXISTS "company_etapas_delete" ON public.etapas;

-- 5) Criar políticas RLS específicas para ETAPAS
CREATE POLICY "company_etapas_select"
ON public.etapas
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.funis f
    JOIN public.user_roles ur ON ur.company_id = f.company_id
    WHERE f.id = etapas.funil_id
      AND ur.user_id = auth.uid()
  )
);

CREATE POLICY "company_etapas_insert"
ON public.etapas
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.funis f
    JOIN public.user_roles ur ON ur.company_id = f.company_id
    WHERE f.id = etapas.funil_id
      AND ur.user_id = auth.uid()
  )
);

CREATE POLICY "company_etapas_update"
ON public.etapas
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.funis f
    JOIN public.user_roles ur ON ur.company_id = f.company_id
    WHERE f.id = etapas.funil_id
      AND ur.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.funis f
    JOIN public.user_roles ur ON ur.company_id = f.company_id
    WHERE f.id = etapas.funil_id
      AND ur.user_id = auth.uid()
  )
);

CREATE POLICY "company_etapas_delete"
ON public.etapas
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.funis f
    JOIN public.user_roles ur ON ur.company_id = f.company_id
    WHERE f.id = etapas.funil_id
      AND ur.user_id = auth.uid()
  )
);

-- 6) Função auxiliar para validar acesso ao funil
CREATE OR REPLACE FUNCTION public.assert_user_can_access_funil(p_funil_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN 
    RAISE EXCEPTION 'Usuário não autenticado'; 
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.funis f
    JOIN public.user_roles ur ON ur.company_id = f.company_id
    WHERE f.id = p_funil_id
      AND ur.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Usuário não possui acesso a este funil';
  END IF;
END;
$$;

-- 7) Função para reordenar etapas de forma atômica e segura
CREATE OR REPLACE FUNCTION public.reorder_etapas(p_funil_id UUID, p_order UUID[])
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE 
  v_idx INT := 1; 
  v_etapa UUID;
BEGIN
  PERFORM public.assert_user_can_access_funil(p_funil_id);
  
  FOREACH v_etapa IN ARRAY p_order LOOP
    UPDATE public.etapas
       SET posicao = v_idx,
           atualizado_em = NOW()
     WHERE id = v_etapa 
       AND funil_id = p_funil_id;
    v_idx := v_idx + 1;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.assert_user_can_access_funil(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reorder_etapas(UUID, UUID[]) TO authenticated;