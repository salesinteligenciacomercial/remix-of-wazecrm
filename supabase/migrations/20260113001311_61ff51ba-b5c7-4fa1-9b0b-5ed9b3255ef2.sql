-- Tabela para armazenar templates do WhatsApp (Meta API)
CREATE TABLE public.whatsapp_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  meta_template_id VARCHAR(255),
  name VARCHAR(255) NOT NULL,
  language VARCHAR(10) DEFAULT 'pt_BR',
  category VARCHAR(50) DEFAULT 'UTILITY' CHECK (category IN ('UTILITY', 'MARKETING', 'AUTHENTICATION')),
  status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'PAUSED', 'DISABLED')),
  components JSONB DEFAULT '[]'::jsonb,
  quality_score VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  synced_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(company_id, name, language)
);

-- Tabela para logs detalhados de mensagens WhatsApp
CREATE TABLE public.whatsapp_message_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversas(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  message_id_meta VARCHAR(255),
  message_id_evolution VARCHAR(255),
  provider VARCHAR(20) DEFAULT 'evolution' CHECK (provider IN ('evolution', 'meta')),
  direction VARCHAR(10) DEFAULT 'outbound' CHECK (direction IN ('inbound', 'outbound')),
  message_type VARCHAR(50) DEFAULT 'text',
  template_id UUID REFERENCES public.whatsapp_templates(id) ON DELETE SET NULL,
  template_name VARCHAR(255),
  phone_number VARCHAR(50),
  status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed', 'deleted')),
  error_code VARCHAR(50),
  error_message TEXT,
  cost_category VARCHAR(50),
  cost_estimate DECIMAL(10, 4) DEFAULT 0,
  campaign_id UUID,
  campaign_name VARCHAR(255),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela para analytics agregados de campanhas
CREATE TABLE public.whatsapp_campaigns_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  campaign_id UUID,
  campaign_name VARCHAR(255) NOT NULL,
  template_id UUID REFERENCES public.whatsapp_templates(id) ON DELETE SET NULL,
  provider VARCHAR(20) DEFAULT 'evolution',
  total_sent INTEGER DEFAULT 0,
  total_delivered INTEGER DEFAULT 0,
  total_read INTEGER DEFAULT 0,
  total_failed INTEGER DEFAULT 0,
  total_replied INTEGER DEFAULT 0,
  estimated_cost DECIMAL(10, 2) DEFAULT 0,
  period_start TIMESTAMP WITH TIME ZONE,
  period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela para configuração de preços por país/categoria
CREATE TABLE public.whatsapp_pricing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  country_code VARCHAR(5) NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('UTILITY', 'MARKETING', 'AUTHENTICATION', 'SERVICE')),
  price_per_message DECIMAL(10, 4) NOT NULL,
  currency VARCHAR(3) DEFAULT 'BRL',
  effective_from TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Inserir preços padrão para o Brasil
INSERT INTO public.whatsapp_pricing (country_code, category, price_per_message, currency) VALUES
  ('BR', 'UTILITY', 0.035, 'BRL'),
  ('BR', 'MARKETING', 0.065, 'BRL'),
  ('BR', 'AUTHENTICATION', 0.045, 'BRL'),
  ('BR', 'SERVICE', 0.00, 'BRL');

-- Habilitar RLS
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_message_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_campaigns_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_pricing ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para whatsapp_templates
CREATE POLICY "Users can view templates from their company"
  ON public.whatsapp_templates FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create templates for their company"
  ON public.whatsapp_templates FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update templates from their company"
  ON public.whatsapp_templates FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete templates from their company"
  ON public.whatsapp_templates FOR DELETE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- Políticas RLS para whatsapp_message_logs
CREATE POLICY "Users can view message logs from their company"
  ON public.whatsapp_message_logs FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create message logs for their company"
  ON public.whatsapp_message_logs FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update message logs from their company"
  ON public.whatsapp_message_logs FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- Políticas RLS para whatsapp_campaigns_analytics
CREATE POLICY "Users can view campaign analytics from their company"
  ON public.whatsapp_campaigns_analytics FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create campaign analytics for their company"
  ON public.whatsapp_campaigns_analytics FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update campaign analytics from their company"
  ON public.whatsapp_campaigns_analytics FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- Políticas RLS para whatsapp_pricing (leitura pública)
CREATE POLICY "Anyone can view pricing"
  ON public.whatsapp_pricing FOR SELECT
  USING (true);

-- Índices para performance
CREATE INDEX idx_whatsapp_templates_company ON public.whatsapp_templates(company_id);
CREATE INDEX idx_whatsapp_templates_status ON public.whatsapp_templates(status);
CREATE INDEX idx_whatsapp_message_logs_company ON public.whatsapp_message_logs(company_id);
CREATE INDEX idx_whatsapp_message_logs_sent_at ON public.whatsapp_message_logs(sent_at);
CREATE INDEX idx_whatsapp_message_logs_campaign ON public.whatsapp_message_logs(campaign_id);
CREATE INDEX idx_whatsapp_message_logs_status ON public.whatsapp_message_logs(status);
CREATE INDEX idx_whatsapp_campaigns_analytics_company ON public.whatsapp_campaigns_analytics(company_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_whatsapp_templates_updated_at
  BEFORE UPDATE ON public.whatsapp_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_whatsapp_campaigns_analytics_updated_at
  BEFORE UPDATE ON public.whatsapp_campaigns_analytics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar realtime para logs de mensagens
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_message_logs;