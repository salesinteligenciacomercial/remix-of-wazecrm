# ✅ Guia de Teste - Integração CEUSIA CRM com N8n e Evolution API

## 🎯 Objetivo
Validar que as mensagens da Evolution API estão chegando no CRM com dados reais (sem variáveis `{{$json.*}}` não substituídas).

---

## 📋 Pré-requisitos

Antes de testar, verifique:
- ✅ Evolution API configurada e WhatsApp conectado
- ✅ N8n instalado e acessível
- ✅ Webhook da Evolution API apontando para o N8n

---

## 🔧 Passo 1: Configurar o Fluxo N8n (3 Nodes Obrigatórios)

### Node 1: Webhook Trigger
1. Adicione um node "Webhook" no N8n
2. Método: POST
3. Path: `/receber` (ou outro de sua escolha)
4. Copie a URL gerada (ex: `https://seu-n8n.com/webhook/receber`)

### Node 2: Set (CRÍTICO - NÃO PULE ESTE PASSO) ⚠️
1. Adicione um node "Set" conectado ao Webhook
2. Configure os seguintes campos:

**Para Evolution API v2:**
```
numero = {{$json["data"]["message"]["key"]["remoteJid"]}}
mensagem = {{$json["data"]["message"]["conversation"]}}
nome_contato = {{$json["data"]["pushName"]}}
origem = whatsapp
tipo_mensagem = texto
```

**Observação**: Se sua Evolution API usar estrutura diferente, ajuste os caminhos JSON conforme necessário. Teste no N8n executando o workflow manualmente e inspecione o payload recebido.

### Node 3: HTTP Request
1. Adicione um node "HTTP Request" conectado ao "Set"
2. Configure:
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

---

## 🧪 Passo 2: Testar a Integração

### Teste 1: Teste Manual no N8n
1. No N8n, clique em "Execute Workflow"
2. Use este JSON de teste no Webhook Trigger:
   ```json
   {
     "data": {
       "message": {
         "key": { "remoteJid": "5511999999999@s.whatsapp.net" },
         "conversation": "Teste de integração manual"
       },
       "pushName": "Teste Manual"
     }
   }
   ```
3. ✅ **Resultado esperado**: Mensagem aparece no CRM com os dados corretos

### Teste 2: Enviar Mensagem Real do WhatsApp
1. Configure o webhook da Evolution API para apontar para seu N8n
2. Envie uma mensagem do seu WhatsApp para o número conectado
3. ✅ **Resultado esperado**: Mensagem aparece no CRM em tempo real com:
   - Nome do contato correto
   - Número do telefone
   - Texto da mensagem
   - Origem "whatsapp"

---

## ✅ Checklist de Validação

Marque os itens conforme for validando:

- [ ] Node "Set" adicionado e configurado no N8n
- [ ] Variáveis `{{$json.*}}` sendo substituídas corretamente
- [ ] Webhook do N8n retornando status 200 (sucesso)
- [ ] Edge function do Supabase NÃO retornando erro 400
- [ ] Mensagens aparecendo no CRM com dados reais
- [ ] Nome do contato correto (não "{{$json.nome_contato}}")
- [ ] Número do telefone correto (não "{{$json.numero}}")
- [ ] Texto da mensagem correto (não "{{$json.mensagem}}")
- [ ] Toast de notificação aparecendo automaticamente
- [ ] Realtime funcionando (sem precisar recarregar a página)

---

## ❌ Problemas Comuns e Soluções

### Erro 400: "Variáveis não substituídas detectadas"
**Causa**: O node "Set" não foi adicionado ou não está conectado corretamente.
**Solução**: Adicione o node "Set" conforme descrito no Passo 1 e verifique a conexão entre os nodes.

### Mensagens aparecendo com "{{$json.numero}}"
**Causa**: O node "Set" está usando os campos errados ou não está mapeando corretamente.
**Solução**: Revise os caminhos JSON no node "Set" e teste executando o workflow manualmente no N8n para ver o payload real.

### Webhook retornando erro de conexão
**Causa**: URL incorreta ou edge function não está pública.
**Solução**: Verifique se a URL está correta e que `verify_jwt = false` está configurado no `supabase/config.toml`.

### Mensagens não aparecem em tempo real
**Causa**: Realtime não está ativo ou há erro de assinatura.
**Solução**: Recarregue a página do CRM e verifique o console do navegador para erros.

---

## 📊 Logs de Depuração

### Verificar Logs da Edge Function
1. Acesse os logs do Supabase
2. Procure por mensagens com:
   - ✅ "✅ Conversa salva com sucesso"
   - ❌ "❌ Variáveis N8n não substituídas detectadas"

### Verificar Dados no Banco
Execute no console SQL do Supabase:
```sql
SELECT * FROM conversas 
WHERE numero NOT LIKE '%{{%' 
  AND numero NOT LIKE '%$json%'
ORDER BY created_at DESC 
LIMIT 10;
```

Deve retornar apenas mensagens com dados reais.

---

## 🎉 Conclusão

Após completar todos os testes, sua integração estará funcionando corretamente:
- ✅ Mensagens chegando do WhatsApp via Evolution API
- ✅ N8n processando e mapeando os dados corretamente
- ✅ Supabase validando e salvando mensagens reais
- ✅ CRM exibindo conversas em tempo real

**Próximos passos**: Integrar IA para respostas automáticas e suporte a envio de mídia (imagens, áudios, PDFs).
