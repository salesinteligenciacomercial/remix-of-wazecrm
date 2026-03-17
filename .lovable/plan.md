

## Analise da Planilha de Acompanhamento

A planilha tem **2 abas**:

### Aba 1 - Prospecção Orgânica (SDR / Disparo em Massa)
| Data | LEADS | % Conversão | OPORTUNIDADE | CPO | % Fechamento | VENDAS | CPV | TICKET | BRUTO |
Rastreia: leads prospectados por dia, taxa de conversão em oportunidade, vendas, ticket medio, valor bruto.

### Aba 2 - Tráfego Pago
| Data | GASTO | LEADS | CPL | % | OPORTUNIDADE | CPO | % | VENDAS | CPV | TICKET | BRUTO | ROI |
Adiciona: gasto em ads, CPL (custo por lead), CPO (custo por oportunidade), CPV (custo por venda), ROI.

### Problemas da planilha atual
- Maioria dos dias vazios com erros `#DIV/0!` e `#REF!`
- Sem identificação de SDR/responsável
- Sem separação por canal/campanha
- Sem acompanhamento de reuniões (mencionado por voce, mas ausente na planilha)
- Sem historico cumulativo/mensal
- Dados manuais, desconectados do CRM

---

## Recomendação: Criar Modulo "Acompanhamento de Prospecção"

Sim, devemos criar um novo modulo. O CRM ja tem os dados de leads, oportunidades e vendas — so falta a **camada de registro diario de atividade de prospecção** e os **dashboards de funil de prospecção**.

### O que o modulo vai ter

**1. Registro Diario de Prospecção (tabela `prospecting_daily_logs`)**
- Data, responsavel (SDR), canal (orgânico/tráfego), tipo de ação (disparo massa, ligação, social selling)
- Leads prospectados, oportunidades geradas, reuniões agendadas, vendas fechadas
- Valor bruto das vendas, ticket medio (calculado)
- Para tráfego: gasto em ads, CPL, CPO, CPV, ROI (todos calculados automaticamente)

**2. Dashboard de Prospecção**
- Visão diaria/semanal/mensal com tabela estilo planilha (familiar ao usuario)
- KPIs em cards: Total Leads, Taxa Oportunidade %, Reuniões, Vendas, Ticket Medio, Valor Bruto
- Graficos de evolução: leads vs oportunidades vs vendas ao longo do tempo
- Comparação entre SDRs (ranking)
- Separação por abas: Orgânico vs Tráfego Pago

**3. Calculos automaticos**
- % Conversão Lead→Oportunidade = oportunidades / leads
- % Conversão Oportunidade→Venda = vendas / oportunidades  
- CPL = gasto / leads
- CPO = gasto / oportunidades
- CPV = gasto / vendas
- ROI = (bruto - gasto) / gasto
- Ticket Medio = bruto / vendas

### Implementação Tecnica

**Database:**
```sql
CREATE TABLE prospecting_daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  user_id UUID NOT NULL, -- SDR responsavel
  log_date DATE NOT NULL,
  channel_type TEXT NOT NULL DEFAULT 'organic', -- 'organic' | 'paid'
  source TEXT, -- 'disparo_massa', 'ligacao', 'social_selling', 'facebook_ads', 'google_ads'
  leads_prospected INT DEFAULT 0,
  opportunities INT DEFAULT 0,
  meetings_scheduled INT DEFAULT 0,
  sales_closed INT DEFAULT 0,
  gross_value NUMERIC DEFAULT 0,
  ad_spend NUMERIC DEFAULT 0, -- só para tráfego pago
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, user_id, log_date, channel_type, source)
);
```

**Frontend:**
- Nova pagina `src/pages/Prospeccao.tsx`
- Novo item no sidebar: "Prospecção" com icone Target
- Componentes: `ProspeccaoTable.tsx` (tabela editavel inline), `ProspeccaoKPIs.tsx`, `ProspeccaoCharts.tsx`
- Filtros: periodo, responsavel, canal, fonte

**Melhorias sobre a planilha:**
- Calculos automaticos sem erros `#DIV/0!`
- Multiplos SDRs com comparação
- Campo de reuniões agendadas (ausente na planilha)
- Historico completo com filtros
- Graficos de tendência
- Export para CSV/Excel

