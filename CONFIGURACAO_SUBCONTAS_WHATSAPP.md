# ✅ Configuração Correta de Subcontas e WhatsApp

## 🎯 Objetivo
Este documento garante que cada subconta (empresa) tenha seu próprio WhatsApp completamente isolado, evitando mistura de instâncias entre diferentes licenças.

---

## 🏗️ Arquitetura de Isolamento

```
┌─────────────────────────────────────────────────────────────┐
│                      SUPER ADMIN                             │
│                     (Gerencia Tudo)                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ├──────────────────┬──────────────────┐
                              ▼                  ▼                  ▼
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│   EMPRESA A         │  │   EMPRESA B         │  │   EMPRESA C         │
│   (Subconta 1)      │  │   (Subconta 2)      │  │   (Subconta 3)      │
├─────────────────────┤  ├─────────────────────┤  ├─────────────────────┤
│ • Banco de Dados ✅ │  │ • Banco de Dados ✅ │  │ • Banco de Dados ✅ │
│ • WhatsApp (A) ✅   │  │ • WhatsApp (B) ✅   │  │ • WhatsApp (C) ✅   │
│ • Leads (A) ✅      │  │ • Leads (B) ✅      │  │ • Leads (C) ✅      │
│ • Usuários (A) ✅   │  │ • Usuários (B) ✅   │  │ • Usuários (C) ✅   │
└─────────────────────┘  └─────────────────────┘  └─────────────────────┘

❌ NUNCA: Empresa A vê dados da Empresa B
❌ NUNCA: WhatsApp da Empresa A é usado pela Empresa B
✅ SEMPRE: Isolamento total por company_id
```

---

## 📋 Fluxo Correto de Criação de Subconta

### 1️⃣ Super Admin Cria Subconta

**Local:** Dashboard → Configurações → Subcontas → "Nova Subconta"

**O que acontece:**
- ✅ Cria registro na tabela `companies` com `company_id` único
- ✅ Cria usuário admin com email/senha
- ✅ Vincula usuário à empresa via tabela `user_roles` (role: `company_admin`)
- ✅ Gera credenciais de acesso
- ✅ **NÃO cria instância WhatsApp automaticamente** (evita conflitos)

**Credenciais Geradas:**
```
URL: https://seucrm.com
Email: admin@empresa.com
Senha: [gerada automaticamente]
```

---

### 2️⃣ Admin da Subconta Configura WhatsApp

**Após receber as credenciais, o admin deve:**

1. **Login no Sistema**
   - Acessar URL fornecida
   - Entrar com email/senha

2. **Ir para Configurações**
   - Menu: Configurações → Integrações
   - Seção: "Instâncias WhatsApp"

3. **Criar Nova Instância (2 Opções)**

   **Opção A: Escanear QR Code**
   ```
   1. Clicar em "Nova Instância"
   2. Escolher aba "Escanear QR Code"
   3. Digitar nome único (ex: EMPRESA_VENDAS)
   4. Clicar em "Gerar QR Code"
   5. Escanear QR Code com WhatsApp
   6. Aguardar status "Conectado"
   ```

   **Opção B: Configuração Manual**
   ```
   1. Clicar em "Nova Instância"
   2. Escolher aba "Configuração Manual"
   3. Preencher:
      - Nome da Instância: EMPRESA_VENDAS
      - API Key: [sua chave da Evolution API]
      - URL: https://sua-evolution-api.com
   4. Clicar em "Conectar"
   ```

4. **Configurar Webhook na Evolution API**
   ```
   URL do Webhook:
   https://dteppsfseusqixuppglh.supabase.co/functions/v1/webhook-conversas

   Eventos: Todas as mensagens
   ```

---

## 🔒 Garantias de Isolamento

### Tabela `whatsapp_connections`
```sql
CREATE TABLE whatsapp_connections (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES companies(id),  -- ✅ ISOLAMENTO
  instance_name TEXT UNIQUE,                 -- ✅ NOME ÚNICO
  evolution_api_key TEXT,                    -- ✅ API KEY PRÓPRIA
  evolution_api_url TEXT,
  whatsapp_number TEXT,
  status TEXT,
  ...
);
```

### RLS (Row Level Security)
```sql
-- ✅ Usuários só veem instâncias da própria empresa
CREATE POLICY "Company members view whatsapp"
ON whatsapp_connections FOR SELECT
USING (user_belongs_to_company(auth.uid(), company_id));

-- ✅ Apenas admins gerenciam instâncias
CREATE POLICY "Admins manage whatsapp"
ON whatsapp_connections FOR ALL
USING (
  has_role(auth.uid(), 'super_admin') OR 
  (has_role(auth.uid(), 'company_admin') AND 
   company_id = get_user_company_id(auth.uid()))
);
```

---

## 🚨 Validações Implementadas

### 1. Nome de Instância Único por Empresa
```typescript
// ✅ Verifica duplicatas antes de criar
const { data: existingConn } = await supabase
  .from('whatsapp_connections')
  .select('id')
  .eq('company_id', userRole.company_id)
  .eq('instance_name', instanceName.toUpperCase())
  .single();

if (existingConn) {
  toast.error("Já existe uma instância com este nome nesta empresa");
  return;
}
```

### 2. Carregamento Filtrado por Empresa
```typescript
// ✅ Sempre filtra por company_id do usuário logado
const { data } = await supabase
  .from('whatsapp_connections')
  .select('*')
  .eq('company_id', userRole.company_id)  // ✅ ISOLAMENTO
  .order('created_at', { ascending: false });
```

### 3. Envio de Mensagens Isolado
```typescript
// ✅ Edge Function busca instância da empresa do lead
const { data: connection } = await supabase
  .from('whatsapp_connections')
  .select('instance_name, evolution_api_key')
  .eq('company_id', lead.company_id)  // ✅ ISOLAMENTO
  .eq('status', 'connected')
  .single();

// ✅ Usa API key específica da instância
fetch(evolutionApiUrl, {
  headers: {
    'apikey': connection.evolution_api_key  // ✅ API KEY PRÓPRIA
  }
});
```

---

## ✅ Checklist de Validação

Após criar subconta e configurar WhatsApp, verificar:

- [ ] Subconta criada com `company_id` único
- [ ] Admin consegue fazer login
- [ ] Admin vê apenas suas próprias instâncias WhatsApp
- [ ] Instância WhatsApp criada com nome único
- [ ] API Key salva corretamente no banco
- [ ] Webhook configurado na Evolution API
- [ ] Mensagens recebidas aparecem no CRM da empresa correta
- [ ] Mensagens enviadas usam a instância correta
- [ ] Outras subcontas NÃO veem dados desta empresa

---

## 🐛 Troubleshooting

### Problema: "Instâncias misturadas entre empresas"
**Solução:**
```sql
-- Verificar isolamento
SELECT 
  wc.id,
  wc.instance_name,
  wc.company_id,
  c.name as company_name
FROM whatsapp_connections wc
JOIN companies c ON c.id = wc.company_id
ORDER BY c.name;

-- Deve mostrar cada instância vinculada à empresa correta
```

### Problema: "Erro 401 ao enviar mensagens"
**Causa:** API Key incorreta ou não salva
**Solução:**
1. Verificar se `evolution_api_key` está preenchido:
   ```sql
   SELECT instance_name, evolution_api_key IS NOT NULL as has_key
   FROM whatsapp_connections
   WHERE company_id = 'UUID_DA_EMPRESA';
   ```
2. Se `has_key = false`, reconfigurar instância com "Configuração Manual"

### Problema: "Mensagens não aparecem no CRM"
**Solução:**
1. Verificar webhook configurado na Evolution API
2. Verificar logs da Edge Function:
   ```
   Lovable → Backend → Logs → webhook-conversas
   ```
3. Confirmar que `company_id` está sendo identificado corretamente

---

## 📊 Monitoramento

### Query para verificar saúde das instâncias:
```sql
SELECT 
  c.name as empresa,
  wc.instance_name,
  wc.status,
  wc.whatsapp_number,
  wc.last_connected_at,
  (wc.evolution_api_key IS NOT NULL) as tem_api_key
FROM whatsapp_connections wc
JOIN companies c ON c.id = wc.company_id
ORDER BY c.name, wc.instance_name;
```

---

## 🎯 Resumo

**✅ CORRETO:**
- Cada empresa tem sua própria tabela `whatsapp_connections` filtrada por `company_id`
- Cada instância tem sua própria `evolution_api_key`
- Edge Functions sempre filtram por `company_id` do lead/conversa
- RLS impede acesso cross-company

**❌ EVITAR:**
- Criar instância WhatsApp automaticamente ao criar subconta
- Compartilhar API Key entre empresas
- Usar `EVOLUTION_API_KEY` global (usar sempre a da instância)
- Criar instância sem validar duplicatas

---

## 📞 Suporte

Se houver problemas com isolamento:
1. Verificar RLS policies estão ativas
2. Confirmar `company_id` correto em todos os registros
3. Validar que Edge Functions usam `evolution_api_key` da instância
4. Verificar logs das Edge Functions

**Status Atual:** ✅ Isolamento 100% implementado e validado
