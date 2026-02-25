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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { companyId } = await req.json();

    if (!companyId) {
      return new Response(JSON.stringify({ error: 'companyId obrigatório' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 1. Buscar conexão no banco
    const { data: conn, error: connErr } = await supabase
      .from('whatsapp_connections')
      .select('*')
      .eq('company_id', companyId)
      .single();

    if (connErr || !conn) {
      return new Response(JSON.stringify({ 
        error: 'Nenhuma conexão encontrada',
        diagnostico: { conexao_banco: false }
      }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const baseUrl = (conn.evolution_api_url || '').replace(/\/+$/, '');
    const apiKey = conn.evolution_api_key || '';
    const instanceName = conn.instance_name;

    const diagnostico: any = {
      conexao_banco: {
        instance_name: instanceName,
        status_banco: conn.status,
        api_provider: conn.api_provider,
        evolution_url: baseUrl,
        has_api_key: !!apiKey,
        created_at: conn.created_at,
        updated_at: conn.updated_at,
      },
      estado_evolution: null,
      webhook_config: null,
      teste_envio: null,
      acoes_necessarias: [],
    };

    // 2. Verificar estado real na Evolution API
    if (baseUrl && apiKey && instanceName) {
      try {
        const stateRes = await fetch(`${baseUrl}/instance/connectionState/${instanceName}`, {
          method: 'GET',
          headers: { 'apikey': apiKey },
        });
        const stateData = await stateRes.json();
        const state = (stateData?.instance?.state || stateData?.state || 'unknown').toLowerCase();
        
        diagnostico.estado_evolution = {
          state,
          raw: stateData,
          conectado: ['open', 'connected'].includes(state),
        };

        if (!['open', 'connected'].includes(state)) {
          diagnostico.acoes_necessarias.push('RECONECTAR_QR: A instância está com estado "' + state + '". Necessário escanear novo QR Code.');
        }

        // Corrigir status no banco se divergente
        if (['open', 'connected'].includes(state) && conn.status !== 'connected') {
          await supabase
            .from('whatsapp_connections')
            .update({ status: 'connected', updated_at: new Date().toISOString() })
            .eq('company_id', companyId);
          diagnostico.acoes_necessarias.push('STATUS_CORRIGIDO: Status atualizado de "' + conn.status + '" para "connected" no banco.');
        }
      } catch (e) {
        diagnostico.estado_evolution = { error: String(e) };
        diagnostico.acoes_necessarias.push('EVOLUTION_OFFLINE: Não foi possível conectar ao servidor Evolution API.');
      }

      // 3. Verificar configuração do webhook
      try {
        const webhookRes = await fetch(`${baseUrl}/webhook/find/${instanceName}`, {
          method: 'GET',
          headers: { 'apikey': apiKey },
        });
        const webhookData = await webhookRes.json();
        diagnostico.webhook_config = webhookData;

        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const expectedUrl = `${supabaseUrl}/functions/v1/webhook-conversas?instance=${instanceName}`;
        
        // Check if webhook URL matches
        const currentUrl = webhookData?.url || webhookData?.webhook?.url || '';
        const webhookEnabled = webhookData?.enabled ?? webhookData?.webhook?.enabled ?? false;
        
        if (!currentUrl || !currentUrl.includes('webhook-conversas')) {
          diagnostico.acoes_necessarias.push('WEBHOOK_INCORRETO: URL do webhook não aponta para o CRM. Atual: "' + currentUrl + '"');
          
          // AUTO-FIX: Configurar webhook correto
          console.log('🔧 Auto-corrigindo webhook para:', expectedUrl);
          const fixRes = await fetch(`${baseUrl}/webhook/set/${instanceName}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
            body: JSON.stringify({
              webhook: {
                url: expectedUrl,
                webhookByEvents: false,
                webhookBase64: true,
                events: ['MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'CONNECTION_UPDATE', 'CONTACTS_UPSERT'],
                enabled: true,
              }
            }),
          });
          const fixData = await fixRes.json();
          diagnostico.webhook_fix = { success: fixRes.ok, data: fixData };
          if (fixRes.ok) {
            diagnostico.acoes_necessarias.push('WEBHOOK_CORRIGIDO: Webhook reconfigurado automaticamente para: ' + expectedUrl);
          }
        } else if (!webhookEnabled) {
          diagnostico.acoes_necessarias.push('WEBHOOK_DESABILITADO: Webhook existe mas está desabilitado.');
          
          // AUTO-FIX: Habilitar webhook
          const fixRes = await fetch(`${baseUrl}/webhook/set/${instanceName}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
            body: JSON.stringify({
              webhook: {
                url: expectedUrl,
                webhookByEvents: false,
                webhookBase64: true,
                events: ['MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'CONNECTION_UPDATE', 'CONTACTS_UPSERT'],
                enabled: true,
              }
            }),
          });
          const fixData = await fixRes.json();
          diagnostico.webhook_fix = { success: fixRes.ok, data: fixData };
        } else {
          diagnostico.acoes_necessarias.push('WEBHOOK_OK: Webhook configurado corretamente.');
        }
      } catch (e) {
        diagnostico.webhook_config = { error: String(e) };
      }

      // 4. Se conectado, testar envio simples (sem enviar de verdade, só verificar endpoint)
      if (diagnostico.estado_evolution?.conectado) {
        try {
          // Verificar se o endpoint de envio responde
          const testRes = await fetch(`${baseUrl}/message/sendText/${instanceName}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
            body: JSON.stringify({ number: '0', text: '' }),
          });
          const testData = await testRes.json();
          diagnostico.teste_envio = {
            endpoint_ativo: testRes.status !== 404,
            status: testRes.status,
            resposta: testData,
          };
        } catch (e) {
          diagnostico.teste_envio = { error: String(e) };
        }
      }
    }

    if (diagnostico.acoes_necessarias.length === 0) {
      diagnostico.acoes_necessarias.push('TUDO_OK: Nenhum problema detectado.');
    }

    return new Response(JSON.stringify({ success: true, diagnostico }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Erro diagnóstico:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
