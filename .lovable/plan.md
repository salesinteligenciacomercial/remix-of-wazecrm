

## Plano: Ajuste do Filtro "Responsável" para Incluir Atendimentos Ativos

### Resumo do Pedido

O usuário quer aprimorar o filtro **"Responsável"** para que funcione como um atalho para o usuário visualizar rapidamente os contatos que **ele está atendendo ativamente** (dentro dos 5 minutos de atendimento ativo).

**Comportamento atual:**
- **Em Atendimento**: Mostra todos os contatos com atendimento ativo de qualquer usuário (funcionando corretamente ✅)
- **Responsável**: Mostra apenas contatos onde o campo `responsavel` ou `assignedUser` está vinculado ao usuário

**Comportamento desejado:**
- **Em Atendimento**: Continua mostrando todos os contatos com atendimento ativo (para que todos vejam quem está atendendo quem) ✅
- **Responsável**: Mostrar contatos que o **usuário atual** está atendendo ativamente (filtro individual por usuário)
  - Quando o usuário responder um contato, esse contato aparece no filtro "Responsável" dele
  - Se passar 5 minutos sem interação, o contato sai do filtro "Responsável"
  - Contatos onde o usuário é responsável legado também continuam aparecendo

---

### Lógica da Solução

O filtro "Responsável" passará a considerar:

1. **Atendimentos ativos do usuário atual**: Contatos onde `attending_user_id === currentUserId` E atendimento não expirado
2. **Responsáveis legados**: Contatos onde `responsavel === currentUserId` OU `assignedUser.id === currentUserId`

```text
┌─────────────────────────────────────────────────────────────────────┐
│                  FILTRO "RESPONSÁVEL" ATUALIZADO                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Contato aparece no filtro "Responsável" do Usuário X se:           │
│                                                                     │
│  1. Usuário X tem atendimento ativo não expirado para este contato  │
│     (attending_user_id === X && expires_at > agora)                 │
│                                                                     │
│  OU                                                                 │
│                                                                     │
│  2. Campo responsavel === X                                         │
│  OU                                                                 │
│  3. Campo assignedUser.id === X                                     │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  REGRA DOS 5 MINUTOS:                                               │
│                                                                     │
│  - Se 5 min sem interação, atendimento expira                       │
│  - Contato sai do filtro "Responsável" (via atendimento ativo)      │
│  - Próxima mensagem do contato vai para "Esperando"                 │
│  - Outro usuário pode assumir                                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

### Visão Comparativa dos Filtros

| Filtro | O que mostra | Visibilidade |
|--------|--------------|--------------|
| **Em Atendimento** | Todos os contatos com atendimento ativo (qualquer usuário) | Todos veem |
| **Responsável** | Contatos que **EU** estou atendendo + meus responsáveis legados | Individual por usuário |
| **Esperando** | Contatos sem atendimento ativo que aguardam resposta | Todos veem |

---

### Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/hooks/useActiveAttendance.ts` | Modificar | Adicionar função para verificar se **usuário atual** está atendendo |
| `src/pages/Conversas.tsx` | Modificar | Atualizar lógica do filtro "Responsável" e badge de contagem |

---

### Detalhes Técnicos

#### 1. Nova função no Hook `useActiveAttendance.ts`

Adicionar uma função para verificar se o usuário atual está atendendo um contato específico:

```typescript
// Verificar se o USUÁRIO ATUAL está atendendo este contato
const isCurrentUserAttending = useCallback((telefoneFormatado: string): boolean => {
  const attendance = getActiveAttendance(telefoneFormatado);
  if (!attendance) return false;
  
  // Verificar se o attending_user_id é o usuário atual
  return attendance.attending_user_id === currentUserIdRef.current;
}, [getActiveAttendance]);
```

#### 2. Atualizar Filtro "Responsável" em `Conversas.tsx`

```typescript
} else if (filter === "responsible") {
  // ✅ Filtro "Responsável" ATUALIZADO
  filtered = filtered.filter(conv => {
    if (conv.isGroup === true) return false;
    
    const telefone = (conv.phoneNumber || conv.id).replace(/[^0-9]/g, '');
    
    // 🆕 NOVO: Verificar se o usuário atual está atendendo ativamente este contato
    if (isCurrentUserAttending(telefone)) return true;
    
    // Manter lógica legada: responsável ou transferido para mim
    return conv.responsavel === currentUserId || conv.assignedUser?.id === currentUserId;
  });
}
```

#### 3. Atualizar Badge de Contagem do Filtro "Responsável"

```typescript
// Badge do filtro "Responsável"
{conversations.filter(c => {
  if (c.isGroup) return false;
  const telefone = (c.phoneNumber || c.id).replace(/[^0-9]/g, '');
  
  // Incluir: atendimentos ativos do usuário atual OU responsáveis legados
  return isCurrentUserAttending(telefone) || 
         c.responsavel === currentUserId || 
         c.assignedUser?.id === currentUserId;
}).length}
```

---

### Fluxo Completo de Exemplo

1. **Usuário Maria responde ao contato João**
   - Sistema registra atendimento ativo: `attending_user_id = Maria`
   - João aparece em "Em Atendimento" (todos veem, com badge "Maria")
   - João aparece em "Responsável" de Maria (apenas Maria vê neste filtro)

2. **Usuário Pedro também logado**
   - Pedro vê João em "Em Atendimento" com badge "Maria atendendo"
   - Pedro NÃO vê João em seu filtro "Responsável"

3. **5 minutos sem interação**
   - Atendimento de Maria expira
   - João sai de "Em Atendimento"
   - João sai de "Responsável" de Maria

4. **João envia nova mensagem**
   - João aparece em "Esperando"
   - Pedro ou qualquer outro usuário pode assumir o atendimento

---

### Benefícios da Implementação

1. **Acesso rápido**: Usuário não precisa ir em "Em Atendimento" e procurar seus contatos
2. **Filtro individual**: Cada usuário vê apenas os contatos que ELE está atendendo
3. **Visibilidade coletiva mantida**: "Em Atendimento" continua mostrando todos para a equipe
4. **Regra de 5 minutos respeitada**: Ao expirar, contato sai automaticamente do filtro

