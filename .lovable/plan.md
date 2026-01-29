
# Sistema de Notificação de Atualizações para Subcontas

## Visão Geral

Implementar um sistema que permite ao Super Admin da conta matriz publicar atualizações/melhorias do sistema, e as subcontas serão notificadas automaticamente sobre essas novidades quando fizerem login no CRM.

## Como Funcionará

1. **Super Admin publica atualização** - Na área de gerenciamento de subcontas, o Super Admin poderá criar anúncios de atualização (changelog)
2. **Subcontas recebem notificação** - Ao fazer login, usuários das subcontas verão um modal/badge informando sobre novas atualizações
3. **Usuário visualiza detalhes** - Podem ver o que foi atualizado/melhorado com descrições claras
4. **Marcar como lido** - Após visualizar, a notificação é marcada como lida

## Componentes da Solução

### 1. Nova Tabela no Banco de Dados

```sql
CREATE TABLE system_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_company_id UUID REFERENCES companies(id) NOT NULL,
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  changes JSONB,  -- Lista detalhada de mudanças
  tipo TEXT DEFAULT 'feature', -- feature, fix, improvement
  published_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE system_update_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  update_id UUID REFERENCES system_updates(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(update_id, user_id)
);
```

### 2. Interface do Super Admin

Novo componente na área de Subcontas para criar/gerenciar atualizações:

- Botão "Publicar Atualização" ao lado de "Aplicar Atualizações"
- Formulário com:
  - Versão (ex: 1.2.0)
  - Título (ex: "Nova funcionalidade de agendamento")
  - Descrição resumida
  - Lista de mudanças (adicionar múltiplos itens)
  - Tipo: Nova Funcionalidade / Correção / Melhoria
- Lista de atualizações já publicadas

### 3. Notificação para Subcontas

- Badge no sino de notificações indicando novas atualizações
- Modal de "Novidades do Sistema" que aparece ao clicar
- Card especial no NotificationCenter para "Atualizações do Sistema"
- Hook `useSystemUpdates` para gerenciar estado

### 4. Modal de Novidades

Quando subconta tiver atualizações não lidas:
- Modal elegante mostrando changelog
- Ícones diferenciados por tipo (rocket para feature, wrench para fix, etc)
- Botão "Entendi" que marca como lido
- Opção "Não mostrar novamente para esta atualização"

## Arquivos a Criar/Modificar

### Novos Arquivos
| Arquivo | Descrição |
|---------|-----------|
| `src/components/configuracoes/SystemUpdatesManager.tsx` | Gerenciador de atualizações (Super Admin) |
| `src/components/configuracoes/NovaAtualizacaoDialog.tsx` | Dialog para criar nova atualização |
| `src/components/updates/SystemUpdatesModal.tsx` | Modal de novidades para subcontas |
| `src/hooks/useSystemUpdates.ts` | Hook para gerenciar atualizações do sistema |

### Arquivos a Modificar
| Arquivo | Modificação |
|---------|-------------|
| `src/components/configuracoes/SubcontasManager.tsx` | Adicionar botão e componente de atualizações |
| `src/components/notifications/NotificationCenter.tsx` | Adicionar grupo de "Atualizações do Sistema" |
| `src/hooks/useNotifications.ts` | Incluir atualizações não lidas na contagem |
| `src/components/layout/MainLayout.tsx` | Montar modal de novidades |

## Fluxo de Uso

```text
Super Admin                          Subconta
    │                                    │
    ├─ Publica atualização v1.2.0        │
    │   "Novo módulo de relatórios"      │
    │                                    │
    │         ────────────────────►      │
    │                                    │
    │                                    ├─ Faz login
    │                                    │
    │                                    ├─ Vê badge no sino
    │                                    │
    │                                    ├─ Abre modal de novidades
    │                                    │
    │                                    ├─ Lê: "Novo módulo de relatórios
    │                                    │       - Dashboard com gráficos
    │                                    │       - Exportar para PDF
    │                                    │       - Filtros avançados"
    │                                    │
    │                                    └─ Clica "Entendi" → marca como lido
```

## Detalhes Técnicos

### RLS Policies

```sql
-- Super Admin pode gerenciar atualizações da sua conta matriz
CREATE POLICY "Master can manage updates" ON system_updates
  FOR ALL USING (
    master_company_id IN (
      SELECT company_id FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- Subcontas podem ler atualizações da matriz
CREATE POLICY "Subaccounts can read updates" ON system_updates
  FOR SELECT USING (
    master_company_id IN (
      SELECT parent_company_id FROM companies c
      JOIN user_roles ur ON ur.company_id = c.id
      WHERE ur.user_id = auth.uid()
    )
  );
```

### Estrutura do JSONB de Mudanças

```json
{
  "changes": [
    {
      "type": "feature",
      "icon": "rocket",
      "text": "Novo dashboard de analytics"
    },
    {
      "type": "improvement", 
      "icon": "zap",
      "text": "Performance 50% melhor nas buscas"
    },
    {
      "type": "fix",
      "icon": "wrench", 
      "text": "Correção no envio de mensagens"
    }
  ]
}
```

## Benefícios

- Comunicação clara entre matriz e subcontas
- Histórico de todas as atualizações
- Rastreamento de quem leu cada atualização
- Engajamento das subcontas com novas funcionalidades
- Profissionalismo na gestão do SaaS
