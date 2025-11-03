# 🔒 CORREÇÕES CRÍTICAS - SISTEMA DE BLOQUEIO DE DRAG
## Data: 2024-11-01 (Tarde)

Este documento detalha as correções críticas do sistema de bloqueio de drag que resolviam o problema de travamento ao mover leads entre colunas.

---

## ❌ PROBLEMA IDENTIFICADO

**Console Error:**
```
[DRAG END] ⚠️ Operação de drag já em andamento - bloqueado
```

**Causa Raiz:**
1. `handleDragStart` ativava `isMovingRef.current = true`
2. `handleDragEnd` verificava se bloqueio estava ativo
3. Como estava ativo (foi ativado no start), bloqueava o **próprio drag**
4. Sistema travava até timeout de 5s

**Sintomas:**
- Lead não movia ao soltar em outra coluna
- Mensagem "Aguarde a operação anterior finalizar"
- Bloqueio ficava travado por 5s

---

## ✅ SOLUÇÃO IMPLEMENTADA

### 1. Sistema de Rastreamento de Drag Atual

**Arquivo:** `src/pages/Kanban.tsx` (linha 134)

```typescript
// ✅ Novo ref para rastrear qual item está sendo arrastado
const currentDragIdRef = useRef<string | null>(null);
```

**Função:** Identificar se o bloqueio ativo é do mesmo drag ou de um drag diferente.

---

### 2. handleDragStart Atualizado

**Arquivo:** `src/pages/Kanban.tsx` (linha 438-482)

**Mudanças:**
- ✅ Rastreia `currentDragIdRef.current = dragId` antes de ativar bloqueio
- ✅ Drag de etapa não ativa bloqueio (gerenciado por `handleEtapaReorder`)
- ✅ Timeout verifica se é o mesmo drag antes de liberar

```typescript
const handleDragStart = (event: DragStartEvent) => {
  const dragId = active.id as string;
  
  // ✅ CRÍTICO: Identificar qual item está sendo arrastado
  currentDragIdRef.current = dragId;
  
  // ✅ Se for drag de etapa, não precisa bloquear aqui
  if (activeData?.type === 'etapa') {
    return;
  }

  // ✅ Para drag de lead: Ativar bloqueio
  isMovingRef.current = true;
  
  // ✅ Timeout verifica se é o mesmo drag
  blockTimeoutRef.current = setTimeout(() => {
    if (isMovingRef.current && currentDragIdRef.current === dragId) {
      // Liberar apenas se for o mesmo drag
      isMovingRef.current = false;
      currentDragIdRef.current = null;
    }
  }, 5000);
};
```

---

### 3. handleDragEnd - Verificação Inteligente

**Arquivo:** `src/pages/Kanban.tsx` (linha 502-542)

**Mudança Crítica:**
Agora verifica se é o **mesmo drag** antes de bloquear:

```typescript
// ✅ CRÍTICO: Verificar se é uma operação concorrente ou o mesmo drag
if (isMovingRef.current) {
  // Se é o mesmo item sendo arrastado, é o mesmo drag - permitir continuar
  if (currentDragIdRef.current === dragId) {
    console.log('[DRAG END] ✅ Mesmo drag - continuando operação');
    // ✅ Não fazer nada, o bloqueio já está ativo e é o mesmo drag
  } else {
    // É um drag diferente - bloquear
    console.warn('[DRAG END] ⚠️ Operação de drag já em andamento - bloqueado');
    return;
  }
}
```

**Resultado:**
- ✅ Mesmo drag: Permite continuar
- ❌ Drag diferente: Bloqueia (operações concorrentes)

---

### 4. LeadCard - etapaId no Data

**Arquivo:** `src/components/funil/LeadCard.tsx` (linha 105)

**Problema:** Ao soltar sobre outro lead, etapa de destino não era identificada.

**Solução:**
```typescript
useDraggable({
  id: lead.id,
  data: {
    type: 'lead',
    lead: lead,
    etapaId: lead.etapa_id // ✅ CRÍTICO: Passar etapaId para identificar etapa de destino
  }
})
```

**Resultado:** Agora pode identificar etapa ao soltar sobre outro lead.

---

### 5. Liberação de Bloqueio Padronizada

**Arquivo:** `src/pages/Kanban.tsx` (todos os returns)

**Padrão aplicado em TODOS os returns:**
```typescript
// ✅ Sempre liberar bloqueio E limpar rastreamento
isMovingRef.current = false;
currentDragIdRef.current = null; // ✅ CRÍTICO: Sempre limpar
if (blockTimeoutRef.current) {
  clearTimeout(blockTimeoutRef.current);
  blockTimeoutRef.current = null;
}
return;
```

**Pontos atualizados:**
- ✅ `if (!over) { return; }` (linha 557)
- ✅ `if (!isOnline) { return; }` (linha 572)
- ✅ `if (activeData?.type === 'etapa') { return; }` (linha 589)
- ✅ `if (!lead) { return; }` (linha 613)
- ✅ `if (!newEtapaId) { return; }` (linha 637)
- ✅ `if (!etapaDestino) { return; }` (linha 659)
- ✅ `if (etapaDestino.funil_id !== selectedFunil) { return; }` (linha 679)
- ✅ `if (lead.etapa_id === newEtapaId) { return; }` (linha 760)
- ✅ `if (error) { throw error; }` (linha 812)
- ✅ Sucesso após servidor (linha 841)
- ✅ `finally` block (linha 894)

---

### 6. Lógica de Identificação de Destino Melhorada

**Arquivo:** `src/pages/Kanban.tsx` (linha 574-596)

**Prioridades:**
1. Drop direto na coluna (`type === 'etapa'`)
2. `etapaId` no data (DroppableColumn)
3. Drop sobre lead - usa `etapaId` do data ou `etapa_id` do lead

```typescript
// ✅ Prioridade 1: Drop direto na área da coluna
if (overData?.type === 'etapa') {
  newEtapaId = over.id as string;
} 
// ✅ Prioridade 2: etapaId no data
else if (overData?.etapaId) {
  newEtapaId = overData.etapaId as string;
} 
// ✅ Prioridade 3: Drop sobre lead
else if (overData?.type === 'lead') {
  // LeadCard agora passa etapaId no data
  newEtapaId = overData.etapaId || overData.lead?.etapa_id || null;
}
```

---

## 📋 CHECKLIST DE VERIFICAÇÃO

Se algo retroceder, verificar:

### Arquivo: `src/pages/Kanban.tsx`
- [ ] Linha 134: `currentDragIdRef` declarado
- [ ] Linha 443: `handleDragStart` define `currentDragIdRef.current = dragId`
- [ ] Linha 508: `handleDragEnd` verifica `currentDragIdRef.current === dragId`
- [ ] Todos os returns liberam `currentDragIdRef.current = null`
- [ ] Timeouts verificam `currentDragIdRef.current === dragId` antes de liberar
- [ ] `finally` block verifica `currentDragIdRef.current === dragId`

### Arquivo: `src/components/funil/LeadCard.tsx`
- [ ] Linha 105: `useDraggable` data inclui `etapaId: lead.etapa_id`

### Arquivo: `src/components/funil/DroppableColumn.tsx`
- [ ] Linha 58-61: `useDroppable` data inclui `type: 'etapa'` e `etapaId: id`

---

## 🔧 COMO RESTAURAR SE RETROCEDER

### Problema: "Operação de drag já em andamento" bloqueia mesmo drag

**Solução:**
1. Adicionar `currentDragIdRef = useRef<string | null>(null)`
2. Em `handleDragStart`: `currentDragIdRef.current = dragId`
3. Em `handleDragEnd`: Verificar se `currentDragIdRef.current === dragId` antes de bloquear
4. Em todos os returns: Liberar `currentDragIdRef.current = null`

### Problema: Não identifica etapa ao soltar sobre lead

**Solução:**
1. Em `LeadCard.tsx`: Adicionar `etapaId: lead.etapa_id` no `data` do `useDraggable`
2. Em `handleDragEnd`: Usar `overData.etapaId || overData.lead?.etapa_id`

---

## ✅ RESULTADO FINAL

**Antes:**
- ❌ Mesmo drag bloqueava a si mesmo
- ❌ Sistema travava por 5s
- ❌ Não identificava etapa ao soltar sobre lead

**Depois:**
- ✅ Mesmo drag pode continuar
- ✅ Drags diferentes são bloqueados corretamente
- ✅ Identifica etapa em todos os casos
- ✅ Bloqueio sempre liberado corretamente
- ✅ Sistema responsivo e funcional

---

**Status:** ✅ CORRIGIDO E TESTADO
**Versão:** 2.0 - Sistema de Bloqueio Inteligente
**Data:** 2024-11-01 (Tarde)

