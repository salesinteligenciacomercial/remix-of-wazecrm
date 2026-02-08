-- Adicionar suporte para lembretes antecipados (múltiplos envios antes da data)
-- Campo para identificar se este lembrete é parte de uma série de lembretes antecipados
ALTER TABLE public.lembretes 
ADD COLUMN IF NOT EXISTS lembrete_principal_id UUID REFERENCES public.lembretes(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS dias_antecedencia INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sequencia_envio INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS tipo_lembrete TEXT DEFAULT 'principal' CHECK (tipo_lembrete IN ('principal', 'antecipado'));

-- Índice para buscar lembretes antecipados
CREATE INDEX IF NOT EXISTS idx_lembretes_principal_id ON public.lembretes(lembrete_principal_id);
CREATE INDEX IF NOT EXISTS idx_lembretes_dias_antecedencia ON public.lembretes(dias_antecedencia);

-- Comentários para documentação
COMMENT ON COLUMN public.lembretes.lembrete_principal_id IS 'ID do lembrete principal, se este for um lembrete antecipado';
COMMENT ON COLUMN public.lembretes.dias_antecedencia IS 'Quantos dias antes da data principal este lembrete será enviado';
COMMENT ON COLUMN public.lembretes.sequencia_envio IS 'Ordem de envio (1 = primeiro lembrete antecipado, 2 = segundo, etc)';
COMMENT ON COLUMN public.lembretes.tipo_lembrete IS 'principal = lembrete do dia, antecipado = lembrete antes da data';