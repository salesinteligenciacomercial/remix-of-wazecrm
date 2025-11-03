# 📋 RELATÓRIO DETALHADO - MENU FUNIL DE VENDAS

**Menu:** FUNIL DE VENDAS (KANBAN)  
**Nota Geral:** ⚠️ **A TESTAR** (Pendente validação completa)  
**Prioridade:** 🔴 **CRÍTICA** (Core do sistema de vendas)

---

## 📊 FUNCIONALIDADES MAPEADAS: 30

### ✅ FUNCIONALIDADES IMPLEMENTADAS

1. ✅ Visualização Kanban
2. ✅ Criação de Funis
3. ✅ Edição de Funis
4. ✅ Criação de Etapas
5. ✅ Edição de Etapas
6. ✅ Reordenação de Etapas (Drag Horizontal)
7. ✅ Movimentação de Leads (Drag & Drop)
8. ✅ Criar Novo Lead
9. ✅ Adicionar Lead Existente
10. ✅ Editar Lead
11. ✅ Remover Lead do Funil
12. ✅ Mover Lead para Outro Funil
13. ✅ Métricas por Etapa
14. ✅ Taxa de Conversão
15. ✅ Tempo Médio na Etapa
16. ✅ Paginação de Leads
17. ✅ Sincronização Realtime
18. ✅ Indicador de Conexão
19. ✅ Navegação Horizontal
20. ✅ Validação de Movimentação
21. ✅ Rollback em Erro
22. ✅ Bloqueio de Operações Concorrentes
23. ✅ Importar Leads (CSV)

---

## ⚠️ PROBLEMAS IDENTIFICADOS

### 🔴 CRÍTICOS

1. **Reordenação de Etapas - data: { type: 'etapa' }**
   - **Problema:** ✅ CRÍTICO - deve ter `data: { type: 'etapa' }` no useSortable
   - **Impacto:** Drag de etapas pode não funcionar ou conflitar com drag de leads
   - **Arquivo:** `src/pages/Kanban.tsx` (linha 73 - SortableColumn)

2. **Realtime Durante Drag**
   - **Problema:** Atualizações realtime podem conflitar com operação de drag
   - **Impacto:** Leads podem voltar para posição original durante drag
   - **Arquivo:** `src/pages/Kanban.tsx` (linhas 334-338, isMovingRef)

3. **RPC reorder_etapas**
   - **Problema:** Função RPC pode não existir no banco
   - **Impacto:** Reordenação pode falhar ou usar fallback mais lento
   - **Arquivo:** `src/pages/Kanban.tsx` (linhas 795-811)

### 🟡 IMPORTANTES

4. **Performance com Muitos Leads**
   - **Problema:** Pode ficar lento com 100+ leads
   - **Impacto:** Interface pode travar
   - **Arquivo:** `src/pages/Kanban.tsx` (função etapaStats)

5. **Validação de Funil**
   - **Problema:** Movimentação entre funis diferentes pode ter bugs
   - **Impacto:** Leads podem ser movidos para funil errado
   - **Arquivo:** `src/pages/Kanban.tsx` (linhas 535-545)

6. **Campo atualizado_em vs updated_at**
   - **Problema:** Usa campo `atualizado_em` não `updated_at`
   - **Impacto:** Reordenação pode não salvar corretamente
   - **Arquivo:** `src/pages/Kanban.tsx` (linha 818)

---

## 🔧 MICRO-PROMPTS PARA CORREÇÃO

### MICRO-PROMPT 1: Garantir data: { type: 'etapa' } no useSortable

```
✅ CRÍTICO - Verificar se SortableColumn tem data: { type: 'etapa' }

No arquivo src/pages/Kanban.tsx, linha 73, garantir que:
const { ... } = useSortable({ 
  id, 
  data: { type: 'etapa' } // ✅ CRÍTICO: deve ter isso
});

Se não tiver, adicionar imediatamente. Isso é essencial para identificar
drag de etapas vs drag de leads.

Arquivo: src/pages/Kanban.tsx (função SortableColumn)
```

### MICRO-PROMPT 2: Melhorar Bloqueio Durante Drag

```
Melhorar bloqueio de atualizações realtime durante drag:

1. Garantir que isMovingRef.current = true antes de iniciar drag
2. Validar que realtime ignora atualizações quando isMovingRef.current = true
3. Liberar bloqueio APÓS confirmação do servidor (não antes)
4. Adicionar timeout de segurança (5s) para liberar bloqueio
5. Logar quando bloqueio está ativo para debug

Arquivo: src/pages/Kanban.tsx
- Linha 335-338 (verificar atualizações)
- Linha 576 (bloquear)
- Linha 658 (liberar)
```

### MICRO-PROMPT 3: Criar ou Corrigir RPC reorder_etapas

```
Criar função RPC reorder_etapas no Supabase ou melhorar fallback:

OPÇÃO 1 - Criar RPC (recomendado):
Criar função SQL no Supabase:
CREATE OR REPLACE FUNCTION reorder_etapas(
  p_funil_id uuid,
  p_order uuid[]
) RETURNS void AS $$
BEGIN
  UPDATE etapas SET posicao = array_position(p_order, id)
  WHERE funil_id = p_funil_id AND id = ANY(p_order);
END;
$$ LANGUAGE plpgsql;

OPÇÃO 2 - Melhorar fallback:
Melhorar tratamento de erro quando RPC não existe
Adicionar log claro indicando que está usando fallback

Arquivo: src/pages/Kanban.tsx (linhas 795-811)
```

### MICRO-PROMPT 4: Otimizar Performance com Muitos Leads

```
Otimizar cálculo de métricas para não travar com muitos leads:

1. Usar useMemo para calcular etapaStats apenas quando necessário
2. Implementar debounce no cálculo de métricas
3. Limitar quantidade de leads processados por vez
4. Usar virtualização para renderização de leads
5. Adicionar indicador de loading quando calculando métricas

Arquivo: src/pages/Kanban.tsx (função etapaStats, linhas 669-717)
Atualizar para usar paginação ou limitar leads processados
```

### MICRO-PROMPT 5: Melhorar Validação de Movimentação Entre Funis

```
Melhorar validação para prevenir movimentação entre funis diferentes:

1. Validar etapaDestino.funil_id === selectedFunil ANTES de mover
2. Mostrar mensagem clara se tentar mover para outro funil
3. Opcional: Permitir mover via dialog "Mover para outro funil"
4. Adicionar confirmação se detectar tentativa de mover entre funis
5. Logar tentativas de movimentação inválida para debug

Arquivo: src/pages/Kanban.tsx (linhas 535-545)
Melhorar mensagem de erro e UX
```

### MICRO-PROMPT 6: Verificar Campo atualizado_em vs updated_at

```
Verificar e corrigir uso correto do campo de timestamp:

1. Verificar schema da tabela etapas no Supabase
2. Se campo é "atualizado_em" → manter código atual (linha 818)
3. Se campo é "updated_at" → corrigir para updated_at
4. Garantir consistência em todas as atualizações de etapa
5. Adicionar comentário no código explicando qual campo usar

Arquivo: src/pages/Kanban.tsx (linha 818)
Verificar: supabase/migrations para ver nome correto do campo
```

---

## 📝 CHECKLIST DE VALIDAÇÃO

Após correções, testar:

- [ ] Arrastar etapa horizontalmente → deve reordenar
- [ ] Arrastar lead entre etapas → deve mover corretamente
- [ ] Tentar mover lead para outro funil → deve bloquear
- [ ] Durante drag, realtime não deve interferir
- [ ] Reordenação de etapas deve salvar no banco
- [ ] Performance com 100+ leads → deve funcionar sem travar
- [ ] Métricas devem calcular corretamente
- [ ] Rollback em caso de erro → deve funcionar
- [ ] Indicador de conexão → deve mostrar status correto

---

## 🎯 NOTA FINAL ESPERADA: 9.0/10

Após corrigir os 6 problemas identificados, o funil deve estar 100% funcional.

---

**PRÓXIMO PASSO:** Usar os micro-prompts acima em um chat específico para correção do menu Funil de Vendas.


