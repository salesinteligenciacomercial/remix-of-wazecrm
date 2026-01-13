import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const META_API_VERSION = 'v18.0';
const META_API_BASE_URL = 'https://graph.facebook.com';

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
    const companyId = url.searchParams.get('company_id');
    const period = url.searchParams.get('period') || 'day'; // day, week, month
    const startDate = url.searchParams.get('start_date');
    const endDate = url.searchParams.get('end_date');

    if (!companyId) {
      return new Response(
        JSON.stringify({ error: 'company_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`WhatsApp Analytics - Company: ${companyId}, Period: ${period}`);

    // Calcular datas
    const now = new Date();
    let dateStart: Date;
    let dateEnd = endDate ? new Date(endDate) : now;

    if (startDate) {
      dateStart = new Date(startDate);
    } else {
      switch (period) {
        case 'week':
          dateStart = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          dateStart = new Date(now.setMonth(now.getMonth() - 1));
          break;
        default: // day
          dateStart = new Date(now.setHours(0, 0, 0, 0));
      }
    }

    // === Buscar métricas do banco de dados ===
    
    // Total de mensagens por status
    const { data: messageLogs, error: logsError } = await supabase
      .from('whatsapp_message_logs')
      .select('status, provider, cost_estimate, template_name, sent_at')
      .eq('company_id', companyId)
      .gte('sent_at', dateStart.toISOString())
      .lte('sent_at', dateEnd.toISOString());

    if (logsError) {
      console.error('Erro ao buscar logs:', logsError);
      throw logsError;
    }

    const logs = messageLogs || [];

    // Calcular métricas
    const metrics = {
      total_sent: logs.filter(l => l.status !== 'pending').length,
      total_delivered: logs.filter(l => l.status === 'delivered' || l.status === 'read').length,
      total_read: logs.filter(l => l.status === 'read').length,
      total_failed: logs.filter(l => l.status === 'failed').length,
      total_pending: logs.filter(l => l.status === 'pending').length,
      delivery_rate: 0,
      read_rate: 0,
      estimated_cost: logs.reduce((sum, l) => sum + (Number(l.cost_estimate) || 0), 0),
      by_provider: {
        meta: logs.filter(l => l.provider === 'meta').length,
        evolution: logs.filter(l => l.provider === 'evolution').length
      },
      by_template: {} as Record<string, number>
    };

    // Calcular taxas
    if (metrics.total_sent > 0) {
      metrics.delivery_rate = Math.round((metrics.total_delivered / metrics.total_sent) * 100);
      metrics.read_rate = Math.round((metrics.total_read / metrics.total_delivered) * 100) || 0;
    }

    // Agrupar por template
    logs.forEach(log => {
      if (log.template_name) {
        metrics.by_template[log.template_name] = (metrics.by_template[log.template_name] || 0) + 1;
      }
    });

    // === Buscar dados por dia para gráfico ===
    const dailyData: Record<string, { sent: number; delivered: number; read: number; failed: number }> = {};
    
    logs.forEach(log => {
      const day = log.sent_at ? new Date(log.sent_at).toISOString().split('T')[0] : 'unknown';
      if (!dailyData[day]) {
        dailyData[day] = { sent: 0, delivered: 0, read: 0, failed: 0 };
      }
      dailyData[day].sent++;
      if (log.status === 'delivered' || log.status === 'read') dailyData[day].delivered++;
      if (log.status === 'read') dailyData[day].read++;
      if (log.status === 'failed') dailyData[day].failed++;
    });

    // Converter para array ordenado
    const chartData = Object.entries(dailyData)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // === Buscar analytics de campanhas ===
    const { data: campaigns, error: campaignsError } = await supabase
      .from('whatsapp_campaigns_analytics')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (campaignsError) {
      console.error('Erro ao buscar campanhas:', campaignsError);
    }

    // === Tentar buscar métricas da Meta API (se disponível) ===
    let metaAnalytics = null;
    
    const { data: connection } = await supabase
      .from('whatsapp_connections')
      .select('meta_access_token, meta_business_account_id')
      .eq('company_id', companyId)
      .in('api_provider', ['meta', 'both'])
      .single();

    if (connection?.meta_access_token && connection?.meta_business_account_id) {
      try {
        const metaUrl = `${META_API_BASE_URL}/${META_API_VERSION}/${connection.meta_business_account_id}?fields=analytics.start(${Math.floor(dateStart.getTime() / 1000)}).end(${Math.floor(dateEnd.getTime() / 1000)}).granularity(DAY)`;
        
        const metaResponse = await fetch(metaUrl, {
          headers: { 'Authorization': `Bearer ${connection.meta_access_token}` }
        });

        if (metaResponse.ok) {
          metaAnalytics = await metaResponse.json();
          console.log('Meta Analytics obtidos');
        }
      } catch (e) {
        console.log('Não foi possível obter analytics da Meta API');
      }
    }

    return new Response(
      JSON.stringify({
        period: {
          start: dateStart.toISOString(),
          end: dateEnd.toISOString(),
          type: period
        },
        metrics,
        chart_data: chartData,
        campaigns: campaigns || [],
        meta_analytics: metaAnalytics
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('WhatsApp Analytics Error:', error);
    const message = error instanceof Error ? error.message : 'Erro interno';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});