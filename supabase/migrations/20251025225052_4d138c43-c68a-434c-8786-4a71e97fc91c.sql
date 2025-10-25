-- LIMPEZA COMPLETA E CONFIGURAÇÃO DEFINITIVA

-- 1. Deletar TODAS as conexões WhatsApp antigas
DELETE FROM whatsapp_connections WHERE company_id = '3d34ff74-b8ad-4c7e-b538-3bdb0d30dc78';

-- 2. Deletar TODAS as conversas antigas
DELETE FROM conversas WHERE company_id = '3d34ff74-b8ad-4c7e-b538-3bdb0d30dc78';

-- 3. Criar APENAS a conexão CRM válida (conforme o print)
INSERT INTO whatsapp_connections (
  company_id,
  instance_name,
  status,
  whatsapp_number,
  last_connected_at
) VALUES (
  '3d34ff74-b8ad-4c7e-b538-3bdb0d30dc78',
  'CRM',
  'connected',
  '558791426333',
  NOW()
);