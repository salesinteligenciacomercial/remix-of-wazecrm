import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const META_API_VERSION = 'v18.0';
const META_API_BASE_URL = 'https://graph.facebook.com';

interface TemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  text?: string;
  example?: { header_text?: string[]; body_text?: string[][] };
  buttons?: Array<{
    type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
    text: string;
    url?: string;
    phone_number?: string;
  }>;
}

interface CreateTemplatePayload {
  name: string;
  language: string;
  category: 'UTILITY' | 'MARKETING' | 'AUTHENTICATION';
  components: TemplateComponent[];
  company_id: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const url = new URL(req.url);
    const method = req.method;
    const body = method !== 'GET' ? await req.json() : {};
    const companyId = url.searchParams.get('company_id') || body.company_id;

    if (!companyId) {
      return new Response(
        JSON.stringify({ error: 'company_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`WhatsApp Templates - ${method} - Company: ${companyId}`);

    // Buscar conexão Meta da empresa
    const { data: connection, error: connError } = await supabase
      .from('whatsapp_connections')
      .select('meta_phone_number_id, meta_access_token, meta_business_account_id, api_provider')
      .eq('company_id', companyId)
      .in('api_provider', ['meta', 'both'])
      .single();

    if (connError || !connection) {
      console.error('Conexão Meta não encontrada:', connError);
      return new Response(
        JSON.stringify({ error: 'Conexão Meta não configurada' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { meta_access_token, meta_business_account_id } = connection;

    if (!meta_access_token || !meta_business_account_id) {
      return new Response(
        JSON.stringify({ error: 'Credenciais Meta incompletas. Configure o Business Account ID.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // === GET: Listar templates ===
    if (method === 'GET') {
      const syncFromMeta = url.searchParams.get('sync') === 'true';
      
      if (syncFromMeta) {
        // Buscar templates da Meta API
        const metaUrl = `${META_API_BASE_URL}/${META_API_VERSION}/${meta_business_account_id}/message_templates?fields=id,name,status,category,language,components,quality_score`;
        
        console.log('Sincronizando templates da Meta:', metaUrl);
        
        const metaResponse = await fetch(metaUrl, {
          headers: { 'Authorization': `Bearer ${meta_access_token}` }
        });

        const metaData = await metaResponse.json();
        
        if (!metaResponse.ok) {
          console.error('Erro Meta API:', metaData);
          return new Response(
            JSON.stringify({ error: metaData.error?.message || 'Erro ao buscar templates da Meta' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Sincronizar com banco local
        const templates = metaData.data || [];
        console.log(`Templates encontrados: ${templates.length}`);

        for (const template of templates) {
          await supabase
            .from('whatsapp_templates')
            .upsert({
              company_id: companyId,
              meta_template_id: template.id,
              name: template.name,
              language: template.language,
              category: template.category,
              status: template.status,
              components: template.components || [],
              quality_score: template.quality_score?.score,
              synced_at: new Date().toISOString()
            }, {
              onConflict: 'company_id,name,language'
            });
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            templates: templates,
            synced: templates.length
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Buscar templates do banco local
      const { data: localTemplates, error: localError } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (localError) throw localError;

      return new Response(
        JSON.stringify({ templates: localTemplates || [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // === POST: Criar template ===
    if (method === 'POST') {
      const payload = body as CreateTemplatePayload;
      
      if (!payload.name || !payload.category || !payload.components) {
        return new Response(
          JSON.stringify({ error: 'name, category e components são obrigatórios' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validar nome do template (Meta exige lowercase, underscore)
      const templateName = payload.name.toLowerCase().replace(/[^a-z0-9_]/g, '_');

      const metaPayload = {
        name: templateName,
        language: payload.language || 'pt_BR',
        category: payload.category,
        components: payload.components
      };

      console.log('Criando template na Meta:', JSON.stringify(metaPayload, null, 2));

      const metaUrl = `${META_API_BASE_URL}/${META_API_VERSION}/${meta_business_account_id}/message_templates`;
      
      const metaResponse = await fetch(metaUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${meta_access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(metaPayload)
      });

      const metaData = await metaResponse.json();

      if (!metaResponse.ok) {
        console.error('Erro ao criar template:', metaData);
        return new Response(
          JSON.stringify({ 
            error: metaData.error?.message || 'Erro ao criar template',
            details: metaData.error
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Salvar no banco local
      const { data: savedTemplate, error: saveError } = await supabase
        .from('whatsapp_templates')
        .insert({
          company_id: companyId,
          meta_template_id: metaData.id,
          name: templateName,
          language: payload.language || 'pt_BR',
          category: payload.category,
          status: 'PENDING',
          components: payload.components,
          synced_at: new Date().toISOString()
        })
        .select()
        .single();

      if (saveError) {
        console.error('Erro ao salvar template localmente:', saveError);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          template_id: metaData.id,
          status: metaData.status || 'PENDING',
          local: savedTemplate
        }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // === DELETE: Deletar template ===
    if (method === 'DELETE') {
      const templateId = body.template_id || url.searchParams.get('template_id');
      const templateName = body.template_name || url.searchParams.get('template_name');

      if (!templateName) {
        return new Response(
          JSON.stringify({ error: 'template_name é obrigatório para deletar' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const metaUrl = `${META_API_BASE_URL}/${META_API_VERSION}/${meta_business_account_id}/message_templates?name=${templateName}`;
      
      console.log('Deletando template:', templateName);

      const metaResponse = await fetch(metaUrl, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${meta_access_token}` }
      });

      const metaData = await metaResponse.json();

      if (!metaResponse.ok) {
        console.error('Erro ao deletar template:', metaData);
        return new Response(
          JSON.stringify({ error: metaData.error?.message || 'Erro ao deletar template' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Remover do banco local
      await supabase
        .from('whatsapp_templates')
        .delete()
        .eq('company_id', companyId)
        .eq('name', templateName);

      return new Response(
        JSON.stringify({ success: true, deleted: templateName }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Método não suportado' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('WhatsApp Templates Error:', error);
    const message = error instanceof Error ? error.message : 'Erro interno';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});