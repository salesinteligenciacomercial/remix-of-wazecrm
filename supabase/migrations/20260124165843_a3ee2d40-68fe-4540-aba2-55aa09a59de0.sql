-- Tabela para registrar cada venda individualmente
CREATE TABLE public.customer_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  produto_id UUID REFERENCES public.produtos_servicos(id) ON DELETE SET NULL,
  produto_nome TEXT NOT NULL,
  
  -- Dados da venda
  valor_unitario NUMERIC NOT NULL DEFAULT 0,
  quantidade INTEGER NOT NULL DEFAULT 1,
  desconto NUMERIC DEFAULT 0,
  valor_final NUMERIC NOT NULL DEFAULT 0,
  
  -- Tipo de venda
  tipo TEXT DEFAULT 'avulsa' CHECK (tipo IN ('avulsa', 'recorrente', 'upsell', 'cross_sell')),
  recorrencia TEXT CHECK (recorrencia IN ('mensal', 'trimestral', 'semestral', 'anual')),
  
  -- Referência a venda recorrente anterior (para tracking de renovações)
  venda_origem_id UUID REFERENCES public.customer_sales(id) ON DELETE SET NULL,
  
  -- Metadados
  responsavel_id UUID,
  notas TEXT,
  categoria TEXT,
  subcategoria TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de cache de LTV para otimização de consultas
CREATE TABLE public.customer_ltv_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  
  -- Métricas de LTV
  total_gasto NUMERIC DEFAULT 0,
  total_compras INTEGER DEFAULT 0,
  ticket_medio NUMERIC DEFAULT 0,
  primeira_compra TIMESTAMPTZ,
  ultima_compra TIMESTAMPTZ,
  dias_como_cliente INTEGER DEFAULT 0,
  frequencia_compra_dias NUMERIC,
  
  -- Produtos mais comprados (JSON array)
  produtos_favoritos JSONB DEFAULT '[]',
  
  -- Contadores por tipo
  total_avulsa INTEGER DEFAULT 0,
  total_recorrente INTEGER DEFAULT 0,
  total_upsell INTEGER DEFAULT 0,
  total_cross_sell INTEGER DEFAULT 0,
  
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lead_id)
);

-- Índices para performance
CREATE INDEX idx_customer_sales_company_id ON public.customer_sales(company_id);
CREATE INDEX idx_customer_sales_lead_id ON public.customer_sales(lead_id);
CREATE INDEX idx_customer_sales_produto_id ON public.customer_sales(produto_id);
CREATE INDEX idx_customer_sales_created_at ON public.customer_sales(created_at DESC);
CREATE INDEX idx_customer_sales_tipo ON public.customer_sales(tipo);
CREATE INDEX idx_customer_ltv_cache_company_id ON public.customer_ltv_cache(company_id);
CREATE INDEX idx_customer_ltv_cache_total_gasto ON public.customer_ltv_cache(total_gasto DESC);

-- Enable RLS
ALTER TABLE public.customer_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_ltv_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customer_sales
CREATE POLICY "Users can view sales from their company"
ON public.customer_sales FOR SELECT
USING (company_id IN (SELECT public.get_user_company_ids()));

CREATE POLICY "Users can insert sales for their company"
ON public.customer_sales FOR INSERT
WITH CHECK (company_id IN (SELECT public.get_user_company_ids()));

CREATE POLICY "Users can update sales from their company"
ON public.customer_sales FOR UPDATE
USING (company_id IN (SELECT public.get_user_company_ids()));

CREATE POLICY "Users can delete sales from their company"
ON public.customer_sales FOR DELETE
USING (company_id IN (SELECT public.get_user_company_ids()));

-- RLS Policies for customer_ltv_cache
CREATE POLICY "Users can view LTV cache from their company"
ON public.customer_ltv_cache FOR SELECT
USING (company_id IN (SELECT public.get_user_company_ids()));

CREATE POLICY "Users can manage LTV cache for their company"
ON public.customer_ltv_cache FOR ALL
USING (company_id IN (SELECT public.get_user_company_ids()));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_customer_sales_updated_at
BEFORE UPDATE ON public.customer_sales
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customer_ltv_cache_updated_at
BEFORE UPDATE ON public.customer_ltv_cache
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Função para recalcular LTV do cliente
CREATE OR REPLACE FUNCTION public.recalculate_customer_ltv()
RETURNS TRIGGER AS $$
DECLARE
  v_lead_id UUID;
  v_company_id UUID;
  v_total_gasto NUMERIC;
  v_total_compras INTEGER;
  v_ticket_medio NUMERIC;
  v_primeira_compra TIMESTAMPTZ;
  v_ultima_compra TIMESTAMPTZ;
  v_dias_como_cliente INTEGER;
  v_frequencia_dias NUMERIC;
  v_produtos_favoritos JSONB;
  v_total_avulsa INTEGER;
  v_total_recorrente INTEGER;
  v_total_upsell INTEGER;
  v_total_cross_sell INTEGER;
BEGIN
  -- Determinar lead_id e company_id baseado na operação
  IF TG_OP = 'DELETE' THEN
    v_lead_id := OLD.lead_id;
    v_company_id := OLD.company_id;
  ELSE
    v_lead_id := NEW.lead_id;
    v_company_id := NEW.company_id;
  END IF;

  -- Calcular métricas agregadas
  SELECT 
    COALESCE(SUM(valor_final), 0),
    COUNT(*),
    COALESCE(AVG(valor_final), 0),
    MIN(created_at),
    MAX(created_at),
    COUNT(*) FILTER (WHERE tipo = 'avulsa'),
    COUNT(*) FILTER (WHERE tipo = 'recorrente'),
    COUNT(*) FILTER (WHERE tipo = 'upsell'),
    COUNT(*) FILTER (WHERE tipo = 'cross_sell')
  INTO 
    v_total_gasto,
    v_total_compras,
    v_ticket_medio,
    v_primeira_compra,
    v_ultima_compra,
    v_total_avulsa,
    v_total_recorrente,
    v_total_upsell,
    v_total_cross_sell
  FROM public.customer_sales
  WHERE lead_id = v_lead_id;

  -- Calcular dias como cliente
  IF v_primeira_compra IS NOT NULL THEN
    v_dias_como_cliente := EXTRACT(DAY FROM (NOW() - v_primeira_compra));
  ELSE
    v_dias_como_cliente := 0;
  END IF;

  -- Calcular frequência de compra
  IF v_total_compras > 1 AND v_primeira_compra IS NOT NULL AND v_ultima_compra IS NOT NULL THEN
    v_frequencia_dias := EXTRACT(DAY FROM (v_ultima_compra - v_primeira_compra)) / (v_total_compras - 1);
  ELSE
    v_frequencia_dias := NULL;
  END IF;

  -- Produtos mais comprados (top 5)
  SELECT COALESCE(jsonb_agg(produto_info), '[]'::jsonb)
  INTO v_produtos_favoritos
  FROM (
    SELECT jsonb_build_object(
      'produto_nome', produto_nome,
      'quantidade', SUM(quantidade),
      'valor_total', SUM(valor_final)
    ) as produto_info
    FROM public.customer_sales
    WHERE lead_id = v_lead_id
    GROUP BY produto_nome
    ORDER BY SUM(valor_final) DESC
    LIMIT 5
  ) top_produtos;

  -- Upsert no cache
  INSERT INTO public.customer_ltv_cache (
    company_id,
    lead_id,
    total_gasto,
    total_compras,
    ticket_medio,
    primeira_compra,
    ultima_compra,
    dias_como_cliente,
    frequencia_compra_dias,
    produtos_favoritos,
    total_avulsa,
    total_recorrente,
    total_upsell,
    total_cross_sell,
    updated_at
  ) VALUES (
    v_company_id,
    v_lead_id,
    v_total_gasto,
    v_total_compras,
    v_ticket_medio,
    v_primeira_compra,
    v_ultima_compra,
    v_dias_como_cliente,
    v_frequencia_dias,
    v_produtos_favoritos,
    v_total_avulsa,
    v_total_recorrente,
    v_total_upsell,
    v_total_cross_sell,
    NOW()
  )
  ON CONFLICT (lead_id) DO UPDATE SET
    total_gasto = EXCLUDED.total_gasto,
    total_compras = EXCLUDED.total_compras,
    ticket_medio = EXCLUDED.ticket_medio,
    primeira_compra = EXCLUDED.primeira_compra,
    ultima_compra = EXCLUDED.ultima_compra,
    dias_como_cliente = EXCLUDED.dias_como_cliente,
    frequencia_compra_dias = EXCLUDED.frequencia_compra_dias,
    produtos_favoritos = EXCLUDED.produtos_favoritos,
    total_avulsa = EXCLUDED.total_avulsa,
    total_recorrente = EXCLUDED.total_recorrente,
    total_upsell = EXCLUDED.total_upsell,
    total_cross_sell = EXCLUDED.total_cross_sell,
    updated_at = NOW();

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para atualizar LTV automaticamente
CREATE TRIGGER trigger_recalculate_customer_ltv
AFTER INSERT OR UPDATE OR DELETE ON public.customer_sales
FOR EACH ROW
EXECUTE FUNCTION public.recalculate_customer_ltv();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_sales;
ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_ltv_cache;