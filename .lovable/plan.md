
# Aumentar Limite e Adicionar Indicador de Progresso no Puxar Histórico

## O que muda para o usuario

Ao clicar em **"Puxar Histórico"** na conversa, o usuario verá:
1. Uma **barra de progresso animada** abaixo do header com etapas visuais (ex: "Conectando ao WhatsApp... Buscando mensagens... Salvando no banco...")
2. O botão mostrará o texto dinâmico conforme a etapa atual
3. Ao concluir, um toast de sucesso informará quantas mensagens foram trazidas (com separação de enviadas e recebidas)
4. O limite de busca passa de **50 para 200 mensagens**

## Arquivos que serão alterados

| Arquivo | Ação | Motivo |
|---------|------|--------|
| `supabase/functions/fetch-whatsapp-messages/index.ts` | Editar | Aumentar limite padrão de 50 para 200 e o fallback da estratégia 3 proporcional |
| `src/services/evolutionApi.ts` | Editar | Aumentar `limit` padrão de 50 para 200 na função `getMessages` |
| `src/pages/Conversas.tsx` | Editar | Adicionar estado `restoreProgress` com etapas e atualizar `handleRestoreConversation` |
| `src/components/conversas/ConversationHeader.tsx` | Editar | Receber e exibir o progresso como barra visual com texto de etapa |

## Detalhes Tecnicos

### 1. Novos estados em `Conversas.tsx`

```typescript
const [restoringConversation, setRestoringConversation] = useState(false); // já existe
const [restoreProgress, setRestoreProgress] = useState<{
  step: number;         // 0-100 para a barra
  label: string;        // texto exibido na etapa
} | null>(null);
```

### 2. Fluxo de progresso em `handleRestoreConversation`

```text
Etapa 1 (10%) → "Conectando ao WhatsApp..."
Etapa 2 (35%) → "Buscando 200 mensagens..."
Etapa 3 (70%) → "Processando X mensagens encontradas..."
Etapa 4 (90%) → "Salvando no banco de dados..."
Etapa 5 (100%) → Sucesso → fecha barra
```

### 3. Indicador visual em `ConversationHeader.tsx`

Adicionar uma `<div>` logo abaixo do header (ainda dentro do container fixo) com:
- A barra de progresso usando o componente `<Progress>` do Radix já disponível no projeto
- Texto da etapa atual
- Aparece apenas quando `restoreProgress !== null`

### 4. Ajuste de limites

- **Edge Function** (`fetch-whatsapp-messages`): `limit = 50` → `limit = 200`; estratégia 3 fallback: `Math.min(limit * 10, 500)` → `Math.min(limit * 5, 1000)` para manter proporcional
- **`evolutionApi.ts`**: parâmetro padrão `limit = 50` → `limit = 200`
- **`handleRestoreConversation`**: chamada `getMessages(..., 50)` → `getMessages(..., 200)`

### 5. Props adicionadas ao `ConversationHeader`

```typescript
restoreProgress?: { step: number; label: string } | null;
```

O indicador de progresso será renderizado dentro do próprio header, como uma faixa abaixo dos botões, para não deslocar o layout da conversa.
