-- Corrigir tipo da coluna horas_antecedencia para aceitar valores decimais
-- A coluna precisa ser NUMERIC para aceitar horas e minutos (ex: 1.0833 = 1h 5min)

ALTER TABLE public.lembretes 
ALTER COLUMN horas_antecedencia TYPE NUMERIC(10, 4);

-- Comentário explicativo
COMMENT ON COLUMN public.lembretes.horas_antecedencia IS 'Tempo de antecedência em horas (aceita decimais para minutos, ex: 1.0833 = 1h 5min)';

