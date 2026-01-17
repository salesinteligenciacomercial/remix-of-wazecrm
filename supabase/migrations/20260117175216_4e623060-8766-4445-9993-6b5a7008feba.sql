-- Tabela para histórico de alterações de valores e status dos leads
CREATE TABLE IF NOT EXISTS public.lead_value_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  company_id UUID NOT NULL,
  
  -- Valores antigo e novo
  old_value NUMERIC,
  new_value NUMERIC,
  value_change NUMERIC,
  
  -- Status antigo e novo
  old_status TEXT,
  new_status TEXT,
  
  -- Etapa antiga e nova
  old_etapa_id UUID REFERENCES public.etapas(id),
  new_etapa_id UUID REFERENCES public.etapas(id),
  
  -- Metadados
  change_type TEXT NOT NULL CHECK (change_type IN ('value_change', 'status_change', 'stage_change', 'probability_change', 'initial')),
  notes TEXT,
  changed_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_lead_value_history_lead_id ON public.lead_value_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_value_history_company_id ON public.lead_value_history(company_id);
CREATE INDEX IF NOT EXISTS idx_lead_value_history_created_at ON public.lead_value_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_value_history_change_type ON public.lead_value_history(change_type);

-- Novos campos na tabela leads
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS expected_close_date DATE;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS loss_reason TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS probability INTEGER DEFAULT 50;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS won_at TIMESTAMPTZ;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS lost_at TIMESTAMPTZ;

-- Índices para os novos campos
CREATE INDEX IF NOT EXISTS idx_leads_expected_close_date ON public.leads(expected_close_date);
CREATE INDEX IF NOT EXISTS idx_leads_probability ON public.leads(probability);
CREATE INDEX IF NOT EXISTS idx_leads_won_at ON public.leads(won_at);
CREATE INDEX IF NOT EXISTS idx_leads_lost_at ON public.leads(lost_at);

-- Enable RLS na tabela de histórico
ALTER TABLE public.lead_value_history ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para lead_value_history
CREATE POLICY "Users can view history of their company leads"
  ON public.lead_value_history
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert history for their company leads"
  ON public.lead_value_history
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Função para registrar mudanças automaticamente
CREATE OR REPLACE FUNCTION public.log_lead_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Registra mudança de valor
  IF OLD.value IS DISTINCT FROM NEW.value THEN
    INSERT INTO public.lead_value_history (lead_id, company_id, old_value, new_value, value_change, change_type, changed_by)
    VALUES (NEW.id, NEW.company_id, OLD.value, NEW.value, COALESCE(NEW.value, 0) - COALESCE(OLD.value, 0), 'value_change', auth.uid());
  END IF;
  
  -- Registra mudança de status
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.lead_value_history (lead_id, company_id, old_status, new_status, old_value, new_value, change_type, changed_by)
    VALUES (NEW.id, NEW.company_id, OLD.status, NEW.status, OLD.value, NEW.value, 'status_change', auth.uid());
    
    -- Atualiza timestamps de ganho/perda
    IF NEW.status = 'ganho' THEN
      NEW.won_at := NOW();
      NEW.conversion_timestamp := NOW();
    ELSIF NEW.status = 'perdido' THEN
      NEW.lost_at := NOW();
    END IF;
  END IF;
  
  -- Registra mudança de etapa
  IF OLD.etapa_id IS DISTINCT FROM NEW.etapa_id THEN
    INSERT INTO public.lead_value_history (lead_id, company_id, old_etapa_id, new_etapa_id, old_value, new_value, change_type, changed_by)
    VALUES (NEW.id, NEW.company_id, OLD.etapa_id, NEW.etapa_id, OLD.value, NEW.value, 'stage_change', auth.uid());
  END IF;
  
  -- Registra mudança de probabilidade
  IF OLD.probability IS DISTINCT FROM NEW.probability THEN
    INSERT INTO public.lead_value_history (lead_id, company_id, old_value, new_value, notes, change_type, changed_by)
    VALUES (NEW.id, NEW.company_id, OLD.probability, NEW.probability, 'Probabilidade alterada de ' || COALESCE(OLD.probability::TEXT, '0') || '% para ' || COALESCE(NEW.probability::TEXT, '0') || '%', 'probability_change', auth.uid());
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para registrar mudanças automaticamente
DROP TRIGGER IF EXISTS lead_changes_trigger ON public.leads;
CREATE TRIGGER lead_changes_trigger
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.log_lead_changes();

-- Habilitar realtime para a tabela de histórico
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_value_history;