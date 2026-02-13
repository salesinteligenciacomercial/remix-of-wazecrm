
# Relatorio e Plano: Chatbot Inteligente no Fluxo de Automacao

## Nota de Funcionalidade Atual: 4/10

### O que funciona hoje
- O **editor visual** (drag-and-drop) permite montar fluxos com gatilhos, acoes, condicoes e nos de IA
- Os fluxos sao salvos no banco (`automation_flows`) com nodes/edges
- A Edge Function `executar-fluxo` executa nodes sequencialmente
- O `ia-orchestrator` ja detecta intencao (agendamento vs atendimento) e chama agentes IA
- O webhook (`webhook-conversas`) ja chama o orchestrator automaticamente para mensagens recebidas

### O que NAO funciona / esta incompleto
1. **O fluxo visual NAO e conectado ao webhook** - quando uma mensagem chega, o webhook chama diretamente o `ia-orchestrator`, NUNCA executa os fluxos visuais criados no builder
2. **Execucao sequencial burra** - o `executar-fluxo` percorre TODOS os nodes em sequencia, ignorando as conexoes (edges) entre eles. Nao segue o grafo
3. **Sem suporte a menus interativos** - nao tem node para enviar botoes ou listas clicaveis do WhatsApp
4. **Sem roteamento por departamento** - nao existe logica para direcionar conversa a um usuario/setor especifico
5. **Sem suporte a audio** - o fluxo nao transcreve audios recebidos antes de processar
6. **Sem estado de conversa** - o chatbot nao lembra em que ponto do fluxo o contato esta

---

## Proposta: Chatbot Inteligente Hibrido

A ideia e combinar o melhor dos dois mundos:
- **Menu estruturado** (botoes clicaveis) para navegacao rapida por departamentos
- **IA conversacional** que entende texto livre E audios, sem depender de "digite 1 ou 2"

### Como vai funcionar na pratica

```text
[Cliente envia mensagem] 
    |
    v
[Webhook recebe] --> [Verifica se tem fluxo ativo]
    |
    v
[Envia menu com botoes clicaveis]:
  "Bem-vindo a Empresa X! Como posso ajudar?"
  [Financeiro] [Suporte] [Vendas] [Falar com Atendente]
    |
    v
[Cliente clica OU digita texto livre OU envia audio]
    |
    v
[IA identifica intencao] --> [Roteia para departamento/usuario]
    |
    v
[Agente IA do departamento responde OU transfere para humano]
```

### Recursos do chatbot inteligente
- Botoes clicaveis via WhatsApp Interactive Messages (API oficial suporta ate 3 botoes ou listas com ate 10 opcoes)
- Se o cliente digitar texto livre ao inves de clicar, a IA entende e roteia corretamente
- Audios sao transcritos automaticamente (ja existe `transcrever-audio`) e processados como texto
- O fluxo lembra o estado da conversa (em qual etapa o cliente esta)

---

## Detalhes Tecnicos

### 1. Novo node "Menu Interativo" no builder visual
- Tipo: `interactive_menu`
- Permite configurar: mensagem de boas-vindas, botoes (label + departamento/usuario destino)
- Cada botao gera uma saida diferente no grafo (edge com label)

### 2. Novo node "Roteamento por Departamento"
- Tipo: `route_department`
- Configura departamentos disponiveis e usuario responsavel por cada um
- Quando acionado, atribui a conversa ao usuario correto e notifica

### 3. Tabela `conversation_flow_state` (nova)
Armazena em que ponto do fluxo cada conversa esta:
- `conversation_number` (telefone)
- `flow_id` (qual fluxo)
- `current_node_id` (em qual node esta)
- `context_data` (dados coletados ate o momento)
- `expires_at` (expira apos X minutos de inatividade)

### 4. Atualizar `webhook-conversas`
Antes de chamar o `ia-orchestrator`, verificar:
1. A empresa tem fluxo ativo?
2. Ja existe um `conversation_flow_state` para este numero?
   - Se sim: continuar de onde parou (enviar para o proximo node)
   - Se nao: iniciar o fluxo do primeiro node (gatilho "nova_mensagem")

### 5. Atualizar `executar-fluxo`
- Seguir as **edges** (conexoes) em vez de executar todos os nodes
- Suportar novos tipos: `interactive_menu`, `route_department`
- Suportar transcricao de audio antes de processar IA
- Salvar estado da conversa no `conversation_flow_state`

### 6. Enviar mensagens interativas via WhatsApp
- Atualizar `enviar-whatsapp` para suportar mensagens com botoes (Interactive Messages)
- Formato: `{ tipo_mensagem: "interactive", buttons: [...] }`

### Sequencia de implementacao

1. Criar tabela `conversation_flow_state`
2. Adicionar nodes "Menu Interativo" e "Roteamento" no builder visual
3. Atualizar `executar-fluxo` para seguir o grafo e suportar novos nodes
4. Atualizar `enviar-whatsapp` para suportar mensagens interativas com botoes
5. Atualizar `webhook-conversas` para verificar fluxos ativos e gerenciar estado
6. Integrar transcricao de audio no fluxo (ja existe a funcao)

### Beneficios
- Chatbot que NAO e "programado" rigidamente - a IA entende qualquer mensagem
- Botoes clicaveis para navegacao rapida (melhor UX)
- Roteamento automatico para departamentos/usuarios
- Suporte a audio (transcricao automatica)
- Estado persistente (o chatbot lembra onde o cliente parou)
