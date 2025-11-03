# 📋 RELATÓRIO DETALHADO - MENU CONVERSAS

**Menu:** CONVERSAS  
**Nota Geral:** ⚠️ **A TESTAR** (Pendente validação completa)  
**Prioridade:** 🔴 **CRÍTICA** (Menu de comunicação principal)

---

## 📊 FUNCIONALIDADES MAPEADAS: 37

### ✅ FUNCIONALIDADES IMPLEMENTADAS

1. ✅ Listagem e Visualização de Conversas
2. ✅ Busca de Conversas
3. ✅ Filtros de Conversas (Status, Canal, Tags)
4. ✅ Visualização de Mensagens
5. ✅ Envio de Mensagens de Texto
6. ✅ Envio de Áudio
7. ✅ Envio de Mídia (Imagens, Vídeos, Documentos)
8. ✅ Transcrição de Áudio
9. ✅ Edição de Mensagens
10. ✅ Reações em Mensagens
11. ✅ Responder Mensagem (Reply)
12. ✅ Mensagens Agendadas
13. ✅ Cancelar Mensagem Agendada
14. ✅ Mensagens Rápidas (Templates)
15. ✅ Criar Mensagem Rápida
16. ✅ Vinculação de Conversa com Lead
17. ✅ Criar Lead Manualmente
18. ✅ Editar Informações do Lead
19. ✅ Adicionar ao Funil de Vendas
20. ✅ Gerenciar Tags
21. ✅ Gerenciar Responsáveis
22. ✅ Criar Tarefa do Lead
23. ✅ Criar Compromisso/Agendamento
24. ✅ Criar Lembrete
25. ✅ Visualizar Perfil do WhatsApp
26. ✅ Sincronização em Tempo Real
27. ✅ Indicadores de Entrega e Leitura
28. ✅ Contador de Mensagens Não Lidas
29. ✅ Notificações de Nova Mensagem
30. ✅ Histórico de Conversas
31. ✅ Deletar Conversa
32. ✅ Integração Global Sync
33. ✅ Workflow Automation

---

## ⚠️ PROBLEMAS IDENTIFICADOS

### 🔴 CRÍTICOS

1. **Sincronização Realtime Instável**
   - **Problema:** Pode ter problemas de conexão/atualização
   - **Impacto:** Mensagens não aparecem em tempo real
   - **Arquivo:** `src/pages/Conversas.tsx` (função `loadSupabaseConversations`)

2. **Vinculação Automática de Leads**
   - **Problema:** Pode não funcionar corretamente
   - **Impacto:** Conversas não vinculam automaticamente com leads
   - **Arquivo:** `src/pages/Conversas.tsx` (função `findOrCreateLead`)

3. **Edge Functions Podem Falhar**
   - **Problema:** `enviar-whatsapp`, `transcrever-audio`, `get-profile-picture` podem falhar
   - **Impacto:** Funcionalidades principais não funcionam
   - **Arquivo:** Múltiplas funções chamam edge functions

### 🟡 IMPORTANTES

4. **Performance com Muitas Conversas**
   - **Problema:** Pode ficar lento com muitas conversas
   - **Impacto:** Interface travando
   - **Arquivo:** `src/pages/Conversas.tsx`

5. **Upload de Mídia Grande**
   - **Problema:** Pode falhar em arquivos grandes
   - **Impacto:** Envio de mídia não funciona
   - **Arquivo:** `src/components/conversas/MediaUpload.tsx`

6. **Transcrição de Áudio com Latência**
   - **Problema:** Pode ter latência ou falhar
   - **Impacto:** Transcrição não aparece
   - **Arquivo:** `src/pages/Conversas.tsx` (função `transcreverAudio`)

---

## 🔧 MICRO-PROMPTS PARA CORREÇÃO

### MICRO-PROMPT 1: Melhorar Sincronização Realtime

```
Corrigir e melhorar sincronização em tempo real de mensagens:

1. Adicionar reconexão automática se canal cair
2. Implementar debounce nas atualizações (evitar spam)
3. Validar dados recebidos via realtime antes de processar
4. Adicionar tratamento de erro específico para falhas de conexão
5. Mostrar indicador visual de status de conexão
6. Logar erros de conexão para debug

Arquivo: src/pages/Conversas.tsx
Função: loadSupabaseConversations (linhas 1647+)
Verificar canais do Supabase Realtime configurados corretamente
```

### MICRO-PROMPT 2: Corrigir Vinculação Automática de Leads

```
Corrigir função findOrCreateLead para vincular conversas automaticamente:

1. Validar número de telefone antes de buscar lead
2. Normalizar número (remover caracteres especiais)
3. Buscar lead por telefone exato e variações
4. Se não encontrar, criar lead automaticamente
5. Vincular conversa ao lead criado/encontrado
6. Adicionar logs para debug de vinculação

Arquivo: src/pages/Conversas.tsx
Função: findOrCreateLead (linhas 3394+)
Função: verificarLeadVinculado (linhas 3486+)
```

### MICRO-PROMPT 3: Melhorar Edge Functions com Retry e Fallback

```
Melhorar chamadas de edge functions com retry e fallback:

1. Adicionar retry automático (máx 3 tentativas) em todas edge functions
2. Adicionar timeout de 10s em cada chamada
3. Implementar fallback quando edge function falhar:
   - enviar-whatsapp: mostrar erro claro
   - transcrever-audio: marcar como "transcrição pendente"
   - get-profile-picture: usar avatar padrão
4. Validar resposta antes de usar
5. Logar erros de edge functions para monitoramento

Arquivos:
- src/pages/Conversas.tsx (múltiplas funções)
- Criar utilitário helper para chamadas de edge function com retry
```

### MICRO-PROMPT 4: Otimizar Performance

```
Otimizar performance do menu Conversas:

1. Implementar virtualização de lista de conversas (react-window)
2. Lazy loading de mensagens (carregar apenas últimas 50)
3. Debounce mais agressivo na busca (500ms)
4. Memoizar componentes de mensagem (MessageItem)
5. Limitar quantidade de conversas carregadas inicialmente
6. Implementar cache de conversas abertas

Arquivo: src/pages/Conversas.tsx
- Usar React.memo em ConversationListItem
- useMemo para filtros e buscas
- Paginação server-side de mensagens
```

### MICRO-PROMPT 5: Melhorar Upload de Mídia

```
Melhorar componente MediaUpload para suportar arquivos grandes:

1. Adicionar validação de tamanho (limite 10MB por padrão)
2. Mostrar progress bar durante upload
3. Comprimir imagens antes de enviar (se > 2MB)
4. Implementar upload em chunks para arquivos grandes
5. Adicionar preview antes de enviar
6. Melhorar tratamento de erro com mensagens claras

Arquivo: src/components/conversas/MediaUpload.tsx
- Adicionar validação de tipo MIME
- Implementar progress tracking
- Usar Supabase Storage com progress callback
```

### MICRO-PROMPT 6: Melhorar Transcrição de Áudio

```
Melhorar sistema de transcrição de áudio:

1. Adicionar indicador visual de "Transcrevendo..."
2. Implementar polling para verificar status de transcrição
3. Adicionar timeout (30s) e mostrar erro se falhar
4. Permitir reenviar transcrição se falhar
5. Salvar status de transcrição (pendente, processando, concluído, erro)
6. Mostrar transcrição quando disponível de forma assíncrona

Arquivo: src/pages/Conversas.tsx
Função: transcreverAudio (linhas 2137+)
- Adicionar status de transcrição na mensagem
- Atualizar UI quando transcrição concluir
```

---

## 📝 CHECKLIST DE VALIDAÇÃO

Após correções, testar:

- [ ] Nova mensagem deve aparecer em tempo real
- [ ] Conversa deve vincular automaticamente com lead existente
- [ ] Criar lead se número não existir
- [ ] Enviar mensagem de texto → deve funcionar
- [ ] Enviar áudio → deve funcionar e transcrever
- [ ] Enviar imagem/vídeo → deve funcionar
- [ ] Upload de arquivo grande → deve mostrar progress
- [ ] Transcrição de áudio → deve aparecer quando pronta
- [ ] Buscar conversas → deve ser rápido
- [ ] Filtros de conversas → devem funcionar
- [ ] Sincronização entre abas → deve funcionar
- [ ] Criar tarefa da conversa → deve funcionar
- [ ] Criar agendamento da conversa → deve funcionar
- [ ] Adicionar ao funil → deve funcionar

---

## 🎯 NOTA FINAL ESPERADA: 8.0/10

Após corrigir os 6 problemas identificados, o menu deve estar funcional.

---

**PRÓXIMO PASSO:** Usar os micro-prompts acima em um chat específico para correção do menu Conversas.


