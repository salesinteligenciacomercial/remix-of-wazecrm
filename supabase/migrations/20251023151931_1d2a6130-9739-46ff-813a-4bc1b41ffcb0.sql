-- Adicionar coluna arquivo_nome na tabela conversas
ALTER TABLE conversas 
ADD COLUMN IF NOT EXISTS arquivo_nome TEXT;