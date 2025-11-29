-- ============================================================
-- 📝 EXECUTE ESTE SQL NO SUPABASE PARA LIMPAR DUPLICATAS
-- ============================================================
-- Este script corrige assinaturas de mensagens:
-- - Mensagens com owner_id = assinatura do usuário (enviada pelo CRM)
-- - Mensagens sem owner_id = "WhatsApp" (enviada pelo App/Web)
-- ============================================================

-- PASSO 1: Criar tabela temporária com mensagens a manter
-- Prioriza mensagens com sent_by específico (nome do usuário, não "Equipe" ou "WhatsApp")
CREATE TEMP TABLE mensagens_para_manter AS
SELECT DISTINCT ON (
  telefone_formatado, 
  LEFT(mensagem, 50), 
  fromme, 
  DATE_TRUNC('minute', created_at)
) 
  id,
  sent_by,
  owner_id
FROM public.conversas
WHERE fromme = true
ORDER BY 
  telefone_formatado, 
  LEFT(mensagem, 50), 
  fromme, 
  DATE_TRUNC('minute', created_at),
  -- Prioridade: 1) Nome específico, 2) Com owner_id, 3) Outros
  CASE 
    WHEN sent_by IS NOT NULL AND sent_by != '' AND sent_by NOT IN ('Equipe', 'WhatsApp') THEN 0 
    WHEN owner_id IS NOT NULL THEN 1
    ELSE 2 
  END,
  created_at ASC;

-- PASSO 2: Deletar duplicatas (manter apenas as corretas)
DELETE FROM public.conversas
WHERE fromme = true
  AND id NOT IN (SELECT id FROM mensagens_para_manter);

-- PASSO 3: Atualizar mensagens COM owner_id (enviadas pelo CRM)
-- Usar nome do usuário que enviou
UPDATE public.conversas c
SET sent_by = COALESCE(
  (SELECT p.full_name FROM public.profiles p WHERE p.id = c.owner_id AND p.full_name IS NOT NULL AND p.full_name != ''),
  (SELECT p.email FROM public.profiles p WHERE p.id = c.owner_id),
  c.sent_by
)
WHERE c.fromme = true
  AND c.owner_id IS NOT NULL
  AND (c.sent_by IS NULL OR c.sent_by = '' OR c.sent_by = 'Equipe' OR c.sent_by = 'WhatsApp');

-- PASSO 4: Atualizar mensagens SEM owner_id (enviadas pelo WhatsApp App/Web)
-- Marcar como "WhatsApp"
UPDATE public.conversas
SET sent_by = 'WhatsApp'
WHERE fromme = true
  AND owner_id IS NULL
  AND (sent_by IS NULL OR sent_by = '' OR sent_by = 'Equipe');

-- Limpar
DROP TABLE IF EXISTS mensagens_para_manter;

-- VERIFICAÇÃO
SELECT 
  'Mensagens enviadas' as tipo,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE sent_by IS NOT NULL AND sent_by NOT IN ('', 'Equipe', 'WhatsApp')) as com_nome_usuario,
  COUNT(*) FILTER (WHERE sent_by = 'WhatsApp') as enviadas_whatsapp_app,
  COUNT(*) FILTER (WHERE sent_by = 'Equipe') as com_equipe,
  COUNT(*) FILTER (WHERE sent_by IS NULL OR sent_by = '') as sem_assinatura
FROM public.conversas
WHERE fromme = true;

