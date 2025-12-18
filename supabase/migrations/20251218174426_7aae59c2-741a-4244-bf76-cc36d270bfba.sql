-- Adicionar coluna attachments na tabela tasks para persistir anexos
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;