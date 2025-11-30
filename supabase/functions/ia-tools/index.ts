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
    const { action, data } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl!, supabaseKey!);

    console.log('🔧 IA Tools - Ação:', action, data);

    let result;

    switch (action) {
      case 'mover_lead_funil':
        const { data: etapa } = await supabase
          .from('etapas')
          .select('id')
          .eq('nome', data.etapa_nome)
          .eq('funil_id', data.funil_id)
          .single();
        
        if (etapa) {
          const { error } = await supabase
            .from('leads')
            .update({ etapa_id: etapa.id, funil_id: data.funil_id })
            .eq('id', data.lead_id);
          
          result = error ? { error: error.message } : { success: true };
        } else {
          result = { error: 'Etapa não encontrada' };
        }
        break;

      case 'adicionar_info_lead':
        const updateData: any = {};
        if (data.cpf) updateData.cpf = data.cpf;
        if (data.email) updateData.email = data.email;
        if (data.value) updateData.value = data.value;
        if (data.company) updateData.company = data.company;
        if (data.notes) updateData.notes = data.notes;
        
        const { error: updateError } = await supabase
          .from('leads')
          .update(updateData)
          .eq('id', data.lead_id);
        
        result = updateError ? { error: updateError.message } : { success: true };
        break;

      case 'adicionar_tags_lead':
        const { data: lead } = await supabase
          .from('leads')
          .select('tags')
          .eq('id', data.lead_id)
          .single();
        
        const tagsAtuais = lead?.tags || [];
        const novasTags = [...new Set([...tagsAtuais, ...data.tags])];
        
        const { error: tagsError } = await supabase
          .from('leads')
          .update({ tags: novasTags })
          .eq('id', data.lead_id);
        
        result = tagsError ? { error: tagsError.message } : { success: true, tags: novasTags };
        break;

      case 'criar_tarefa':
        const { data: tarefa, error: tarefaError } = await supabase
          .from('tasks')
          .insert({
            title: data.title,
            description: data.description,
            priority: data.priority || 'media',
            status: data.status || 'pendente',
            lead_id: data.lead_id,
            owner_id: data.owner_id,
            company_id: data.company_id,
            due_date: data.due_date,
            start_date: data.start_date || new Date().toISOString()
          })
          .select()
          .single();
        
        result = tarefaError ? { error: tarefaError.message } : { success: true, tarefa };
        break;

      case 'listar_tarefas_lead':
        const { data: tarefas } = await supabase
          .from('tasks')
          .select('*')
          .eq('lead_id', data.lead_id)
          .order('created_at', { ascending: false });
        
        result = { tarefas };
        break;

      case 'listar_funis':
        const { data: funis } = await supabase
          .from('funis')
          .select('id, nome, descricao')
          .eq('company_id', data.company_id);
        
        result = { funis };
        break;

      case 'listar_etapas_funil':
        const { data: etapas } = await supabase
          .from('etapas')
          .select('id, nome, cor, posicao')
          .eq('funil_id', data.funil_id)
          .order('posicao');
        
        result = { etapas };
        break;

      default:
        result = { error: 'Ação não reconhecida' };
    }

    console.log('✅ IA Tools - Resultado:', result);

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('❌ Erro na ia-tools:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
