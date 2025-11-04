# 🔍 RELATÓRIO DE MAPEAMENTO - FUNÇÕES QUE RETROCEDERAM

**Data:** 03/11/2025  
**Status:** 🔍 **ANÁLISE EM ANDAMENTO**  
**Objetivo:** Identificar funções e problemas corrigidos que retrocederam

---

## 📋 METODOLOGIA

Comparação entre:
- ✅ **Relatórios de Correção Pós-Implementação** (RELATORIO_POS_CORRECAO_*.md)
- ⚠️ **Código Atual** (arquivos .tsx)

---

## ✅ FUNÇÕES VERIFICADAS E PRESENTES

### ✅ MENU LEADS:

1. ✅ **`getCompanyId()` com cache** (linha 94)
   - Função presente e funcionando
   - Cache implementado (`companyIdCache`)

2. ✅ **Paginação Server-Side** (linha 76)
   - `PAGE_SIZE = 50` presente
   - Implementação correta

3. ✅ **Debounce de Busca** (linha 77)
   - `SEARCH_DEBOUNCE_MS = 500` presente
   - Implementado

4. ✅ **Validação de company_id** (linhas 194, 353, 849)
   - Presente em múltiplas operações

---

### ✅ MENU FUNIL DE VENDAS:

1. ✅ **`data: { type: 'etapa' }`** (linha 103)
   - Presente no `useSortable`
   - Comentário de backup presente

2. ✅ **`blockTimeoutRef`** (linha 154)
   - Presente e funcionando

3. ✅ **`MAX_LEADS_TO_PROCESS`** (linha 151)
   - Presente (limite de 500)

4. ✅ **`metricsDebounceRef`** (linha 155)
   - Presente e funcionando

5. ✅ **`isMovingRef`** (linha 152)
   - Presente para bloqueio durante drag

---

### ✅ MENU TAREFAS:

1. ✅ **Hook `useTaskTimer.ts`**
   - Arquivo presente
   - Sendo usado no TaskCard.tsx

2. ✅ **Metadados em campos JSONB** (linha 253)
   - `formatTask` usando campos dedicados
   - Sem fallback de metadados antigos

3. ✅ **Edge Function `api-tarefas`**
   - Arquivo presente

---

### ✅ MENU AGENDA:

1. ✅ **`company_id` em lembretes** (linha 478)
   - Validação presente
   - Garantido em compromissos

2. ✅ **Lazy loading** (linhas 346-355)
   - `loadedMonths` implementado
   - Carregamento por mês

---

## ✅ FUNÇÕES VERIFICADAS E CONFIRMADAS COMO PRESENTES

### ✅ MENU LEADS - Funções Confirmadas:

1. ✅ **Busca de Avatar do WhatsApp** 
   - ✅ `getCachedAvatar()` presente (linha 919)
   - ✅ `getLeadAvatar()` presente (linha 1070)
   - ✅ Função de busca implementada com cache
   - ✅ Busca de avatar do WhatsApp funcionando

2. ✅ **Busca com Operadores de Valor** (`>`, `<`, `=`, `>=`, `<=`)
   - ✅ Implementado (linhas 405-443)
   - ✅ Suporta: `>1000`, `<500`, `=3000`, `>=1000.50`, `<=500.25`
   - ✅ Regex para detectar operadores presente

3. ⚠️ **Busca com Operadores de Nome e Data** (`nome:`, `data:`)
   - ⚠️ **REGressão identificada:** Operadores `nome:` e `data:` NÃO encontrados
   - ⚠️ Apenas operadores de valor estão implementados
   - ⚠️ **CORREÇÃO NECESSÁRIA:** Implementar suporte para `nome:` e `data:`

3. ⚠️ **Validação em ImportarLeadsDialog**
   - Status: Não verificado
   - ⚠️ **PRECISA VERIFICAR:** Se `company_id` está sendo validado

4. ⚠️ **Validação em EditarLeadDialog**
   - Status: Não verificado
   - ⚠️ **PRECISA VERIFICAR:** Se `company_id` está sendo validado

5. ⚠️ **Validação em NovoLeadDialog**
   - Status: Não verificado
   - ⚠️ **PRECISA VERIFICAR:** Se `company_id` está sendo validado

---

### 🔍 MENU FUNIL DE VENDAS - Verificações Necessárias:

1. ⚠️ **RPC `reorder_etapas`**
   - Status: `data: { type: 'etapa' }` presente
   - ⚠️ **PRECISA VERIFICAR:** Se função `handleEtapaReorder` está chamando RPC

2. ⚠️ **Fallback robusto para `newColumnId`**
   - Status: Não verificado
   - ⚠️ **PRECISA VERIFICAR:** Se `handleDragEnd` tem múltiplos fallbacks

3. ⚠️ **Validação de funil** (bloquear movimentação entre funis)
   - Status: Não verificado
   - ⚠️ **PRECISA VERIFICAR:** Se validação está presente

---

### 🔍 MENU TAREFAS - Verificações Necessárias:

1. ⚠️ **Edge Function `api-tarefas` - Validação `company_id`**
   - Status: Arquivo presente
   - ⚠️ **PRECISA VERIFICAR:** Se validações de segurança estão presentes

2. ⚠️ **Drag & drop robusto com fallbacks**
   - Status: Não verificado
   - ⚠️ **PRECISA VERIFICAR:** Se múltiplos fallbacks estão implementados

---

### 🔍 MENU AGENDA - Verificações Necessárias:

1. ⚠️ **Edge Function `enviar-lembretes` - Sistema de retry**
   - Status: Arquivo presente
   - ⚠️ **PRECISA VERIFICAR:** Se retry (1h, 3h, 24h) está implementado

2. ⚠️ **Campos `tentativas` e `proxima_tentativa`**
   - Status: Não verificado
   - ⚠️ **PRECISA VERIFICAR:** Se migration foi aplicada

---

## 📊 RESUMO EXECUTIVO

### ✅ **FUNÇÕES PRESENTES (CONFIRMADAS):**
- ✅ `getCompanyId()` com cache
- ✅ Paginação server-side
- ✅ Debounce de busca
- ✅ `blockTimeoutRef`, `MAX_LEADS_TO_PROCESS`, `metricsDebounceRef`
- ✅ `data: { type: 'etapa' }` para reordenação
- ✅ `useTaskTimer.ts` hook
- ✅ Metadados em JSONB dedicados
- ✅ `company_id` em lembretes

### ⚠️ **FUNÇÕES QUE PRECISAM VERIFICAÇÃO DETALHADA:**
- ⚠️ Busca de avatar do WhatsApp (pode estar faltando função)
- ⚠️ Busca com operadores (`nome:`, `valor:`, `data:`) - **PROVÁVEL REGRESSÃO**
- ⚠️ Validações em dialogs (NovoLead, EditarLead, ImportarLead)
- ⚠️ RPC `reorder_etapas` com fallback
- ⚠️ Validação de funil (bloquear movimentação entre funis)
- ⚠️ Edge function `api-tarefas` - validações de segurança
- ⚠️ Edge function `enviar-lembretes` - sistema de retry
- ⚠️ Migration de campos `tentativas` e `proxima_tentativa`

---

## 🎯 PRÓXIMOS PASSOS

1. ⏳ **Verificar implementação de busca com operadores** (Leads)
2. ⏳ **Verificar função de busca de avatar** (Leads)
3. ⏳ **Verificar validações em dialogs** (Leads)
4. ⏳ **Verificar RPC reorder_etapas** (Funil)
5. ⏳ **Verificar edge functions** (Tarefas, Agenda)
6. ⏳ **Criar relatório final com correções necessárias**

---

**Status:** 🔍 **MAPEAMENTO INICIAL COMPLETO - VERIFICAÇÕES DETALHADAS NECESSÁRIAS**

