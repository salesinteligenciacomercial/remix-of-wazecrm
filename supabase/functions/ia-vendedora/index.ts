import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { conversationId, message, leadData, productInfo } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    const leadContext = leadData ? `
Lead: ${leadData.name}
Empresa: ${leadData.company || 'Não informado'}
Valor em negociação: ${leadData.value ? `R$ ${leadData.value}` : 'Não definido'}
Etapa: ${leadData.funnelStage || 'Novo'}
Status: ${leadData.status || 'novo'}
` : '';

    const productContext = productInfo ? `
PRODUTO/SERVIÇO:
${productInfo}
` : '';

    const systemPrompt = `Você é uma IA vendedora especializada em conversão comercial.

CONTEXTO:
${leadContext}
${productContext}

ESTRATÉGIA DE VENDAS:
1. Identificar a dor/necessidade do cliente
2. Apresentar benefícios do produto (não características técnicas)
3. Criar senso de urgência quando apropriado
4. Superar objeções de forma consultiva
5. Conduzir para fechamento ou próximo passo

TÉCNICAS:
- Use perguntas abertas para entender necessidades
- Faça conexões emocionais (como o produto ajuda a resolver o problema)
- Apresente prova social quando possível
- Ofereça opções limitadas (evite paralisia por escolha)
- Seja assertivo mas não agressivo

AÇÕES DISPONÍVEIS:
- [QUALIFICAR_ORCAMENTO]: quando descobrir budget/orçamento
- [ENVIAR_PROPOSTA]: quando estiver pronto para proposta formal
- [AGENDAR_REUNIAO]: para demonstração ou negociação
- [APLICAR_DESCONTO]: se autorizado e estratégico
- [SOLICITAR_APROVACAO]: para valores acima da alçada

Responda de forma persuasiva mas genuína. Máximo 4 linhas. Inclua ação entre colchetes se aplicável.`;

    console.log('💰 IA Vendedora - Processando:', { conversationId, message: message.substring(0, 50) });

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.8,
        max_tokens: 600,
      }),
    });

    if (!response.ok) {
      if (response.status === 429 || response.status === 402) {
        return new Response(
          JSON.stringify({ error: response.status === 429 ? 'Rate limit' : 'Créditos insuficientes' }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`Erro da IA: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    const actionMatch = aiResponse.match(/\[(QUALIFICAR_ORCAMENTO|ENVIAR_PROPOSTA|AGENDAR_REUNIAO|APLICAR_DESCONTO|SOLICITAR_APROVACAO)\]/);
    const action = actionMatch ? actionMatch[1] : null;
    const cleanResponse = aiResponse.replace(/\[(QUALIFICAR_ORCAMENTO|ENVIAR_PROPOSTA|AGENDAR_REUNIAO|APLICAR_DESCONTO|SOLICITAR_APROVACAO)\]/g, '').trim();

    // Registrar no sistema de aprendizado
    try {
      await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/ia-aprendizado`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'record_interaction',
          data: {
            company_id: leadData?.company_id,
            agent_type: 'vendedora',
            conversation_id: conversationId,
            lead_id: leadData?.id,
            input_message: message,
            ai_response: cleanResponse,
            context_data: { action, leadData, productInfo }
          }
        })
      });
    } catch (e) {
      console.log('Erro ao registrar aprendizado:', e);
    }

    console.log('✅ IA Vendedora - Resposta:', { action, response: cleanResponse.substring(0, 50) });

    return new Response(
      JSON.stringify({ 
        response: cleanResponse,
        action,
        conversationId 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('❌ Erro na ia-vendedora:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
