

## Plano: Filtro por Data no Gerenciamento de Tags

### Resumo do Pedido
Adicionar funcionalidade de filtro por data no diálogo de gerenciamento de tags para:
1. **Filtrar contatos por data de atribuição de tags** - ver quais contatos receberam tags em uma data específica (hoje, esta semana, data customizada)
2. **Filtrar contatos que mandaram mensagem** - ver contatos que enviaram mensagens em uma data específica

---

### Desafio Técnico Identificado

Atualmente, o banco de dados **não registra quando uma tag foi adicionada a um lead**. A tabela `leads` apenas armazena as tags atuais em um array (`tags`), sem histórico temporal. Isso significa que não é possível filtrar "quais tags foram adicionadas hoje" sem primeiro implementar o rastreamento.

---

### Solução Proposta

#### Parte 1: Nova Tabela para Histórico de Tags
Criar uma tabela `lead_tag_history` para registrar quando tags são adicionadas/removidas:

```text
lead_tag_history
├── id (uuid)
├── lead_id (uuid) → referência a leads
├── company_id (uuid)
├── tag_name (text)
├── action (text) → 'added' ou 'removed'
├── created_at (timestamptz)
└── created_by (uuid) → usuário que fez a alteração
```

#### Parte 2: Atualizar Hook de Tags
Modificar o `useTagsManager` para registrar no histórico sempre que uma tag for adicionada ou removida de um lead.

#### Parte 3: Interface Aprimorada do TagsManager
Adicionar ao diálogo de gerenciamento de tags:

1. **Seletor de Período** - Botões rápidos:
   - "Hoje"
   - "Esta Semana"  
   - "Personalizado" (abre calendário)

2. **Tabs de Visualização**:
   - **Tags Atribuídas**: Contatos que receberam tags na data selecionada
   - **Mensagens Recebidas**: Contatos que enviaram mensagens na data selecionada

3. **Lista de Resultados**: Mostrar contatos com suas informações (nome, telefone, tags, data/hora)

---

### Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| Migração SQL | Criar | Criar tabela `lead_tag_history` com RLS |
| `src/hooks/useTagsManager.ts` | Modificar | Registrar alterações no histórico |
| `src/components/leads/TagsManager.tsx` | Modificar | Adicionar filtros de data e tabs |

---

### Fluxo da Interface

```text
┌─────────────────────────────────────────────────────────┐
│ Gerenciamento de Tags                                   │
├─────────────────────────────────────────────────────────┤
│ [Criar Tag]  [Input para nova tag...]  [+]              │
├─────────────────────────────────────────────────────────┤
│ Filtrar por Data:                                       │
│ [Hoje] [Esta Semana] [📅 Selecionar Data]              │
├─────────────────────────────────────────────────────────┤
│ [Tags Atribuídas]  [Mensagens Recebidas]  ← Tabs       │
├─────────────────────────────────────────────────────────┤
│ Data selecionada: 28/01/2026                           │
│ ┌─────────────────────────────────────────────────────┐│
│ │ 🏷 Tag: "Cliente VIP"                              ││
│ │ 👤 João Silva - (11) 99999-1234                    ││
│ │ 📅 Atribuída em: 28/01/2026 às 14:30               ││
│ ├─────────────────────────────────────────────────────┤│
│ │ 🏷 Tag: "Interessado"                              ││
│ │ 👤 Maria Santos - (11) 99999-5678                  ││
│ │ 📅 Atribuída em: 28/01/2026 às 10:15               ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ Estatísticas: 5 tags atribuídas | 12 mensagens hoje    │
└─────────────────────────────────────────────────────────┘
```

---

### Detalhes Técnicos

#### Migração SQL
```sql
-- Tabela para histórico de tags
CREATE TABLE IF NOT EXISTS public.lead_tag_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  tag_name TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('added', 'removed')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_lead_tag_history_lead_id ON public.lead_tag_history(lead_id);
CREATE INDEX idx_lead_tag_history_company_id ON public.lead_tag_history(company_id);
CREATE INDEX idx_lead_tag_history_created_at ON public.lead_tag_history(created_at);
CREATE INDEX idx_lead_tag_history_tag_name ON public.lead_tag_history(tag_name);

-- RLS Policies
ALTER TABLE public.lead_tag_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tag history of their company"
  ON public.lead_tag_history FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert tag history for their company"
  ON public.lead_tag_history FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));

-- Habilitar realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_tag_history;
```

#### Consulta para Tags por Data
```typescript
// Buscar tags atribuídas hoje
const { data } = await supabase
  .from("lead_tag_history")
  .select(`
    id,
    tag_name,
    action,
    created_at,
    lead:leads(id, name, phone, telefone, profile_picture_url)
  `)
  .eq("action", "added")
  .gte("created_at", startOfDay.toISOString())
  .lte("created_at", endOfDay.toISOString())
  .order("created_at", { ascending: false });
```

#### Consulta para Mensagens por Data
```typescript
// Buscar contatos que mandaram mensagem hoje
const { data } = await supabase
  .from("conversas")
  .select(`
    id,
    mensagem,
    created_at,
    nome_contato,
    telefone_formatado,
    lead:leads(id, name, tags)
  `)
  .eq("fromme", false) // Mensagens recebidas
  .gte("created_at", startOfDay.toISOString())
  .lte("created_at", endOfDay.toISOString())
  .order("created_at", { ascending: false });
```

---

### Comportamento Esperado

1. **Sem data selecionada**: Mostra a lista normal de tags como atualmente
2. **Com data selecionada**: Filtra para mostrar apenas atividade daquela data
3. **Tab "Tags Atribuídas"**: Lista contatos que receberam tags na data
4. **Tab "Mensagens Recebidas"**: Lista contatos que enviaram mensagens na data
5. **Estatísticas atualizadas**: Contadores refletem a data selecionada

