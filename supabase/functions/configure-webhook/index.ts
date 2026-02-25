import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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

    const { instanceName, companyId } = await req.json();

    if (!instanceName) {
      return new Response(JSON.stringify({ error: 'instanceName é obrigatório' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get connection info
    const { data: conn, error: connErr } = await supabase
      .from('whatsapp_connections')
      .select('evolution_api_url, evolution_api_key, instance_name')
      .eq('instance_name', instanceName)
      .single();

    if (connErr || !conn) {
      return new Response(JSON.stringify({ error: 'Conexão não encontrada', details: connErr }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const baseUrl = conn.evolution_api_url.replace(/\/+$/, '');
    const apiKey = conn.evolution_api_key;
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const webhookUrl = `${supabaseUrl}/functions/v1/webhook-conversas?instance=${instanceName}`;

    console.log('🔗 [CONFIGURE-WEBHOOK] Base URL:', baseUrl);
    console.log('🔗 [CONFIGURE-WEBHOOK] Webhook URL:', webhookUrl);

    // Step 1: Check current webhook config
    let currentWebhook = null;
    try {
      const findRes = await fetch(`${baseUrl}/webhook/find/${instanceName}`, {
        method: 'GET',
        headers: { 'apikey': apiKey, 'Content-Type': 'application/json' },
      });
      currentWebhook = await findRes.json();
      console.log('📡 [CONFIGURE-WEBHOOK] Webhook atual:', JSON.stringify(currentWebhook));
    } catch (e) {
      console.warn('⚠️ Não foi possível verificar webhook atual:', e);
    }

    // Step 2: Set webhook with all required events
    const webhookPayload = {
      webhook: {
        url: webhookUrl,
        webhookByEvents: false,
        webhookBase64: true,
        events: [
          'MESSAGES_UPSERT',
          'MESSAGES_UPDATE', 
          'CONNECTION_UPDATE',
          'CONTACTS_UPSERT',
        ],
        enabled: true,
      }
    };

    console.log('📤 [CONFIGURE-WEBHOOK] Enviando config:', JSON.stringify(webhookPayload));

    const setRes = await fetch(`${baseUrl}/webhook/set/${instanceName}`, {
      method: 'POST',
      headers: { 'apikey': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookPayload),
    });

    const setData = await setRes.json();
    console.log('📡 [CONFIGURE-WEBHOOK] Resposta set:', JSON.stringify(setData));

    if (!setRes.ok) {
      // Try alternative endpoint format (v2)
      console.log('🔄 [CONFIGURE-WEBHOOK] Tentando formato alternativo...');
      
      const altPayload = {
        webhook: {
          url: webhookUrl,
          webhookByEvents: false,
          webhookBase64: true,
          events: [
            'MESSAGES_UPSERT',
            'MESSAGES_UPDATE',
            'CONNECTION_UPDATE',
            'CONTACTS_UPSERT',
          ],
          enabled: true,
        }
      };

      const altRes = await fetch(`${baseUrl}/webhook/set/${instanceName}`, {
        method: 'PUT',
        headers: { 'apikey': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify(altPayload),
      });

      const altData = await altRes.json();
      console.log('📡 [CONFIGURE-WEBHOOK] Resposta alternativa:', JSON.stringify(altData));

      return new Response(JSON.stringify({
        success: altRes.ok,
        currentWebhook,
        setResult: setData,
        altResult: altData,
        webhookUrl,
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Step 3: Verify by reading back
    let verifyWebhook = null;
    try {
      const verifyRes = await fetch(`${baseUrl}/webhook/find/${instanceName}`, {
        method: 'GET',
        headers: { 'apikey': apiKey, 'Content-Type': 'application/json' },
      });
      verifyWebhook = await verifyRes.json();
      console.log('✅ [CONFIGURE-WEBHOOK] Verificação:', JSON.stringify(verifyWebhook));
    } catch (e) {
      console.warn('⚠️ Erro na verificação:', e);
    }

    return new Response(JSON.stringify({
      success: true,
      currentWebhook,
      setResult: setData,
      verifyWebhook,
      webhookUrl,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ [CONFIGURE-WEBHOOK] Erro:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
