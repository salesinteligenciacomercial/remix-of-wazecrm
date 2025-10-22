# 🚀 Guia de Integração CEUSIA CRM com Evolution API + N8n

## 📋 O que foi implementado

✅ **Tabela `conversas` no Supabase** - Armazena todas as mensagens
✅ **Edge Function `webhook-conversas`** - Recebe mensagens do N8n
✅ **Interface Conversas com Realtime** - Atualiza automaticamente quando novas mensagens chegam
✅ **Sincronização bidirecional** - Enviar e receber mensagens

---

## 🔧 Configuração no N8n

### 1️⃣ Configurar Webhook de Recebimento (Evolution API → N8n → CEUSIA CRM)

**Node 1: Webhook Trigger (Evolution API)**
- Adicione um node "Webhook" no N8n
- Configure o webhook da Evolution API para enviar para este endpoint
- Dados esperados da Evolution API:
  ```json
  {
    "data": {
      "message": {
        "key": { "remoteJid": "5511999999999@s.whatsapp.net" },
        "conversation": "Olá, gostaria de saber mais"
      },
      "pushName": "João Silva"
    }
  }
  ```

**Node 2: Set (Mapear Dados da Evolution API)** ⚠️ **CRÍTICO - OBRIGATÓRIO**
- **Nome**: Mapear Dados Evolution
- **Campos a configurar**:
  ```
  numero = {{$json["data"]["message"]["key"]["remoteJid"]}}
  mensagem = {{$json["data"]["message"]["conversation"]}}
  nome_contato = {{$json["data"]["pushName"]}}
  origem = whatsapp
  tipo_mensagem = texto
  ```

> **🔥 IMPORTANTE**: Este node é **obrigatório** para extrair e mapear os dados corretos do webhook da Evolution API. Sem ele, as variáveis não serão substituídas e você receberá erro 400 do Supabase!

**Node 3: HTTP Request (N8n → CEUSIA CRM)**
- **Método**: POST
- **URL**: `https://dteppsfseusqixuppglh.supabase.co/functions/v1/webhook-conversas`
- **Authentication**: None
- **Headers**:
  ```
  Content-Type: application/json
  ```
- **Body (JSON)**:
  ```json
  {
    "numero": "{{ $json.numero }}",
    "mensagem": "{{ $json.mensagem }}",
    "origem": "{{ $json.origem }}",
    "tipo_mensagem": "{{ $json.tipo_mensagem }}",
    "nome_contato": "{{ $json.nome_contato }}"
  }
  ```

> **📌 ATENÇÃO**: 
> - Este webhook é **público** e não requer autenticação
> - As variáveis `{{ $json.* }}` agora vêm do node "Set" anterior com dados reais
> - Se receber erro 400 "variáveis não substituídas", verifique se o node "Set" está conectado corretamente antes deste node

---

### 2️⃣ Configurar Fluxo com IA (Opcional)

**Node 3: OpenAI (Processar com IA)**
- Adicione entre o Webhook e o HTTP Request
- Configure a IA para processar a mensagem
- Responder automaticamente

**Exemplo de Fluxo Completo:**
```
Evolution API → Webhook Trigger → OpenAI → HTTP Request → CEUSIA CRM
```

---

## 🧪 Testando a Integração

### Teste 1: Enviar mensagem via N8n manualmente

Use o seguinte comando cURL para testar (sem autenticação):

```bash
curl -X POST https://dteppsfseusqixuppglh.supabase.co/functions/v1/webhook-conversas \
  -H "Content-Type: application/json" \
  -d '{
    "numero": "5511999999999",
    "mensagem": "Olá! Teste de integração",
    "origem": "WhatsApp",
    "nome_contato": "Teste Cliente"
  }'
```

**Resultado esperado:**
- ✅ Status 200
- ✅ Mensagem aparece na aba "Conversas" do CRM imediatamente
- ✅ Toast de notificação "Nova mensagem recebida do WhatsApp!"

---

### Teste 2: Verificar Realtime

1. Abra a aba "Conversas" no CRM
2. Execute o comando cURL acima
3. A mensagem deve aparecer automaticamente **sem recarregar a página**

---

## 📊 Estrutura da Tabela `conversas`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | ID único da mensagem |
| `numero` | TEXT | Número do contato (WhatsApp) |
| `mensagem` | TEXT | Conteúdo da mensagem |
| `origem` | TEXT | Canal (WhatsApp, Instagram, Facebook) |
| `status` | TEXT | Status (Recebida, Enviada, Lida) |
| `tipo_mensagem` | TEXT | Tipo (text, image, audio, pdf) |
| `midia_url` | TEXT | URL do arquivo de mídia (opcional) |
| `nome_contato` | TEXT | Nome do contato (opcional) |
| `created_at` | TIMESTAMP | Data/hora de criação |
| `updated_at` | TIMESTAMP | Data/hora de atualização |

---

## 🔐 Segurança

- ✅ RLS habilitado na tabela `conversas`
- ✅ CORS configurado na Edge Function
- ✅ Webhook público (sem autenticação JWT) para aceitar chamadas externas do N8n
- ⚠️ **Importante**: O webhook é público por design para aceitar mensagens do N8n. Implemente validações adicionais se necessário.

---

## 🎯 Próximos Passos

### Para integração completa com Evolution API:

1. **Gerar QR Code**
   - Criar tela de configuração em "Configurações → Integrações"
   - Botão "Conectar WhatsApp"
   - Exibir QR Code da Evolution API

2. **Webhook Evolution → N8n**
   - Configurar webhook na Evolution API
   - Endpoint: `https://seu-n8n.com/webhook/evolution`

3. **Enviar Mensagens via Evolution**
   - Criar Edge Function para enviar mensagens
   - Integrar botão "Enviar" com a Evolution API

4. **Suporte a Mídia**
   - Upload de imagens, áudios e PDFs
   - Armazenar no Supabase Storage
   - Enviar via Evolution API

---

## 📞 Suporte

Em caso de dúvidas:
- 📧 suporte@ceusia.com.br
- 💬 WhatsApp: (11) 99999-9999

---

## ✅ Checklist de Implementação

- [x] Tabela `conversas` criada
- [x] Edge Function `webhook-conversas` implementada
- [x] Interface com Realtime configurada
- [x] Salvamento de mensagens enviadas
- [ ] QR Code da Evolution API
- [ ] Envio de mensagens via Evolution
- [ ] Suporte a mídia (imagens, áudios, PDFs)
- [ ] IA Vendedora integrada
