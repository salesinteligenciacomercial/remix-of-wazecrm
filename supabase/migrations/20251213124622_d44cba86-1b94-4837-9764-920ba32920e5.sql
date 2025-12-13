-- Adicionar colunas para Instagram na tabela whatsapp_connections
ALTER TABLE public.whatsapp_connections
ADD COLUMN IF NOT EXISTS instagram_account_id text,
ADD COLUMN IF NOT EXISTS instagram_access_token text,
ADD COLUMN IF NOT EXISTS instagram_username text;

-- Adicionar comentários
COMMENT ON COLUMN public.whatsapp_connections.instagram_account_id IS 'ID da conta Instagram Business';
COMMENT ON COLUMN public.whatsapp_connections.instagram_access_token IS 'Token de acesso do Instagram';
COMMENT ON COLUMN public.whatsapp_connections.instagram_username IS 'Username do Instagram';