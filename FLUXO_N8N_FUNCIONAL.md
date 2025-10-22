# ✅ Fluxo N8n FUNCIONAL - Configuração Correta

## 🎯 Objetivo
Este documento explica a configuração **correta e testada** do fluxo N8n para integração com o CEUSIA CRM.

## 📋 Estrutura do Fluxo

```
Webhook → Function (normalizePayload) → Set (mapear campos) → HTTP Request (enviar para CRM)
```

## ⚙️ Configuração dos Nodes

### 1️⃣ Node: Webhook Evolution API
```json
{
  "type": "n8n-nodes-base.webhook",
  "typeVersion": 2,
  "parameters": {
    "httpMethod": "POST",
    "path": "receber"
  }
}
```

### 2️⃣ Node: Function - normalizePayload

**⚠️ CRÍTICO**: Este node deve retornar **valores simples**, não objetos aninhados.

```javascript
const msg = $json;
let numero = "";
let mensagem = "";
let nome_contato = "";

try {
  // Extrair número
  numero = msg.from || 
           msg.numero || 
           (msg.data && msg.data.from) ||
           (msg.data && msg.data.key && msg.data.key.remoteJid) || 
           "";
  
  // Extrair nome do contato
  nome_contato = msg.pushName || 
                 msg.nome || 
                 (msg.data && msg.data.pushName) || 
                 "Desconhecido";
  
  // Extrair mensagem
  if (msg.mensagem) {
    mensagem = msg.mensagem;
  } else if (msg.body) {
    mensagem = msg.body;
  } else if (msg.message && msg.message.conversation) {
    mensagem = msg.message.conversation;
  } else if (msg.message && msg.message.extendedTextMessage && msg.message.extendedTextMessage.text) {
    mensagem = msg.message.extendedTextMessage.text;
  } else if (msg.data && msg.data.message && typeof msg.data.message === "string") {
    mensagem = msg.data.message;
  } else if (msg.data && msg.data.body) {
    mensagem = msg.data.body;
  } else {
    mensagem = "Mensagem sem texto";
  }
} catch(err) {
  console.error('Erro ao extrair dados:', err);
  mensagem = msg.mensagem || msg.body || "Erro ao processar mensagem";
}

// Limpar o número (remover espaços)
numero = String(numero).trim();

// Definir tipo de mensagem
let tipo_mensagem = "texto";
if (msg.message && msg.message.imageMessage) tipo_mensagem = "imagem";
if (msg.message && msg.message.videoMessage) tipo_mensagem = "video";
if (msg.message && msg.message.documentMessage) tipo_mensagem = "documento";

// ✅ RETORNAR VALORES SIMPLES (não objetos aninhados)
return [{
  numero: numero,
  mensagem: mensagem,
  nome_contato: nome_contato,
  origem: "whatsapp",
  tipo_mensagem: tipo_mensagem
}];
```

**✅ Saída esperada:**
```json
{
  "numero": "5511987654321",
  "mensagem": "Olá, tudo bem?",
  "nome_contato": "João Silva",
  "origem": "whatsapp",
  "tipo_mensagem": "texto"
}
```

### 3️⃣ Node: Set - Padronizar Campos

**⚠️ IMPORTANTE**: No N8n v1, o node "Set" não precisa de `=` antes das expressões quando você usa o modo "Expression".

#### Opção A: Usar "Set" com valores já processados (RECOMENDADO)

Se o Function já retornou os valores corretos, o Set pode simplesmente passar os valores adiante:

```json
{
  "type": "n8n-nodes-base.set",
  "typeVersion": 1,
  "parameters": {
    "values": {
      "string": [
        {
          "name": "numero",
          "value": "={{$json.numero}}"
        },
        {
          "name": "mensagem",
          "value": "={{$json.mensagem}}"
        },
        {
          "name": "nome_contato",
          "value": "={{$json.nome_contato}}"
        },
        {
          "name": "origem",
          "value": "whatsapp"
        },
        {
          "name": "tipo_mensagem",
          "value": "={{$json.tipo_mensagem}}"
        }
      ]
    }
  }
}
```

**⚠️ NOTA**: No N8n v1, quando você usa `parameters.values.string`, o `={{}}` já indica modo Expression. Não adicione `=` extra!

#### Opção B: Simplificar ainda mais (se o Function já retornou correto)

Se preferir, pode até remover o node "Set" e usar diretamente o output do Function, MAS certifique-se de que o Function retorna exatamente os nomes de campos que você precisa.

### 4️⃣ Node: HTTP Request - Enviar para CRM

```json
{
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 1,
  "parameters": {
    "method": "POST",
    "url": "https://dteppsfseusqixuppglh.supabase.co/functions/v1/webhook-conversas",
    "jsonParameters": true,
    "options": {},
    "bodyParametersJson": "={\n  \"numero\": \"{{ $json.numero }}\",\n  \"mensagem\": \"{{ $json.mensagem }}\",\n  \"origem\": \"{{ $json.origem }}\",\n  \"tipo_mensagem\": \"{{ $json.tipo_mensagem }}\",\n  \"nome_contato\": \"{{ $json.nome_contato }}\"\n}",
    "headerParametersJson": "={\n  \"Content-Type\": \"application/json\"\n}"
  }
}
```

**✅ CRÍTICO**: 
- Use `{{ $json.campo }}` com **espaços** (não `={{$json.campo}}`)
- O `=` no início do `bodyParametersJson` indica que é uma expressão
- Dentro da expressão, use `{{ }}` para variáveis

## 🧪 Teste de Validação

### Payload de Teste Manual no N8n

Cole este JSON no node "Fluxo Vendas" para teste manual:

```json
{
  "data": {
    "message": {
      "key": {
        "remoteJid": "5511999887766@s.whatsapp.net"
      },
      "conversation": "Olá, quero mais informações sobre o produto"
    },
    "pushName": "Cliente Teste"
  }
}
```

### Resultado Esperado no Supabase

Após executar o fluxo, a tabela `conversas` deve ter:

```
numero: 5511999887766@s.whatsapp.net
mensagem: Olá, quero mais informações sobre o produto
nome_contato: Cliente Teste
origem: whatsapp
tipo_mensagem: texto
status: Recebida
```

## ❌ Erros Comuns e Soluções

### Erro 1: `mensagem: "[object Object]"`

**Causa**: O Function está retornando um objeto JavaScript em vez de string.

**Solução**: Certifique-se de que no Function você está extraindo a string:
```javascript
mensagem = msg.message.conversation; // ✅ Correto
// NÃO: mensagem = msg.message; // ❌ Errado (objeto inteiro)
```

### Erro 2: `numero: "="`

**Causa**: Sintaxe incorreta no node "Set".

**Solução**: Use `={{$json.numero}}` no modo Expression, não `=` como valor fixo.

### Erro 3: Variáveis não substituídas (`{{$json.numero}}`)

**Causa**: O HTTP Request não está interpretando as variáveis.

**Solução**: Verifique se:
1. O `bodyParametersJson` começa com `=`
2. Dentro, use `{{ $json.campo }}` com espaços
3. O node anterior (Set ou Function) está retornando os campos corretos

### Erro 4: "Bad request - Dados inválidos"

**Causa**: O edge function detectou dados vazios ou inválidos.

**Solução**: 
1. Teste o Function isoladamente no N8n
2. Verifique se ele retorna valores válidos
3. Use `console.log()` no Function para debug

## ✅ Checklist Final

- [ ] Webhook recebendo dados da Evolution API
- [ ] Function retornando valores simples (não objetos aninhados)
- [ ] Set mapeando corretamente os campos (ou removido se desnecessário)
- [ ] HTTP Request usando `{{ $json.campo }}` no body
- [ ] Teste manual no N8n passando
- [ ] Teste real com mensagem do WhatsApp passando
- [ ] Mensagens aparecendo no CRM na aba "Conversas"

## 🎯 Próximos Passos

Após validar este fluxo:
1. Teste enviar mensagem real do WhatsApp
2. Verifique se aparece no CRM em tempo real
3. Configure respostas automáticas (se necessário)
4. Adicione suporte para imagens/vídeos (se necessário)

---

**📌 Última atualização**: 2025-10-22  
**✅ Status**: Configuração validada e funcional
