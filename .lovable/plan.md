

# Correção: Disparo em Massa Congela Após 1 Mensagem

## Problema Identificado

Dois problemas críticos:

1. **Edge Function não está registrada** no `config.toml` — nunca foi deployada, então a chamada falha silenciosamente
2. **Timeout da Edge Function** — Supabase Edge Functions têm limite de ~60-150s de execução. Com 50 leads e delay de 7s entre mensagens, seriam ~350s — a função morre antes de terminar

Por isso: envia 1 mensagem, a função é terminada pelo timeout, e o progresso congela em "1 de 50".

## Solução: Processamento em Lotes com Auto-Reinvocação

A Edge Function será reescrita para processar **um lote pequeno** de leads (ex: 5 por vez) e depois **se reinvocar automaticamente** para o próximo lote, evitando o timeout.

```text
Chamada 1 → processa leads 0-4 → salva progresso → chama a si mesma
Chamada 2 → processa leads 5-9 → salva progresso → chama a si mesma
...
Chamada N → processa últimos leads → marca como completed
```

## Alterações

### 1. Registrar no `config.toml`
Adicionar entrada `[functions.disparo-em-massa]` com `verify_jwt = false` (pois precisa se auto-invocar sem JWT do usuário, e a autenticação é feita via campaign_id)

### 2. Reescrever `supabase/functions/disparo-em-massa/index.ts`
- Processar no máximo **5 leads por invocação** (bem dentro do timeout)
- Após processar o lote, atualizar `sent_count` no banco
- Se ainda houver leads restantes, fazer `fetch()` para si mesma com o mesmo `campaign_id`
- A função lê `sent_count` do banco para saber de onde continuar (já existe no código atual via `startIndex = sentCount`)
- Retornar resposta imediatamente ao cliente na primeira chamada

### 3. Ajustar `DisparoEmMassa.tsx`
- Nenhuma mudança significativa necessária — o Realtime subscription já monitora o progresso
- Apenas garantir que o `invoke` não espere a resposta completa (já usa fire-and-forget)

## Detalhes Técnicos

**Lote por invocação**: 5 leads (com delay de 7s = ~35s por lote, bem dentro do limite)

**Auto-reinvocação**: Usa `fetch()` direto para a URL da própria função com `Authorization: Bearer SERVICE_ROLE_KEY`, sem aguardar resposta (fire-and-forget)

**Segurança**: A função valida que o `campaign_id` existe e pertence a uma campanha válida antes de processar

