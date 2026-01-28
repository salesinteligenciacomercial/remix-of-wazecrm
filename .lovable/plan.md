
## Plano: Filtros Avançados no Menu Leads

### Resumo do Pedido
Criar um novo botão no menu de Leads que abre um painel/diálogo com filtros avançados, permitindo filtrar leads por:
1. **Ganhos** - Leads com status "ganho" (com filtro por data de fechamento)
2. **Perdidos** - Leads com status "perdido" (com filtro por data de perda)
3. **Com Valores** - Leads que possuem valor > 0 (com faixa de valores)
4. **Prontuários** - Leads que possuem arquivos/anexos no prontuário
5. **Aniversariantes** - Leads com aniversário na data selecionada

Todos os filtros podem ser combinados com seleção de data (hoje, esta semana, período personalizado).

---

### Arquitetura da Solução

#### Novo Componente: `LeadsAdvancedFilter.tsx`
Um botão que abre um diálogo modal com:
- Seletor de tipo de filtro (Ganhos, Perdidos, Valores, Prontuários, Aniversariantes)
- Seletor de período de data
- Preview dos resultados filtrados
- Botão para aplicar filtros à lista principal

---

### Interface Proposta

```text
┌─────────────────────────────────────────────────────────────────┐
│ 🔍 Filtros Avançados                                            │
├─────────────────────────────────────────────────────────────────┤
│ Filtrar por:                                                    │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───────────┐ ┌────────────┐│
│ │🏆 Ganhos│ │❌Perdidos│ │💰Valores│ │📋Prontuário│ │🎂Aniversário││
│ └─────────┘ └─────────┘ └─────────┘ └───────────┘ └────────────┘│
├─────────────────────────────────────────────────────────────────┤
│ Período:                                                        │
│ [Hoje] [Esta Semana] [Este Mês] [📅 Personalizado]             │
├─────────────────────────────────────────────────────────────────┤
│ 📊 Encontrados: 45 leads                                        │
├─────────────────────────────────────────────────────────────────┤
│ Leads encontrados:                                              │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 👤 João Silva - R$ 5.000 - Ganho em 25/01/2026              │ │
│ │ 👤 Maria Santos - R$ 3.200 - Ganho em 24/01/2026            │ │
│ │ 👤 Pedro Costa - R$ 8.500 - Ganho em 23/01/2026             │ │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                         [Limpar] [Aplicar Filtro]               │
└─────────────────────────────────────────────────────────────────┘
```

---

### Detalhes Técnicos

#### Campos do Banco de Dados Utilizados

| Filtro | Campos | Lógica |
|--------|--------|--------|
| Ganhos | `status = 'ganho'`, `won_at` | Filtra por `won_at` no período |
| Perdidos | `status = 'perdido'`, `lost_at` | Filtra por `lost_at` no período |
| Com Valores | `value > 0` | Opção de faixa min/max |
| Prontuários | JOIN com `lead_attachments` | Leads que têm anexos |
| Aniversariantes | `data_nascimento` | Comparar mês/dia no período |

#### Consultas SQL

**Ganhos por período:**
```typescript
supabase.from("leads")
  .select("*")
  .eq("status", "ganho")
  .eq("company_id", companyId)
  .gte("won_at", startDate.toISOString())
  .lte("won_at", endDate.toISOString())
```

**Perdidos por período:**
```typescript
supabase.from("leads")
  .select("*")
  .eq("status", "perdido")
  .eq("company_id", companyId)
  .gte("lost_at", startDate.toISOString())
  .lte("lost_at", endDate.toISOString())
```

**Leads com prontuário:**
```typescript
// Primeiro buscar IDs dos leads com anexos
const { data: attachments } = await supabase
  .from("lead_attachments")
  .select("lead_id")
  .eq("company_id", companyId);

const leadIds = [...new Set(attachments.map(a => a.lead_id))];

// Depois buscar leads
supabase.from("leads")
  .select("*")
  .in("id", leadIds)
```

**Aniversariantes:**
```typescript
// Buscar leads com data_nascimento e filtrar no frontend
// pelo dia/mês correspondente ao período selecionado
const hoje = new Date();
const aniversariantes = leads.filter(lead => {
  if (!lead.data_nascimento) return false;
  const nascimento = new Date(lead.data_nascimento);
  return nascimento.getDate() === hoje.getDate() 
      && nascimento.getMonth() === hoje.getMonth();
});
```

---

### Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/components/leads/LeadsAdvancedFilter.tsx` | Criar | Componente principal do filtro |
| `src/pages/Leads.tsx` | Modificar | Adicionar botão e integrar filtros |

---

### Fluxo de Uso

1. Usuário clica no botão "Filtros Avançados" no header da página Leads
2. Modal abre com as opções de filtro
3. Usuário seleciona o tipo de filtro (ex: "Ganhos")
4. Usuário seleciona o período (ex: "Esta Semana")
5. Sistema exibe preview dos leads encontrados
6. Usuário clica em "Aplicar Filtro"
7. Lista principal de leads é atualizada com os resultados
8. Badge indica filtro ativo na página

---

### Comportamento por Tipo de Filtro

**Ganhos:**
- Mostra leads com status "ganho"
- Filtra pela data de fechamento (`won_at`)
- Exibe: nome, valor ganho, data de fechamento

**Perdidos:**
- Mostra leads com status "perdido"
- Filtra pela data de perda (`lost_at`)
- Exibe: nome, motivo da perda (se disponível), data

**Com Valores:**
- Mostra leads onde `value > 0`
- Opção de filtrar por faixa de valores
- Exibe: nome, valor, status

**Prontuários:**
- Mostra leads que possuem anexos em `lead_attachments`
- Clique abre o prontuário do lead
- Exibe: nome, quantidade de arquivos

**Aniversariantes:**
- Mostra leads com aniversário no período
- Similar ao AniversariantesManager mas integrado
- Exibe: nome, data de nascimento, idade
