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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, data } = await req.json();

    if (action === 'record_interaction') {
      // Registrar interação da IA
      const { company_id, agent_type, conversation_id, lead_id, input_message, ai_response, context_data } = data;
      
      const { data: training, error } = await supabase
        .from('ia_training_data')
        .insert({
          company_id,
          agent_type,
          conversation_id,
          lead_id,
          input_message,
          ai_response,
          context_data
        })
        .select()
        .single();

      if (error) throw error;

      // Atualizar métricas
      await updateMetrics(supabase, company_id, agent_type);

      return new Response(
        JSON.stringify({ success: true, training_id: training.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'record_feedback') {
      // Registrar feedback/correção humana
      const { training_id, human_correction, feedback_score, resulted_in_conversion } = data;
      
      const { error } = await supabase
        .from('ia_training_data')
        .update({
          human_correction,
          was_corrected: !!human_correction,
          feedback_score,
          resulted_in_conversion,
          updated_at: new Date().toISOString()
        })
        .eq('id', training_id);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'analyze_patterns') {
      // Analisar padrões de conversão
      const { company_id } = data;
      
      const { data: conversions, error } = await supabase
        .from('ia_training_data')
        .select('*')
        .eq('company_id', company_id)
        .eq('resulted_in_conversion', true)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Identificar padrões comuns
      const patterns = await identifyPatterns(conversions);
      
      // Salvar padrões
      for (const pattern of patterns) {
        await supabase.from('ia_patterns').upsert({
          company_id,
          pattern_type: pattern.type,
          pattern_name: pattern.name,
          pattern_data: pattern.data,
          confidence_score: pattern.confidence
        });
      }

      return new Response(
        JSON.stringify({ success: true, patterns }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'generate_recommendations') {
      // Gerar recomendações para um lead
      const { company_id, lead_id, conversation_id } = data;
      
      // Buscar histórico do lead
      const { data: history } = await supabase
        .from('ia_training_data')
        .select('*')
        .eq('company_id', company_id)
        .eq('lead_id', lead_id)
        .order('created_at', { ascending: false })
        .limit(20);

      // Buscar padrões ativos
      const { data: patterns } = await supabase
        .from('ia_patterns')
        .select('*')
        .eq('company_id', company_id)
        .eq('is_active', true);

      // Gerar recomendações baseadas em histórico e padrões
      const recommendations = await generateRecommendations(history || [], patterns || [], lead_id);
      
      // Salvar recomendações
      for (const rec of recommendations) {
        await supabase.from('ia_recommendations').insert({
          company_id,
          lead_id,
          conversation_id,
          recommendation_type: rec.type,
          recommendation_text: rec.text,
          recommendation_data: rec.data,
          priority: rec.priority
        });
      }

      return new Response(
        JSON.stringify({ success: true, recommendations }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Erro na ia-aprendizado:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function updateMetrics(supabase: any, company_id: string, agent_type: string) {
  const today = new Date().toISOString().split('T')[0];
  
  // Buscar dados de hoje
  const { data: todayData } = await supabase
    .from('ia_training_data')
    .select('*')
    .eq('company_id', company_id)
    .eq('agent_type', agent_type)
    .gte('created_at', `${today}T00:00:00`);

  const total = todayData?.length || 0;
  const successful = todayData?.filter((d: any) => !d.was_corrected && (d.feedback_score || 0) >= 4).length || 0;
  const corrections = todayData?.filter((d: any) => d.was_corrected).length || 0;
  const conversions = todayData?.filter((d: any) => d.resulted_in_conversion).length || 0;
  
  const accuracy = total > 0 ? (successful / total) : 0;
  const confidence = total > 0 ? ((total - corrections) / total) : 0;
  const progress = Math.min(1, total / 100); // Progresso baseado em volume

  await supabase.from('ia_metrics').upsert({
    company_id,
    agent_type,
    metric_date: today,
    total_interactions: total,
    successful_interactions: successful,
    corrections_needed: corrections,
    conversions_assisted: conversions,
    avg_response_accuracy: accuracy,
    avg_confidence_score: confidence,
    learning_progress: progress
  }, {
    onConflict: 'company_id,agent_type,metric_date'
  });
}

function identifyPatterns(conversions: any[]) {
  const patterns: any[] = [];
  
  // Padrão 1: Horários com maior conversão
  const hourCounts: Record<number, number> = {};
  conversions.forEach(c => {
    const hour = new Date(c.created_at).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });
  
  const bestHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
  if (bestHour) {
    patterns.push({
      type: 'timing',
      name: 'Melhor horário para contato',
      data: { hour: parseInt(bestHour[0]), count: bestHour[1] },
      confidence: Math.min(1, bestHour[1] / conversions.length)
    });
  }

  // Padrão 2: Palavras-chave em conversões
  const keywords: Record<string, number> = {};
  conversions.forEach(c => {
    const words = c.input_message?.toLowerCase().split(/\s+/) || [];
    words.forEach((w: string) => {
      if (w.length > 4) keywords[w] = (keywords[w] || 0) + 1;
    });
  });

  const topKeywords = Object.entries(keywords)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (topKeywords.length > 0) {
    patterns.push({
      type: 'conversion',
      name: 'Palavras-chave de conversão',
      data: { keywords: topKeywords.map(k => k[0]) },
      confidence: 0.7
    });
  }

  return patterns;
}

function generateRecommendations(history: any[], patterns: any[], lead_id: string) {
  const recommendations: any[] = [];

  // Recomendação 1: Momento ideal para contato
  const timingPattern = patterns?.find(p => p.pattern_type === 'timing');
  if (timingPattern) {
    recommendations.push({
      type: 'timing',
      text: `Melhor horário para contato: ${timingPattern.pattern_data.hour}:00h`,
      data: timingPattern.pattern_data,
      priority: 'high'
    });
  }

  // Recomendação 2: Palavras-chave a usar
  const keywordPattern = patterns?.find(p => p.pattern_type === 'conversion');
  if (keywordPattern) {
    recommendations.push({
      type: 'message',
      text: `Use palavras-chave: ${keywordPattern.pattern_data.keywords.join(', ')}`,
      data: keywordPattern.pattern_data,
      priority: 'medium'
    });
  }

  // Recomendação 3: Baseada em histórico
  if (history && history.length > 0) {
    const lastInteraction = history[0];
    const daysSince = (Date.now() - new Date(lastInteraction.created_at).getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSince > 3) {
      recommendations.push({
        type: 'action',
        text: 'Fazer follow-up (sem contato há mais de 3 dias)',
        data: { days_since: Math.floor(daysSince) },
        priority: 'high'
      });
    }
  }

  return recommendations;
}