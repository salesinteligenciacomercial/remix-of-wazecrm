-- Função auxiliar para validar acesso a um funil
CREATE OR REPLACE FUNCTION public.assert_user_can_access_funil(p_funil_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.funis f
    LEFT JOIN public.user_roles ur ON ur.company_id = f.company_id
    WHERE f.id = p_funil_id
      AND (
        f.owner_id = v_user_id OR
        ur.user_id = v_user_id
      )
  ) THEN
    RAISE EXCEPTION 'Usuário não possui acesso a este funil';
  END IF;
END;
$$;

ALTER FUNCTION public.assert_user_can_access_funil(UUID) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.assert_user_can_access_funil(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assert_user_can_access_funil(UUID) TO service_role;

-- Função RPC para reordenar etapas de um funil
CREATE OR REPLACE FUNCTION public.reorder_etapas(p_funil_id UUID, p_order UUID[])
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_index INT;
  v_etapa_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  IF p_funil_id IS NULL THEN
    RAISE EXCEPTION 'Funil inválido';
  END IF;

  IF p_order IS NULL OR array_length(p_order, 1) IS NULL THEN
    RAISE EXCEPTION 'Lista de etapas inválida';
  END IF;

  PERFORM public.assert_user_can_access_funil(p_funil_id);

  v_index := 1;
  FOREACH v_etapa_id IN ARRAY p_order LOOP
    UPDATE public.etapas
    SET posicao = v_index,
        atualizado_em = NOW()
    WHERE id = v_etapa_id
      AND funil_id = p_funil_id;

    v_index := v_index + 1;
  END LOOP;
END;
$$;

ALTER FUNCTION public.reorder_etapas(UUID, UUID[]) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.reorder_etapas(UUID, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reorder_etapas(UUID, UUID[]) TO service_role;
