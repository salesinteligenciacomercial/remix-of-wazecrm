import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BuscarDadosRequest {
  userIds: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { userIds }: BuscarDadosRequest = await req.json();

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Lista de user IDs é obrigatória' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔍 [BUSCAR-DADOS] Buscando dados para', userIds.length, 'usuários');

    // Buscar dados dos usuários do auth.users
    const usersData: Array<{ id: string; email: string; full_name: string | null }> = [];

    for (const userId of userIds) {
      try {
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
        
        if (userError) {
          console.warn(`⚠️ [BUSCAR-DADOS] Erro ao buscar usuário ${userId}:`, userError);
          continue;
        }

        if (userData?.user) {
          const email = userData.user.email || '';
          const full_name = userData.user.user_metadata?.full_name || 
                           userData.user.user_metadata?.fullName || 
                           null;

          usersData.push({
            id: userId,
            email: email,
            full_name: full_name
          });
        }
      } catch (error) {
        console.warn(`⚠️ [BUSCAR-DADOS] Erro ao processar usuário ${userId}:`, error);
      }
    }

    // Também buscar/atualizar profiles na tabela profiles
    for (const userData of usersData) {
      try {
        await supabaseAdmin
          .from('profiles')
          .upsert({
            id: userData.id,
            full_name: userData.full_name || 'Usuário',
            email: userData.email,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'id'
          });
      } catch (error) {
        console.warn(`⚠️ [BUSCAR-DADOS] Erro ao atualizar profile para ${userData.id}:`, error);
      }
    }

    console.log(`✅ [BUSCAR-DADOS] Retornando dados de ${usersData.length} usuários`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        users: usersData 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('❌ [BUSCAR-DADOS] Erro:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erro ao buscar dados dos usuários',
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

