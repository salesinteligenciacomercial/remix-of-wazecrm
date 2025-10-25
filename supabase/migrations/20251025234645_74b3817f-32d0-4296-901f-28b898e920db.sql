
-- Atualizar o usuário atual para super_admin
-- Este script transforma o usuário jeovauzumak@gmail.com em super_admin

UPDATE user_roles 
SET role = 'super_admin'
WHERE user_id = '677a7847-1f34-44d0-b03b-c148b4b166b7'
AND company_id = '3d34ff74-b8ad-4c7e-b538-3bdb0d30dc78';

-- Confirmar a atualização
SELECT 
  ur.user_id,
  ur.role,
  ur.company_id,
  p.email,
  p.full_name
FROM user_roles ur
LEFT JOIN profiles p ON p.id = ur.user_id
WHERE ur.user_id = '677a7847-1f34-44d0-b03b-c148b4b166b7';
