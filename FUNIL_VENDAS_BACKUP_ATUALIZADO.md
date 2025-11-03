# 🚀 BACKUP ATUALIZADO - FUNIL DE VENDAS
## Última atualização: 2024-11-01

Este arquivo documenta TODAS as correções aplicadas ao Funil de Vendas para evitar retrocessos.

---

## ✅ CORREÇÕES APLICADAS

### 1. **Comentários de Leads (LeadComments.tsx)**
**Status:** ✅ CORRIGIDO E ATUALIZADO

**Problema anterior:** Usava tabela `lead_comments` que não existe ou não tem permissões.

**Solução implementada:**
- ✅ Usa campo `notes` do lead diretamente
- ✅ Armazena comentários como JSON no campo `notes`
- ✅ Aceita `initialNotes` como prop
- ✅ Função `parseComments()` para parsear JSON ou texto simples
- ✅ Função `persistComments()` para salvar no campo `notes`

**Arquivo:** `src/components/funil/LeadComments.tsx`

**Código chave:**
```typescript
interface LeadCommentsProps {
  leadId: string;
  initialNotes?: string | null; // ✅ IMPORTANTE: Deve receber notes do lead
  onCommentAdded?: () => void;
}

// ✅ Usa leads.notes em vez de lead_comments
const loadComments = async () => {
  const { data } = await supabase
    .from("leads")
    .select("notes")
    .eq("id", leadId)
    .maybeSingle();
  setComments(parseComments(data?.notes));
};

// ✅ Salva no campo notes como JSON
const persistComments = async (updated: Comment[]) => {
  await supabase
    .from("leads")
    .update({ notes: JSON.stringify(updated) })
    .eq("id", leadId);
};
```

---

### 2. **LeadCard - Passar notes para LeadComments**
**Status:** ✅ CORRIGIDO E ATUALIZADO

**Arquivo:** `src/components/funil/LeadCard.tsx`

**Código chave:**
```typescript
interface LeadCardProps {
  lead: {
    // ... outros campos
    notes?: string | null; // ✅ IMPORTANTE: Deve incluir notes
  };
}

// ✅ Passa initialNotes ao LeadComments
<LeadComments
  leadId={lead.id}
  initialNotes={lead.notes ?? null} // ✅ CRÍTICO: Passa notes do lead
  onCommentAdded={() => onLeadMoved?.()}
/>
```

---

### 3. **Edição de Nome do Funil (EditarFunilDialog.tsx)**
**Status:** ✅ CORRIGIDO E ATUALIZADO COM FALLBACK

**Problema anterior:** Dependia de RPC `update_funil_nome` que pode não existir.

**Solução implementada:**
- ✅ Tenta usar RPC primeiro
- ✅ Fallback para UPDATE direto se RPC falhar
- ✅ Funciona mesmo sem RPCs configurados

**Arquivo:** `src/components/funil/EditarFunilDialog.tsx`

**Código chave:**
```typescript
// ✅ Tenta RPC primeiro
try {
  const { error: rpcError } = await supabase.rpc("update_funil_nome", {
    p_funil_id: funilId,
    p_nome: nomeFunil,
  });
  if (rpcError) {
    // ✅ Fallback para UPDATE direto
    const { error: updateError } = await supabase
      .from("funis")
      .update({ nome: nomeFunil })
      .eq("id", funilId);
  }
} catch (e) {
  // ✅ Fallback para UPDATE direto
  const { error: updateError } = await supabase
    .from("funis")
    .update({ nome: nomeFunil })
    .eq("id", funilId);
}
```

---

### 4. **Edição de Nome de Etapa (EditarEtapaDialog.tsx)**
**Status:** ✅ CORRIGIDO E ATUALIZADO COM FALLBACK

**Problema anterior:** Dependia de RPC `update_etapa` que pode não existir.

**Solução implementada:**
- ✅ Tenta usar RPC primeiro
- ✅ Fallback para UPDATE direto se RPC falhar
- ✅ Usa campo `atualizado_em` (não `updated_at`)
- ✅ Funciona mesmo sem RPCs configurados

**Arquivo:** `src/components/funil/EditarEtapaDialog.tsx`

**Código chave:**
```typescript
// ✅ Tenta RPC primeiro
try {
  const { error: rpcError } = await supabase.rpc("update_etapa", {
    p_etapa_id: etapaId,
    p_nome: nomeFormatado,
    p_cor: cor,
    p_posicao: null,
  });
  if (rpcError) {
    // ✅ Fallback para UPDATE direto
    const { error: directUpdateError } = await supabase
      .from("etapas")
      .update({
        nome: nomeFormatado,
        cor: cor,
        atualizado_em: new Date().toISOString() // ✅ IMPORTANTE: atualizado_em não updated_at
      })
      .eq("id", etapaId);
  }
} catch (e) {
  // ✅ Fallback para UPDATE direto
}
```

---

### 5. **Reordenação de Etapas (Kanban.tsx)**
**Status:** ✅ CORRIGIDO E ATUALIZADO COM FALLBACK

**Problemas anteriores:**
- `SortableColumn` não identificava drag de etapas
- Usava campo `updated_at` em vez de `atualizado_em`
- Não tinha fallback para RPC `reorder_etapas`

**Soluções implementadas:**
- ✅ Adicionado `data: { type: 'etapa' }` no `useSortable`
- ✅ Corrigido campo para `atualizado_em`
- ✅ Fallback para RPC `reorder_etapas`
- ✅ Fallback para updates individuais se RPC falhar

**Arquivo:** `src/pages/Kanban.tsx`

**Código chave:**
```typescript
// ✅ IMPORTANTE: Adicionar data: { type: 'etapa' } para identificar drag de etapas
const {
  attributes,
  listeners,
  setNodeRef,
  transform,
  transition,
  isDragging: sortableIsDragging,
} = useSortable({ id, data: { type: 'etapa' } }); // ✅ CRÍTICO

// ✅ Reordenação com fallbacks
const handleEtapaReorder = async (activeId: string, overId: string) => {
  // ... lógica de reordenação
  
  // ✅ Tenta RPC primeiro
  if (selectedFunil) {
    try {
      const { error: rpcErr } = await supabase.rpc('reorder_etapas', {
        p_funil_id: selectedFunil,
        p_order: updatedEtapas.map(etapa => etapa.id)
      });
      if (!rpcErr) {
        // ✅ Sucesso via RPC
        return;
      }
    } catch (e) {
      // ✅ Fallback para updates individuais
    }
  }

  // ✅ Fallback: Updates individuais
  const updates = updatedEtapas.map(etapa => ({
    id: etapa.id,
    posicao: etapa.posicao,
    atualizado_em: new Date().toISOString() // ✅ IMPORTANTE: atualizado_em não updated_at
  }));

  const updatePromises = updates.map(update =>
    supabase
      .from('etapas')
      .update({
        posicao: update.posicao,
        atualizado_em: update.atualizado_em // ✅ CRÍTICO: atualizado_em
      })
      .eq('id', update.id)
  );
  
  await Promise.all(updatePromises);
};
```

---

### 6. **TarefaModal - Seleção de Quadro e Etapa**
**Status:** ✅ CORRIGIDO E ATUALIZADO

**Problema anterior:** Não tinha opções para escolher quadro e etapa ao criar tarefa.

**Solução implementada:**
- ✅ Carrega boards da tabela `task_boards`
- ✅ Carrega columns da tabela `task_columns`
- ✅ Select de Quadro no topo do formulário
- ✅ Select de Etapa (filtrado pelo quadro) logo abaixo
- ✅ Salva `board_id` e `column_id` ao criar tarefa
- ✅ Atualiza etapas automaticamente quando muda o quadro

**Arquivo:** `src/components/tarefas/TarefaModal.tsx`

**Código chave:**
```typescript
// ✅ Estados para boards e columns
const [boards, setBoards] = useState<Board[]>([]);
const [columns, setColumns] = useState<Column[]>([]);
const [formData, setFormData] = useState({
  // ... outros campos
  board_id: "", // ✅ IMPORTANTE
  column_id: "" // ✅ IMPORTANTE
});

// ✅ Carrega boards e columns ao abrir modal
const carregarBoardsEColunas = async () => {
  const { data: boardsData } = await supabase
    .from("task_boards")
    .select("*")
    .order("criado_em");
  setBoards(boardsData || []);

  const { data: columnsData } = await supabase
    .from("task_columns")
    .select("*")
    .order("posicao");
  setColumns(columnsData || []);
};

// ✅ Formulário com Quadro e Etapa no topo
<form onSubmit={handleSubmit}>
  {/* ✅ Quadro no topo */}
  {boards.length > 0 && (
    <div>
      <Label>Quadro</Label>
      <Select value={formData.board_id} onValueChange={(value) => 
        setFormData({ ...formData, board_id: value, column_id: "" })
      }>
        {/* ... options */}
      </Select>
    </div>
  )}

  {/* ✅ Etapa logo abaixo (filtrada pelo quadro) */}
  {formData.board_id && columns.filter(c => c.board_id === formData.board_id).length > 0 && (
    <div>
      <Label>Etapa</Label>
      <Select value={formData.column_id} onValueChange={(value) => 
        setFormData({ ...formData, column_id: value })
      }>
        {/* ... options filtradas */}
      </Select>
    </div>
  )}

  {/* ... resto do formulário */}
</form>

// ✅ Salva board_id e column_id
const { error } = await supabase.from("tasks").insert({
  // ... outros campos
  board_id: formData.board_id || null, // ✅ CRÍTICO
  column_id: formData.column_id || null // ✅ CRÍTICO
});
```

---

## 📋 CHECKLIST DE VERIFICAÇÃO

Se algo retroceder, verifique:

- [ ] `LeadComments.tsx` usa `leads.notes` (não `lead_comments`)
- [ ] `LeadComments.tsx` tem `initialNotes` na interface
- [ ] `LeadCard.tsx` passa `initialNotes={lead.notes ?? null}` ao LeadComments
- [ ] `LeadCard.tsx` interface inclui `notes?: string | null`
- [ ] `EditarFunilDialog.tsx` tem fallback para UPDATE direto
- [ ] `EditarEtapaDialog.tsx` tem fallback para UPDATE direto
- [ ] `EditarEtapaDialog.tsx` usa campo `atualizado_em` (não `updated_at`)
- [ ] `Kanban.tsx` SortableColumn tem `data: { type: 'etapa' }`
- [ ] `Kanban.tsx` handleEtapaReorder usa `atualizado_em` (não `updated_at`)
- [ ] `Kanban.tsx` handleEtapaReorder tem fallback para RPC `reorder_etapas`
- [ ] `TarefaModal.tsx` tem estados `boards` e `columns`
- [ ] `TarefaModal.tsx` carrega `task_boards` e `task_columns`
- [ ] `TarefaModal.tsx` tem Select de Quadro no topo
- [ ] `TarefaModal.tsx` tem Select de Etapa (filtrado por quadro)
- [ ] `TarefaModal.tsx` salva `board_id` e `column_id` ao criar tarefa

---

## 🔧 COMO RESTAURAR SE RETROCEDER

Se algo retroceder, use este guia:

1. **Comentários não funcionam:**
   - Verifique se `LeadComments.tsx` usa `leads.notes`
   - Verifique se `LeadCard.tsx` passa `initialNotes`

2. **Edição de funil/etapa não funciona:**
   - Verifique se tem fallback para UPDATE direto
   - Verifique se usa campo correto (`atualizado_em` não `updated_at`)

3. **Reordenação de etapas não funciona:**
   - Verifique se `SortableColumn` tem `data: { type: 'etapa' }`
   - Verifique se usa `atualizado_em` no UPDATE
   - Verifique se tem fallback para RPC

4. **TarefaModal não mostra Quadro/Etapa:**
   - Verifique se carrega `task_boards` e `task_columns`
   - Verifique se tem Selects no topo do formulário
   - Verifique se salva `board_id` e `column_id`

---

## 📝 NOTAS IMPORTANTES

- ✅ Todos os componentes têm fallbacks para funcionar mesmo sem RPCs
- ✅ Todos usam campos corretos do banco (`atualizado_em` não `updated_at`)
- ✅ Comentários usam `notes` do lead diretamente (não tabela separada)
- ✅ TarefaModal permite escolher Quadro e Etapa antes de criar tarefa

---

---

## 🔧 CORREÇÕES DE BLOQUEIO DE DRAG (2024-11-01 - TARDE)

### 7. **Sistema de Bloqueio de Drag Corrigido**
**Status:** ✅ CORRIGIDO E ATUALIZADO

**Problema anterior:** 
- `handleDragStart` ativava bloqueio
- `handleDragEnd` detectava bloqueio ativo e bloqueava o próprio drag
- Erro: "Operação de drag já em andamento" bloqueava o mesmo drag

**Solução implementada:**
- ✅ Adicionado `currentDragIdRef` para rastrear qual item está sendo arrastado
- ✅ Verificação inteligente: permite mesmo drag continuar, bloqueia drags diferentes
- ✅ Todos os pontos de liberação atualizam `currentDragIdRef = null`
- ✅ Timeouts verificam se é o mesmo drag antes de liberar

**Arquivo:** `src/pages/Kanban.tsx`

**Código chave:**
```typescript
// ✅ Novo ref para rastrear drag atual
const currentDragIdRef = useRef<string | null>(null);

// ✅ handleDragStart - identifica drag atual
handleDragStart = (event) => {
  currentDragIdRef.current = dragId; // Rastrear qual item
  isMovingRef.current = true;
  // ...
}

// ✅ handleDragEnd - verificação inteligente
handleDragEnd = async (event) => {
  if (isMovingRef.current) {
    // Se é o mesmo item sendo arrastado, é o mesmo drag - permitir continuar
    if (currentDragIdRef.current === dragId) {
      console.log('[DRAG END] ✅ Mesmo drag - continuando operação');
      // Não fazer nada, o bloqueio já está ativo e é o mesmo drag
    } else {
      // É um drag diferente - bloquear
      console.warn('[DRAG END] ⚠️ Operação de drag já em andamento - bloqueado');
      return;
    }
  }
  // ...
}

// ✅ Sempre limpar ao liberar bloqueio
isMovingRef.current = false;
currentDragIdRef.current = null; // ✅ CRÍTICO: Limpar rastreamento
```

---

### 8. **LeadCard - etapaId no Data do Drag**
**Status:** ✅ CORRIGIDO E ATUALIZADO

**Problema anterior:** Ao soltar sobre outro lead, a etapa de destino não era identificada.

**Solução implementada:**
- ✅ Adicionado `etapaId: lead.etapa_id` no `data` do `useDraggable`
- ✅ Permite identificar etapa ao soltar sobre outro lead

**Arquivo:** `src/components/funil/LeadCard.tsx`

**Código chave:**
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

---

### 9. **Lógica de Identificação de Destino Melhorada**
**Status:** ✅ CORRIGIDO E ATUALIZADO

**Problema anterior:** Lógica de identificação não cobria todos os casos ao soltar sobre leads.

**Solução implementada:**
- ✅ Prioridade 1: Drop direto na coluna (`type === 'etapa'`)
- ✅ Prioridade 2: `etapaId` no data (DroppableColumn)
- ✅ Prioridade 3: Drop sobre lead - usa `etapaId` do data ou `etapa_id` do lead

**Arquivo:** `src/pages/Kanban.tsx`

**Código chave:**
```typescript
// ✅ Prioridade 1: Drop direto na área da coluna (tipo 'etapa')
if (overData?.type === 'etapa') {
  newEtapaId = over.id as string;
} 
// ✅ Prioridade 2: etapaId no data (DroppableColumn passa isso)
else if (overData?.etapaId) {
  newEtapaId = overData.etapaId as string;
} 
// ✅ Prioridade 3: Drop sobre lead - usar etapaId do data ou etapa_id do lead
else if (overData?.type === 'lead') {
  // Tentar etapaId do data primeiro (LeadCard agora passa)
  newEtapaId = overData.etapaId || overData.lead?.etapa_id || null;
}
```

---

### 10. **Liberação de Bloqueio em Todos os Returns**
**Status:** ✅ CORRIGIDO E ATUALIZADO

**Problema anterior:** Alguns `return` ocorriam sem liberar bloqueio, travando o sistema.

**Solução implementada:**
- ✅ Todos os `return` antes do try liberam bloqueio
- ✅ Todos os `return` dentro do try liberam bloqueio
- ✅ `finally` sempre libera bloqueio como backup
- ✅ Todos liberam também `currentDragIdRef.current = null`

**Arquivo:** `src/pages/Kanban.tsx`

**Checklist de liberação:**
```typescript
// ✅ Padrão em TODOS os returns:
isMovingRef.current = false;
currentDragIdRef.current = null; // ✅ Sempre limpar rastreamento
if (blockTimeoutRef.current) {
  clearTimeout(blockTimeoutRef.current);
  blockTimeoutRef.current = null;
}
return;
```

---

**Última revisão:** 2024-11-01 (Tarde)
**Status:** ✅ TODAS AS CORREÇÕES APLICADAS E TESTADAS
**Versão:** 2.0 - Sistema de Bloqueio Inteligente Implementado

