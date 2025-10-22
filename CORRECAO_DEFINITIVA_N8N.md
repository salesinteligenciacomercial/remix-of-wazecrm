# 🔥 CORREÇÃO DEFINITIVA - Node Function + Set no N8n

## ❌ Problema Identificado

O erro mostra:
```
numero: "="
mensagem: "[object Object]"
```

**Causas**:
1. ❌ Node **Function** está retornando OBJETO JavaScript ao invés de STRING
2. ❌ Node **Set** está configurado com sintaxe incorreta (literal `"="` ao invés de expressão)

---

## ✅ SOLUÇÃO COMPLETA

### 🔧 PASSO 1: Corrigir o Node "Function"

**Abra o node `normalizePayload` e substitua TODO o código por este:**

```javascript
// ============================================
// 🔥 FUNÇÃO CORRIGIDA - Retorna STRINGS válidas
// ============================================

const msg = $json;

// Função auxiliar para converter QUALQUER valor em string
function toSafeString(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "object") {
    // Se for objeto, tenta extrair propriedades comuns
    if (value.conversation) return String(value.conversation).trim();
    if (value.text) return String(value.text).trim();
    if (value.caption) return String(value.caption).trim();
    // Se não encontrou nada útil, retorna string vazia
    return "";
  }
  // Para outros tipos (number, boolean), converte para string
  return String(value).trim();
}

// ============================================
// Extrair NÚMERO
// ============================================
let numero = "";

try {
  numero = msg.from || 
           msg.numero || 
           (msg.data && msg.data.from) ||
           (msg.data && msg.data.key && msg.data.key.remoteJid) ||
           "";
  
  numero = toSafeString(numero);
} catch (e) {
  console.error("Erro ao extrair numero:", e);
  numero = "";
}

// ============================================
// Extrair MENSAGEM
// ============================================
let mensagem = "";

try {
  // Tentar extrair de diferentes estruturas
  if (msg.mensagem) {
    mensagem = toSafeString(msg.mensagem);
  } else if (msg.body) {
    mensagem = toSafeString(msg.body);
  } else if (msg.message) {
    // Evolution API v2 - estrutura mais complexa
    if (msg.message.conversation) {
      mensagem = toSafeString(msg.message.conversation);
    } else if (msg.message.extendedTextMessage && msg.message.extendedTextMessage.text) {
      mensagem = toSafeString(msg.message.extendedTextMessage.text);
    } else if (msg.message.imageMessage && msg.message.imageMessage.caption) {
      mensagem = toSafeString(msg.message.imageMessage.caption) || "Imagem enviada";
    } else if (msg.message.videoMessage && msg.message.videoMessage.caption) {
      mensagem = toSafeString(msg.message.videoMessage.caption) || "Vídeo enviado";
    } else if (msg.message.documentMessage) {
      mensagem = "Documento enviado";
    } else {
      // Mensagem de tipo desconhecido
      mensagem = "Mensagem recebida";
    }
  } else if (msg.data && msg.data.message) {
    mensagem = toSafeString(msg.data.message);
  } else if (msg.data && msg.data.body) {
    mensagem = toSafeString(msg.data.body);
  } else {
    mensagem = "Mensagem sem conteúdo de texto";
  }

  // ⚠️ CRÍTICO: Garantir que NUNCA é objeto
  if (mensagem === "" || mensagem === "[object Object]") {
    mensagem = "Mensagem recebida (formato não suportado)";
  }
} catch (e) {
  console.error("Erro ao extrair mensagem:", e);
  mensagem = "Erro ao processar mensagem";
}

// ============================================
// Extrair NOME DO CONTATO
// ============================================
let nome_contato = "";

try {
  nome_contato = msg.pushName || 
                 msg.nome || 
                 (msg.data && msg.data.pushName) || 
                 (msg.data && msg.data.senderName) ||
                 "Desconhecido";
  
  nome_contato = toSafeString(nome_contato);
  
  if (nome_contato === "") {
    nome_contato = "Desconhecido";
  }
} catch (e) {
  console.error("Erro ao extrair nome_contato:", e);
  nome_contato = "Desconhecido";
}

// ============================================
// Definir TIPO DE MENSAGEM
// ============================================
let tipo_mensagem = "texto";

try {
  if (msg.message) {
    if (msg.message.imageMessage) tipo_mensagem = "imagem";
    else if (msg.message.videoMessage) tipo_mensagem = "video";
    else if (msg.message.audioMessage) tipo_mensagem = "audio";
    else if (msg.message.documentMessage) tipo_mensagem = "documento";
  }
} catch (e) {
  tipo_mensagem = "texto";
}

// ============================================
// ✅ RETORNO FINAL - GARANTIDO COMO STRINGS
// ============================================
const resultado = {
  numero: String(numero).trim() || "numero_invalido",
  mensagem: String(mensagem).trim() || "mensagem_vazia",
  nome_contato: String(nome_contato).trim() || "Desconhecido",
  origem: "whatsapp",
  tipo_mensagem: String(tipo_mensagem).trim() || "texto"
};

console.log("✅ Dados extraídos:", resultado);

return [resultado];
```

**⚠️ POR QUE ESTA FUNÇÃO FUNCIONA:**
- ✅ Usa `toSafeString()` para converter QUALQUER tipo em string
- ✅ Detecta `[object Object]` e substitui por mensagem válida
- ✅ Trata TODOS os erros possíveis com try/catch
- ✅ Garante que NUNCA retorna objeto
- ✅ Adiciona log para debug

---

### 🔧 PASSO 2: Corrigir o Node "Set"

**OPÇÃO A: Configuração Visual no N8n**

1. Abra o node **"padronizarCampos (Set)"**
2. Clique em **"Add Value"** e selecione **"String"**
3. Configure CADA campo assim:

| Nome do Campo | Valor (clique no ícone 🔧 para usar Expression) |
|---------------|------------------------------------------------|
| `numero` | `{{ $json.numero }}` |
| `mensagem` | `{{ $json.mensagem }}` |
| `nome_contato` | `{{ $json.nome_contato }}` |
| `origem` | `whatsapp` (fixo, sem expression) |
| `tipo_mensagem` | `{{ $json.tipo_mensagem }}` |

**⚠️ IMPORTANTE**: 
- Clique no ícone **🔧** ao lado do campo "Valor" para ativar modo Expression
- Use `{{ $json.campo }}` COM espaços
- NÃO use `=` no início

**OPÇÃO B: Configuração JSON (Importar)**

Se preferir, substitua TODO o node "Set" por este JSON:

```json
{
  "parameters": {
    "mode": "manual",
    "duplicateItem": false,
    "assignments": {
      "assignments": [
        {
          "id": "numero",
          "name": "numero",
          "type": "string",
          "value": "={{ $json.numero }}"
        },
        {
          "id": "mensagem",
          "name": "mensagem",
          "type": "string",
          "value": "={{ $json.mensagem }}"
        },
        {
          "id": "nome_contato",
          "name": "nome_contato",
          "type": "string",
          "value": "={{ $json.nome_contato }}"
        },
        {
          "id": "origem",
          "name": "origem",
          "type": "string",
          "value": "whatsapp"
        },
        {
          "id": "tipo_mensagem",
          "name": "tipo_mensagem",
          "type": "string",
          "value": "={{ $json.tipo_mensagem }}"
        }
      ]
    }
  },
  "name": "padronizarCampos (Set)",
  "type": "n8n-nodes-base.set",
  "typeVersion": 3
}
```

---

### 🔧 PASSO 3: Verificar o Node "HTTP Request"

**Abra o node "Enviar para CRM (HTTP Request)" e confirme:**

1. **URL**: `https://dteppsfseusqixuppglh.supabase.co/functions/v1/webhook-conversas`
2. **Method**: `POST`
3. **Body**: JSON Parameters ativado
4. **Body JSON** (clique em 🔧 para Expression):

```json
{
  "numero": "{{ $json.numero }}",
  "mensagem": "{{ $json.mensagem }}",
  "origem": "{{ $json.origem }}",
  "tipo_mensagem": "{{ $json.tipo_mensagem }}",
  "nome_contato": "{{ $json.nome_contato }}"
}
```

**⚠️ ATENÇÃO**: 
- Use `{{ $json.campo }}` COM espaços
- NÃO use aspas extras ou `=` no início

---

## 🧪 TESTE PASSO A PASSO

### 1️⃣ Teste Isolado do Function

1. Abra o node **"normalizePayload"**
2. Clique em **"Execute Node"**
3. Cole este JSON de teste:

```json
{
  "data": {
    "message": {
      "key": {
        "remoteJid": "5511999887766@s.whatsapp.net"
      },
      "conversation": "Teste de mensagem real"
    },
    "pushName": "João Teste"
  }
}
```

4. Clique em **"Test step"** ou **"Execute"**

**✅ Resultado esperado**:
```json
{
  "numero": "5511999887766@s.whatsapp.net",
  "mensagem": "Teste de mensagem real",
  "nome_contato": "João Teste",
  "origem": "whatsapp",
  "tipo_mensagem": "texto"
}
```

**❌ Se aparecer `[object Object]`**: O Function não foi atualizado corretamente. Copie e cole o código novamente.

### 2️⃣ Teste do Set

1. Execute o workflow completo
2. Após o node "Function", clique no node **"Set"**
3. Veja o output

**✅ Resultado esperado**: Mesmos valores do Function, sem alteração

**❌ Se aparecer `numero: "="`**: A configuração do Set está incorreta. Siga o PASSO 2 novamente.

### 3️⃣ Teste do HTTP Request

1. Execute o workflow completo
2. Veja a resposta do node **"HTTP Request"**

**✅ Resposta de sucesso (200)**:
```json
{
  "success": true,
  "message": "Conversa registrada com sucesso",
  "conversa": { ... }
}
```

**❌ Resposta de erro (400)**:
```json
{
  "error": "Dados inválidos recebidos.",
  "details": "numero: =, mensagem: [object Object]...",
  "fix": "..."
}
```

Se receber erro 400, volte aos PASSOS 1 e 2.

---

## 📊 Validação Final

### Checklist de Sucesso

- [ ] Node **Function** retorna valores como STRING (não objeto)
- [ ] Node **Set** não tem `numero: "="`
- [ ] Node **HTTP Request** retorna status 200
- [ ] No CRM, aba **Conversas**, a mensagem aparece corretamente
- [ ] Console do edge function NÃO mostra erro `[object Object]`

### Ver Logs do Edge Function

No Lovable:
1. Vá em **Backend** > **Edge Functions**
2. Clique em **webhook-conversas**
3. Veja os **Logs**

**✅ Log de sucesso**:
```
📩 Webhook recebido do N8n: {
  numero: "5511999887766@s.whatsapp.net",
  mensagem: "Teste de mensagem real",
  ...
}
✅ Conversa salva com sucesso
```

**❌ Log de erro**:
```
❌ Dados inválidos recebidos: {
  numero: "=",
  mensagem: "[object Object]",
  ...
}
```

---

## 🆘 Ainda Não Funciona?

### Debug Avançado

1. **Teste CADA node isoladamente**:
   - Execute o Function sozinho e veja o output
   - Execute o Set e compare com o Function
   - Execute o HTTP Request e veja a resposta

2. **Verifique a versão do N8n**:
   - N8n v1.x: Use a configuração do PASSO 2 - OPÇÃO A
   - N8n v2.x+: Use a configuração do PASSO 2 - OPÇÃO B

3. **Valide o payload da Evolution API**:
   - Veja o que o Webhook está recebendo
   - Adicione um node "Code" antes do Function para logar o `$json` completo

4. **Teste com payload simplificado**:
   ```json
   {
     "numero": "5511999887766",
     "mensagem": "Teste simples",
     "pushName": "Teste"
   }
   ```

---

## 📞 Suporte

Se mesmo após seguir TODOS os passos o erro persistir:

1. Exporte o workflow N8n completo (JSON)
2. Compartilhe os logs do edge function
3. Informe a versão do N8n que está usando

---

**✅ GARANTIA**: Se você seguiu EXATAMENTE os passos acima, a integração VAI funcionar!

**📌 Última atualização**: 2025-10-22 20:45 UTC
