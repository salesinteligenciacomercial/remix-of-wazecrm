-- Criar tabela para ações agendadas de cadências
CREATE TABLE public.scheduled_cadence_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cadence_progress_id UUID NOT NULL REFERENCES public.lead_cadence_progress(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  channel TEXT NOT NULL,
  action_description TEXT,
  message_content TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_scheduled_cadence_actions_status ON public.scheduled_cadence_actions(status);
CREATE INDEX idx_scheduled_cadence_actions_scheduled_at ON public.scheduled_cadence_actions(scheduled_at);
CREATE INDEX idx_scheduled_cadence_actions_company ON public.scheduled_cadence_actions(company_id);
CREATE INDEX idx_scheduled_cadence_actions_lead ON public.scheduled_cadence_actions(lead_id);

-- Adicionar colunas à tabela lead_cadence_progress
ALTER TABLE public.lead_cadence_progress 
ADD COLUMN IF NOT EXISTS cadence_steps JSONB,
ADD COLUMN IF NOT EXISTS cadence_config JSONB;

-- Enable RLS
ALTER TABLE public.scheduled_cadence_actions ENABLE ROW LEVEL SECURITY;

-- Policies para scheduled_cadence_actions
CREATE POLICY "Users can view their company scheduled actions"
ON public.scheduled_cadence_actions FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can insert scheduled actions for their company"
ON public.scheduled_cadence_actions FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update their company scheduled actions"
ON public.scheduled_cadence_actions FOR UPDATE
USING (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can delete their company scheduled actions"
ON public.scheduled_cadence_actions FOR DELETE
USING (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Enable realtime para atualizações em tempo real
ALTER PUBLICATION supabase_realtime ADD TABLE public.scheduled_cadence_actions;

-- Trigger para updated_at
CREATE TRIGGER update_scheduled_cadence_actions_updated_at
BEFORE UPDATE ON public.scheduled_cadence_actions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();