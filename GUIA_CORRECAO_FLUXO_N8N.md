# 🔧 Guia de Correção: Fluxo N8n → CEUSIA CRM

## ❌ Problema Atual

As mensagens não estão chegando no CRM porque as variáveis do N8n estão sendo enviadas como **texto literal** em vez de serem **substituídas pelos valores reais**.

**Erro nos logs:**
```
❌ Variáveis N8n não substituídas detectadas: {
  numero: "={{$json.numero}}",
  mensagem: "={{$json.mensagem}}"
}
```

---

## ✅ Solução: Passo a Passo para Corrigir

### **Passo 1: Corrigir o Node "padronizarCampos (Set)"**

Abra o node **"padronizarCampos (Set)"** e configure assim:

| Campo | Modo | Valor Correto |
|-------|------|---------------|
| `numero` | **Expression** | `{{$json["numero"]}}` *(sem o `=` no início)* |
| `mensagem` | **Expression** | `{{$json["mensagem"]}}` |
| `nome_contato` | **Expression** | `{{$json["nome_contato"]}}` |
| `origem` | **Fixed** | `whatsapp` |
| `tipo_mensagem` | **Expression** | `{{$json["tipo_mensagem"]}}` |

**⚠️ IMPORTANTE:**
- Quando usar o modo **Expression**, NÃO adicione `=` no início
- Use apenas `{{$json["campo"]}}` sem o `=`

**Como fazer:**
1. Clique no node "padronizarCampos (Set)"
2. Para cada campo, clique no botão de modo (deve estar em "Expression")
3. Digite apenas: `{{$json["numero"]}}` (sem `=`)
4. Repita para todos os campos

---

### **Passo 2: Corrigir o Node "Enviar para CRM (HTTP Request)"**

Abra o node **"Enviar para CRM (HTTP Request)"** e configure:

**URL:**
```
https://dteppsfseusqixuppglh.supabase.co/functions/v1/webhook-conversas
```

**Method:**
```
POST
```

**Headers:**
```json
{
  "Content-Type": "application/json"
}
```

**Body (JSON/RAW):**

**⚠️ CORREÇÃO CRÍTICA:** Remova o `=` antes das chaves `{{`:

```json
{
  "numero": "{{ $json.numero }}",
  "mensagem": "{{ $json.mensagem }}",
  "origem": "{{ $json.origem }}",
  "tipo_mensagem": "{{ $json.tipo_mensagem }}",
  "nome_contato": "{{ $json.nome_contato }}"
}
```

**✅ Use `{{ }}` (com espaços)**  
**❌ NÃO use `={{}}` (com `=` no início)**

---

### **Passo 3: Estrutura Correta do Fluxo**

```
┌─────────────────┐
│  Fluxo Vendas   │ (Webhook POST /receber)
│   (Webhook)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ normalizePayload│ (Function - extrai dados da Evolution API)
│   (Function)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│padronizarCampos │ ⚠️ CORREÇÃO AQUI: sem `=` nos valores
│     (Set)       │ Use: {{$json["numero"]}} (não ={{)
└────────┬────────┘
         │
         ├─────────────────┐
         │                 │
         ▼                 ▼
┌───────────────┐  ┌──────────────────┐
│Enviar via API │  │Enviar para CRM   │ ⚠️ CORREÇÃO AQUI: {{ }} sem =
│  (WhatsApp)   │  │(HTTP Request)    │ Body: {{ $json.numero }}
└───────────────┘  └──────────────────┘
```

---

## 🧪 Teste de Validação

### **Teste 1: Executar Manualmente no N8n**

1. Clique em **"Execute Workflow"** no N8n
2. No node "Fluxo Vendas" (Webhook), use este JSON de teste:

```json
{
  "data": {
    "key": {
      "remoteJid": "5511999999999@s.whatsapp.net"
    },
    "message": {
      "conversation": "Teste de integração CEUSIA CRM"
    },
    "pushName": "Cliente Teste"
  }
}
```

3. Clique em "Execute Node"
4. **Verifique:**
   - ✅ O node "padronizarCampos (Set)" deve mostrar valores **reais** (não `={{...}}`)
   - ✅ O node "Enviar para CRM" deve retornar **Status 200**
   - ✅ A mensagem deve aparecer na aba **"Conversas"** do CEUSIA CRM

---

### **Teste 2: Enviar Mensagem Real do WhatsApp**

1. Envie uma mensagem do seu WhatsApp para o número conectado à Evolution API
2. Verifique se:
   - ✅ O webhook do N8n foi acionado
   - ✅ A mensagem apareceu no CRM com:
     - Nome do contato correto
     - Número do cliente correto
     - Texto real da mensagem
     - Origem "whatsapp"

---

## ❌ Erros Comuns e Como Evitar

### **Erro 1: "Variáveis não substituídas detectadas"**
**Causa:** Você usou `={{$json.campo}}` em vez de `{{$json.campo}}`  
**Solução:** Remova o `=` do início das expressões

### **Erro 2: Campos vazios no CRM**
**Causa:** O node "Set" não foi configurado corretamente  
**Solução:** Verifique se cada campo está em modo "Expression" e sem o `=`

### **Erro 3: "Cannot read property"**
**Causa:** O node "normalizePayload" não está extraindo os dados corretamente  
**Solução:** Verifique se o payload da Evolution API está chegando no formato esperado

---

## 📋 Checklist Final

Antes de enviar uma mensagem de teste, verifique:

- [ ] Node "padronizarCampos (Set)" está sem `=` nos valores
- [ ] Node "Enviar para CRM" está com `{{ }}` (não `={{}}`)
- [ ] URL do webhook está correta: `https://dteppsfseusqixuppglh.supabase.co/functions/v1/webhook-conversas`
- [ ] Header `Content-Type: application/json` está configurado
- [ ] Node "normalizePayload" está extraindo os campos corretamente

---

## 🎯 Resultado Esperado

Após aplicar as correções:

✅ Mensagens do WhatsApp aparecem no CRM em tempo real  
✅ Dados corretos: nome, número, mensagem  
✅ Status 200 no HTTP Request  
✅ Sem erros de "variáveis não substituídas"  

---

## 🆘 Ainda com Problemas?

Se após seguir este guia você ainda tiver erros:

1. **Exporte o fluxo do N8n** (botão "Download" → formato JSON)
2. **Copie os logs do N8n** do node "Enviar para CRM"
3. **Tire um print** dos campos do node "Set"
4. Envie essas informações para análise detalhada

---

## 📸 Exemplo Visual da Correção

**❌ ERRADO (com `=`):**
```json
{
  "numero": "={{$json.numero}}"
}
```

**✅ CORRETO (sem `=`):**
```json
{
  "numero": "{{ $json.numero }}"
}
```

**Diferença:** O `=` força o N8n a interpretar o valor como uma expressão de string literal, e não como uma variável a ser substituída.

---

**📌 Lembre-se:** No N8n, dentro de strings JSON, sempre use `{{ }}` (com espaços) e **nunca** `={{}}`.
