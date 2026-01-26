
# Melhorias para o Menu Financeiro

## Resumo Executivo

Apos analise completa do modulo Financeiro, identifiquei 6 areas principais de melhoria que aumentarao a eficiencia operacional, a experiencia do usuario e a tomada de decisoes estrategicas.

---

## 1. Periodo de Trial com Gestao Automatizada

### Situacao Atual
O sistema ja possui status "trial" para assinaturas, mas nao ha controle de vencimento ou conversao automatica.

### Melhorias Propostas

**Campos novos na tabela `company_subscriptions`:**
- `trial_end_date` - data de fim do trial
- `trial_days` - duracao configuravel (7, 14, 30 dias)
- `converted_from_trial` - flag de conversao

**Funcionalidades:**
- Contador de dias restantes no trial visivel na tabela
- Alerta automatico quando trial esta prestes a vencer (3 dias antes)
- Acao rapida para converter trial em assinatura paga
- Relatorio de taxa de conversao trial para pago

**Interface Visual:**
```text
+--------------------------------------------------------------------+
| ASSINATURAS                                                        |
+--------------------------------------------------------------------+
| Empresa     | Plano    | Status     | Trial Restante | Acoes       |
|-------------|----------|------------|----------------|-------------|
| ABC Ltda    | Pro      | Trial      | 5 dias         | [Converter] |
| XYZ SA      | Starter  | Trial      | 1 dia ⚠️       | [Converter] |
+--------------------------------------------------------------------+
```

---

## 2. Dashboard Financeiro Aprimorado

### Situacao Atual
O dashboard mostra 8 KPIs basicos mas falta contexto historico e projecoes.

### Melhorias Propostas

**Novos KPIs:**
- **ARR (Receita Anual Recorrente)**: MRR x 12
- **ARPU (Receita Media por Usuario)**: MRR / clientes ativos
- **Projecao 3 Meses**: estimativa baseada na tendencia
- **NDR (Net Dollar Retention)**: retencao liquida de receita

**Melhorias Visuais:**
- Mini-graficos de tendencia (sparklines) em cada card
- Comparativo com periodo anterior (variacao %)
- Tooltips explicativos para cada metrica
- Cores dinamicas baseadas em metas (verde/amarelo/vermelho)

**Cards Interativos:**
- Ao clicar em "Inadimplentes", abre lista de faturas em atraso
- Ao clicar em "Clientes Ativos", abre lista de assinaturas

---

## 3. Fluxo de Caixa e Previsibilidade

### Situacao Atual
Nao existe visualizacao de fluxo de caixa ou projecoes futuras.

### Melhorias Propostas

**Novo Componente `FluxoCaixaChart.tsx`:**
```text
+--------------------------------------------------------------------+
| FLUXO DE CAIXA - PROXIMOS 3 MESES                                  |
+--------------------------------------------------------------------+
|                                                                    |
|  R$15k ┤                           ┌──────┐                        |
|        │              ┌──────┐     │//////│                        |
|  R$10k ┤    ┌──────┐  │//////│     │//////│                        |
|        │    │//////│  │//////│     │//////│                        |
|   R$5k ┤    │//////│  │//////│     │//////│                        |
|        └────┴──────┴──┴──────┴─────┴──────┴─────                   |
|              Fev        Mar          Abr                           |
|                                                                    |
|  Previsto: R$ 45.000   Recebido: R$ 12.500   A Receber: R$ 32.500  |
+--------------------------------------------------------------------+
```

**Funcionalidades:**
- Calendario de recebimentos baseado em `next_billing_date`
- Projecao de receita considerando churn estimado
- Alertas de concentracao de vencimentos (muitas faturas no mesmo dia)

---

## 4. Automacao de Cobranças e Lembretes

### Situacao Atual
Geracao de faturas e cobranças e manual.

### Melhorias Propostas

**Cobranças Recorrentes:**
- Opcao para gerar faturas automaticamente X dias antes do vencimento
- Configuracao por subconta ou global
- Integracao automatica com Asaas para emissao

**Lembretes Automaticos:**
- E-mail/WhatsApp X dias antes do vencimento
- Lembrete no dia do vencimento
- Cobrança apos Y dias de atraso

**Painel de Configuracao:**
```text
+--------------------------------------------------------------------+
| CONFIGURACOES DE COBRANCA                                          |
+--------------------------------------------------------------------+
| Geracao Automatica de Faturas                                      |
| [x] Gerar fatura 5 dias antes do vencimento                        |
|                                                                    |
| Lembretes                                                          |
| [x] 3 dias antes - E-mail                                          |
| [x] No vencimento - WhatsApp                                       |
| [x] 5 dias apos atraso - E-mail + WhatsApp                         |
+--------------------------------------------------------------------+
```

---

## 5. Relatorios e Exportacoes Avancadas

### Situacao Atual
Existe apenas exportacao basica de custos em CSV.

### Melhorias Propostas

**Novos Relatorios:**
1. **DRE Simplificado** - Receitas vs Custos por periodo
2. **Aging Report** - Faturas por tempo de atraso (1-30, 31-60, 61-90, 90+)
3. **Cohort Analysis** - Retencao de clientes por mes de aquisicao
4. **Revenue por Segmento** - Receita por tipo de plano

**Formatos de Exportacao:**
- CSV (atual)
- PDF com graficos
- Excel com multiplas abas

**Agendamento:**
- Enviar relatorio semanal/mensal por e-mail

---

## 6. Melhorias de UX e Performance

### Situacao Atual
Interface funcional mas pode ser otimizada.

### Melhorias Propostas

**Navegacao Rapida:**
- Breadcrumbs indicando contexto
- Atalhos de teclado para acoes comuns
- Busca global em faturas/assinaturas/transacoes

**Filtros Avancados:**
- Filtro por periodo personalizado (date picker)
- Filtro por valor (faixa de valores)
- Filtros salvos como "favoritos"

**Performance:**
- Paginacao nas tabelas (evitar carregar 100+ registros)
- Virtual scrolling para listas grandes
- Lazy loading de graficos

**Feedback Visual:**
- Skeleton loading consistente
- Toast notifications para acoes
- Indicadores de dados desatualizados

---

## Resumo Tecnico de Implementacao

### Novas Tabelas/Campos

```sql
-- Campos em company_subscriptions
ALTER TABLE company_subscriptions ADD COLUMN trial_end_date DATE;
ALTER TABLE company_subscriptions ADD COLUMN trial_days INTEGER DEFAULT 14;
ALTER TABLE company_subscriptions ADD COLUMN converted_from_trial BOOLEAN DEFAULT FALSE;

-- Nova tabela para configuracao de cobrancas
CREATE TABLE billing_automation_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_company_id UUID REFERENCES companies(id),
  auto_generate_invoices BOOLEAN DEFAULT FALSE,
  days_before_due INTEGER DEFAULT 5,
  reminder_days_before INTEGER[] DEFAULT '{3, 0}',
  reminder_days_after INTEGER[] DEFAULT '{5, 15, 30}',
  reminder_channels TEXT[] DEFAULT '{email}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Nova tabela para lembretes enviados
CREATE TABLE billing_reminders_sent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES billing_invoices(id),
  reminder_type TEXT NOT NULL,
  channel TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT now()
);
```

### Novos Componentes

| Componente | Descricao |
|------------|-----------|
| `TrialManager.tsx` | Gestao de trials com conversao |
| `FluxoCaixaChart.tsx` | Projecao de fluxo de caixa |
| `BillingAutomationConfig.tsx` | Configuracao de cobranças |
| `AgingReport.tsx` | Relatorio de faturas por tempo |
| `RevenueBySegment.tsx` | Grafico de receita por plano |
| `AdvancedFilters.tsx` | Componente de filtros reutilizavel |

### Novos Hooks

| Hook | Funcao |
|------|--------|
| `useTrialManagement` | Logica de trials e conversoes |
| `useCashFlowProjection` | Calculo de projecoes |
| `useBillingAutomation` | Gerenciamento de automacoes |
| `useReportGenerator` | Geracao de relatorios PDF/Excel |

---

## Prioridade de Implementacao

### Fase 1 - Alto Impacto, Rapido (1-2 dias)
1. Periodo de Trial com gestao
2. KPIs aprimorados no dashboard
3. Filtros avancados

### Fase 2 - Medio Impacto (2-3 dias)
4. Fluxo de Caixa e projecoes
5. Relatorios de aging e cohort

### Fase 3 - Automacao (3-5 dias)
6. Cobrancas e lembretes automaticos
7. Integracao com WhatsApp para avisos

---

## Beneficios Esperados

- **Reducao de inadimplencia**: Lembretes automaticos e visibilidade de atrasos
- **Conversao de trials**: Acompanhamento proativo de clientes em teste
- **Decisoes estrategicas**: Dados de projecao e tendencia
- **Produtividade**: Automacao de tarefas manuais
- **Experiencia do usuario**: Interface mais intuitiva e responsiva
