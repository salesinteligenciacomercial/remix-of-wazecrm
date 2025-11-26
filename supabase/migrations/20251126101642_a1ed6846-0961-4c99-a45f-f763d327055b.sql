-- Adicionar colunas necessárias para sistema de retry de lembretes
ALTER TABLE public.lembretes 
ADD COLUMN IF NOT EXISTS tentativas SMALLINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS proxima_tentativa TIMESTAMPTZ;

-- Criar índice para melhorar performance nas queries de lembretes pendentes
CREATE INDEX IF NOT EXISTS idx_lembretes_status_data 
ON public.lembretes(status_envio, data_envio);

CREATE INDEX IF NOT EXISTS idx_lembretes_retry 
ON public.lembretes(status_envio, proxima_tentativa)
WHERE status_envio = 'retry';

-- Comentários explicativos
COMMENT ON COLUMN public.lembretes.tentativas IS 'Número de tentativas de envio do lembrete (máximo 3)';
COMMENT ON COLUMN public.lembretes.proxima_tentativa IS 'Data/hora da próxima tentativa de envio em caso de falha';