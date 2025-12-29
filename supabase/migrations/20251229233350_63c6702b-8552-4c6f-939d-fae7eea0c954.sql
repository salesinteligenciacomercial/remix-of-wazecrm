-- Enable REPLICA IDENTITY FULL for internal_messages to allow realtime filtering by conversation_id
ALTER TABLE public.internal_messages REPLICA IDENTITY FULL;

-- Also enable for internal_conversations for complete realtime support
ALTER TABLE public.internal_conversations REPLICA IDENTITY FULL;