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
    const { conversationId, message, leadData, knowledgeBase } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    const leadContext = leadData ? `
Cliente: ${leadData.name}
Empresa: ${leadData.company || 'Não informado'}
Histórico de compras: ${leadData.purchaseHistory || 'Primeiro contato'}
` : '';

    const knowledgeContext = knowledgeBase ? `
BASE DE CONHECIMENTO:
${knowledgeBase}
` : '';

    const systemPrompt = `Você é uma IA de suporte ao cliente especializada em resolver dúvidas.

CONTEXTO:
${leadContext}
${knowledgeContext}

PRINCÍPIOS DO SUPORTE:
1. Empatia primeiro - reconheça o problema
2. Seja claro e objetivo nas soluções
3. Ofereça passos práticos e acionáveis
4. Verifique se o problema foi resolvido
5. Se não souber, admita e transfira para humano

DÚVIDAS COMUNS:
- Como usar o produto/serviço
- Problemas técnicos
- Dúvidas sobre cobrança
- Solicitações de mudanças/upgrades
- Cancelamentos (tente reter com soluções)

AÇÕES DISPONÍVEIS:
- [TUTORIAL]: enviar tutorial ou documentação
- [ABRIR_TICKET]: criar ticket de suporte técnico
- [ESCALAR]: transferir para supervisor/especialista
- [SOLICITAR_FEEDBACK]: após resolver, pedir avaliação
- [OFERECER_UPGRADE]: se problema seria resolvido com plano superior

Responda de forma clara e helpful. Máximo 5 linhas. Inclua ação entre colchetes se aplicável.`;

    console.log('🛠️ IA Suporte - Processando:', { conversationId, message: message.substring(0, 50) });

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
        temperature: 0.6,
        max_tokens: 700,
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

    const actionMatch = aiResponse.match(/\[(TUTORIAL|ABRIR_TICKET|ESCALAR|SOLICITAR_FEEDBACK|OFERECER_UPGRADE)\]/);
    const action = actionMatch ? actionMatch[1] : null;
    const cleanResponse = aiResponse.replace(/\[(TUTORIAL|ABRIR_TICKET|ESCALAR|SOLICITAR_FEEDBACK|OFERECER_UPGRADE)\]/g, '').trim();

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
            agent_type: 'suporte',
            conversation_id: conversationId,
            lead_id: leadData?.id,
            input_message: message,
            ai_response: cleanResponse,
            context_data: { action, leadData, knowledgeBase }
          }
        })
      });
    } catch (e) {
      console.log('Erro ao registrar aprendizado:', e);
    }

    console.log('✅ IA Suporte - Resposta:', { action, response: cleanResponse.substring(0, 50) });

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
    console.error('❌ Erro na ia-suporte:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
