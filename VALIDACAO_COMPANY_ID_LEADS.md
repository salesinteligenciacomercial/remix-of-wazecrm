# Validação de Company ID no Menu Leads

**Data de Implementação:** Novembro 2024  
**Status:** ✅ Completo

## 📋 Resumo das Validações Implementadas

Todas as operações CRUD do menu Leads agora validam se o usuário está vinculado a uma empresa (`company_id`) antes de executar qualquer ação.

---

## ✅ Validações Implementadas

### 1. **Função `carregarLeads()` - READ**
**Arquivo:** `src/pages/Leads.tsx`

**Validações:**
- ✅ Verifica se usuário tem `company_id` vinculado
- ✅ Filtra leads apenas pela `company_id` do usuário
- ✅ Mostra mensagem clara se usuário não tiver `company_id`

**Código:**
```typescript
// Validar company_id antes de carregar leads
const companyId = await getCompanyId();

if (!companyId) {
  toast({
    variant: "destructive",
    title: "Acesso restrito",
    description: "Você precisa estar vinculado a uma empresa para gerenciar leads.",
  });
  return;
}

// Carregar apenas leads da empresa do usuário
const { data, error } = await supabase
  .from("leads")
  .select("*")
  .eq("company_id", companyId)
  .order("created_at", { ascending: false });
```

---

### 2. **Função `confirmarExclusao()` - DELETE**
**Arquivo:** `src/pages/Leads.tsx`

**Validações:**
- ✅ Verifica se usuário tem `company_id` vinculado
- ✅ Verifica se o lead pertence à empresa do usuário antes de excluir
- ✅ Exclui apenas se o lead pertencer à empresa do usuário
- ✅ Mostra mensagem de erro se usuário não tiver `company_id`
- ✅ Mostra mensagem de erro se lead não pertencer à empresa do usuário

**Código:**
```typescript
// Validar company_id antes de excluir
const companyId = await getCompanyId();

if (!companyId) {
  toast({
    variant: "destructive",
    title: "Acesso restrito",
    description: "Você precisa estar vinculado a uma empresa para gerenciar leads.",
  });
  return;
}

// Verificar se o lead pertence à empresa do usuário
const { data: leadData } = await supabase
  .from("leads")
  .select("company_id")
  .eq("id", leadParaExcluir.id)
  .maybeSingle();

if (leadData.company_id !== companyId) {
  toast({
    variant: "destructive",
    title: "Acesso negado",
    description: "Você não tem permissão para excluir este lead.",
  });
  return;
}

// Excluir o lead
await supabase
  .from("leads")
  .delete()
  .eq("id", leadParaExcluir.id)
  .eq("company_id", companyId);
```

---

### 3. **Função `handleSubmit()` no EditarLeadDialog - UPDATE**
**Arquivo:** `src/components/funil/EditarLeadDialog.tsx`

**Validações:**
- ✅ Verifica se usuário tem `company_id` vinculado
- ✅ Verifica se o lead pertence à empresa do usuário antes de editar
- ✅ Atualiza apenas se o lead pertencer à empresa do usuário
- ✅ Mostra mensagem de erro se usuário não tiver `company_id`
- ✅ Mostra mensagem de erro se lead não pertencer à empresa do usuário

**Código:**
```typescript
// Validar company_id do usuário
const { data: userRole, error: roleError } = await supabase
  .from("user_roles")
  .select("company_id")
  .eq("user_id", session.user.id)
  .maybeSingle();

if (!userRole?.company_id) {
  toast.error("⚠️ Você precisa estar vinculado a uma empresa para gerenciar leads.");
  return;
}

// Verificar se o lead pertence à empresa do usuário
const { data: leadData } = await supabase
  .from("leads")
  .select("company_id")
  .eq("id", lead.id)
  .maybeSingle();

if (leadData.company_id !== userRole.company_id) {
  toast.error("⚠️ Você não tem permissão para editar este lead.");
  return;
}

// Atualizar o lead
await supabase
  .from("leads")
  .update({ ...dados })
  .eq("id", lead.id)
  .eq("company_id", userRole.company_id);
```

---

### 4. **Função `handleSubmit()` no NovoLeadDialog - CREATE**
**Arquivo:** `src/components/funil/NovoLeadDialog.tsx`

**Validações:**
- ✅ Verifica se usuário tem `company_id` vinculado antes de criar
- ✅ Cria lead apenas se usuário tiver `company_id`
- ✅ Define `company_id` automaticamente no lead criado
- ✅ Mostra mensagem clara se usuário não tiver `company_id`

**Código:**
```typescript
// Validar company_id antes de criar
const { data: userRole, error: roleError } = await supabase
  .from("user_roles")
  .select("company_id")
  .eq("user_id", session.user.id)
  .maybeSingle();

if (!userRole?.company_id) {
  toast.error("⚠️ Você precisa estar vinculado a uma empresa para gerenciar leads.");
  return;
}

// Criar lead com company_id
await supabase
  .from("leads")
  .insert([{
    ...dados,
    company_id: userRole.company_id,
    owner_id: session.user.id,
  }]);
```

---

### 5. **Função `handleImport()` no ImportarLeadsDialog - CREATE (Importação)**
**Arquivo:** `src/components/funil/ImportarLeadsDialog.tsx`

**Validações:**
- ✅ Verifica se usuário tem `company_id` vinculado antes de importar
- ✅ Importa leads apenas se usuário tiver `company_id`
- ✅ Define `company_id` automaticamente em todos os leads importados
- ✅ Mostra mensagem clara se usuário não tiver `company_id`

**Código:**
```typescript
// Validar company_id antes de importar
const { data: userRole, error: roleError } = await supabase
  .from("user_roles")
  .select("company_id")
  .eq("user_id", user.id)
  .maybeSingle();

if (!userRole?.company_id) {
  toast.error("⚠️ Você precisa estar vinculado a uma empresa para gerenciar leads.");
  return;
}

// Importar leads com company_id
const validLeads = processedLeads.map(lead => ({
  ...lead,
  company_id: userRole.company_id,
  owner_id: user.id,
}));

await supabase
  .from("leads")
  .insert(validLeads);
```

---

## 🔒 Mensagens de Erro Padronizadas

Todas as validações usam mensagens claras e consistentes:

**Quando usuário não tem company_id:**
```
⚠️ Você precisa estar vinculado a uma empresa para gerenciar leads.
```

**Quando usuário não tem permissão:**
```
⚠️ Você não tem permissão para [editar/excluir] este lead.
```

**Quando ocorre erro na verificação:**
```
❌ Não foi possível verificar sua empresa. Tente novamente ou contate o suporte.
```

---

## ✅ Arquivos Modificados

1. ✅ `src/pages/Leads.tsx`
   - Função `getCompanyId()` adicionada
   - Validação em `carregarLeads()`
   - Validação em `confirmarExclusao()`

2. ✅ `src/components/funil/EditarLeadDialog.tsx`
   - Validação de `company_id` em `handleSubmit()`
   - Verificação de permissão antes de editar

3. ✅ `src/components/funil/NovoLeadDialog.tsx`
   - Mensagem de erro atualizada para padrão
   - Validação já existia, apenas padronizada

4. ✅ `src/components/funil/ImportarLeadsDialog.tsx`
   - Mensagem de erro atualizada para padrão
   - Validação já existia, apenas padronizada

---

## 🧪 Como Testar

### Teste 1: Usuário sem company_id
1. Faça login com um usuário sem `company_id` vinculado
2. Tente acessar o menu Leads
3. **Esperado:** Mensagem "Você precisa estar vinculado a uma empresa para gerenciar leads"

### Teste 2: Criar Lead sem company_id
1. Faça login com usuário sem `company_id`
2. Tente criar um novo lead
3. **Esperado:** Mensagem de erro impedindo a criação

### Teste 3: Editar Lead de outra empresa
1. Faça login com usuário da Empresa A
2. Tente editar um lead da Empresa B
3. **Esperado:** Mensagem "Você não tem permissão para editar este lead"

### Teste 4: Excluir Lead de outra empresa
1. Faça login com usuário da Empresa A
2. Tente excluir um lead da Empresa B
3. **Esperado:** Mensagem "Você não tem permissão para excluir este lead"

### Teste 5: Carregar Leads
1. Faça login com usuário da Empresa A
2. Acesse o menu Leads
3. **Esperado:** Ver apenas leads da Empresa A

---

## 📝 Notas Importantes

1. **Isolamento de Dados:** Agora cada empresa só vê e gerencia seus próprios leads
2. **Segurança:** Todas as operações verificam `company_id` antes de executar
3. **Mensagens Claras:** Usuários recebem feedback claro sobre restrições de acesso
4. **Consistência:** Todas as mensagens de erro seguem o mesmo padrão

---

## ✅ Status Final

- ✅ **READ (carregarLeads)**: Validado
- ✅ **CREATE (NovoLeadDialog)**: Validado
- ✅ **CREATE (ImportarLeadsDialog)**: Validado
- ✅ **UPDATE (EditarLeadDialog)**: Validado
- ✅ **DELETE (confirmarExclusao)**: Validado

**Todas as operações CRUD do menu Leads estão protegidas com validação de `company_id`!**


