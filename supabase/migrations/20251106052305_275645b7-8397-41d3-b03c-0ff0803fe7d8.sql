
-- Corrigir trigger da tabela funis
DROP TRIGGER IF EXISTS update_funis_updated_at ON public.funis;

-- Aplicar o trigger correto que usa atualizado_em
CREATE TRIGGER update_funis_atualizado_em
  BEFORE UPDATE ON public.funis
  FOR EACH ROW
  EXECUTE FUNCTION public.update_atualizado_em_column();
