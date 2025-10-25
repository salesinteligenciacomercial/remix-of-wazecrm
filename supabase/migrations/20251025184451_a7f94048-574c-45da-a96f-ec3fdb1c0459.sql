-- CORREÇÃO CRÍTICA: Atualizar instância CRM para empresa correta
UPDATE whatsapp_connections
SET 
  company_id = 'a3d2003b-486e-400e-a7ab-4d8d6cc331b6',
  evolution_api_key = 'A3D4F4EAF241-4344-8F3D-15FFA9C34D86',
  status = 'connected',
  updated_at = now()
WHERE instance_name = 'CRM';

-- Garantir que não há duplicatas
DELETE FROM whatsapp_connections 
WHERE company_id = '3d34ff74-b8ad-4c7e-b538-3bdb0d30dc78' 
AND instance_name = 'CRM';