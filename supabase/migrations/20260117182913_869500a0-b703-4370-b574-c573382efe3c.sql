-- Criar tabela de produtos/serviços
CREATE TABLE public.produtos_servicos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  preco_sugerido NUMERIC(12,2) DEFAULT 0,
  categoria TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.produtos_servicos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuários podem ver produtos da sua empresa"
ON public.produtos_servicos
FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Usuários podem criar produtos na sua empresa"
ON public.produtos_servicos
FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Usuários podem atualizar produtos da sua empresa"
ON public.produtos_servicos
FOR UPDATE
USING (
  company_id IN (
    SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Usuários podem excluir produtos da sua empresa"
ON public.produtos_servicos
FOR DELETE
USING (
  company_id IN (
    SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()
  )
);

-- Adicionar campo de produto ao lead
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS produto_id UUID REFERENCES public.produtos_servicos(id) ON DELETE SET NULL;

-- Índices
CREATE INDEX idx_produtos_servicos_company_id ON public.produtos_servicos(company_id);
CREATE INDEX idx_produtos_servicos_ativo ON public.produtos_servicos(ativo);
CREATE INDEX idx_leads_produto_id ON public.leads(produto_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_produtos_servicos_updated_at
BEFORE UPDATE ON public.produtos_servicos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();