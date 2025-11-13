-- Adicionar campo slug à tabela agendas para links públicos
ALTER TABLE public.agendas ADD COLUMN IF NOT EXISTS slug text UNIQUE;

-- Criar índice para melhorar performance de busca por slug
CREATE INDEX IF NOT EXISTS idx_agendas_slug ON public.agendas(slug);

-- Comentário explicativo
COMMENT ON COLUMN public.agendas.slug IS 'URL amigável única para acesso público à agenda';