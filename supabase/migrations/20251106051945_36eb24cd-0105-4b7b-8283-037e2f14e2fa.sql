
-- Remove o trigger problemático que referencia updated_at
DROP TRIGGER IF EXISTS update_etapas_updated_at ON public.etapas;

-- Cria um novo trigger correto que atualiza atualizado_em
CREATE OR REPLACE FUNCTION public.update_atualizado_em_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Aplica o novo trigger na tabela etapas
CREATE TRIGGER update_etapas_atualizado_em
  BEFORE UPDATE ON public.etapas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_atualizado_em_column();
