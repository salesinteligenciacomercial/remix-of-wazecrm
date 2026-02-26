

## Plano: Integrar botão IA das Conversas com o backend (IA Atendimento, IA Agendamento e Fluxo/URA)

### Problema atual

O botão "IA" no header das conversas salva apenas no `localStorage` do navegador — não tem efeito real no backend. O webhook ignora esse estado e usa apenas `ia_configurations.learning_mode` (global). Não há como escolher qual IA usar por conversa.

### Solução

#### 1. Criar tabela `conversation_ai_settings` no banco
Armazena por conversa qual modo de IA está ativo:
- `conversation_id` (text, unique)
- `company_id` (uuid)
- `ai_mode` (text): `'off'` | `'atendimento'` | `'agendamento'` | `'fluxo'` | `'all'`
- `activated_by` (uuid)
- `created_at` / `updated_at`

#### 2. Refatorar botão IA no `ConversationHeader.tsx`
Trocar o botão simples por um **dropdown** com 4 opções:
- ❌ **Desativar IA** — nenhuma IA responde
- 🤖 **IA Atendimento** — só IA de atendimento responde
- 📅 **IA Agendamento** — só IA de agendamento responde
- 🔄 **Fluxo/URA** — ativa apenas fluxos de automação
- ✨ **Todas as IAs** — orchestrator decide qual usar

O estado visual do botão mostra qual modo está ativo.

#### 3. Atualizar `Conversas.tsx`
- Substituir `aiMode` (localStorage) por consulta/gravação na tabela `conversation_ai_settings`
- `toggleAiMode` vira `setConversationAIMode(convId, mode)` que faz upsert no banco
- Carregar o modo ativo ao selecionar uma conversa

#### 4. Atualizar `webhook-conversas/index.ts`
Antes de chamar IA ou fluxo, consultar `conversation_ai_settings`:
- Se `ai_mode = 'off'` → não fazer nada
- Se `ai_mode = 'atendimento'` → chamar só `ia-atendimento`
- Se `ai_mode = 'agendamento'` → chamar só `ia-agendamento`
- Se `ai_mode = 'fluxo'` → só processar fluxos de automação
- Se `ai_mode = 'all'` → usar orchestrator (comportamento atual)
- Se não existe registro → usar lógica atual (global `learning_mode`)

### Arquivos a editar
- **Migration SQL**: criar tabela `conversation_ai_settings` com RLS
- **`src/components/conversas/ConversationHeader.tsx`**: dropdown de modos IA
- **`src/pages/Conversas.tsx`**: integração com banco em vez de localStorage
- **`supabase/functions/webhook-conversas/index.ts`**: respeitar modo por conversa

