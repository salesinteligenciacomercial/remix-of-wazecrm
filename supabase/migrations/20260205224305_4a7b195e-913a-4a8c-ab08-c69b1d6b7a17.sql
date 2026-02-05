-- Adicionar campo para vincular leads duplicados ao lead/contato original
-- Isso permite ter múltiplos cartões de negociação para o mesmo contato
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS lead_origem_id UUID REFERENCES public.leads(id) ON DELETE SET NULL;

-- Criar índice para consultas eficientes
CREATE INDEX IF NOT EXISTS idx_leads_lead_origem_id ON public.leads(lead_origem_id);

-- Comentário para documentação
COMMENT ON COLUMN public.leads.lead_origem_id IS 'Referência ao lead original quando este é uma duplicação. Usado para múltiplas negociações do mesmo contato.';