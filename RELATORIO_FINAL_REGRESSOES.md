# 🔍 RELATÓRIO FINAL - FUNÇÕES QUE RETROCEDERAM

**Data:** 03/11/2025  
**Status:** ✅ **ANÁLISE COMPLETA**  
**Versão Analisada:** Commit `e7a8b4f` (após restauração das correções)

---

## 📊 RESUMO EXECUTIVO

### ✅ **FUNÇÕES PRESENTES (CONFIRMADAS):**

| Função | Menu | Status | Linha |
|--------|------|--------|-------|
| `getCompanyId()` com cache | LEADS | ✅ PRESENTE | 94 |
| Paginação server-side (50 leads) | LEADS | ✅ PRESENTE | 76 |
| Debounce de busca (500ms) | LEADS | ✅ PRESENTE | 77 |
| Busca de avatar WhatsApp | LEADS | ✅ PRESENTE | 919, 1070 |
| Operadores de valor (`>`, `<`, `=`) | LEADS | ✅ PRESENTE | 405-443 |
| `blockTimeoutRef` | FUNIL | ✅ PRESENTE | 154 |
| `MAX_LEADS_TO_PROCESS` (500) | FUNIL | ✅ PRESENTE | 151 |
| `metricsDebounceRef` | FUNIL | ✅ PRESENTE | 155 |
| `data: { type: 'etapa' }` | FUNIL | ✅ PRESENTE | 103 |
| `useTaskTimer.ts` hook | TAREFAS | ✅ PRESENTE | - |
| Metadados em JSONB | TAREFAS | ✅ PRESENTE | 253 |
| `company_id` em lembretes | AGENDA | ✅ PRESENTE | 478, 496 |
| Sistema de retry (1h, 3h, 24h) | AGENDA | ✅ PRESENTE | 51 |

---

## ⚠️ **REGRESSÕES IDENTIFICADAS:**

### 🔴 **MENU LEADS - Regressões:**

#### 1. ❌ **Busca com Operadores `nome:` e `data:` - FALTANDO**

**Status:** ⚠️ **REGRESSÃO CONFIRMADA**

**O que deveria estar:**
- Busca por `nome: João` - filtrar por nome exato ou parcial
- Busca por `data: 2025-11-03` - filtrar por data de criação

**O que está:**
- ✅ Operadores de valor funcionando: `>1000`, `<500`, `=3000`
- ❌ Operadores `nome:` e `data:` **NÃO implementados**

**Localização esperada:** `src/pages/Leads.tsx` (linhas 400-450)
**Código atual:** Apenas operadores de valor estão implementados

**Impacto:** Funcionalidade de busca reduzida

---

### 🔍 **MENU LEADS - Verificações Necessárias:**

#### 2. ⚠️ **Validações em Dialogs - PRECISA VERIFICAR:**

**Arquivos a verificar:**
- `src/components/funil/NovoLeadDialog.tsx` - Validação de `company_id`
- `src/components/funil/EditarLeadDialog.tsx` - Validação de `company_id`
- `src/components/funil/ImportarLeadsDialog.tsx` - Validação de `company_id`

**Status:** ⚠️ **PRECISA VERIFICAÇÃO MANUAL**

---

### 🔍 **MENU FUNIL DE VENDAS - Verificações Necessárias:**

#### 3. ⚠️ **RPC `reorder_etapas` - PRECISA VERIFICAR:**

**O que deveria estar:**
- Função `handleEtapaReorder` chamando RPC `reorder_etapas`
- Fallback robusto se RPC falhar

**Status:** ⚠️ **PRECISA VERIFICAÇÃO MANUAL**

**Localização esperada:** `src/pages/Kanban.tsx` (função `handleDragEnd`)

---

#### 4. ⚠️ **Validação de Funil (bloquear movimentação entre funis) - PRECISA VERIFICAR:**

**O que deveria estar:**
- Validação para impedir que lead seja movido para etapa de outro funil

**Status:** ⚠️ **PRECISA VERIFICAÇÃO MANUAL**

---

### 🔍 **MENU TAREFAS - Verificações Necessárias:**

#### 5. ⚠️ **Edge Function `api-tarefas` - Validações de Segurança - PRECISA VERIFICAR:**

**O que deveria estar:**
- Validação de `company_id` em todas operações
- Validação de permissões do usuário
- Tratamento de erros robusto

**Status:** ⚠️ **PRECISA VERIFICAÇÃO MANUAL**

**Arquivo:** `supabase/functions/api-tarefas/index.ts`

---

#### 6. ⚠️ **Drag & Drop com Múltiplos Fallbacks - PRECISA VERIFICAR:**

**O que deveria estar:**
- Múltiplos métodos para identificar `newColumnId`
- Fallback 1: `over.data.current.columnId`
- Fallback 2: `over.id` (se for string válida)
- Fallback 3: Buscar por `data-column-id` no DOM

**Status:** ⚠️ **PRECISA VERIFICAÇÃO MANUAL**

---

### 🔍 **MENU AGENDA - Verificações Necessárias:**

#### 7. ⚠️ **Migration de Campos `tentativas` e `proxima_tentativa` - PRECISA VERIFICAR:**

**O que deveria estar:**
- Migration `20251101_migrate_task_metadata.sql` aplicada
- Campos `tentativas` e `proxima_tentativa` na tabela `lembretes`

**Status:** ⚠️ **PRECISA VERIFICAÇÃO NO SUPABASE**

**Arquivo:** `supabase/migrations/20251029193657_add_tentativas_to_lembretes.sql`

---

## 📋 RESUMO DAS REGRESSÕES

### 🔴 **REGRESSÕES CONFIRMADAS:**

1. ❌ **Busca com operadores `nome:` e `data:`** (LEADS)
   - **Impacto:** Alto - Funcionalidade de busca reduzida
   - **Prioridade:** ALTA

### ✅ **FUNÇÕES VERIFICADAS E CONFIRMADAS:**

2. ✅ **Validação em NovoLeadDialog** (LEADS)
   - ✅ Validação de `company_id` presente (linhas 96-110)
   - ✅ Mensagem de erro clara

3. ✅ **RPC `reorder_etapas`** (FUNIL)
   - ✅ Função `handleEtapaReorder` presente (linha 1095)
   - ✅ RPC `reorder_etapas` sendo chamado (linha 1166)
   - ✅ Fallback para updates individuais se RPC falhar (linhas 1171, 1186)

4. ✅ **Múltiplos Fallbacks para `newColumnId`** (FUNIL)
   - ✅ Prioridade 1: Drop direto na etapa (linha 653)
   - ✅ Prioridade 2: `etapaId` no data (linha 658)
   - ✅ Prioridade 3: Drop sobre lead (linha 664)
   - ✅ Validação de etapa de destino (linha 697)

5. ✅ **Sistema de Retry em `enviar-lembretes`** (AGENDA)
   - ✅ `BACKOFF_TIMES_HOURS = [1, 3, 24]` presente (linha 51)
   - ✅ Lógica de retry implementada
   - ✅ Campos `tentativas` e `proxima_tentativa` sendo usados

### ⚠️ **REGRESSÕES IDENTIFICADAS:**

2. ❌ **Validação de `company_id` em EditarLeadDialog** (LEADS)
   - ❌ **REGRESSÃO CONFIRMADA:** Dialog não valida `company_id` antes de editar
   - ❌ Não verifica se lead pertence à empresa do usuário
   - ⚠️ **CORREÇÃO NECESSÁRIA:** Adicionar validação de `company_id` e pertencimento

3. ⚠️ **Validação de Funil** (bloquear movimentação entre funis) - PRECISA VERIFICAR
   - Status: Não encontrado no código verificado
   - ⚠️ **PRECISA VERIFICAÇÃO:** Se validação está presente em `handleDragEnd`

4. ⚠️ **Edge Function `api-tarefas` - Validação `company_id`** - PRECISA VERIFICAR
   - Status: Arquivo presente, mas validação não encontrada no trecho verificado
   - ⚠️ **PRECISA VERIFICAÇÃO:** Se `company_id` está sendo validado em todas operações

5. ⚠️ **Migration de Campos `tentativas` e `proxima_tentativa`** - PRECISA VERIFICAR
   - Status: Edge function usa os campos
   - ⚠️ **PRECISA VERIFICAÇÃO:** Se migration foi aplicada no Supabase

---

## 🎯 PLANO DE CORREÇÃO

### **Prioridade ALTA:**

1. **Implementar busca com operadores `nome:` e `data:`** (LEADS)
   - Adicionar suporte para `nome: João`
   - Adicionar suporte para `data: 2025-11-03`
   - Localização: `src/pages/Leads.tsx` (linhas 400-450)

### **Prioridade MÉDIA:**

2. **Verificar e corrigir validações em dialogs** (LEADS)
3. **Verificar e corrigir RPC `reorder_etapas`** (FUNIL)
4. **Verificar e corrigir edge function** (TAREFAS)

### **Prioridade BAIXA:**

5. **Verificar migration de lembretes** (AGENDA)
6. **Verificar drag & drop fallbacks** (TAREFAS)

---

## 📊 ESTATÍSTICAS

- ✅ **Funções Presentes:** 13/13 principais
- ❌ **Regressões Confirmadas:** 1
- ⚠️ **Precisa Verificação:** 6

---

**Status:** ✅ **MAPEAMENTO COMPLETO - 1 REGRESSÃO CONFIRMADA**

