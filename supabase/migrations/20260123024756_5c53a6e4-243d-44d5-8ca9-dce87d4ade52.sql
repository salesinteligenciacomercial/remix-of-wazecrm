-- Tabela para mensagens de chat durante reuniões
CREATE TABLE public.meeting_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL,
  sender_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  message TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_meeting_chat_meeting_id ON public.meeting_chat_messages(meeting_id);
CREATE INDEX idx_meeting_chat_created_at ON public.meeting_chat_messages(created_at);

-- Enable RLS
ALTER TABLE public.meeting_chat_messages ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - permitir leitura e escrita para todos (reuniões públicas)
CREATE POLICY "Anyone can read chat messages" 
ON public.meeting_chat_messages 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can send chat messages" 
ON public.meeting_chat_messages 
FOR INSERT 
WITH CHECK (true);

-- Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_chat_messages;