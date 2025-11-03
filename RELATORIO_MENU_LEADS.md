# 📋 RELATÓRIO DETALHADO - MENU LEADS

**Menu:** LEADS  
**Nota Geral:** ⚠️ **A TESTAR** (Pendente validação completa)  
**Prioridade:** 🔴 **CRÍTICA** (Menu base usado por todos os outros)

---

## 📊 FUNCIONALIDADES MAPEADAS: 34

### ✅ FUNCIONALIDADES IMPLEMENTADAS

1. ✅ Listagem de Leads (Scroll infinito - 50 por vez)
2. ✅ Busca Avançada (texto + operadores > < =)
3. ✅ Filtros por Status
4. ✅ Filtro por Tags
5. ✅ Criação de Lead
6. ✅ Edição de Lead
7. ✅ Exclusão de Lead
8. ✅ Importação CSV
9. ✅ Exportação CSV
10. ✅ Gerenciamento de Tags
11. ✅ Visualização de Avatar (WhatsApp)
12. ✅ Ações Rápidas (Menu)
13. ✅ Abrir Conversa
14. ✅ Criar Agendamento
15. ✅ Criar Tarefa
16. ✅ Paginação Infinita
17. ✅ Sincronização Realtime
18. ✅ Validação Company ID
19. ✅ Validação Importação
20. ✅ Formatação Telefone
21. ✅ Badges Status/Origem
22. ✅ Loading States
23. ✅ Feedback Visual

---

## ⚠️ PROBLEMAS IDENTIFICADOS

### 🔴 CRÍTICOS

1. **Validação de Company ID**
   - **Problema:** Pode faltar validação em algumas operações
   - **Impacto:** Erros silenciosos ou falhas na criação/edição
   - **Arquivo:** `src/pages/Leads.tsx`, `src/components/funil/NovoLeadDialog.tsx`

2. **Performance com Muitos Leads**
   - **Problema:** Limite de 1000 leads pode não ser suficiente
   - **Impacto:** Sistema pode ficar lento com muitos registros
   - **Arquivo:** `src/pages/Leads.tsx` (linha 77)

### 🟡 IMPORTANTES

3. **Avatar do WhatsApp**
   - **Problema:** Edge function pode falhar
   - **Impacto:** Avatares não carregam
   - **Arquivo:** `src/pages/Leads.tsx` (função `buscarFotoPerfil`)

4. **Sincronização Realtime**
   - **Problema:** Pode ter problemas de conexão
   - **Impacto:** Leads não atualizam em tempo real
   - **Arquivo:** `src/hooks/useLeadsSync.ts`

5. **Busca por Valor com Operadores**
   - **Problema:** Pode não funcionar corretamente
   - **Impacto:** Filtros não funcionam
   - **Arquivo:** `src/pages/Leads.tsx` (função `filterLeads`)

---

## 🔧 MICRO-PROMPTS PARA CORREÇÃO

### MICRO-PROMPT 1: Validar Company ID em Todas Operações

```
Verificar e adicionar validação de company_id em todas as operações CRUD do menu Leads:

1. Na função carregarLeads() - adicionar filtro por company_id
2. Na função criar lead - validar se usuário tem company_id antes de criar
3. Na função editar lead - validar company_id do lead antes de editar
4. Na função excluir lead - validar company_id antes de excluir
5. Mostrar mensagem clara se usuário não tiver company_id vinculado

Arquivos a verificar:
- src/pages/Leads.tsx
- src/components/funil/NovoLeadDialog.tsx
- src/components/funil/EditarLeadDialog.tsx
- src/components/funil/ImportarLeadsDialog.tsx

Adicionar tratamento de erro específico: "Você precisa estar vinculado a uma empresa para gerenciar leads"
```

### MICRO-PROMPT 2: Melhorar Performance com Muitos Leads

```
Otimizar carregamento de leads para suportar mais de 1000 registros:

1. Implementar paginação server-side ao invés de client-side
2. Adicionar cache de leads carregados
3. Implementar virtualização de lista (react-window ou similar)
4. Adicionar debounce mais agressivo na busca (500ms)
5. Carregar apenas campos necessários na listagem inicial

Arquivos a modificar:
- src/pages/Leads.tsx (função carregarLeads)
- Adicionar query params para paginação no Supabase
- Limitar campos retornados na query inicial
```

### MICRO-PROMPT 3: Corrigir Avatar do WhatsApp

```
Corrigir busca de avatar do WhatsApp com fallback robusto:

1. Adicionar timeout na chamada da edge function (5s)
2. Melhorar tratamento de erro na função buscarFotoPerfil
3. Adicionar cache de avatares carregados (localStorage)
4. Implementar retry automático (máx 2 tentativas)
5. Garantir que fallback (UI Avatars) sempre funcione

Arquivo: src/pages/Leads.tsx (linhas 458-493)
```

### MICRO-PROMPT 4: Corrigir Sincronização Realtime

```
Melhorar hook useLeadsSync para garantir sincronização estável:

1. Adicionar reconexão automática se canal cair
2. Implementar debounce nas atualizações (evitar spam)
3. Adicionar validação de dados recebidos via realtime
4. Logar erros de conexão para debug
5. Mostrar indicador visual de status de conexão

Arquivo: src/hooks/useLeadsSync.ts
Verificar se canal está configurado corretamente no Supabase
```

### MICRO-PROMPT 5: Corrigir Busca por Valor com Operadores

```
Corrigir função filterLeads para busca por valor com operadores funcionar corretamente:

1. Validar formato da busca (>1000, <500, =3000)
2. Tratar valores com decimais (ex: >1000.50)
3. Validar se valor do lead é numérico antes de comparar
4. Adicionar suporte a >= e <=
5. Melhorar regex de validação do padrão

Arquivo: src/pages/Leads.tsx (função filterLeads, linhas 266-319)
Testar casos:
- Busca: ">1000" deve retornar leads com value > 1000
- Busca: "<500" deve retornar leads com value < 500
- Busca: "=3000" deve retornar leads com value = 3000
```

---

## 📝 CHECKLIST DE VALIDAÇÃO

Após correções, testar:

- [ ] Criar lead sem company_id → deve mostrar erro
- [ ] Criar lead com company_id → deve funcionar
- [ ] Buscar leads com operador ">1000" → deve filtrar corretamente
- [ ] Buscar leads com operador "<500" → deve filtrar corretamente
- [ ] Carregar mais de 1000 leads → deve funcionar sem travar
- [ ] Avatar do WhatsApp deve carregar ou mostrar fallback
- [ ] Sincronização realtime deve funcionar entre abas
- [ ] Editar lead deve validar company_id
- [ ] Excluir lead deve validar company_id
- [ ] Importação CSV deve validar company_id

---

## 🎯 NOTA FINAL ESPERADA: 9.0/10

Após corrigir os 5 problemas identificados, o menu deve estar 100% funcional.

---

**PRÓXIMO PASSO:** Usar os micro-prompts acima em um chat específico para correção do menu Leads.


