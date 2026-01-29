-- Tabela para armazenar atualizações do sistema
CREATE TABLE public.system_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  changes JSONB DEFAULT '[]'::jsonb,
  tipo TEXT DEFAULT 'feature' CHECK (tipo IN ('feature', 'fix', 'improvement')),
  published_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela para rastrear leituras das atualizações
CREATE TABLE public.system_update_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  update_id UUID REFERENCES public.system_updates(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(update_id, user_id)
);

-- Índices para performance
CREATE INDEX idx_system_updates_master_company ON public.system_updates(master_company_id);
CREATE INDEX idx_system_updates_published_at ON public.system_updates(published_at DESC);
CREATE INDEX idx_system_update_reads_user ON public.system_update_reads(user_id);
CREATE INDEX idx_system_update_reads_update ON public.system_update_reads(update_id);

-- Habilitar RLS
ALTER TABLE public.system_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_update_reads ENABLE ROW LEVEL SECURITY;

-- Função para verificar se usuário é super_admin de uma empresa
CREATE OR REPLACE FUNCTION public.is_master_admin_of(p_master_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    JOIN public.companies c ON c.id = ur.company_id
    WHERE ur.user_id = auth.uid() 
      AND ur.role = 'super_admin'
      AND c.id = p_master_company_id
      AND c.is_master_account = true
  );
$$;

-- Função para obter o parent_company_id da empresa do usuário
CREATE OR REPLACE FUNCTION public.get_user_parent_company_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.parent_company_id
  FROM public.user_roles ur
  JOIN public.companies c ON c.id = ur.company_id
  WHERE ur.user_id = auth.uid()
  LIMIT 1;
$$;

-- Políticas para system_updates
-- Super Admin pode gerenciar atualizações da sua conta matriz
CREATE POLICY "Super admin can manage own updates"
ON public.system_updates
FOR ALL
USING (public.is_master_admin_of(master_company_id))
WITH CHECK (public.is_master_admin_of(master_company_id));

-- Subcontas podem ler atualizações da sua matriz
CREATE POLICY "Subaccounts can read parent updates"
ON public.system_updates
FOR SELECT
USING (
  master_company_id = public.get_user_parent_company_id()
);

-- Políticas para system_update_reads
-- Usuários podem gerenciar suas próprias leituras
CREATE POLICY "Users can manage own reads"
ON public.system_update_reads
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Super admin pode ver todas as leituras das suas atualizações
CREATE POLICY "Super admin can view reads of own updates"
ON public.system_update_reads
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.system_updates su
    WHERE su.id = update_id
    AND public.is_master_admin_of(su.master_company_id)
  )
);