

## Plano: Evoluir Prospecção com Rastreamento por Lead Individual

### Problema Atual
O módulo atual registra apenas **números agregados** (ex: "10 leads, 3 oportunidades, 1 venda"). Não há visibilidade sobre **quais leads** foram abordados, qual script foi usado, ou o resultado individual de cada interação.

### Solução: Tabela de Interações por Lead

Criar uma tabela `prospecting_interactions` que registra cada abordagem individual, vinculada ao lead do CRM e ao log diário.

### 1. Banco de Dados — Nova tabela `prospecting_interactions`

```sql
CREATE TABLE public.prospecting_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) NOT NULL,
  daily_log_id UUID, -- referência ao log diário (prospecting ou followup)
  log_type TEXT NOT NULL DEFAULT 'prospecting', -- 'prospecting' | 'followup'
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  lead_name TEXT, -- cache do nome caso lead seja deletado
  lead_phone TEXT,
  user_id UUID NOT NULL,
  interaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  channel TEXT, -- 'whatsapp', 'ligacao', 'email', 'social_selling'
  script_used TEXT, -- nome/identificador do script usado
  outcome TEXT NOT NULL DEFAULT 'contacted', 
    -- 'contacted', 'responded', 'opportunity', 'meeting_scheduled', 'sale_closed', 'no_response', 'rejected'
  interaction_summary TEXT, -- resumo livre da interação
  gross_value NUMERIC DEFAULT 0, -- valor se foi venda
  next_action TEXT, -- próximo passo planejado
  next_action_date DATE, -- data do próximo passo
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

Com RLS por `company_id` (mesmo padrão existente) e trigger `update_updated_at`.

### 2. Tabela de Scripts (biblioteca reutilizável)

```sql
CREATE TABLE public.prospecting_scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) NOT NULL,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'geral', -- 'primeira_abordagem', 'followup', 'fechamento', 'objecao'
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 3. Novos Componentes Frontend

- **`InteractionLogDialog.tsx`** — Formulário para registrar interação individual:
  - Busca de lead (autocomplete do CRM por nome/telefone)
  - Seleção de script (dropdown da biblioteca)
  - Resultado (contacted/responded/opportunity/meeting/sale/no_response/rejected)
  - Resumo da interação (texto livre)
  - Valor (se venda)
  - Próximo passo + data

- **`InteractionTimeline.tsx`** — Timeline de interações dentro da tabela, expansível por linha do log diário (clica na linha → expande para ver cada lead abordado)

- **`ScriptLibrary.tsx`** — Painel lateral ou modal para gerenciar scripts (criar, editar, ativar/desativar)

- **`LeadOutcomesBadge.tsx`** — Badges coloridos por resultado (verde=venda, azul=reunião, amarelo=oportunidade, cinza=sem resposta)

### 4. Alterações na Página Existente

- Adicionar botão **"+ Registrar Interação"** ao lado do "Registrar" existente
- Cada linha da tabela de logs fica **expansível** — ao clicar, mostra as interações individuais daquele dia/responsável
- Novo **sub-tab "Interações"** dentro de cada aba (Orgânico/Pago/Follow-Up) mostrando a timeline completa filtrada
- Coluna extra nas tabelas: **"Detalhes"** com contagem de interações (ex: "5 interações")

### 5. Resumo do Fluxo do Usuário

1. SDR clica em **"Registrar Interação"**
2. Seleciona o lead do CRM (autocomplete)
3. Escolhe o script usado (da biblioteca)
4. Marca o resultado (respondeu, agendou reunião, etc.)
5. Escreve resumo da conversa
6. Define próximo passo
7. O sistema **automaticamente incrementa** os contadores do log diário (leads_prospected +1, opportunities +1, etc.)

### 6. Benefícios

- Saber **exatamente qual lead** foi abordado e o resultado
- Histórico de **qual script** performou melhor (taxa de resposta por script)
- **Resumo da interação** para contexto em follow-ups futuros
- **Próximos passos** com datas para não perder timing
- Contadores automáticos eliminam erro de digitação manual

