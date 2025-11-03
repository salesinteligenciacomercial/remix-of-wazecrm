-- Corrigir leads que não têm company_id definido
-- Isso é necessário para que as políticas RLS dos comentários funcionem

-- Primeiro, vamos obter a company_id padrão (primeira empresa criada)
DO $$
DECLARE
    default_company_id UUID;
BEGIN
    SELECT id INTO default_company_id
    FROM public.companies
    ORDER BY created_at ASC
    LIMIT 1;

    -- Atualizar leads que não têm company_id
    IF default_company_id IS NOT NULL THEN
        UPDATE public.leads
        SET company_id = default_company_id
        WHERE company_id IS NULL;
    END IF;
END $$;

-- Garantir que todos os leads têm company_id definido
ALTER TABLE public.leads
ALTER COLUMN company_id SET NOT NULL;
