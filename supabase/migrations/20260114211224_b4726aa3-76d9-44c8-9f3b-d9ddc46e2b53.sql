-- =====================================================
-- SUPER INTELIGÊNCIA COMERCIAL - TABELAS PRINCIPAIS
-- =====================================================

-- 1. Tabela de Inteligência por Lead (análise em tempo real)
CREATE TABLE IF NOT EXISTS public.ia_lead_intelligence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  
  -- Scores e classificações
  engagement_score INTEGER DEFAULT 0 CHECK (engagement_score >= 0 AND engagement_score <= 100),
  temperature TEXT DEFAULT 'frio' CHECK (temperature IN ('frio', 'morno', 'quente', 'fechando')),
  purchase_intent INTEGER DEFAULT 0 CHECK (purchase_intent >= 0 AND purchase_intent <= 100),
  
  -- Análise conversacional
  conversation_sentiment TEXT DEFAULT 'neutro' CHECK (conversation_sentiment IN ('positivo', 'neutro', 'negativo', 'frustrado', 'entusiasmado')),
  detected_intent TEXT, -- compra, dúvida, reclamação, negociação, etc
  objections JSONB DEFAULT '[]'::jsonb, -- Lista de objeções detectadas
  interests JSONB DEFAULT '[]'::jsonb, -- Interesses identificados
  
  -- Recomendações de ação
  recommended_channel TEXT DEFAULT 'whatsapp' CHECK (recommended_channel IN ('whatsapp', 'instagram', 'call', 'email', 'any')),
  recommended_action TEXT, -- follow_up, proposta, desconto, agendar, ligar, etc
  next_action_date TIMESTAMPTZ,
  suggested_script TEXT, -- Roteiro sugerido
  
  -- Cadência
  days_since_last_contact INTEGER DEFAULT 0,
  total_contact_attempts INTEGER DEFAULT 0,
  response_rate DECIMAL(5,2) DEFAULT 0, -- Taxa de resposta do lead
  avg_response_time_minutes INTEGER, -- Tempo médio de resposta
  
  -- Contexto
  last_message_summary TEXT, -- Resumo da última conversa
  key_topics JSONB DEFAULT '[]'::jsonb, -- Tópicos principais discutidos
  decision_makers JSONB DEFAULT '[]'::jsonb, -- Pessoas envolvidas na decisão
  
  -- Metadata
  last_analysis_at TIMESTAMPTZ DEFAULT now(),
  analysis_version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT unique_lead_intelligence UNIQUE(lead_id)
);

-- 2. Tabela de Regras de Cadência Inteligente
CREATE TABLE IF NOT EXISTS public.ia_cadence_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Identificação
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  
  -- Condições de aplicação
  target_temperature TEXT[] DEFAULT ARRAY['frio', 'morno', 'quente'],
  target_funnels UUID[], -- Funis específicos (null = todos)
  target_stages UUID[], -- Etapas específicas (null = todas)
  target_tags TEXT[], -- Tags específicas (null = todas)
  
  -- Regras de contato
  max_attempts INTEGER DEFAULT 5,
  days_between_contacts INTEGER DEFAULT 2,
  channels_sequence JSONB DEFAULT '["whatsapp", "call", "whatsapp"]'::jsonb,
  
  -- Horários otimizados
  best_contact_hours JSONB DEFAULT '{"weekday": {"start": 9, "end": 18}, "weekend": {"start": 10, "end": 14}}'::jsonb,
  avoid_hours JSONB DEFAULT '[]'::jsonb, -- Horários a evitar
  
  -- Escalação
  escalate_after_attempts INTEGER DEFAULT 3, -- Escalar para supervisor após X tentativas
  escalate_to_user_id UUID,
  
  -- Prioridade
  priority INTEGER DEFAULT 0, -- Maior = mais prioritário
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabela de Scripts/Roteiros Dinâmicos
CREATE TABLE IF NOT EXISTS public.ia_scripts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Identificação
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  
  -- Contexto de uso
  trigger_context TEXT NOT NULL CHECK (trigger_context IN (
    'primeira_abordagem', 'follow_up', 'reengajamento',
    'objecao_preco', 'objecao_prazo', 'objecao_confianca', 'objecao_concorrencia',
    'fechamento', 'proposta', 'negociacao',
    'pos_venda', 'upsell', 'cross_sell'
  )),
  target_temperature TEXT[] DEFAULT ARRAY['frio', 'morno', 'quente'],
  target_channel TEXT CHECK (target_channel IN ('whatsapp', 'instagram', 'call', 'email', 'any')),
  
  -- Conteúdo
  script_template TEXT NOT NULL, -- Template com variáveis {{nome}}, {{produto}}, etc
  variables JSONB DEFAULT '[]'::jsonb, -- Lista de variáveis disponíveis
  example_usage TEXT, -- Exemplo de uso
  
  -- Performance
  times_used INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  success_rate DECIMAL(5,2) DEFAULT 0,
  
  -- Tags para organização
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Tabela de Alertas de Inteligência Comercial
CREATE TABLE IF NOT EXISTS public.ia_commercial_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Referência
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  conversation_id UUID,
  
  -- Classificação
  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'lead_quente', 'lead_esfriando', 'oportunidade', 'risco_perda',
    'follow_up_urgente', 'objecao_detectada', 'interesse_alto',
    'sem_contato', 'resposta_rapida', 'padrao_compra'
  )),
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  
  -- Conteúdo
  title TEXT NOT NULL,
  description TEXT,
  recommended_action TEXT,
  action_data JSONB, -- Dados para executar a ação
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'seen', 'actioned', 'dismissed')),
  seen_at TIMESTAMPTZ,
  actioned_at TIMESTAMPTZ,
  actioned_by UUID,
  
  -- Expiração
  expires_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Tabela de Métricas Comerciais Agregadas (Dashboard)
CREATE TABLE IF NOT EXISTS public.ia_commercial_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Período
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Métricas de Leads
  total_leads_monitored INTEGER DEFAULT 0,
  leads_hot INTEGER DEFAULT 0,
  leads_warm INTEGER DEFAULT 0,
  leads_cold INTEGER DEFAULT 0,
  
  -- Métricas de Engajamento
  avg_engagement_score DECIMAL(5,2) DEFAULT 0,
  avg_response_rate DECIMAL(5,2) DEFAULT 0,
  avg_response_time_minutes INTEGER DEFAULT 0,
  
  -- Métricas de Conversão
  conversion_rate DECIMAL(5,2) DEFAULT 0,
  opportunities_detected INTEGER DEFAULT 0,
  risks_detected INTEGER DEFAULT 0,
  
  -- Métricas de Atividade
  total_messages_sent INTEGER DEFAULT 0,
  total_messages_received INTEGER DEFAULT 0,
  total_calls_made INTEGER DEFAULT 0,
  total_meetings_scheduled INTEGER DEFAULT 0,
  
  -- Métricas de Follow-up
  pending_followups INTEGER DEFAULT 0,
  overdue_followups INTEGER DEFAULT 0,
  completed_followups INTEGER DEFAULT 0,
  
  -- Objeções mais comuns
  top_objections JSONB DEFAULT '[]'::jsonb,
  
  -- Análise detalhada
  metrics_data JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT unique_daily_metrics UNIQUE(company_id, metric_date)
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_ia_lead_intelligence_company ON public.ia_lead_intelligence(company_id);
CREATE INDEX IF NOT EXISTS idx_ia_lead_intelligence_lead ON public.ia_lead_intelligence(lead_id);
CREATE INDEX IF NOT EXISTS idx_ia_lead_intelligence_temperature ON public.ia_lead_intelligence(temperature);
CREATE INDEX IF NOT EXISTS idx_ia_lead_intelligence_score ON public.ia_lead_intelligence(engagement_score DESC);
CREATE INDEX IF NOT EXISTS idx_ia_lead_intelligence_next_action ON public.ia_lead_intelligence(next_action_date);

CREATE INDEX IF NOT EXISTS idx_ia_cadence_rules_company ON public.ia_cadence_rules(company_id);
CREATE INDEX IF NOT EXISTS idx_ia_cadence_rules_active ON public.ia_cadence_rules(is_active);

CREATE INDEX IF NOT EXISTS idx_ia_scripts_company ON public.ia_scripts(company_id);
CREATE INDEX IF NOT EXISTS idx_ia_scripts_context ON public.ia_scripts(trigger_context);
CREATE INDEX IF NOT EXISTS idx_ia_scripts_active ON public.ia_scripts(is_active);

CREATE INDEX IF NOT EXISTS idx_ia_commercial_alerts_company ON public.ia_commercial_alerts(company_id);
CREATE INDEX IF NOT EXISTS idx_ia_commercial_alerts_lead ON public.ia_commercial_alerts(lead_id);
CREATE INDEX IF NOT EXISTS idx_ia_commercial_alerts_status ON public.ia_commercial_alerts(status);
CREATE INDEX IF NOT EXISTS idx_ia_commercial_alerts_severity ON public.ia_commercial_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_ia_commercial_alerts_type ON public.ia_commercial_alerts(alert_type);

CREATE INDEX IF NOT EXISTS idx_ia_commercial_metrics_company_date ON public.ia_commercial_metrics(company_id, metric_date DESC);

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE public.ia_lead_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ia_cadence_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ia_scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ia_commercial_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ia_commercial_metrics ENABLE ROW LEVEL SECURITY;

-- Políticas para ia_lead_intelligence
CREATE POLICY "Users can view lead intelligence for their company"
  ON public.ia_lead_intelligence FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert lead intelligence for their company"
  ON public.ia_lead_intelligence FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update lead intelligence for their company"
  ON public.ia_lead_intelligence FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));

-- Políticas para ia_cadence_rules
CREATE POLICY "Users can view cadence rules for their company"
  ON public.ia_cadence_rules FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage cadence rules for their company"
  ON public.ia_cadence_rules FOR ALL
  USING (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));

-- Políticas para ia_scripts
CREATE POLICY "Users can view scripts for their company"
  ON public.ia_scripts FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage scripts for their company"
  ON public.ia_scripts FOR ALL
  USING (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));

-- Políticas para ia_commercial_alerts
CREATE POLICY "Users can view alerts for their company"
  ON public.ia_commercial_alerts FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage alerts for their company"
  ON public.ia_commercial_alerts FOR ALL
  USING (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));

-- Políticas para ia_commercial_metrics
CREATE POLICY "Users can view metrics for their company"
  ON public.ia_commercial_metrics FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "System can insert/update metrics"
  ON public.ia_commercial_metrics FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update metrics"
  ON public.ia_commercial_metrics FOR UPDATE
  USING (true);

-- =====================================================
-- TRIGGERS PARA ATUALIZAÇÃO AUTOMÁTICA
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_ia_intelligence_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ia_lead_intelligence_updated_at
  BEFORE UPDATE ON public.ia_lead_intelligence
  FOR EACH ROW EXECUTE FUNCTION public.update_ia_intelligence_updated_at();

CREATE TRIGGER update_ia_cadence_rules_updated_at
  BEFORE UPDATE ON public.ia_cadence_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_ia_intelligence_updated_at();

CREATE TRIGGER update_ia_scripts_updated_at
  BEFORE UPDATE ON public.ia_scripts
  FOR EACH ROW EXECUTE FUNCTION public.update_ia_intelligence_updated_at();

CREATE TRIGGER update_ia_commercial_metrics_updated_at
  BEFORE UPDATE ON public.ia_commercial_metrics
  FOR EACH ROW EXECUTE FUNCTION public.update_ia_intelligence_updated_at();

-- =====================================================
-- HABILITAR REALTIME PARA ALERTAS
-- =====================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.ia_commercial_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ia_lead_intelligence;