

# Envio de Templates via Ações Rápidas na Conversa

## Objetivo
Adicionar uma nova opção "Enviar Template" dentro do menu **Ações Rápidas** na tela de Conversas, permitindo selecionar e enviar templates aprovados da API Oficial da Meta diretamente para o contato da conversa ativa -- sem precisar ir ao Disparo em Massa.

## O que muda para o usuario

1. No painel lateral da conversa, dentro de **Ações Rápidas**, aparece um novo botão: **"Enviar Template"**
2. Ao clicar, abre um Dialog com:
   - Seletor de templates aprovados (reutiliza o componente `TemplateSelector` ja existente)
   - Preview do template selecionado
   - Campos para preencher variaveis dinamicas (nome do lead, etc.)
   - Campo de URL de midia (quando o template exige video/imagem/documento no cabecalho)
   - Botao "Enviar Template" que envia para o contato da conversa atual
3. A mensagem enviada aparece no historico da conversa com o conteudo legivel do template
4. O envio usa a mesma Edge Function `enviar-whatsapp` ja existente, passando `template_name`, `template_language` e `template_components`

## Detalhes Tecnicos

### 1. Extrair funcoes auxiliares para reutilizacao

As funcoes `buildTemplateComponents` e `buildTemplateTextContent` que hoje estao dentro de `DisparoEmMassa.tsx` serao extraidas para um arquivo utilitario compartilhado:

**Novo arquivo:** `src/utils/templateHelpers.ts`
- `buildTemplateComponents(template, lead, templateVariables, templateMediaUrl)` 
- `buildTemplateTextContent(template, lead, templateVariables)`

Isso permite reutilizar em ambos DisparoEmMassa e Conversas sem duplicacao de codigo.

### 2. Novo componente: `ConversaTemplateSender`

**Novo arquivo:** `src/components/conversas/ConversaTemplateSender.tsx`

Componente Dialog que:
- Recebe `companyId`, `contactName`, `contactPhone`, `origemApi` e callback `onSend`
- Usa o `TemplateSelector` existente para selecionar template
- Mostra preview e campos de variaveis
- Ao clicar "Enviar", chama a funcao de envio com os dados do template
- Preenche automaticamente `{{nome}}` com o nome do contato da conversa

### 3. Integracao em `Conversas.tsx`

No bloco de **Ações Rápidas** (linha ~9456), adicionar o botao que abre o `ConversaTemplateSender`. A logica de envio:

1. Monta o payload com `template_name`, `template_language`, `template_components`
2. Salva a mensagem no banco (tabela `conversas`) com `tipo_mensagem: 'template'` e o texto legivel reconstruido
3. Envia via `enviar-whatsapp` Edge Function (que ja suporta templates)
4. Respeita o `force_provider` (origem da conversa) para manter consistencia do canal

### 4. Estados necessarios em Conversas.tsx

Adicionar estados para controlar o dialog de template:
- `templateDialogOpen` (boolean)
- `selectedConvTemplate` (Template | null)
- `convTemplateVariables` (Record<string, string>)
- `convTemplateMediaUrl` (string)
- `sendingTemplate` (boolean)

### 5. Fluxo de envio

```text
Usuario clica "Enviar Template"
  -> Abre Dialog com TemplateSelector
  -> Seleciona template aprovado
  -> Preenche variaveis (nome auto-preenchido)
  -> Clica "Enviar"
  -> Salva no banco com tipo_mensagem='template' e texto legivel
  -> Envia via enviar-whatsapp com template_name/language/components
  -> Fecha Dialog e mostra toast de sucesso
  -> Mensagem aparece no chat via realtime
```

### Arquivos afetados

| Arquivo | Acao |
|---------|------|
| `src/utils/templateHelpers.ts` | Criar (extrair funcoes de DisparoEmMassa) |
| `src/components/conversas/ConversaTemplateSender.tsx` | Criar (novo componente) |
| `src/components/campanhas/DisparoEmMassa.tsx` | Modificar (importar funcoes do utilitario) |
| `src/pages/Conversas.tsx` | Modificar (adicionar botao + logica de envio) |

