import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SQL = `
-- Funções auxiliares e políticas para corrigir funil/etapas
DO $$
BEGIN
  -- Função de acesso a funil
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
      LEFT JOIN public.user_roles ur ON ur.company_id = f.company_id
      WHERE f.id = p_funil_id
        AND (
          f.owner_id = auth.uid() OR
          ur.user_id = auth.uid()
        )
    ) THEN
      RAISE EXCEPTION 'Usuário não possui acesso a este funil';
    END IF;
  END;
  $$;

  -- RPC de reordenação
  CREATE OR REPLACE FUNCTION public.reorder_etapas(p_funil_id UUID, p_order UUID[])
  RETURNS VOID
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
  DECLARE v_index INT; v_etapa UUID;
  BEGIN
    PERFORM public.assert_user_can_access_funil(p_funil_id);
    v_index := 1;
    FOREACH v_etapa IN ARRAY p_order LOOP
      UPDATE public.etapas
         SET posicao = v_index,
             atualizado_em = NOW()
       WHERE id = v_etapa AND funil_id = p_funil_id;
      v_index := v_index + 1;
    END LOOP;
  END;
  $$;

  -- Políticas de UPDATE em funis para usuários da empresa
  BEGIN
    DROP POLICY IF EXISTS "Users can update their company funis" ON public.funis;
  EXCEPTION WHEN undefined_object THEN NULL; END;

  DO $$ BEGIN
    CREATE POLICY "Company users can update funis"
    ON public.funis
    FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.company_id = funis.company_id
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.company_id = funis.company_id
      )
    );
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;

  -- Políticas de UPDATE em etapas para usuários da empresa do funil
  BEGIN
    DROP POLICY IF EXISTS "Users can update etapas from their funis" ON public.etapas;
  EXCEPTION WHEN undefined_object THEN NULL; END;

  DO $$ BEGIN
    CREATE POLICY "Company users can update etapas"
    ON public.etapas
    FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM public.funis f
        JOIN public.user_roles ur ON ur.company_id = f.company_id
        WHERE f.id = etapas.funil_id AND ur.user_id = auth.uid()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.funis f
        JOIN public.user_roles ur ON ur.company_id = f.company_id
        WHERE f.id = etapas.funil_id AND ur.user_id = auth.uid()
      )
    );
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
END $$;
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const dbUrl = Deno.env.get("SUPABASE_DB_URL");

    const authHeader = req.headers.get("Authorization")!;
    const supabase = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });

    // Requer usuário autenticado
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Execução do SQL diretamente via conexão ao banco (service scope)
    if (!dbUrl) {
      return new Response(JSON.stringify({ error: "SUPABASE_DB_URL não configurada" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const client = new Client(dbUrl);
    await client.connect();
    try {
      await client.queryArray(SQL);
    } finally {
      await client.end();
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("setup-funil error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});



