
-- Criar conexão WhatsApp para empresa JEOVA COSTA DE LIMA
INSERT INTO whatsapp_connections (
  instance_name,
  company_id,
  evolution_api_url,
  evolution_api_key,
  status,
  created_at,
  updated_at
) VALUES (
  'CRM',
  '3d34ff74-b8ad-4c7e-b538-3bdb0d30dc78',
  'https://evolution-evolution-api.kxuvcf.easypanel.host/',
  '4BEFA4E48722-435C-A968-FA1FF722B095',
  'disconnected',
  now(),
  now()
);
