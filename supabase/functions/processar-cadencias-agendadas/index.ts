import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScheduledAction {
  id: string;
  cadence_progress_id: string;
  lead_id: string;
  company_id: string;
  step_number: number;
  channel: string;
  action_description: string;
  message_content: string;
  scheduled_at: string;
  status: string;
}

interface Lead {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  empresa: string;
  valor: number;
}

interface CadenceProgress {
  id: string;
  lead_id: string;
  status: string;
  current_step: number;
  total_steps: number;
  cadence_name: string;
}

// Replace variables in message template
function replaceVariables(template: string, lead: Lead): string {
  if (!template) return '';
  
  return template
    .replace(/\{\{nome\}\}/g, lead.nome || 'Cliente')
    .replace(/\{\{empresa\}\}/g, lead.empresa || '')
    .replace(/\{\{telefone\}\}/g, lead.telefone || '')
    .replace(/\{\{email\}\}/g, lead.email || '')
    .replace(/\{\{valor\}\}/g, lead.valor ? `R$ ${lead.valor.toLocaleString('pt-BR')}` : '');
}

// Format phone number for WhatsApp
function formatPhoneForWhatsApp(phone: string): string {
  if (!phone) return '';
  
  // Remove all non-numeric characters
  let cleaned = phone.replace(/\D/g, '');
  
  // Add Brazil country code if not present
  if (cleaned.length === 11 || cleaned.length === 10) {
    cleaned = '55' + cleaned;
  }
  
  return cleaned;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🔄 Processando cadências agendadas...');

    // Fetch pending actions that are due
    const now = new Date().toISOString();
    const { data: actions, error: fetchError } = await supabase
      .from('scheduled_cadence_actions')
      .select(`
        *,
        lead_cadence_progress:cadence_progress_id (
          id,
          lead_id,
          status,
          current_step,
          total_steps,
          cadence_name
        ),
        leads:lead_id (
          id,
          nome,
          email,
          telefone,
          empresa,
          valor
        )
      `)
      .eq('status', 'pending')
      .lte('scheduled_at', now)
      .order('scheduled_at', { ascending: true })
      .limit(50);

    if (fetchError) {
      console.error('Erro ao buscar ações:', fetchError);
      throw fetchError;
    }

    console.log(`📋 Encontradas ${actions?.length || 0} ações pendentes`);

    const results = {
      processed: 0,
      sent: 0,
      failed: 0,
      cancelled: 0,
      details: [] as any[]
    };

    for (const action of (actions || [])) {
      const progress = action.lead_cadence_progress as CadenceProgress;
      const lead = action.leads as Lead;

      // Skip if cadence is no longer active
      if (!progress || progress.status !== 'active') {
        console.log(`⏭️ Cadência ${action.cadence_progress_id} não está ativa, cancelando ação`);
        
        await supabase
          .from('scheduled_cadence_actions')
          .update({ 
            status: 'cancelled',
            updated_at: new Date().toISOString()
          })
          .eq('id', action.id);
        
        results.cancelled++;
        continue;
      }

      // Skip if lead data is missing
      if (!lead || (!lead.telefone && !lead.email)) {
        console.log(`⚠️ Lead ${action.lead_id} sem dados de contato`);
        
        await supabase
          .from('scheduled_cadence_actions')
          .update({ 
            status: 'failed',
            error_message: 'Lead sem dados de contato',
            updated_at: new Date().toISOString()
          })
          .eq('id', action.id);
        
        results.failed++;
        continue;
      }

      results.processed++;
      
      // Personalize message
      const personalizedMessage = replaceVariables(action.message_content || '', lead);
      
      let sendResult = { success: false, error: '' };

      try {
        if (action.channel === 'whatsapp' && lead.telefone) {
          // Get WhatsApp connection for company
          const { data: connections } = await supabase
            .from('whatsapp_connections')
            .select('*')
            .eq('company_id', action.company_id)
            .eq('status', 'connected')
            .limit(1);

          if (!connections || connections.length === 0) {
            throw new Error('Nenhuma conexão WhatsApp ativa encontrada');
          }

          const connection = connections[0];
          const formattedPhone = formatPhoneForWhatsApp(lead.telefone);

          // Call enviar-whatsapp function
          const { data: whatsappResponse, error: whatsappError } = await supabase.functions.invoke('enviar-whatsapp', {
            body: {
              instanceKey: connection.instance_key,
              number: formattedPhone,
              textMessage: { text: personalizedMessage },
              company_id: action.company_id,
              lead_id: action.lead_id,
              source: 'cadence_automation',
              cadence_progress_id: action.cadence_progress_id
            }
          });

          if (whatsappError) throw whatsappError;
          sendResult.success = true;
          
          console.log(`✅ WhatsApp enviado para ${lead.nome}`);

        } else if (action.channel === 'email' && lead.email) {
          // Check for Gmail integration
          const { data: gmailIntegrations } = await supabase
            .from('gmail_integrations')
            .select('*')
            .eq('company_id', action.company_id)
            .eq('connected', true)
            .limit(1);

          if (!gmailIntegrations || gmailIntegrations.length === 0) {
            throw new Error('Nenhuma integração de email ativa encontrada');
          }

          // Extract subject from message (first line or default)
          const lines = personalizedMessage.split('\n');
          const subject = lines[0]?.startsWith('Assunto:') 
            ? lines[0].replace('Assunto:', '').trim()
            : `${progress.cadence_name} - Passo ${action.step_number}`;
          const body = lines[0]?.startsWith('Assunto:') 
            ? lines.slice(1).join('\n').trim()
            : personalizedMessage;

          // Call enviar-email-gmail function
          const { data: emailResponse, error: emailError } = await supabase.functions.invoke('enviar-email-gmail', {
            body: {
              company_id: action.company_id,
              to: lead.email,
              subject: subject,
              body: body,
              lead_id: action.lead_id,
              log_to_conversas: true
            }
          });

          if (emailError) throw emailError;
          sendResult.success = true;
          
          console.log(`✅ Email enviado para ${lead.nome}`);

        } else if (action.channel === 'ligacao') {
          // For calls, create a task for the user
          const { error: taskError } = await supabase
            .from('tarefas')
            .insert({
              titulo: `Ligar para ${lead.nome} - ${progress.cadence_name}`,
              descricao: `Cadência: ${progress.cadence_name}\nPasso ${action.step_number}: ${action.action_description}\n\nTelefone: ${lead.telefone}`,
              company_id: action.company_id,
              status: 'pendente',
              prioridade: 'alta',
              data_vencimento: new Date().toISOString(),
              lead_id: action.lead_id
            });

          if (taskError) throw taskError;
          sendResult.success = true;
          
          console.log(`📞 Tarefa de ligação criada para ${lead.nome}`);

        } else {
          throw new Error(`Canal não suportado ou dados insuficientes: ${action.channel}`);
        }

      } catch (error: any) {
        console.error(`❌ Erro ao processar ação ${action.id}:`, error);
        sendResult.error = error.message || 'Erro desconhecido';
      }

      // Update action status
      if (sendResult.success) {
        await supabase
          .from('scheduled_cadence_actions')
          .update({ 
            status: 'sent',
            sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', action.id);

        // Update cadence progress - advance to next step
        const newStep = action.step_number + 1;
        const isCompleted = newStep > progress.total_steps;

        await supabase
          .from('lead_cadence_progress')
          .update({
            current_step: isCompleted ? progress.total_steps : newStep,
            status: isCompleted ? 'completed' : 'active',
            completed_at: isCompleted ? new Date().toISOString() : null,
            updated_at: new Date().toISOString()
          })
          .eq('id', action.cadence_progress_id);

        results.sent++;
        results.details.push({
          lead: lead.nome,
          channel: action.channel,
          status: 'sent',
          step: action.step_number
        });

      } else {
        await supabase
          .from('scheduled_cadence_actions')
          .update({ 
            status: 'failed',
            error_message: sendResult.error,
            updated_at: new Date().toISOString()
          })
          .eq('id', action.id);

        results.failed++;
        results.details.push({
          lead: lead.nome,
          channel: action.channel,
          status: 'failed',
          error: sendResult.error,
          step: action.step_number
        });
      }
    }

    console.log(`📊 Resumo: ${results.processed} processadas, ${results.sent} enviadas, ${results.failed} falharam, ${results.cancelled} canceladas`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Cadências processadas com sucesso',
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Erro ao processar cadências:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
