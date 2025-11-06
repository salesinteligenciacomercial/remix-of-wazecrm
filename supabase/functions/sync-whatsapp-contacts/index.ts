import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL") || "https://evo.continuum.tec.br";
const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { instanceName } = await req.json();

    if (!instanceName) {
      return new Response(
        JSON.stringify({ error: 'Instance name é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🔄 Buscando contatos da instância: ${instanceName}`);

    // Buscar contatos da Evolution API
    const response = await fetch(
      `${EVOLUTION_API_URL}/chat/findContacts/${instanceName}`,
      {
        method: 'GET',
        headers: {
          'apikey': EVOLUTION_API_KEY || '',
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro da Evolution API:', response.status, errorText);
      
      return new Response(
        JSON.stringify({ 
          error: 'Falha ao buscar contatos',
          status: response.status,
          details: errorText
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const contacts = await response.json();
    
    console.log(`✅ ${contacts?.length || 0} contatos recuperados`);

    return new Response(
      JSON.stringify({ contacts }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro ao sincronizar contatos:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Erro interno',
        details: String(error)
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
