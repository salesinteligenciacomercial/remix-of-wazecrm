
-- Add segmento column to companies table
ALTER TABLE public.companies ADD COLUMN segmento text;

-- Add comment for documentation
COMMENT ON COLUMN public.companies.segmento IS 'Segmento de atuação da empresa (ex: correspondente_bancario, clinica_estetica, etc)';
