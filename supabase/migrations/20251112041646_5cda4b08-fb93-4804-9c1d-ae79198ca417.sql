-- Adicionar campo comments (JSONB) na tabela tasks para armazenar comentários
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS comments jsonb DEFAULT '[]'::jsonb;

-- Adicionar campo attachments (JSONB) na tabela tasks para armazenar anexos
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb;

-- Adicionar campo tags (TEXT[]) na tabela tasks para armazenar tags
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT ARRAY[]::text[];

-- Adicionar campo time_tracking_iniciado na tabela tasks
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS time_tracking_iniciado timestamp with time zone;

-- Adicionar campo time_tracking_pausado na tabela tasks
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS time_tracking_pausado boolean DEFAULT false;

-- Adicionar campo tempo_gasto (em segundos) na tabela tasks
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS tempo_gasto integer DEFAULT 0;

COMMENT ON COLUMN public.tasks.comments IS 'Comentários da tarefa em formato JSONB: [{"id": "uuid", "text": "comentário", "author_id": "uuid", "created_at": "timestamp"}]';
COMMENT ON COLUMN public.tasks.attachments IS 'Anexos da tarefa em formato JSONB: [{"name": "nome", "url": "url", "type": "tipo"}]';
COMMENT ON COLUMN public.tasks.tags IS 'Tags da tarefa';
COMMENT ON COLUMN public.tasks.tempo_gasto IS 'Tempo gasto na tarefa em segundos';
COMMENT ON COLUMN public.tasks.time_tracking_iniciado IS 'Data/hora de início do rastreamento de tempo';
COMMENT ON COLUMN public.tasks.time_tracking_pausado IS 'Indica se o rastreamento está pausado';