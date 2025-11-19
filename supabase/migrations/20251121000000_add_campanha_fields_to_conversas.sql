-- Adicionar campos de campanha na tabela conversas
-- Esta migration adiciona os campos necessários para rastreamento de campanhas de disparo em massa

-- Adicionar campos de campanha
ALTER TABLE public.conversas 
ADD COLUMN IF NOT EXISTS campanha_nome TEXT,
ADD COLUMN IF NOT EXISTS campanha_id TEXT;

-- Adicionar campos de rastreamento de leitura se não existirem
ALTER TABLE public.conversas 
ADD COLUMN IF NOT EXISTS read BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS delivered BOOLEAN DEFAULT FALSE;

-- Criar índices para melhor performance nas consultas de campanhas
CREATE INDEX IF NOT EXISTS idx_conversas_campanha_id ON public.conversas(campanha_id);
CREATE INDEX IF NOT EXISTS idx_conversas_campanha_nome ON public.conversas(campanha_nome);
CREATE INDEX IF NOT EXISTS idx_conversas_read ON public.conversas(read) WHERE read = true;
CREATE INDEX IF NOT EXISTS idx_conversas_delivered ON public.conversas(delivered) WHERE delivered = true;

-- Comentários para documentação
COMMENT ON COLUMN public.conversas.campanha_nome IS 'Nome da campanha de disparo em massa';
COMMENT ON COLUMN public.conversas.campanha_id IS 'ID único da campanha para agrupamento';
COMMENT ON COLUMN public.conversas.read IS 'Indica se a mensagem foi lida/visualizada';
COMMENT ON COLUMN public.conversas.delivered IS 'Indica se a mensagem foi entregue';

