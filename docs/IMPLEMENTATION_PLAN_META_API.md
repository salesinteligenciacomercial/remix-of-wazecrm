# Plano de Implementação: Suporte para WhatsApp Business API (Meta)

## 🎯 Objetivo
Adicionar suporte para WhatsApp Business API oficial do Meta, mantendo compatibilidade com Evolution API.

## 📋 Estrutura de Implementação

### 1. Modificações no Banco de Dados

```sql
-- Migration: Adicionar suporte para Meta API
ALTER TABLE whatsapp_connections 
ADD COLUMN IF NOT EXISTS api_provider VARCHAR(20) DEFAULT 'evolution' CHECK (api_provider IN ('evolution', 'meta', 'both')),
ADD COLUMN IF NOT EXISTS meta_app_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS meta_app_secret VARCHAR(255),
ADD COLUMN IF NOT EXISTS meta_phone_number_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS meta_access_token TEXT,
ADD COLUMN IF NOT EXISTS meta_webhook_verify_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS meta_business_account_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS meta_token_expires_at TIMESTAMP WITH TIME ZONE;

-- Índice para busca rápida
CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_api_provider 
ON whatsapp_connections(api_provider, company_id);
```

### 2. Nova Edge Function: `enviar-whatsapp-meta`

**Localização:** `supabase/functions/enviar-whatsapp-meta/index.ts`

**Responsabilidades:**
- Enviar mensagens via WhatsApp Business API oficial
- Gerenciar autenticação OAuth
- Renovar tokens automaticamente
- Suportar templates de mensagem
- Enviar mídia (imagens, áudios, vídeos, documentos)

### 3. Nova Edge Function: `webhook-meta`

**Localização:** `supabase/functions/webhook-meta/index.ts`

**Responsabilidades:**
- Receber webhooks do Meta
- Verificar assinatura do webhook
- Processar eventos (mensagens, status, etc.)
- Transformar formato Meta para formato interno
- Salvar no banco de dados

### 4. Router/Manager de API

**Localização:** `supabase/functions/enviar-whatsapp/index.ts` (modificar)

**Lógica:**
```typescript
async function sendMessage(data: SendMessageData) {
  const connection = await getWhatsAppConnection(data.company_id);
  
  if (connection.api_provider === 'meta') {
    return await sendViaMetaAPI(data, connection);
  } else if (connection.api_provider === 'evolution') {
    return await sendViaEvolutionAPI(data, connection);
  } else if (connection.api_provider === 'both') {
    // Tentar Meta primeiro, fallback para Evolution
    try {
      return await sendViaMetaAPI(data, connection);
    } catch (error) {
      console.warn('Meta API falhou, tentando Evolution:', error);
      return await sendViaEvolutionAPI(data, connection);
    }
  }
}
```

### 5. Modificações no Frontend

**Arquivo:** `src/pages/Configuracoes.tsx` ou novo componente

**Adicionar:**
- Seção de configuração do Meta API
- Campos para App ID, App Secret, Phone Number ID
- Botão para conectar/autenticar
- Status da conexão
- Opção de escolher provider (Evolution/Meta/Both)

### 6. Modificações no Webhook

**Arquivo:** `supabase/functions/webhook-conversas/index.ts`

**Adicionar:**
```typescript
function isMetaAPIPayload(body: any): boolean {
  return body.object === 'whatsapp_business_account' && 
         body.entry && 
         Array.isArray(body.entry);
}

function transformMetaPayload(body: any) {
  // Transformar formato Meta para formato interno
  // Similar ao transformEvolutionPayload
}
```

## 🔐 Autenticação Meta API

### Fluxo OAuth:
1. Usuário clica em "Conectar com Meta"
2. Redireciona para Meta OAuth
3. Usuário autoriza app
4. Recebe código de autorização
5. Troca código por access token
6. Salva token no banco
7. Renova token automaticamente antes de expirar

### Webhook Verification:
```typescript
// GET request para verificar webhook
if (req.method === 'GET') {
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');
  
  if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }
  return new Response('Forbidden', { status: 403 });
}
```

## 📦 Estrutura de Arquivos

```
supabase/functions/
├── enviar-whatsapp/
│   └── index.ts (modificar - adicionar router)
├── enviar-whatsapp-meta/
│   └── index.ts (novo)
├── webhook-conversas/
│   └── index.ts (modificar - adicionar suporte Meta)
└── webhook-meta/
    └── index.ts (novo - webhook dedicado do Meta)

src/
├── pages/
│   ├── Conversas.tsx (sem mudanças necessárias)
│   └── Configuracoes.tsx (adicionar seção Meta)
├── components/
│   └── WhatsAppConnectionConfig.tsx (novo)
└── utils/
    └── whatsappApiManager.ts (novo - abstração)
```

## 🧪 Testes Necessários

1. **Teste de Envio:**
   - Enviar texto via Meta API
   - Enviar mídia via Meta API
   - Enviar template via Meta API
   - Fallback para Evolution se Meta falhar

2. **Teste de Recebimento:**
   - Receber mensagem via webhook Meta
   - Processar status de entrega
   - Processar status de leitura

3. **Teste de Autenticação:**
   - Fluxo OAuth completo
   - Renovação automática de token
   - Tratamento de token expirado

4. **Teste de Integração:**
   - Múltiplas conexões (Evolution + Meta)
   - Alternância entre providers
   - Sincronização de mensagens

## 📚 Recursos Necessários

### Documentação Meta:
- [WhatsApp Business API Docs](https://developers.facebook.com/docs/whatsapp)
- [Cloud API Reference](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Webhooks Guide](https://developers.facebook.com/docs/whatsapp/webhooks)

### Bibliotecas:
- `@supabase/supabase-js` (já existe)
- Fetch API nativo (Deno já tem)
- Crypto API para verificação de webhook

## ⏱️ Timeline Estimado

- **Semana 1:** Estrutura de dados + Edge Functions básicas
- **Semana 2:** Autenticação OAuth + Webhooks
- **Semana 3:** Frontend + Integração completa
- **Semana 4:** Testes + Documentação + Deploy

## ✅ Checklist de Implementação

### Backend:
- [ ] Migration para adicionar campos Meta
- [ ] Edge function `enviar-whatsapp-meta`
- [ ] Edge function `webhook-meta`
- [ ] Modificar `enviar-whatsapp` com router
- [ ] Modificar `webhook-conversas` para suportar Meta
- [ ] Implementar renovação automática de token
- [ ] Implementar verificação de webhook

### Frontend:
- [ ] Componente de configuração Meta API
- [ ] Interface de seleção de provider
- [ ] Fluxo OAuth
- [ ] Indicadores de status
- [ ] Tratamento de erros

### Testes:
- [ ] Testes unitários
- [ ] Testes de integração
- [ ] Testes end-to-end
- [ ] Testes de fallback

### Documentação:
- [ ] Guia de configuração
- [ ] Guia de migração
- [ ] Troubleshooting
- [ ] FAQ

