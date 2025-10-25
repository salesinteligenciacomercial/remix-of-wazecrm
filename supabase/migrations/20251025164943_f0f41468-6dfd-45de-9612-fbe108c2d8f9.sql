-- Remover constraint que impedia múltiplas conexões por company (se existir)
-- e adicionar constraint para instância única por company

-- Adicionar constraint única para instance_name por company
ALTER TABLE whatsapp_connections 
DROP CONSTRAINT IF EXISTS whatsapp_connections_company_id_key;

ALTER TABLE whatsapp_connections 
ADD CONSTRAINT whatsapp_connections_instance_company_unique 
UNIQUE (company_id, instance_name);

-- Adicionar índice para melhorar performance de busca por instância
CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_instance 
ON whatsapp_connections(instance_name) 
WHERE status = 'connected';

-- Adicionar comentário explicativo
COMMENT ON TABLE whatsapp_connections IS 'Cada company pode ter múltiplas instâncias WhatsApp, mas cada instância deve ter nome único dentro da company';