-- Adicionar índices para melhorar performance de consultas em conversas
CREATE INDEX IF NOT EXISTS idx_conversas_company_id ON public.conversas(company_id);
CREATE INDEX IF NOT EXISTS idx_conversas_telefone_formatado ON public.conversas(telefone_formatado);
CREATE INDEX IF NOT EXISTS idx_conversas_created_at_desc ON public.conversas(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversas_company_created ON public.conversas(company_id, created_at DESC);

-- Adicionar índices para melhorar performance de consultas em leads
CREATE INDEX IF NOT EXISTS idx_leads_company_phone ON public.leads(company_id, phone);
CREATE INDEX IF NOT EXISTS idx_leads_company_telefone ON public.leads(company_id, telefone);