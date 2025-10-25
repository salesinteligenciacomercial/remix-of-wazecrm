
-- Atualizar a instância JE2 para a empresa matriz correta
UPDATE whatsapp_connections 
SET 
  company_id = '3d34ff74-b8ad-4c7e-b538-3bdb0d30dc78',
  updated_at = now()
WHERE instance_name = 'JE2';

-- Atualizar as conversas antigas para a empresa correta também
UPDATE conversas
SET company_id = '3d34ff74-b8ad-4c7e-b538-3bdb0d30dc78'
WHERE company_id = 'a3d2003b-486e-400e-a7ab-4d8d6cc331b6';

-- Atualizar leads também se houver
UPDATE leads
SET company_id = '3d34ff74-b8ad-4c7e-b538-3bdb0d30dc78'
WHERE company_id = 'a3d2003b-486e-400e-a7ab-4d8d6cc331b6';
