-- Adicionar campo destinatario à tabela lembretes
ALTER TABLE public.lembretes 
ADD COLUMN IF NOT EXISTS destinatario text NOT NULL DEFAULT 'lead' CHECK (destinatario IN ('lead', 'responsavel', 'ambos'));

-- Adicionar campo telefone_responsavel para quando o lembrete for para o responsável
ALTER TABLE public.lembretes 
ADD COLUMN IF NOT EXISTS telefone_responsavel text;

-- Habilitar realtime para a tabela lembretes
ALTER PUBLICATION supabase_realtime ADD TABLE public.lembretes;