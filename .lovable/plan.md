

## Diagnóstico do Banco de Dados - Relatório Completo

### Situação Atual Crítica

```text
╔══════════════════════════════════════════════════════════╗
║  BANCO DE DADOS: 22 GB TOTAL                            ║
║                                                          ║
║  Tabela 'conversas':                                     ║
║    - Dados reais:     26 MB  (34.657 registros)          ║
║    - Índices:         32 MB                              ║
║    - TOAST (bloat):   19 GB  ← PROBLEMA AQUI            ║
║                                                          ║
║  Outras tabelas:      ~30 MB (leads, tasks, etc.)        ║
║  Espaço real usado:   ~90 MB                             ║
║  Espaço desperdiçado: ~21.9 GB (99.6% é LIXO)           ║
╠══════════════════════════════════════════════════════════╣
║  Cloud Lovable: $25/$25 + $51.43 recargas = PAUSADO     ║
╚══════════════════════════════════════════════════════════╝
```

### Causa do Problema

Os 19 GB de "bloat" na tabela `conversas` são de registros Base64 antigos que foram deletados anteriormente, mas o PostgreSQL **não liberou o espaço em disco** automaticamente. O `DELETE` marca linhas como mortas, mas o espaço TOAST permanece alocado. Seria necessário um `VACUUM FULL conversas` para recuperar, mas o Lovable Cloud não oferece acesso direto ao terminal do banco.

### O Que NÃO É Possível Fazer

Desconectar do Lovable Cloud **não é possível** uma vez habilitado. O que podemos fazer é **migrar completamente** para seu Supabase self-hosted na VPS.

---

### Plano de Migração: Lovable Cloud → Supabase Self-Hosted (VPS)

#### Fase 1 — Exportar Schema e Dados (~90 MB reais)

1. **Exportar estrutura** (tabelas, funções, triggers, RLS policies) do banco atual usando `pg_dump --schema-only`
2. **Exportar dados** de todas as tabelas (apenas ~90 MB de dados reais)
3. **Exportar Storage** (buckets: conversation-media, lead-attachments, user-avatars, internal-chat-media)

#### Fase 2 — Importar no Supabase Self-Hosted

1. Aplicar schema no Supabase da VPS
2. Importar dados via `pg_restore` ou SQL
3. Recriar buckets de Storage e migrar arquivos
4. Copiar Edge Functions para o Supabase self-hosted
5. Configurar secrets (META_WEBHOOK_VERIFY_TOKEN, EVOLUTION_API_KEY, etc.)

#### Fase 3 — Atualizar Frontend

1. Alterar `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` no `.env` para apontar ao Supabase da VPS
2. Fazer build do frontend (`npm run build`)
3. Deploy do frontend na VPS (Nginx/Apache servindo os arquivos estáticos)

#### Fase 4 — Atualizar Webhooks

1. Reconfigurar webhooks do Meta (WhatsApp/Instagram) para apontar ao novo endpoint na VPS
2. Reconfigurar Evolution API para o novo URL

---

### Por Que o Supabase Self-Hosted é Melhor Para Você

| Aspecto | Lovable Cloud | Supabase Self-Hosted |
|---|---|---|
| Espaço em disco | $25/mês (limitado) | Ilimitado (disco da VPS) |
| Controle do banco | Sem terminal SQL | Acesso total (psql, pg_dump) |
| VACUUM FULL | Não disponível | Pode executar livremente |
| Custo mensal | $25+ com recargas | Já incluso na VPS |
| Edge Functions | Deploy automático | Deploy manual (deno) |
| Storage | Limitado ao plano | Disco da VPS |
| Backups | Limitado | Controle total |

---

### Ação Imediata (Antes da Migração)

Posso tentar recuperar espaço agora mesmo executando uma limpeza dentro do Cloud:
- Recriar a tabela `conversas` com os dados limpos (cria nova tabela, copia dados, troca nomes) — isso eliminaria os 19 GB de bloat
- Isso reduziria o banco de 22 GB para ~90 MB, possivelmente reativando o Cloud temporariamente

### Próximos Passos

Para a migração completa, preciso que você me forneça:
1. **URL do Supabase self-hosted** (ex: `https://supabase.seudominio.com`)
2. **Anon key** do Supabase self-hosted
3. **Service role key** para importação dos dados

Posso começar pela ação imediata de limpeza do bloat agora?

