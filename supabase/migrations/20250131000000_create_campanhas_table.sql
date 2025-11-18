-- Criar tabela de campanhas de disparo em massa
CREATE TABLE IF NOT EXISTS public.campanhas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  total_leads INTEGER DEFAULT 0,
  enviados INTEGER DEFAULT 0,
  sucesso INTEGER DEFAULT 0,
  falhas INTEGER DEFAULT 0,
  status TEXT DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'enviando', 'pausada', 'concluida', 'cancelada')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.campanhas ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem (para evitar conflitos)
DROP POLICY IF EXISTS "Users can view campanhas from their company" ON public.campanhas;
DROP POLICY IF EXISTS "Users can create campanhas for their company" ON public.campanhas;
DROP POLICY IF EXISTS "Users can update campanhas from their company" ON public.campanhas;
DROP POLICY IF EXISTS "Users can delete campanhas from their company" ON public.campanhas;

-- Políticas RLS para campanhas
CREATE POLICY "Users can view campanhas from their company"
  ON public.campanhas
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.user_roles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create campanhas for their company"
  ON public.campanhas
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.user_roles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update campanhas from their company"
  ON public.campanhas
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM public.user_roles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete campanhas from their company"
  ON public.campanhas
  FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM public.user_roles
      WHERE user_id = auth.uid()
    )
  );

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_campanhas_company_id ON public.campanhas(company_id);
CREATE INDEX IF NOT EXISTS idx_campanhas_status ON public.campanhas(status);
CREATE INDEX IF NOT EXISTS idx_campanhas_created_at ON public.campanhas(created_at DESC);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_campanhas_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_campanhas_updated_at ON public.campanhas;
CREATE TRIGGER update_campanhas_updated_at
  BEFORE UPDATE ON public.campanhas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_campanhas_updated_at();
