-- Adicionar campo para controlar se a subconta pode receber mensagens de grupos
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS allow_group_messages BOOLEAN DEFAULT false;

-- Comentário explicativo
COMMENT ON COLUMN public.companies.allow_group_messages IS 'Controla se a subconta pode receber mensagens de grupos do WhatsApp';