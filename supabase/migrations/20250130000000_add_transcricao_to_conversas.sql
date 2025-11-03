-- Adicionar coluna transcricao à tabela conversas para armazenar transcrições de áudio
ALTER TABLE public.conversas 
ADD COLUMN IF NOT EXISTS transcricao TEXT;

-- Comentário na coluna
COMMENT ON COLUMN public.conversas.transcricao IS 'Transcrição de mensagens de áudio gerada via IA';

