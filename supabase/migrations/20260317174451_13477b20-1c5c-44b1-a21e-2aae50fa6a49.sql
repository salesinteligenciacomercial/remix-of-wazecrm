
CREATE TABLE public.followup_daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) NOT NULL,
  user_id UUID NOT NULL,
  log_date DATE NOT NULL,
  source TEXT,
  followups_sent INT DEFAULT 0,
  responses INT DEFAULT 0,
  meetings_scheduled INT DEFAULT 0,
  sales_closed INT DEFAULT 0,
  gross_value NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, user_id, log_date, source)
);

ALTER TABLE public.followup_daily_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view followup logs from their company"
ON public.followup_daily_logs FOR SELECT
USING (company_id IN (SELECT public.get_user_company_ids()));

CREATE POLICY "Users can insert followup logs for their company"
ON public.followup_daily_logs FOR INSERT
WITH CHECK (company_id IN (SELECT public.get_user_company_ids()));

CREATE POLICY "Users can update followup logs from their company"
ON public.followup_daily_logs FOR UPDATE
USING (company_id IN (SELECT public.get_user_company_ids()));

CREATE POLICY "Users can delete followup logs from their company"
ON public.followup_daily_logs FOR DELETE
USING (company_id IN (SELECT public.get_user_company_ids()));

CREATE TRIGGER update_followup_daily_logs_updated_at
BEFORE UPDATE ON public.followup_daily_logs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
