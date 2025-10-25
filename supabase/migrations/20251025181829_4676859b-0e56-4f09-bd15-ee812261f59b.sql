-- Inserir nova instância CRM para o CRM Matriz
INSERT INTO whatsapp_connections (
  instance_name,
  company_id,
  evolution_api_url,
  status,
  created_at,
  updated_at
) VALUES (
  'CRM',
  '3d34ff74-b8ad-4c7e-b538-3bdb0d30dc78',
  'https://evolution-evolution-api.kxuvcf.easypanel.host/',
  'disconnected',
  now(),
  now()
);