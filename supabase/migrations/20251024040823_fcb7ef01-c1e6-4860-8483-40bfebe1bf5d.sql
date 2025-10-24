-- Tabela para armazenar histórico de aprendizado da IA por empresa
CREATE TABLE IF NOT EXISTS public.ia_training_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  agent_type TEXT NOT NULL, -- 'atendimento', 'vendedora', 'suporte'
  conversation_id UUID,
  lead_id UUID,
  input_message TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  human_correction TEXT,
  was_corrected BOOLEAN DEFAULT false,
  feedback_score INTEGER, -- 1-5
  resulted_in_conversion BOOLEAN DEFAULT false,
  context_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela para padrões identificados pela IA
CREATE TABLE IF NOT EXISTS public.ia_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  pattern_type TEXT NOT NULL, -- 'conversion', 'followup', 'timing'
  pattern_name TEXT NOT NULL,
  pattern_data JSONB NOT NULL,
  confidence_score NUMERIC(3,2) DEFAULT 0.5,
  times_validated INTEGER DEFAULT 0,
  last_validated_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela para recomendações da IA
CREATE TABLE IF NOT EXISTS public.ia_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  lead_id UUID,
  conversation_id UUID,
  recommendation_type TEXT NOT NULL, -- 'action', 'message', 'timing', 'channel'
  recommendation_text TEXT NOT NULL,
  recommendation_data JSONB DEFAULT '{}'::jsonb,
  priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high'
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'auto_applied'
  applied_at TIMESTAMPTZ,
  applied_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela para métricas de performance da IA
CREATE TABLE IF NOT EXISTS public.ia_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  agent_type TEXT NOT NULL,
  metric_date DATE DEFAULT CURRENT_DATE,
  total_interactions INTEGER DEFAULT 0,
  successful_interactions INTEGER DEFAULT 0,
  corrections_needed INTEGER DEFAULT 0,
  conversions_assisted INTEGER DEFAULT 0,
  avg_response_accuracy NUMERIC(3,2) DEFAULT 0,
  avg_confidence_score NUMERIC(3,2) DEFAULT 0,
  learning_progress NUMERIC(3,2) DEFAULT 0,
  metrics_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, agent_type, metric_date)
);

-- Tabela para configurações de IA por empresa
CREATE TABLE IF NOT EXISTS public.ia_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL UNIQUE,
  learning_mode BOOLEAN DEFAULT true,
  auto_optimization BOOLEAN DEFAULT false,
  collaborative_mode BOOLEAN DEFAULT true,
  custom_prompts JSONB DEFAULT '{}'::jsonb,
  training_preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_ia_training_company ON public.ia_training_data(company_id);
CREATE INDEX IF NOT EXISTS idx_ia_training_agent ON public.ia_training_data(agent_type);
CREATE INDEX IF NOT EXISTS idx_ia_training_conversation ON public.ia_training_data(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ia_patterns_company ON public.ia_patterns(company_id);
CREATE INDEX IF NOT EXISTS idx_ia_patterns_active ON public.ia_patterns(is_active);
CREATE INDEX IF NOT EXISTS idx_ia_recommendations_company ON public.ia_recommendations(company_id);
CREATE INDEX IF NOT EXISTS idx_ia_recommendations_status ON public.ia_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_ia_metrics_company ON public.ia_metrics(company_id);

-- RLS Policies
ALTER TABLE public.ia_training_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ia_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ia_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ia_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ia_configurations ENABLE ROW LEVEL SECURITY;

-- Políticas para ia_training_data
CREATE POLICY "Company users manage training data"
ON public.ia_training_data
FOR ALL
USING (user_belongs_to_company(auth.uid(), company_id));

-- Políticas para ia_patterns
CREATE POLICY "Company users view patterns"
ON public.ia_patterns
FOR SELECT
USING (user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Company users manage patterns"
ON public.ia_patterns
FOR ALL
USING (user_belongs_to_company(auth.uid(), company_id));

-- Políticas para ia_recommendations
CREATE POLICY "Company users view recommendations"
ON public.ia_recommendations
FOR SELECT
USING (user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Company users manage recommendations"
ON public.ia_recommendations
FOR ALL
USING (user_belongs_to_company(auth.uid(), company_id));

-- Políticas para ia_metrics
CREATE POLICY "Company users view metrics"
ON public.ia_metrics
FOR SELECT
USING (user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Company users manage metrics"
ON public.ia_metrics
FOR ALL
USING (user_belongs_to_company(auth.uid(), company_id));

-- Políticas para ia_configurations
CREATE POLICY "Company users view config"
ON public.ia_configurations
FOR SELECT
USING (user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Company users manage config"
ON public.ia_configurations
FOR ALL
USING (user_belongs_to_company(auth.uid(), company_id));

-- Triggers para updated_at
CREATE TRIGGER update_ia_training_data_updated_at
  BEFORE UPDATE ON public.ia_training_data
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ia_patterns_updated_at
  BEFORE UPDATE ON public.ia_patterns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ia_metrics_updated_at
  BEFORE UPDATE ON public.ia_metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ia_configurations_updated_at
  BEFORE UPDATE ON public.ia_configurations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();