import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Webhook para receber atualizações de status de mensagens do WhatsApp Meta API
serve(async (req) => {
  const url = new URL(req.url);
  
  // === GET: Verificação do webhook (Meta envia GET para verificar) ===
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    
    // Token de verificação (deve ser configurado no Meta Developer)
    const VERIFY_TOKEN = Deno.env.get('WHATSAPP_WEBHOOK_VERIFY_TOKEN') || 'appceusia_webhook_verify_2024';
    
    console.log('Webhook Verification Request:', { mode, token, challenge });
    
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('Webhook verificado com sucesso');
      return new Response(challenge, { status: 200 });
    }
    
    return new Response('Forbidden', { status: 403 });
  }

  // === OPTIONS: CORS ===
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // === POST: Receber atualizações de status ===
  if (req.method === 'POST') {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    try {
      const body = await req.json();
      console.log('Webhook Status - Payload:', JSON.stringify(body, null, 2));

      // Verificar se é um evento do WhatsApp Business API
      if (body.object !== 'whatsapp_business_account') {
        console.log('Evento ignorado - não é WhatsApp Business');
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Processar cada entrada
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field !== 'messages') continue;

          const value = change.value;
          const phoneNumberId = value.metadata?.phone_number_id;
          
          // Buscar company_id pelo phone_number_id
          const { data: connection } = await supabase
            .from('whatsapp_connections')
            .select('company_id')
            .eq('meta_phone_number_id', phoneNumberId)
            .single();

          const companyId = connection?.company_id;

          // Processar status de mensagens
          for (const status of value.statuses || []) {
            const messageId = status.id;
            const recipientId = status.recipient_id;
            const messageStatus = status.status; // sent, delivered, read, failed
            const timestamp = new Date(parseInt(status.timestamp) * 1000).toISOString();
            const errorInfo = status.errors?.[0];

            console.log(`Status Update: ${messageId} -> ${messageStatus}`);

            // Atualizar log de mensagem
            const updateData: Record<string, any> = {
              status: messageStatus
            };

            switch (messageStatus) {
              case 'sent':
                updateData.sent_at = timestamp;
                break;
              case 'delivered':
                updateData.delivered_at = timestamp;
                break;
              case 'read':
                updateData.read_at = timestamp;
                break;
              case 'failed':
                updateData.failed_at = timestamp;
                updateData.error_code = errorInfo?.code;
                updateData.error_message = errorInfo?.message;
                break;
            }

            // Tentar atualizar pelo message_id_meta
            const { data: updated, error } = await supabase
              .from('whatsapp_message_logs')
              .update(updateData)
              .eq('message_id_meta', messageId)
              .select();

            if (error) {
              console.error('Erro ao atualizar log:', error);
            } else if (updated && updated.length === 0) {
              // Se não encontrou, criar novo registro
              console.log('Mensagem não encontrada, criando novo log');
              await supabase
                .from('whatsapp_message_logs')
                .insert({
                  company_id: companyId,
                  message_id_meta: messageId,
                  phone_number: recipientId,
                  provider: 'meta',
                  direction: 'outbound',
                  ...updateData
                });
            } else {
              console.log('Log atualizado:', updated);
            }

            // Atualizar analytics de campanha se houver
            if (companyId && messageStatus === 'delivered') {
              // Incrementar contador de entregues (ignora se falhar)
              try {
                await supabase.rpc('increment_campaign_delivered', { 
                  p_company_id: companyId 
                });
              } catch {
                // RPC não existe, ignorar
              }
            }
          }

          // Processar mensagens recebidas (para contagem)
          for (const message of value.messages || []) {
            const from = message.from;
            const messageType = message.type;
            const timestamp = new Date(parseInt(message.timestamp) * 1000).toISOString();

            console.log(`Mensagem recebida de ${from}: ${messageType}`);

            // Registrar mensagem recebida
            await supabase
              .from('whatsapp_message_logs')
              .insert({
                company_id: companyId,
                message_id_meta: message.id,
                phone_number: from,
                provider: 'meta',
                direction: 'inbound',
                message_type: messageType,
                status: 'received',
                sent_at: timestamp
              });
          }
        }
      }

      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error: unknown) {
      console.error('Webhook Status Error:', error);
      // Meta espera 200 mesmo em caso de erro para não reenviar
      return new Response(JSON.stringify({ received: true, error: 'processing_error' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  return new Response('Method Not Allowed', { status: 405 });
});