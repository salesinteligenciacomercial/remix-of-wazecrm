-- Corrigir políticas RLS da tabela user_roles para evitar recursão circular
-- O problema: a política usa has_role() que tenta ler user_roles, criando deadlock

-- 1. Remover política antiga que causa recursão
DROP POLICY IF EXISTS "Users view own roles" ON public.user_roles;

-- 2. Criar política simples que permite usuários verem suas próprias roles
-- SEM usar funções que dependem de user_roles (evita recursão)
CREATE POLICY "users_can_view_own_roles" ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 3. Permitir super admins verem todas as roles
-- Usar uma query direta no auth.users para evitar recursão
CREATE POLICY "super_admins_view_all_roles" ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (
    -- Verificar se o usuário tem email específico de super admin
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND email IN ('jeovauzumak@gmail.com', 'jeovauzuak@gmail.com')
    )
  );

-- 4. Permitir company admins verem roles da mesma empresa
CREATE POLICY "company_admins_view_company_roles" ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id 
      FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'company_admin'
    )
  );

-- Comentário explicativo
COMMENT ON POLICY "users_can_view_own_roles" ON public.user_roles IS 'Permite usuários visualizarem suas próprias roles sem recursão';
COMMENT ON POLICY "super_admins_view_all_roles" ON public.user_roles IS 'Permite super admins (por email) visualizarem todas as roles';
COMMENT ON POLICY "company_admins_view_company_roles" ON public.user_roles IS 'Permite company admins visualizarem roles de sua empresa';