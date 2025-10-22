-- Criar função para atualizar updated_at se não existir
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Adicionar novos campos na tabela leads
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS telefone TEXT,
ADD COLUMN IF NOT EXISTS cpf TEXT,
ADD COLUMN IF NOT EXISTS etapa_id UUID,
ADD COLUMN IF NOT EXISTS funil_id UUID;

-- Criar tabela de funis (para múltiplos funis)
CREATE TABLE IF NOT EXISTS funis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  owner_id UUID REFERENCES profiles(id),
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS na tabela funis
ALTER TABLE funis ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para funis
CREATE POLICY "Users can view their company funis"
ON funis FOR SELECT
USING (owner_id IN (SELECT id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create funis"
ON funis FOR INSERT
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their company funis"
ON funis FOR UPDATE
USING (owner_id IN (SELECT id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete their company funis"
ON funis FOR DELETE
USING (owner_id IN (SELECT id FROM profiles WHERE id = auth.uid()));

-- Criar tabela de etapas (cada funil pode ter várias etapas)
CREATE TABLE IF NOT EXISTS etapas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funil_id UUID REFERENCES funis(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  posicao INT DEFAULT 0,
  cor TEXT DEFAULT '#3b82f6',
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS na tabela etapas
ALTER TABLE etapas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para etapas
CREATE POLICY "Users can view etapas from their funis"
ON etapas FOR SELECT
USING (funil_id IN (SELECT id FROM funis WHERE owner_id = auth.uid()));

CREATE POLICY "Users can create etapas"
ON etapas FOR INSERT
WITH CHECK (funil_id IN (SELECT id FROM funis WHERE owner_id = auth.uid()));

CREATE POLICY "Users can update etapas from their funis"
ON etapas FOR UPDATE
USING (funil_id IN (SELECT id FROM funis WHERE owner_id = auth.uid()));

CREATE POLICY "Users can delete etapas from their funis"
ON etapas FOR DELETE
USING (funil_id IN (SELECT id FROM funis WHERE owner_id = auth.uid()));

-- Adicionar constraint de foreign key para leads
ALTER TABLE leads
DROP CONSTRAINT IF EXISTS fk_etapa,
DROP CONSTRAINT IF EXISTS fk_funil;

ALTER TABLE leads
ADD CONSTRAINT fk_etapa FOREIGN KEY (etapa_id) REFERENCES etapas(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_funil FOREIGN KEY (funil_id) REFERENCES funis(id) ON DELETE SET NULL;

-- Criar triggers para atualizar updated_at nas novas tabelas
DROP TRIGGER IF EXISTS update_funis_updated_at ON funis;
CREATE TRIGGER update_funis_updated_at
BEFORE UPDATE ON funis
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_etapas_updated_at ON etapas;
CREATE TRIGGER update_etapas_updated_at
BEFORE UPDATE ON etapas
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_leads_etapa_id ON leads(etapa_id);
CREATE INDEX IF NOT EXISTS idx_leads_funil_id ON leads(funil_id);
CREATE INDEX IF NOT EXISTS idx_etapas_funil_id ON etapas(funil_id);
CREATE INDEX IF NOT EXISTS idx_etapas_posicao ON etapas(funil_id, posicao);