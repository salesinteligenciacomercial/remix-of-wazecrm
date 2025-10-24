-- Limpeza completa do CRM - manter apenas usuário mestre e dados essenciais

-- 1. Deletar compromissos de teste
DELETE FROM public.compromissos 
WHERE company_id != 'a3d2003b-486e-400e-a7ab-4d8d6cc331b6';

-- 2. Deletar tarefas de teste
DELETE FROM public.tasks;

-- 3. Deletar etapas dos funis que serão removidos
DELETE FROM public.etapas 
WHERE funil_id != '85f5e5cd-87e6-4e50-a08d-abf0d7fbbda6';

-- 4. Deletar leads de teste (manter apenas Jeohvah Lima)
DELETE FROM public.leads 
WHERE id != '86b59e63-e3be-4bd6-a7d3-3dd86bb7e7f7';

-- 5. Deletar funis de teste (manter apenas ATENDIMENTO)
DELETE FROM public.funis 
WHERE id != '85f5e5cd-87e6-4e50-a08d-abf0d7fbbda6';

-- 6. Deletar conversas de teste (manter apenas do número 558791426333)
DELETE FROM public.conversas 
WHERE numero != '558791426333';

-- 7. Deletar user_roles das subcontas
DELETE FROM public.user_roles 
WHERE user_id IN (
  'a91c79b8-1c5c-4cc1-9b15-36cfaaa8a16c',
  '01a43bd9-a5ed-4fda-b3eb-6dbfb8a0ce2a',
  'b22fb893-da4c-48d3-858b-ab0e7ead9e07',
  '2d3d16dd-e3b3-47bc-9939-dc880c5eaba0'
);

-- 8. Deletar empresas de teste
DELETE FROM public.companies 
WHERE id IN (
  '5da65ecb-5e51-456d-bdc2-6e18c3e7a36e',
  '828ff9bb-41a3-4e38-8619-d8c7ad85dbc5'
);

-- 9. Deletar perfis dos usuários de teste
DELETE FROM public.profiles 
WHERE id IN (
  'a91c79b8-1c5c-4cc1-9b15-36cfaaa8a16c',
  '01a43bd9-a5ed-4fda-b3eb-6dbfb8a0ce2a',
  'b22fb893-da4c-48d3-858b-ab0e7ead9e07',
  '2d3d16dd-e3b3-47bc-9939-dc880c5eaba0'
);

-- 10. Deletar usuários de autenticação (apenas se possível - pode precisar de admin)
-- Nota: A deleção de auth.users requer privilégios especiais
-- Os usuários em auth.users podem precisar ser removidos manualmente via Lovable Cloud