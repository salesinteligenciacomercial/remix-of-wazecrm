-- Adicionar coluna start_date à tabela tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ;

-- Adicionar comentário descritivo
COMMENT ON COLUMN tasks.start_date IS 'Data de início do prazo estimado da tarefa';

-- Criar índice para performance em consultas de intervalo de datas
CREATE INDEX IF NOT EXISTS idx_tasks_date_range 
ON tasks(start_date, due_date) 
WHERE start_date IS NOT NULL;