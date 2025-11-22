-- Criar tabela de notificações para lembretes e outros eventos
CREATE TABLE IF NOT EXISTS public.notificacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tipo TEXT NOT NULL, -- 'lembrete_enviado', 'compromisso_criado', etc.
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  compromisso_id UUID REFERENCES public.compromissos(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  lida BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar índice para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario_id ON public.notificacoes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_lida ON public.notificacoes(lida);
CREATE INDEX IF NOT EXISTS idx_notificacoes_created_at ON public.notificacoes(created_at DESC);

-- Habilitar RLS
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

-- Política RLS: usuários podem ver apenas suas próprias notificações
CREATE POLICY "Users can view their own notifications"
  ON public.notificacoes FOR SELECT
  USING (usuario_id = auth.uid());

-- Política RLS: usuários podem atualizar suas próprias notificações
CREATE POLICY "Users can update their own notifications"
  ON public.notificacoes FOR UPDATE
  USING (usuario_id = auth.uid());

-- Política RLS: sistema pode inserir notificações (via service role)
CREATE POLICY "System can insert notifications"
  ON public.notificacoes FOR INSERT
  WITH CHECK (true);

