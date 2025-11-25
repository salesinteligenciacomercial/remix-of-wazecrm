-- Criar tabela para categorias de mensagens rápidas
CREATE TABLE IF NOT EXISTS public.quick_message_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar tabela para mensagens rápidas
CREATE TABLE IF NOT EXISTS public.quick_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category_id UUID REFERENCES public.quick_message_categories(id) ON DELETE SET NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'audio', 'document')),
  media_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.quick_message_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quick_messages ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para categorias
CREATE POLICY "Company users manage categories"
  ON public.quick_message_categories
  FOR ALL
  USING (user_belongs_to_company(auth.uid(), company_id));

-- Políticas RLS para mensagens rápidas
CREATE POLICY "Company users manage quick messages"
  ON public.quick_messages
  FOR ALL
  USING (user_belongs_to_company(auth.uid(), company_id));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_quick_message_categories_updated_at
  BEFORE UPDATE ON public.quick_message_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_quick_messages_updated_at
  BEFORE UPDATE ON public.quick_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_quick_message_categories_company ON public.quick_message_categories(company_id);
CREATE INDEX IF NOT EXISTS idx_quick_messages_company ON public.quick_messages(company_id);
CREATE INDEX IF NOT EXISTS idx_quick_messages_category ON public.quick_messages(category_id);