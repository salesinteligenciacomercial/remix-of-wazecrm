import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScheduledMessage {
  id: string;
  phone_number: string;
  message_content: string;
  scheduled_datetime: string;
  company_id: string;
  owner_id?: string;
  contact_name?: string;
  conversation_id?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🔍 Buscando mensagens agendadas pendentes...');

    // Buscar mensagens pendentes que já passaram da hora agendada
    const { data: messages, error: fetchError } = await supabase
      .from('scheduled_whatsapp_messages')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_datetime', new Date().toISOString())
      .order('scheduled_datetime', { ascending: true })
      .limit(50);

    if (fetchError) {
      console.error('❌ Erro ao buscar mensagens:', fetchError);
      throw fetchError;
    }

    console.log(`📨 Encontradas ${messages?.length || 0} mensagens para enviar`);

    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'Nenhuma mensagem pendente' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = [];

    for (const message of messages as ScheduledMessage[]) {
      try {
        console.log(`📤 Enviando mensagem ${message.id} para ${message.phone_number}`);

        // Buscar conexão WhatsApp da empresa
        const { data: connection } = await supabase
          .from('whatsapp_connections')
          .select('*')
          .eq('company_id', message.company_id)
          .eq('status', 'connected')
          .maybeSingle();

        if (!connection) {
          console.error(`❌ Nenhuma conexão WhatsApp ativa para empresa ${message.company_id}`);
          
          await supabase
            .from('scheduled_whatsapp_messages')
            .update({
              status: 'failed',
              error_message: 'Nenhuma conexão WhatsApp ativa',
              updated_at: new Date().toISOString()
            })
            .eq('id', message.id);

          results.push({ id: message.id, status: 'failed', error: 'Sem conexão WhatsApp' });
          continue;
        }

        // Chamar edge function de envio de WhatsApp
        const { data: sendResult, error: sendError } = await supabase.functions.invoke(
          'enviar-whatsapp',
          {
            body: {
              numero: message.phone_number,
              mensagem: message.message_content,
              company_id: message.company_id,
            },
          }
        );

        if (sendError || !sendResult?.success) {
          console.error(`❌ Erro ao enviar mensagem:`, sendError || sendResult);
          
          await supabase
            .from('scheduled_whatsapp_messages')
            .update({
              status: 'failed',
              error_message: sendError?.message || sendResult?.error || 'Erro ao enviar',
              updated_at: new Date().toISOString()
            })
            .eq('id', message.id);

          results.push({ 
            id: message.id, 
            status: 'failed', 
            error: sendError?.message || 'Erro ao enviar' 
          });
        } else {
          console.log(`✅ Mensagem ${message.id} enviada com sucesso`);
          
          // Atualizar status da mensagem agendada
          await supabase
            .from('scheduled_whatsapp_messages')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', message.id);

          // Criar registro na tabela conversas para exibir a mensagem enviada no CRM
          const { error: conversaError } = await supabase
            .from('conversas')
            .insert({
              numero: message.phone_number,
              mensagem: message.message_content,
              origem: 'WhatsApp',
              status: 'Enviada',
              tipo_mensagem: 'text',
              nome_contato: (message as any).contact_name || message.phone_number,
              owner_id: (message as any).owner_id,
              company_id: message.company_id,
              fromme: true, // CORRIGIDO: usar fromme (minúsculo) como está no banco
              created_at: new Date().toISOString()
            });

          if (conversaError) {
            console.error(`⚠️ Erro ao salvar conversa no CRM:`, conversaError);
          } else {
            console.log(`💬 Mensagem salva no CRM para conversa ${message.phone_number}`);
          }

          results.push({ id: message.id, status: 'sent' });
        }

        // Aguardar 1 segundo entre cada envio para não sobrecarregar
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`❌ Erro ao processar mensagem ${message.id}:`, error);
        
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        
        await supabase
          .from('scheduled_whatsapp_messages')
          .update({
            status: 'failed',
            error_message: errorMessage,
            updated_at: new Date().toISOString()
          })
          .eq('id', message.id);

        results.push({ 
          id: message.id, 
          status: 'failed', 
          error: errorMessage
        });
      }
    }

    console.log('✅ Processamento concluído:', results);

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: results.length,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro geral:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});