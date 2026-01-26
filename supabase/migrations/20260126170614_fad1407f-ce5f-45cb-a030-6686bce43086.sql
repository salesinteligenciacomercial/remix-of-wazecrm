-- Tabela para armazenar snapshots de métricas de uso por subconta
CREATE TABLE public.company_usage_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Métricas de Uso
  total_leads INTEGER DEFAULT 0,
  total_users INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  messages_sent INTEGER DEFAULT 0,
  messages_received INTEGER DEFAULT 0,
  media_files_count INTEGER DEFAULT 0,
  storage_bytes_used BIGINT DEFAULT 0,
  edge_function_calls INTEGER DEFAULT 0,
  ia_requests INTEGER DEFAULT 0,
  automation_executions INTEGER DEFAULT 0,
  
  -- Custos Calculados (em centavos para precisão)
  database_cost INTEGER DEFAULT 0,
  storage_cost INTEGER DEFAULT 0,
  edge_functions_cost INTEGER DEFAULT 0,
  ia_cost INTEGER DEFAULT 0,
  whatsapp_cost INTEGER DEFAULT 0,
  total_cost INTEGER DEFAULT 0,
  
  -- Metadata
  calculated_at TIMESTAMPTZ DEFAULT now(),
  master_company_id UUID REFERENCES companies(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índice para busca eficiente
CREATE INDEX idx_usage_metrics_company_period 
ON company_usage_metrics(company_id, period_start, period_end);

CREATE INDEX idx_usage_metrics_master 
ON company_usage_metrics(master_company_id);

-- Tabela de configuração de custos unitários
CREATE TABLE public.cost_configuration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_company_id UUID NOT NULL REFERENCES companies(id),
  
  -- Custos por unidade (em centavos BRL)
  cost_per_lead INTEGER DEFAULT 5,
  cost_per_user INTEGER DEFAULT 500,
  cost_per_message_sent INTEGER DEFAULT 4,
  cost_per_message_received INTEGER DEFAULT 1,
  cost_per_media_file INTEGER DEFAULT 10,
  cost_per_gb_storage INTEGER DEFAULT 1000,
  cost_per_edge_call INTEGER DEFAULT 1,
  cost_per_ia_request INTEGER DEFAULT 50,
  cost_per_automation INTEGER DEFAULT 2,
  
  -- Custos fixos
  base_monthly_cost INTEGER DEFAULT 2000,
  
  -- WhatsApp custos por tipo
  whatsapp_utility_cost INTEGER DEFAULT 4,
  whatsapp_marketing_cost INTEGER DEFAULT 7,
  whatsapp_auth_cost INTEGER DEFAULT 5,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(master_company_id)
);

-- Enable RLS
ALTER TABLE public.company_usage_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_configuration ENABLE ROW LEVEL SECURITY;

-- RLS Policies para company_usage_metrics
CREATE POLICY "Master can view own subaccount metrics"
ON public.company_usage_metrics
FOR SELECT
TO authenticated
USING (master_company_id IN (SELECT company_id FROM public.get_user_company_ids()));

CREATE POLICY "Master can insert metrics"
ON public.company_usage_metrics
FOR INSERT
TO authenticated
WITH CHECK (master_company_id IN (SELECT company_id FROM public.get_user_company_ids()));

CREATE POLICY "Master can update own metrics"
ON public.company_usage_metrics
FOR UPDATE
TO authenticated
USING (master_company_id IN (SELECT company_id FROM public.get_user_company_ids()));

CREATE POLICY "Master can delete own metrics"
ON public.company_usage_metrics
FOR DELETE
TO authenticated
USING (master_company_id IN (SELECT company_id FROM public.get_user_company_ids()));

-- RLS Policies para cost_configuration
CREATE POLICY "Master can view own cost config"
ON public.cost_configuration
FOR SELECT
TO authenticated
USING (master_company_id IN (SELECT company_id FROM public.get_user_company_ids()));

CREATE POLICY "Master can insert cost config"
ON public.cost_configuration
FOR INSERT
TO authenticated
WITH CHECK (master_company_id IN (SELECT company_id FROM public.get_user_company_ids()));

CREATE POLICY "Master can update own cost config"
ON public.cost_configuration
FOR UPDATE
TO authenticated
USING (master_company_id IN (SELECT company_id FROM public.get_user_company_ids()));

-- Função para calcular métricas de uso de uma empresa
CREATE OR REPLACE FUNCTION public.calculate_company_usage(
  p_company_id UUID,
  p_start_date DATE,
  p_end_date DATE
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_leads', (SELECT COUNT(*) FROM leads WHERE company_id = p_company_id),
    'total_users', (SELECT COUNT(*) FROM user_roles WHERE company_id = p_company_id),
    'messages_sent', (SELECT COUNT(*) FROM conversas WHERE company_id = p_company_id 
                      AND fromme = true AND created_at::date BETWEEN p_start_date AND p_end_date),
    'messages_received', (SELECT COUNT(*) FROM conversas WHERE company_id = p_company_id 
                          AND fromme = false AND created_at::date BETWEEN p_start_date AND p_end_date),
    'media_files', (SELECT COUNT(*) FROM conversas WHERE company_id = p_company_id 
                    AND tipo_mensagem IN ('audio','video','image','document') 
                    AND created_at::date BETWEEN p_start_date AND p_end_date),
    'automation_executions', (SELECT COUNT(*) FROM automation_flow_logs 
                              WHERE company_id = p_company_id 
                              AND started_at::date BETWEEN p_start_date AND p_end_date),
    'ia_requests', 0
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Função para buscar todas subcontas com métricas
CREATE OR REPLACE FUNCTION public.get_subcontas_with_usage(
  p_master_company_id UUID,
  p_start_date DATE,
  p_end_date DATE
) RETURNS TABLE (
  company_id UUID,
  company_name TEXT,
  company_status TEXT,
  total_leads BIGINT,
  total_users BIGINT,
  messages_sent BIGINT,
  messages_received BIGINT,
  media_files BIGINT,
  automation_executions BIGINT,
  monthly_value NUMERIC,
  subscription_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as company_id,
    c.name as company_name,
    c.status as company_status,
    (SELECT COUNT(*) FROM leads l WHERE l.company_id = c.id) as total_leads,
    (SELECT COUNT(*) FROM user_roles ur WHERE ur.company_id = c.id) as total_users,
    (SELECT COUNT(*) FROM conversas cv WHERE cv.company_id = c.id 
     AND cv.fromme = true AND cv.created_at::date BETWEEN p_start_date AND p_end_date) as messages_sent,
    (SELECT COUNT(*) FROM conversas cv WHERE cv.company_id = c.id 
     AND cv.fromme = false AND cv.created_at::date BETWEEN p_start_date AND p_end_date) as messages_received,
    (SELECT COUNT(*) FROM conversas cv WHERE cv.company_id = c.id 
     AND cv.tipo_mensagem IN ('audio','video','image','document') 
     AND cv.created_at::date BETWEEN p_start_date AND p_end_date) as media_files,
    (SELECT COUNT(*) FROM automation_flow_logs afl WHERE afl.company_id = c.id 
     AND afl.started_at::date BETWEEN p_start_date AND p_end_date) as automation_executions,
    COALESCE(cs.monthly_value, 0) as monthly_value,
    COALESCE(cs.status, 'sem_assinatura') as subscription_status
  FROM companies c
  LEFT JOIN company_subscriptions cs ON cs.company_id = c.id
  WHERE c.parent_company_id = p_master_company_id
  ORDER BY c.name;
END;
$$;