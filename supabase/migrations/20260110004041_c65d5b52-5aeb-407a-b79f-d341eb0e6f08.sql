-- Adicionar permissões para os módulos que faltam

-- Analytics
INSERT INTO public.permissions (name, module, action, description)
VALUES 
  ('analytics.view', 'analytics', 'view', 'Visualizar analytics e dashboards')
ON CONFLICT DO NOTHING;

-- Chat Equipe
INSERT INTO public.permissions (name, module, action, description)
VALUES 
  ('chat_equipe.view', 'chat_equipe', 'view', 'Visualizar chat da equipe'),
  ('chat_equipe.send', 'chat_equipe', 'send', 'Enviar mensagens no chat da equipe')
ON CONFLICT DO NOTHING;

-- Reuniões
INSERT INTO public.permissions (name, module, action, description)
VALUES 
  ('reunioes.view', 'reunioes', 'view', 'Visualizar reuniões'),
  ('reunioes.create', 'reunioes', 'create', 'Criar reuniões'),
  ('reunioes.edit', 'reunioes', 'edit', 'Editar reuniões')
ON CONFLICT DO NOTHING;

-- Discador
INSERT INTO public.permissions (name, module, action, description)
VALUES 
  ('discador.view', 'discador', 'view', 'Visualizar discador'),
  ('discador.call', 'discador', 'call', 'Realizar chamadas')
ON CONFLICT DO NOTHING;

-- Processos Comerciais
INSERT INTO public.permissions (name, module, action, description)
VALUES 
  ('processos.view', 'processos', 'view', 'Visualizar processos comerciais'),
  ('processos.create', 'processos', 'create', 'Criar processos'),
  ('processos.edit', 'processos', 'edit', 'Editar processos')
ON CONFLICT DO NOTHING;

-- Automação/IA (renomear de fluxos para automacao para consistência)
INSERT INTO public.permissions (name, module, action, description)
VALUES 
  ('automacao.view', 'automacao', 'view', 'Visualizar fluxos e automação'),
  ('automacao.create', 'automacao', 'create', 'Criar automações'),
  ('automacao.edit', 'automacao', 'edit', 'Editar automações')
ON CONFLICT DO NOTHING;