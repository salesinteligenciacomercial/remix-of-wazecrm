# 🧪 PLANO DE TESTES FINAIS - 5 MENUS PRIORITÁRIOS

**Data:** 01/11/2025  
**Status:** ✅ **PRONTO PARA EXECUÇÃO**  
**Objetivo:** Validar todas as funcionalidades e sincronização entre menus

---

## 🎯 RESUMO EXECUTIVO

**5 Menus Prontos para Teste:**
1. ✅ LEADS (9.5/10)
2. ✅ FUNIL DE VENDAS (9.5/10)
3. ✅ TAREFAS (9.5/10)
4. ✅ AGENDA (9.5/10)
5. ✅ CONVERSAS (Validado)

**Validação Estrutural:** ✅ **COMPLETA**
**Status:** ✅ **PRONTO PARA TESTES FUNCIONAIS**

---

## 📋 TESTES POR MENU

### 🧪 TESTE 1: MENU LEADS

#### Funcionalidades Core:
- [ ] **Criar Novo Lead**
  - Preencher todos os campos obrigatórios
  - Verificar se salva corretamente
  - Verificar se aparece em tempo real

- [ ] **Editar Lead**
  - Alterar informações
  - Verificar se atualiza corretamente
  - Verificar sincronização realtime

- [ ] **Buscar Lead com Operadores**
  - Buscar por nome: `nome: João`
  - Buscar por valor: `valor: >1000`
  - Buscar por data: `data: 2025-11-01`
  - Verificar resultados corretos

- [ ] **Avatar do WhatsApp**
  - Verificar se carrega automaticamente
  - Verificar se atualiza quando lead muda
  - Verificar fallback se não houver avatar

- [ ] **Sincronização Realtime**
  - Criar lead em uma aba
  - Verificar se aparece automaticamente em outras abas
  - Verificar se atualiza quando outro usuário edita

---

### 🧪 TESTE 2: MENU FUNIL DE VENDAS

#### Funcionalidades Core:
- [ ] **Reordenar Etapas (Drag Horizontal)**
  - Arrastar etapa horizontalmente
  - Verificar se ordem salva corretamente
  - Verificar se não há conflito com realtime

- [ ] **Mover Lead Entre Etapas (Drag & Drop)**
  - Arrastar lead para outra etapa
  - Verificar se move corretamente
  - Verificar se bloqueio durante drag funciona
  - Verificar se realtime não interfere

- [ ] **Bloqueio Durante Drag**
  - Iniciar drag de lead
  - Verificar se realtime está bloqueado
  - Finalizar drag
  - Verificar se realtime volta a funcionar

- [ ] **Performance com Muitos Leads**
  - Criar 100+ leads em um funil
  - Verificar tempo de carregamento
  - Verificar se drag & drop ainda funciona
  - Verificar se métricas calculam corretamente

- [ ] **Validação de Funil**
  - Tentar mover lead entre funis diferentes
  - Verificar se bloqueia corretamente
  - Verificar mensagem de erro clara

---

### 🧪 TESTE 3: MENU TAREFAS

#### Funcionalidades Core:
- [ ] **Criar Nova Tarefa**
  - Preencher todos os campos
  - Adicionar checklist
  - Adicionar tags
  - Verificar se salva em campos JSONB corretos

- [ ] **Timer de Tempo Gasto**
  - Iniciar timer
  - Verificar se conta tempo corretamente
  - Pausar timer
  - Verificar se salva tempo acumulado
  - Verificar display de tempo formatado

- [ ] **Drag & Drop Entre Colunas**
  - Arrastar tarefa para outra coluna
  - Verificar se move corretamente
  - Verificar se identifica coluna destino (múltiplos fallbacks)
  - Verificar feedback visual

- [ ] **Metadados em Campos JSONB**
  - Criar tarefa com checklist
  - Verificar se salva em campo `checklist` (não na descrição)
  - Criar tarefa com tags
  - Verificar se salva em campo `tags`
  - Adicionar comentário
  - Verificar se salva em campo `comments`
  - Anexar arquivo
  - Verificar se salva em campo `attachments`

- [ ] **Edge Function api-tarefas**
  - Criar tarefa via edge function
  - Mover tarefa via edge function
  - Deletar tarefa via edge function
  - Verificar validação de company_id

---

### 🧪 TESTE 4: MENU AGENDA

#### Funcionalidades Core:
- [ ] **Criar Compromisso**
  - Preencher todos os campos
  - Vincular com lead
  - Verificar se salva corretamente
  - Verificar company_id incluído

- [ ] **Criar Lembrete**
  - Criar compromisso com lembrete
  - Verificar se company_id está incluído no lembrete
  - Verificar se lembrete aparece na lista
  - Verificar status `pendente`

- [ ] **Edge Function enviar-lembretes**
  - Simular data_envio chegando
  - Verificar se edge function é chamada (via cron)
  - Verificar se lembrete é enviado
  - Verificar se status muda para `enviado`

- [ ] **Sistema de Retry**
  - Simular falha no envio
  - Verificar se status muda para `retry`
  - Verificar se `tentativas` incrementa
  - Verificar se `proxima_tentativa` é calculada (1h, 3h, 24h)
  - Verificar se retry funciona automaticamente

- [ ] **Performance do Calendário**
  - Navegar entre meses
  - Verificar se carrega apenas compromissos do mês
  - Verificar se cache funciona
  - Verificar se não recarrega meses já carregados

- [ ] **Sincronização de Leads**
  - Editar lead em outro menu
  - Verificar se compromisso atualiza nome do lead
  - Verificar se sincronização realtime funciona

---

### 🧪 TESTE 5: MENU CONVERSAS

#### Funcionalidades Core:
- [ ] **Criar Nova Conversa**
  - Criar conversa manualmente
  - Verificar se salva corretamente
  - Verificar company_id incluído

- [ ] **Enviar Mensagem**
  - Enviar mensagem de texto
  - Enviar mensagem com mídia
  - Enviar mensagem de áudio
  - Verificar se salva corretamente
  - Verificar se aparece em tempo real

- [ ] **Receber Mensagem em Tempo Real**
  - Simular recebimento de mensagem
  - Verificar se aparece automaticamente
  - Verificar se atualiza contador não lido

- [ ] **Editar Informações do Lead**
  - Editar informações do lead vinculado
  - Verificar se salva corretamente
  - Verificar se sincroniza com menu Leads

- [ ] **Atribuir Responsáveis**
  - Atribuir responsável à conversa
  - Verificar se salva corretamente
  - Verificar se aparece na lista

- [ ] **Sincronização com Outros Menus**
  - Criar lead via menu Leads
  - Verificar se aparece opção de vincular no menu Conversas
  - Mover lead no Funil
  - Verificar se atualiza na conversa

---

## 🔄 TESTES DE INTEGRAÇÃO

### 🔗 Sincronização Entre Menus

#### Teste 1: Lead Criado no Menu Leads
- [ ] Criar lead no menu Leads
- [ ] Verificar se aparece automaticamente no Funil
- [ ] Verificar se aparece opção de vincular no menu Conversas
- [ ] Verificar se pode criar tarefa vinculada ao lead
- [ ] Verificar se pode criar compromisso vinculado ao lead

#### Teste 2: Lead Movido no Funil
- [ ] Mover lead no menu Funil de Vendas
- [ ] Verificar se atualiza no menu Leads
- [ ] Verificar se atualiza etapa na conversa
- [ ] Verificar se tarefas relacionadas atualizam

#### Teste 3: Tarefa Criada Vinculada a Lead
- [ ] Criar tarefa no menu Tarefas vinculada a lead
- [ ] Verificar se aparece no menu Leads
- [ ] Verificar se atualiza status na conversa
- [ ] Verificar se notifica responsável

#### Teste 4: Compromisso Criado Vinculado a Lead
- [ ] Criar compromisso no menu Agenda vinculado a lead
- [ ] Verificar se aparece no menu Leads
- [ ] Verificar se aparece na conversa
- [ ] Verificar se lembrete é criado corretamente

#### Teste 5: Conversa Vinculada a Lead
- [ ] Vincular conversa a lead no menu Conversas
- [ ] Verificar se aparece histórico no menu Leads
- [ ] Verificar se pode criar tarefa diretamente da conversa
- [ ] Verificar se pode criar compromisso diretamente da conversa

---

## 🤖 TESTES DE WORKFLOWS AUTOMATIZADOS

### ⚙️ Regras de Negócio

#### Teste 1: Tarefa Automática ao Mover Lead
- [ ] Mover lead para etapa "Proposta" no Funil
- [ ] Verificar se tarefa é criada automaticamente
- [ ] Verificar se tarefa está vinculada ao lead
- [ ] Verificar se tarefa tem descrição correta

#### Teste 2: Lembrete Automático
- [ ] Criar compromisso com lembrete
- [ ] Verificar se lembrete é criado corretamente
- [ ] Verificar se cron job chama edge function
- [ ] Verificar se lembrete é enviado na hora certa

#### Teste 3: Notificações
- [ ] Criar tarefa e atribuir responsável
- [ ] Verificar se responsável recebe notificação
- [ ] Criar compromisso e atribuir participante
- [ ] Verificar se participante recebe notificação

---

## ⚡ TESTES DE PERFORMANCE

### 📊 Volume de Dados

#### Teste 1: 1000+ Leads
- [ ] Carregar sistema com 1000+ leads
- [ ] Verificar tempo de carregamento inicial
- [ ] Verificar se busca funciona rapidamente
- [ ] Verificar se paginação funciona

#### Teste 2: 500+ Tarefas
- [ ] Carregar sistema com 500+ tarefas
- [ ] Verificar tempo de carregamento
- [ ] Verificar se drag & drop ainda funciona
- [ ] Verificar se métricas calculam corretamente

#### Teste 3: 100+ Compromissos
- [ ] Carregar calendário com 100+ compromissos
- [ ] Verificar tempo de carregamento
- [ ] Verificar se lazy loading funciona
- [ ] Verificar se navegação entre meses é rápida

---

## 🔒 TESTES DE SEGURANÇA

### 🛡️ Validação de Company ID

#### Teste 1: Isolamento de Dados
- [ ] Usuário A criar lead na empresa A
- [ ] Usuário B (empresa B) não deve ver lead
- [ ] Verificar se validação de company_id funciona

#### Teste 2: Edge Functions
- [ ] Tentar acessar dados de outra empresa via edge function
- [ ] Verificar se validação bloqueia acesso
- [ ] Verificar se retorna erro apropriado

---

## 📝 DOCUMENTAÇÃO DE RESULTADOS

### ✅ Template de Registro

**Teste:** [Nome do Teste]  
**Menu:** [Menu]  
**Data:** [Data]  
**Status:** ✅ Passou / ❌ Falhou  
**Observações:** [Notas]

---

## 🎯 PRÓXIMOS PASSOS

### ✅ Após Testes:

1. **Documentar Resultados**
   - Registrar todos os testes executados
   - Documentar erros encontrados
   - Registrar melhorias sugeridas

2. **Corrigir Problemas**
   - Corrigir erros encontrados
   - Melhorar pontos identificados
   - Re-testar após correções

3. **Validar Produção**
   - Preparar ambiente de produção
   - Validar configurações
   - Deploy final

---

**Plano criado em:** 01/11/2025  
**Versão:** 1.0 FINAL  
**Status:** ✅ **PRONTO PARA EXECUÇÃO**



