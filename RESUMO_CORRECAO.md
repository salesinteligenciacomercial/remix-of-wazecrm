# ⚡ Correção Rápida: Fluxo N8n → CEUSIA CRM

## 🎯 O Problema

As variáveis do N8n estão chegando como **texto literal** no Supabase:
```
"={{$json.numero}}" ❌ (errado - com = no início)
```

Deveria chegar como:
```
"5511999999999@s.whatsapp.net" ✅ (correto - valor real)
```

---

## 🔧 Solução em 2 Passos

### **PASSO 1: Corrigir o Node "Enviar para CRM"**

No node **"Enviar para CRM (HTTP Request)"**, mude o Body de:

**❌ ERRADO:**
```json
{
  "numero": "={{$json.numero}}",
  "mensagem": "={{$json.mensagem}}"
}
```

**✅ CORRETO:**
```json
{
  "numero": "{{ $json.numero }}",
  "mensagem": "{{ $json.mensagem }}",
  "origem": "{{ $json.origem }}",
  "tipo_mensagem": "{{ $json.tipo_mensagem }}",
  "nome_contato": "{{ $json.nome_contato }}"
}
```

**Diferença:** Remova o `=` do início e adicione **espaços** dentro das chaves.

---

### **PASSO 2: Verificar o Node "Set"**

No node **"Padronizar Campos (Set)"**, certifique-se de que está em modo **Expression**:

- `numero` = `{{$json["numero"]}}`
- `mensagem` = `{{$json["mensagem"]}}`
- `nome_contato` = `{{$json["nome_contato"]}}`
- `origem` = `whatsapp` (Fixed)
- `tipo_mensagem` = `{{$json["tipo_mensagem"]}}`

**⚠️ Nota:** Se estiver usando N8n v1 do node Set, o `={{` é aceitável **apenas neste node**, mas no HTTP Request deve ser sempre `{{ }}`.

---

## 🧪 Teste Rápido

1. No N8n, clique em **"Execute Workflow"**
2. No node Webhook, use este JSON:
```json
{
  "data": {
    "key": { "remoteJid": "5511999999999@s.whatsapp.net" },
    "message": { "conversation": "Teste CRM" },
    "pushName": "Cliente Teste"
  }
}
```
3. Execute e verifique:
   - ✅ Status 200 no node "Enviar para CRM"
   - ✅ Mensagem aparece na aba "Conversas" do CEUSIA CRM

---

## 📦 Fluxo Corrigido Pronto para Importar

Use o arquivo **`FLUXO_N8N_CORRIGIDO.json`** que foi criado para você.

**Como importar no N8n:**
1. Abra o N8n
2. Clique em "Import from File"
3. Selecione o arquivo `FLUXO_N8N_CORRIGIDO.json`
4. Ative o workflow

---

## ✅ Resultado Final

Após a correção:
- ✅ Mensagens do WhatsApp chegam no CRM em tempo real
- ✅ Dados reais: nome, número, texto
- ✅ Sem erro de "variáveis não substituídas"

---

## 🆘 Ainda com Erro?

Se o erro persistir, verifique:
1. O URL está correto: `https://dteppsfseusqixuppglh.supabase.co/functions/v1/webhook-conversas`
2. O Header `Content-Type: application/json` está configurado
3. O node "Normalizar Dados" está extraindo os campos corretamente

---

**🔑 Regra de Ouro:** No N8n, dentro de JSON strings, sempre use `{{ }}` (com espaços) e nunca `={{}}`.
