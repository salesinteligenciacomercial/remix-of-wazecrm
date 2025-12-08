-- Create call_history table for storing phone call records
CREATE TABLE public.call_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  phone_number TEXT NOT NULL,
  lead_name TEXT,
  call_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  call_end TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'iniciando',
  call_result TEXT,
  notes TEXT,
  notes_required BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index for faster queries
CREATE INDEX idx_call_history_company ON public.call_history(company_id);
CREATE INDEX idx_call_history_user ON public.call_history(user_id);
CREATE INDEX idx_call_history_lead ON public.call_history(lead_id);
CREATE INDEX idx_call_history_date ON public.call_history(call_start DESC);

-- Enable RLS
ALTER TABLE public.call_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Company users view call history"
  ON public.call_history
  FOR SELECT
  USING (user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Company users insert call history"
  ON public.call_history
  FOR INSERT
  WITH CHECK (user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Company users update call history"
  ON public.call_history
  FOR UPDATE
  USING (user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Company users delete call history"
  ON public.call_history
  FOR DELETE
  USING (user_belongs_to_company(auth.uid(), company_id));

-- Trigger for updated_at
CREATE TRIGGER update_call_history_updated_at
  BEFORE UPDATE ON public.call_history
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for call status updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_history;