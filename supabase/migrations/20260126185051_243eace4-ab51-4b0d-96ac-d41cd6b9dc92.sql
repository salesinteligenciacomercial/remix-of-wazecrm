-- Adicionar campos de trial na tabela company_subscriptions
ALTER TABLE public.company_subscriptions 
ADD COLUMN IF NOT EXISTS trial_end_date DATE,
ADD COLUMN IF NOT EXISTS trial_days INTEGER DEFAULT 14,
ADD COLUMN IF NOT EXISTS converted_from_trial BOOLEAN DEFAULT FALSE;

-- Criar tabela para configuração de automação de cobrança
CREATE TABLE IF NOT EXISTS public.billing_automation_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  auto_generate_invoices BOOLEAN DEFAULT FALSE,
  days_before_due INTEGER DEFAULT 5,
  reminder_days_before INTEGER[] DEFAULT '{3, 0}',
  reminder_days_after INTEGER[] DEFAULT '{5, 15, 30}',
  reminder_channels TEXT[] DEFAULT '{email}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(master_company_id)
);

-- Criar tabela para histórico de lembretes enviados
CREATE TABLE IF NOT EXISTS public.billing_reminders_sent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES public.billing_invoices(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL,
  channel TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT now(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE
);

-- Habilitar RLS
ALTER TABLE public.billing_automation_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_reminders_sent ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para billing_automation_config
CREATE POLICY "Master can view own config" 
ON public.billing_automation_config FOR SELECT 
USING (master_company_id IN (SELECT company_id FROM public.get_user_company_ids()));

CREATE POLICY "Master can insert own config" 
ON public.billing_automation_config FOR INSERT 
WITH CHECK (master_company_id IN (SELECT company_id FROM public.get_user_company_ids()));

CREATE POLICY "Master can update own config" 
ON public.billing_automation_config FOR UPDATE 
USING (master_company_id IN (SELECT company_id FROM public.get_user_company_ids()));

CREATE POLICY "Master can delete own config" 
ON public.billing_automation_config FOR DELETE 
USING (master_company_id IN (SELECT company_id FROM public.get_user_company_ids()));

-- Políticas RLS para billing_reminders_sent
CREATE POLICY "Company can view own reminders" 
ON public.billing_reminders_sent FOR SELECT 
USING (company_id IN (SELECT company_id FROM public.get_user_company_ids()));

CREATE POLICY "Company can insert own reminders" 
ON public.billing_reminders_sent FOR INSERT 
WITH CHECK (company_id IN (SELECT company_id FROM public.get_user_company_ids()));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_billing_automation_config_updated_at
BEFORE UPDATE ON public.billing_automation_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();