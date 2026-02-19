
-- Adicionar coluna para armazenar o ID da mensagem no WhatsApp (necessário para edição/exclusão)
ALTER TABLE public.conversas ADD COLUMN IF NOT EXISTS whatsapp_message_id TEXT;

-- Índice para busca rápida pelo ID da mensagem WhatsApp
CREATE INDEX IF NOT EXISTS idx_conversas_whatsapp_message_id ON public.conversas(whatsapp_message_id) WHERE whatsapp_message_id IS NOT NULL;
