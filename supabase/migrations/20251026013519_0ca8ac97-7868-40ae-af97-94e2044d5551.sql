-- Criar tabela para mensagens agendadas
CREATE TABLE IF NOT EXISTS public.scheduled_whatsapp_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  owner_id UUID NOT NULL,
  conversation_id TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  contact_name TEXT,
  message_content TEXT NOT NULL,
  scheduled_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.scheduled_whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Política para usuários da empresa visualizarem suas mensagens agendadas
CREATE POLICY "Company users view scheduled messages"
ON public.scheduled_whatsapp_messages
FOR SELECT
USING (user_belongs_to_company(auth.uid(), company_id));

-- Política para usuários criarem mensagens agendadas
CREATE POLICY "Company users create scheduled messages"
ON public.scheduled_whatsapp_messages
FOR INSERT
WITH CHECK (user_belongs_to_company(auth.uid(), company_id));

-- Política para usuários atualizarem suas mensagens agendadas
CREATE POLICY "Company users update scheduled messages"
ON public.scheduled_whatsapp_messages
FOR UPDATE
USING (user_belongs_to_company(auth.uid(), company_id));

-- Política para usuários deletarem suas mensagens agendadas
CREATE POLICY "Company users delete scheduled messages"
ON public.scheduled_whatsapp_messages
FOR DELETE
USING (user_belongs_to_company(auth.uid(), company_id));

-- Índices para melhor performance
CREATE INDEX idx_scheduled_messages_status ON public.scheduled_whatsapp_messages(status);
CREATE INDEX idx_scheduled_messages_datetime ON public.scheduled_whatsapp_messages(scheduled_datetime);
CREATE INDEX idx_scheduled_messages_company ON public.scheduled_whatsapp_messages(company_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_scheduled_whatsapp_messages_updated_at
BEFORE UPDATE ON public.scheduled_whatsapp_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.scheduled_whatsapp_messages;