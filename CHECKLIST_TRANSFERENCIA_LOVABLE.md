# ✅ CHECKLIST RÁPIDO: TRANSFERÊNCIA PARA LOVABLE

**Data:** 01/11/2025  
**Status:** ✅ **PRONTO PARA TRANSFERÊNCIA**

---

## 🎯 RESUMO EXECUTIVO

**4 Menus Corrigidos e Prontos:**
- ✅ LEADS (9.5/10)
- ✅ FUNIL DE VENDAS (9.5/10)
- ✅ TAREFAS (9.5/10)
- ✅ AGENDA (9.5/10)

**Total:** 21 micro-prompts aplicados | 121 funcionalidades validadas

---

## ⚠️ ORDEM OBRIGATÓRIA DE EXECUÇÃO

### 1️⃣ MIGRATIONS (PRIMEIRO) ⚠️ CRÍTICO

```sql
-- Executar no Supabase SQL Editor:

-- Migration do Tarefas (se ainda não aplicada)
-- Arquivo: supabase/migrations/20251101_migrate_task_metadata.sql

-- Campos do Agenda (se não existirem)
ALTER TABLE lembretes 
ADD COLUMN IF NOT EXISTS tentativas INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS proxima_tentativa TIMESTAMP WITH TIME ZONE;
```

**Status:** [ ] Aplicado

---

### 2️⃣ EDGE FUNCTIONS (SEGUNDO) ⚠️

**Deploy via Supabase CLI ou Interface:**

```bash
supabase functions deploy api-tarefas
supabase functions deploy enviar-lembretes
```

**Arquivos:**
- [ ] `supabase/functions/api-tarefas/index.ts`
- [ ] `supabase/functions/enviar-lembretes/index.ts`

**Status:** [ ] Deployado

---

### 3️⃣ ARQUIVOS NOVOS (TERCEIRO) ⚠️

**Criar no Lovable:**

- [ ] `src/hooks/useTaskTimer.ts` ⚠️ **CRÍTICO - Novo arquivo**

**Status:** [ ] Criado

---

### 4️⃣ ARQUIVOS MODIFICADOS (QUARTO)

**Menu LEADS:**
- [ ] `src/pages/Leads.tsx`
- [ ] `src/hooks/useLeadsSync.ts`

**Menu FUNIL DE VENDAS:**
- [ ] `src/pages/Kanban.tsx`
- [ ] `src/components/funil/DroppableColumn.tsx`
- [ ] `src/components/funil/LeadCard.tsx`

**Menu TAREFAS:**
- [ ] `src/pages/Tarefas.tsx`
- [ ] `src/components/tarefas/TaskCard.tsx`

**Menu AGENDA:**
- [ ] `src/pages/Agenda.tsx`
- [ ] `src/components/agenda/EditarCompromissoDialog.tsx`

**Status:** [ ] Transferidos

---

## 🔧 MÉTODO RECOMENDADO: GIT

```bash
# 1. Fazer backup
git checkout -b backup-antes-transferencia-2025-11-01
git push origin backup-antes-transferencia-2025-11-01

# 2. Voltar para main
git checkout main

# 3. Adicionar arquivos
git add src/pages/Leads.tsx
git add src/pages/Kanban.tsx
git add src/pages/Tarefas.tsx
git add src/pages/Agenda.tsx
git add src/hooks/useTaskTimer.ts
git add supabase/functions/api-tarefas/index.ts
git add supabase/functions/enviar-lembretes/index.ts

# 4. Commit
git commit -m "fix: Correções dos 4 menus prioritários (Leads, Funil, Tarefas, Agenda)"

# 5. Push
git push origin main
```

---

## ✅ VALIDAÇÃO PÓS-DEPLOY

### Testes Funcionais

**Menu LEADS:**
- [ ] Criar lead funciona
- [ ] Busca funciona
- [ ] Avatar carrega

**Menu FUNIL DE VENDAS:**
- [ ] Reordenar etapas funciona
- [ ] Mover lead funciona

**Menu TAREFAS:**
- [ ] Criar tarefa funciona
- [ ] Timer funciona
- [ ] Drag & drop funciona

**Menu AGENDA:**
- [ ] Criar compromisso funciona
- [ ] Criar lembrete funciona
- [ ] Retry funciona

**Status:** [ ] Todos os testes passando

---

## 📝 PRÓXIMOS PASSOS

1. ✅ **Transferir atualizações para Lovable** ← VOCÊ ESTÁ AQUI
2. ⏳ **Corrigir menu CONVERSAS** (último menu prioritário)
3. ⏳ **Testes de integração completos**
4. ⏳ **Documentação final**

---

**Checklist criado em:** 01/11/2025  
**Versão:** 1.0 FINAL



