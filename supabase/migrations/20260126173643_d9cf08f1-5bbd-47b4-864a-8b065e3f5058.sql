-- 1. Function to get historical cost for a subconta
CREATE OR REPLACE FUNCTION public.get_subconta_historical_cost(
  p_master_company_id UUID,
  p_company_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  v_activation_date DATE;
BEGIN
  -- Get activation date
  SELECT created_at::date INTO v_activation_date
  FROM companies WHERE id = p_company_id AND parent_company_id = p_master_company_id;
  
  IF v_activation_date IS NULL THEN
    RETURN jsonb_build_object('error', 'Company not found or not a subconta');
  END IF;
  
  SELECT jsonb_build_object(
    'activation_date', v_activation_date,
    'months_active', GREATEST(1, EXTRACT(MONTH FROM age(current_date, v_activation_date)) + 
                     EXTRACT(YEAR FROM age(current_date, v_activation_date)) * 12),
    'total_messages_sent', (SELECT COUNT(*) FROM conversas WHERE company_id = p_company_id AND fromme = true),
    'total_messages_received', (SELECT COUNT(*) FROM conversas WHERE company_id = p_company_id AND fromme = false),
    'total_media_files', (SELECT COUNT(*) FROM conversas WHERE company_id = p_company_id 
                          AND tipo_mensagem IN ('audio','video','image','document')),
    'total_automations', (SELECT COUNT(*) FROM automation_flow_logs WHERE company_id = p_company_id),
    'total_leads', (SELECT COUNT(*) FROM leads WHERE company_id = p_company_id),
    'total_users', (SELECT COUNT(*) FROM user_roles WHERE company_id = p_company_id)
  ) INTO result;
  
  RETURN result;
END;
$$;

-- 2. Function to get monthly cost comparison
CREATE OR REPLACE FUNCTION public.get_monthly_cost_comparison(
  p_master_company_id UUID,
  p_months INTEGER DEFAULT 6
) RETURNS TABLE(
  month_year TEXT,
  month_date DATE,
  company_id UUID,
  company_name TEXT,
  messages_sent BIGINT,
  messages_received BIGINT,
  media_files BIGINT,
  automation_executions BIGINT,
  monthly_value NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH months AS (
    SELECT generate_series(
      date_trunc('month', current_date - (p_months || ' months')::interval),
      date_trunc('month', current_date),
      '1 month'::interval
    )::date as month_start
  ),
  subcontas AS (
    SELECT c.id, c.name
    FROM companies c
    WHERE c.parent_company_id = p_master_company_id
  )
  SELECT 
    to_char(m.month_start, 'YYYY-MM') as month_year,
    m.month_start as month_date,
    s.id as company_id,
    s.name as company_name,
    (SELECT COUNT(*) FROM conversas cv 
     WHERE cv.company_id = s.id 
     AND cv.fromme = true 
     AND date_trunc('month', cv.created_at::date) = m.month_start) as messages_sent,
    (SELECT COUNT(*) FROM conversas cv 
     WHERE cv.company_id = s.id 
     AND cv.fromme = false 
     AND date_trunc('month', cv.created_at::date) = m.month_start) as messages_received,
    (SELECT COUNT(*) FROM conversas cv 
     WHERE cv.company_id = s.id 
     AND cv.tipo_mensagem IN ('audio','video','image','document')
     AND date_trunc('month', cv.created_at::date) = m.month_start) as media_files,
    (SELECT COUNT(*) FROM automation_flow_logs afl 
     WHERE afl.company_id = s.id 
     AND date_trunc('month', afl.started_at::date) = m.month_start) as automation_executions,
    COALESCE((SELECT cs.monthly_value FROM company_subscriptions cs WHERE cs.company_id = s.id LIMIT 1), 0) as monthly_value
  FROM months m
  CROSS JOIN subcontas s
  ORDER BY m.month_start DESC, s.name;
END;
$$;

-- 3. Create cost_alerts table
CREATE TABLE public.cost_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  alert_name TEXT NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('total_cost', 'margin_percent', 'cost_category')),
  threshold_value INTEGER NOT NULL,
  threshold_operator TEXT NOT NULL CHECK (threshold_operator IN ('>', '<', '>=', '<=')),
  cost_category TEXT,
  is_active BOOLEAN DEFAULT true,
  notify_email BOOLEAN DEFAULT true,
  notify_in_app BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create cost_alert_history table
CREATE TABLE public.cost_alert_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID REFERENCES cost_alerts(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  triggered_value INTEGER NOT NULL,
  threshold_value INTEGER NOT NULL,
  message TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Enable RLS
ALTER TABLE public.cost_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_alert_history ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for cost_alerts
CREATE POLICY "Master can view own alerts"
ON public.cost_alerts FOR SELECT
USING (master_company_id IN (SELECT company_id FROM public.get_user_company_ids()));

CREATE POLICY "Master can create own alerts"
ON public.cost_alerts FOR INSERT
WITH CHECK (master_company_id IN (SELECT company_id FROM public.get_user_company_ids()));

CREATE POLICY "Master can update own alerts"
ON public.cost_alerts FOR UPDATE
USING (master_company_id IN (SELECT company_id FROM public.get_user_company_ids()));

CREATE POLICY "Master can delete own alerts"
ON public.cost_alerts FOR DELETE
USING (master_company_id IN (SELECT company_id FROM public.get_user_company_ids()));

-- 7. RLS Policies for cost_alert_history
CREATE POLICY "Master can view own alert history"
ON public.cost_alert_history FOR SELECT
USING (alert_id IN (
  SELECT id FROM public.cost_alerts 
  WHERE master_company_id IN (SELECT company_id FROM public.get_user_company_ids())
));

CREATE POLICY "Master can create alert history"
ON public.cost_alert_history FOR INSERT
WITH CHECK (alert_id IN (
  SELECT id FROM public.cost_alerts 
  WHERE master_company_id IN (SELECT company_id FROM public.get_user_company_ids())
));

-- 8. Trigger for updated_at
CREATE TRIGGER update_cost_alerts_updated_at
BEFORE UPDATE ON public.cost_alerts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();