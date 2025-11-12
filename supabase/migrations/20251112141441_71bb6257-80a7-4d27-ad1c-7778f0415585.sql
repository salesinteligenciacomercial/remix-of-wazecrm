-- ============================================
-- FASE 1: Garantir 100% de armazenamento de conversas
-- ============================================

-- 1.1 - Criar função para atualizar nome_contato automaticamente
CREATE OR REPLACE FUNCTION public.atualizar_nome_contato_conversa()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Se nome_contato está vazio e tem lead_id, buscar do lead
  IF (NEW.nome_contato IS NULL OR NEW.nome_contato = '') AND NEW.lead_id IS NOT NULL THEN
    SELECT name INTO NEW.nome_contato
    FROM public.leads
    WHERE id = NEW.lead_id
    LIMIT 1;
    
    -- Log para debug
    IF NEW.nome_contato IS NOT NULL THEN
      RAISE NOTICE 'Nome preenchido do lead: %', NEW.nome_contato;
    END IF;
  END IF;
  
  -- Se ainda está vazio e tem telefone, usar o telefone como nome temporário
  IF (NEW.nome_contato IS NULL OR NEW.nome_contato = '') AND NEW.telefone_formatado IS NOT NULL THEN
    NEW.nome_contato := NEW.telefone_formatado;
    RAISE NOTICE 'Nome preenchido com telefone: %', NEW.nome_contato;
  END IF;
  
  -- Se ainda está vazio e tem número (pode ser grupo), usar o número
  IF (NEW.nome_contato IS NULL OR NEW.nome_contato = '') AND NEW.numero IS NOT NULL THEN
    NEW.nome_contato := NEW.numero;
    RAISE NOTICE 'Nome preenchido com número: %', NEW.nome_contato;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 1.2 - Criar trigger para executar antes de INSERT ou UPDATE
DROP TRIGGER IF EXISTS trigger_atualizar_nome_contato ON public.conversas;
CREATE TRIGGER trigger_atualizar_nome_contato
  BEFORE INSERT OR UPDATE ON public.conversas
  FOR EACH ROW
  EXECUTE FUNCTION public.atualizar_nome_contato_conversa();

-- 1.3 - Corrigir dados existentes: mensagens enviadas sem nome que têm lead vinculado
UPDATE public.conversas c
SET nome_contato = l.name,
    updated_at = NOW()
FROM public.leads l
WHERE c.lead_id = l.id
  AND (c.nome_contato IS NULL OR c.nome_contato = '')
  AND c.fromme = true
  AND l.name IS NOT NULL;

-- 1.4 - Corrigir dados existentes: mensagens sem nome nem lead, usar telefone
UPDATE public.conversas
SET nome_contato = telefone_formatado,
    updated_at = NOW()
WHERE (nome_contato IS NULL OR nome_contato = '')
  AND telefone_formatado IS NOT NULL
  AND telefone_formatado != '';

-- 1.5 - Corrigir dados existentes: mensagens sem nome e sem telefone_formatado, usar numero
UPDATE public.conversas
SET nome_contato = numero,
    updated_at = NOW()
WHERE (nome_contato IS NULL OR nome_contato = '')
  AND numero IS NOT NULL
  AND numero != '';

-- 1.6 - Criar índice para melhorar performance de queries por telefone
CREATE INDEX IF NOT EXISTS idx_conversas_telefone_formatado 
  ON public.conversas(telefone_formatado) 
  WHERE telefone_formatado IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conversas_company_created 
  ON public.conversas(company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversas_lead_id 
  ON public.conversas(lead_id) 
  WHERE lead_id IS NOT NULL;

-- 1.7 - Adicionar comentários para documentação
COMMENT ON FUNCTION public.atualizar_nome_contato_conversa() IS 
  'Garante que toda conversa tenha um nome_contato preenchido (do lead, telefone ou número)';
  
COMMENT ON TRIGGER trigger_atualizar_nome_contato ON public.conversas IS 
  'Atualiza automaticamente nome_contato antes de inserir/atualizar conversa';