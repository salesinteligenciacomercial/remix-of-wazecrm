
-- Create prospecting daily logs table
CREATE TABLE public.prospecting_daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) NOT NULL,
  user_id UUID NOT NULL,
  log_date DATE NOT NULL,
  channel_type TEXT NOT NULL DEFAULT 'organic',
  source TEXT,
  leads_prospected INT DEFAULT 0,
  opportunities INT DEFAULT 0,
  meetings_scheduled INT DEFAULT 0,
  sales_closed INT DEFAULT 0,
  gross_value NUMERIC DEFAULT 0,
  ad_spend NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, user_id, log_date, channel_type, source)
);

-- Enable RLS
ALTER TABLE public.prospecting_daily_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies - users can access logs from their company
CREATE POLICY "Users can view company prospecting logs"
ON public.prospecting_daily_logs
FOR SELECT
TO authenticated
USING (company_id IN (SELECT public.get_user_company_ids()));

CREATE POLICY "Users can insert company prospecting logs"
ON public.prospecting_daily_logs
FOR INSERT
TO authenticated
WITH CHECK (company_id IN (SELECT public.get_user_company_ids()));

CREATE POLICY "Users can update company prospecting logs"
ON public.prospecting_daily_logs
FOR UPDATE
TO authenticated
USING (company_id IN (SELECT public.get_user_company_ids()));

CREATE POLICY "Users can delete company prospecting logs"
ON public.prospecting_daily_logs
FOR DELETE
TO authenticated
USING (company_id IN (SELECT public.get_user_company_ids()));

-- Trigger for updated_at
CREATE TRIGGER update_prospecting_daily_logs_updated_at
BEFORE UPDATE ON public.prospecting_daily_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
