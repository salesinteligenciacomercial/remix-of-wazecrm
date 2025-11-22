-- ============================================
-- MIGRAÇÃO URGENTE: Corrigir tipo da coluna horas_antecedencia
-- ============================================
-- Execute este SQL no Supabase Dashboard > SQL Editor
-- Isso corrigirá o erro "invalid input syntax for type integer"
-- ============================================

-- Alterar tipo da coluna para aceitar valores decimais
ALTER TABLE public.lembretes 
ALTER COLUMN horas_antecedencia TYPE NUMERIC(10, 4);

-- Verificar se a alteração foi aplicada
SELECT 
    column_name, 
    data_type, 
    numeric_precision, 
    numeric_scale
FROM information_schema.columns 
WHERE table_name = 'lembretes' 
  AND column_name = 'horas_antecedencia';

-- Se a consulta acima mostrar NUMERIC(10,4), a migração foi aplicada com sucesso!

