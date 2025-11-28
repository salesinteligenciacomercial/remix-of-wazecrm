-- Adicionar foreign key para profissionais na tabela agendas
-- Primeiro, remover constraint antiga se existir
ALTER TABLE public.agendas 
DROP CONSTRAINT IF EXISTS agendas_responsavel_id_fkey;

-- Adicionar nova foreign key correta apontando para profissionais
ALTER TABLE public.agendas
ADD CONSTRAINT agendas_responsavel_id_fkey 
FOREIGN KEY (responsavel_id) 
REFERENCES public.profissionais(id) 
ON DELETE SET NULL;

-- Comentário explicativo
COMMENT ON CONSTRAINT agendas_responsavel_id_fkey ON public.agendas IS 
'Links agenda to the professional (profissional) responsible for it';