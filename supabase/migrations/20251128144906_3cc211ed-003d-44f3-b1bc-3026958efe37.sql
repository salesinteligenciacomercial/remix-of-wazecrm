-- Corrigir search_path da função update_profissionais_updated_at
DROP TRIGGER IF EXISTS profissionais_updated_at ON public.profissionais;
DROP FUNCTION IF EXISTS update_profissionais_updated_at();

CREATE OR REPLACE FUNCTION update_profissionais_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profissionais_updated_at
BEFORE UPDATE ON public.profissionais
FOR EACH ROW
EXECUTE FUNCTION update_profissionais_updated_at();