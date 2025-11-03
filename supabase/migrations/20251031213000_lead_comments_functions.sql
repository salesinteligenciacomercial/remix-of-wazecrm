-- Ensure helper composite type exists for returning comments
-- (idempotent guard because CREATE TYPE IF NOT EXISTS is not available directly)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'lead_comment_view'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.lead_comment_view AS (
      id UUID,
      comment TEXT,
      created_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ,
      user_id UUID,
      user_name TEXT,
      user_email TEXT
    );
  END IF;
END $$;

-- Function to ensure the lead_comments table (and policies) exist.
CREATE OR REPLACE FUNCTION public.ensure_lead_comments_table()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'lead_comments'
  ) THEN
    EXECUTE $$
      CREATE TABLE public.lead_comments (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        comment TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
      )
    $$;
  END IF;

  EXECUTE 'ALTER TABLE public.lead_comments ENABLE ROW LEVEL SECURITY';

  -- Indexes
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'lead_comments' AND indexname = 'idx_lead_comments_lead_id'
  ) THEN
    EXECUTE 'CREATE INDEX idx_lead_comments_lead_id ON public.lead_comments(lead_id)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'lead_comments' AND indexname = 'idx_lead_comments_user_id'
  ) THEN
    EXECUTE 'CREATE INDEX idx_lead_comments_user_id ON public.lead_comments(user_id)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'lead_comments' AND indexname = 'idx_lead_comments_created_at'
  ) THEN
    EXECUTE 'CREATE INDEX idx_lead_comments_created_at ON public.lead_comments(created_at DESC)';
  END IF;

  -- Policies (create only if missing)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'lead_comments' AND policyname = 'lead_comments_select_policy'
  ) THEN
    EXECUTE $$
      CREATE POLICY lead_comments_select_policy ON public.lead_comments
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.leads l
          JOIN public.user_roles ur ON ur.company_id = l.company_id
          WHERE l.id = lead_comments.lead_id
            AND ur.user_id = auth.uid()
        )
      )
    $$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'lead_comments' AND policyname = 'lead_comments_insert_policy'
  ) THEN
    EXECUTE $$
      CREATE POLICY lead_comments_insert_policy ON public.lead_comments
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.leads l
          JOIN public.user_roles ur ON ur.company_id = l.company_id
          WHERE l.id = lead_comments.lead_id
            AND ur.user_id = auth.uid()
        )
      )
    $$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'lead_comments' AND policyname = 'lead_comments_update_policy'
  ) THEN
    EXECUTE $$
      CREATE POLICY lead_comments_update_policy ON public.lead_comments
      FOR UPDATE USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid())
    $$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'lead_comments' AND policyname = 'lead_comments_delete_policy'
  ) THEN
    EXECUTE $$
      CREATE POLICY lead_comments_delete_policy ON public.lead_comments
      FOR DELETE USING (user_id = auth.uid())
    $$;
  END IF;
END;
$$;

ALTER FUNCTION public.ensure_lead_comments_table() OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.ensure_lead_comments_table() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_lead_comments_table() TO service_role;

-- Helper function to validate if the current user can access a lead
CREATE OR REPLACE FUNCTION public.assert_user_can_access_lead(p_lead_id UUID)
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
    FROM public.leads l
    JOIN public.user_roles ur ON ur.company_id = l.company_id
    WHERE l.id = p_lead_id
      AND ur.user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Usuário não possui acesso a este lead';
  END IF;
END;
$$;

ALTER FUNCTION public.assert_user_can_access_lead(UUID) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.assert_user_can_access_lead(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assert_user_can_access_lead(UUID) TO service_role;

-- RPC: obter comentários de um lead
CREATE OR REPLACE FUNCTION public.get_lead_comments(p_lead_id UUID)
RETURNS SETOF public.lead_comment_view
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

  PERFORM public.ensure_lead_comments_table();
  PERFORM public.assert_user_can_access_lead(p_lead_id);

  RETURN QUERY
  SELECT
    lc.id,
    lc.comment,
    lc.created_at,
    lc.updated_at,
    lc.user_id,
    COALESCE(ur.name, 'Usuário') AS user_name,
    ur.email AS user_email
  FROM public.lead_comments lc
  LEFT JOIN public.user_roles ur ON ur.user_id = lc.user_id
  WHERE lc.lead_id = p_lead_id
  ORDER BY lc.created_at DESC;
END;
$$;

ALTER FUNCTION public.get_lead_comments(UUID) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.get_lead_comments(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_lead_comments(UUID) TO service_role;

-- RPC: adicionar comentário a um lead
CREATE OR REPLACE FUNCTION public.add_lead_comment(p_lead_id UUID, p_comment TEXT)
RETURNS public.lead_comment_view
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_result public.lead_comment_view;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  IF p_comment IS NULL OR length(trim(p_comment)) = 0 THEN
    RAISE EXCEPTION 'Comentário não pode ser vazio';
  END IF;

  PERFORM public.ensure_lead_comments_table();
  PERFORM public.assert_user_can_access_lead(p_lead_id);

  INSERT INTO public.lead_comments (lead_id, user_id, comment)
  VALUES (p_lead_id, v_user_id, trim(p_comment))
  RETURNING id, comment, created_at, updated_at, user_id
  INTO v_result.id, v_result.comment, v_result.created_at, v_result.updated_at, v_result.user_id;

  SELECT COALESCE(ur.name, 'Usuário'), ur.email
  INTO v_result.user_name, v_result.user_email
  FROM public.user_roles ur
  WHERE ur.user_id = v_user_id
  LIMIT 1;

  IF v_result.user_name IS NULL THEN
    v_result.user_name := 'Usuário';
  END IF;

  RETURN v_result;
END;
$$;

ALTER FUNCTION public.add_lead_comment(UUID, TEXT) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.add_lead_comment(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_lead_comment(UUID, TEXT) TO service_role;

-- RPC: remover comentário (somente autor)
CREATE OR REPLACE FUNCTION public.delete_lead_comment(p_comment_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_comment RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  PERFORM public.ensure_lead_comments_table();

  SELECT id, lead_id, user_id
  INTO v_comment
  FROM public.lead_comments
  WHERE id = p_comment_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF v_comment.user_id <> v_user_id THEN
    RAISE EXCEPTION 'Usuário não autorizado a remover este comentário';
  END IF;

  PERFORM public.assert_user_can_access_lead(v_comment.lead_id);

  DELETE FROM public.lead_comments WHERE id = p_comment_id;
END;
$$;

ALTER FUNCTION public.delete_lead_comment(UUID) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.delete_lead_comment(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_lead_comment(UUID) TO service_role;
