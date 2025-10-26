-- Adicionar campo para mensagens citadas/respondidas
ALTER TABLE public.conversas 
ADD COLUMN IF NOT EXISTS replied_to_id uuid,
ADD COLUMN IF NOT EXISTS replied_to_message text;

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_conversas_replied_to_id ON public.conversas(replied_to_id);

-- Adicionar comentários
COMMENT ON COLUMN public.conversas.replied_to_id IS 'ID da mensagem que está sendo respondida';
COMMENT ON COLUMN public.conversas.replied_to_message IS 'Conteúdo da mensagem original que foi respondida';