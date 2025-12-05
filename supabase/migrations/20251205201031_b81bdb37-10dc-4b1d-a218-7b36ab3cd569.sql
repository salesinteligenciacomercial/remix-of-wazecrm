-- Add recurrence fields to lembretes table
ALTER TABLE public.lembretes 
ADD COLUMN IF NOT EXISTS recorrencia text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS data_hora_envio timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS proxima_data_envio timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ativo boolean DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN public.lembretes.recorrencia IS 'Tipo de recorrência: null (sem recorrência), semanal, quinzenal, mensal';
COMMENT ON COLUMN public.lembretes.data_hora_envio IS 'Data e hora específica do primeiro envio';
COMMENT ON COLUMN public.lembretes.proxima_data_envio IS 'Próxima data de envio para lembretes recorrentes';
COMMENT ON COLUMN public.lembretes.ativo IS 'Se o lembrete recorrente ainda está ativo';