import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { conversationId, message, leadData, companyId } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl!, supabaseKey!);

    console.log('🎯 IA Orchestrator - Detectando intenção:', message.substring(0, 50));

    // Verificar configurações de IA da empresa
    const { data: config } = await supabase
      .from('ia_configurations')
      .select('custom_prompts')
      .eq('company_id', companyId)
      .single();

    const customPrompts = config?.custom_prompts || {};

    // Detectar intenção da mensagem
    const messageLower = message.toLowerCase();
    let agentType = 'atendimento'; // Default

    // Palavras-chave para agendamento
    if (messageLower.match(/\b(agendar|marcar|horário|consulta|disponível|agenda)\b/)) {
      if (customPrompts.agendamento?.enabled) {
        agentType = 'agendamento';
      }
    }
    // Palavras-chave para vendas
    else if (messageLower.match(/\b(preço|valor|quanto|comprar|adquirir|plano|pacote)\b/)) {
      if (customPrompts.vendedora?.enabled) {
        agentType = 'vendedora';
      }
    }
    // Palavras-chave para suporte
    else if (messageLower.match(/\b(problema|erro|ajuda|não funciona|bug|suporte)\b/)) {
      if (customPrompts.suporte?.enabled) {
        agentType = 'suporte';
      }
    }

    console.log('🤖 Roteando para agente:', agentType);

    // Chamar o agente apropriado
    const response = await fetch(`${supabaseUrl}/functions/v1/ia-${agentType}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        conversationId,
        message,
        leadData,
        companyId
      })
    });

    if (!response.ok) {
      throw new Error(`Erro ao chamar ia-${agentType}: ${response.status}`);
    }

    const agentResponse = await response.json();

    // Executar ações de CRM automaticamente se houver
    if (agentResponse.action) {
      console.log('🔧 Executando ação:', agentResponse.action);
      
      // Mover lead no funil
      if (agentResponse.action.startsWith('MOVER_FUNIL:')) {
        const etapaNome = agentResponse.action.split(':')[1];
        await fetch(`${supabaseUrl}/functions/v1/ia-tools`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'mover_lead_funil',
            data: {
              lead_id: leadData?.id,
              etapa_nome: etapaNome,
              funil_id: leadData?.funil_id
            }
          })
        });
      }
      
      // Adicionar tags
      if (agentResponse.action.startsWith('ADICIONAR_TAG:')) {
        const tag = agentResponse.action.split(':')[1];
        await fetch(`${supabaseUrl}/functions/v1/ia-tools`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'adicionar_tags_lead',
            data: {
              lead_id: leadData?.id,
              tags: [tag]
            }
          })
        });
      }
      
      // Criar tarefa
      if (agentResponse.action.startsWith('CRIAR_TAREFA:')) {
        const titulo = agentResponse.action.split(':')[1];
        await fetch(`${supabaseUrl}/functions/v1/ia-tools`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'criar_tarefa',
            data: {
              title: titulo,
              lead_id: leadData?.id,
              owner_id: leadData?.owner_id,
              company_id: companyId,
              priority: 'media',
              start_date: new Date().toISOString()
            }
          })
        });
      }

      // Coletar dados
      if (agentResponse.action.startsWith('COLETAR_DADOS:')) {
        const dados = agentResponse.action.split(':')[1].split(',').reduce((acc: any, pair: string) => {
          const [key, value] = pair.split('=');
          acc[key] = value;
          return acc;
        }, {});
        
        await fetch(`${supabaseUrl}/functions/v1/ia-tools`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'adicionar_info_lead',
            data: {
              lead_id: leadData?.id,
              ...dados
            }
          })
        });
      }
    }

    console.log('✅ IA Orchestrator - Resposta processada');

    return new Response(
      JSON.stringify(agentResponse),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('❌ Erro no ia-orchestrator:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
