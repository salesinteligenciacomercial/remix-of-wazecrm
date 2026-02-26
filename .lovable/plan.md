

## Diagnóstico: Bug de digitação no Processos Comerciais

### Causa raiz

O problema está no componente `BlockEditor.tsx`. A cada tecla digitada, a função `updateBlock` é chamada, que faz **duas coisas simultaneamente**:

1. Envia uma requisição ao banco de dados para salvar o texto
2. Chama `onBlocksChange(updatedBlocks)` que atualiza o estado do componente pai (`NotionPage`)

Isso causa um ciclo de re-renderização: o componente pai recebe novos `blocks`, re-renderiza o `BlockEditor`, e o textarea recebe um `value` possivelmente desatualizado (a resposta do banco ainda não voltou, ou o estado do pai conflita com o que o usuário está digitando). O resultado é texto "pulando", caracteres perdidos e impossibilidade de digitar normalmente.

### Solução

Implementar **estado local** para o texto de cada bloco e usar **debounce** para salvar no banco. Assim, a digitação fica instantânea e fluida, e o salvamento acontece apenas após o usuário parar de digitar por ~500ms.

### Alterações planejadas

**Arquivo: `src/components/processos/notion/BlockEditor.tsx`**

1. Criar um sub-componente `EditableBlock` que mantém o texto em estado local (`useState`) independente das props
2. Sincronizar o estado local com as props apenas quando o `block.id` muda (novo bloco), não a cada re-render
3. Usar `useCallback` com `setTimeout`/debounce de ~500ms para chamar `updateBlock` (salvamento no banco) somente após pausa na digitação
4. Remover a chamada síncrona a `onBlocksChange` dentro de `updateBlock` durante digitação ativa — o estado local do textarea é a fonte de verdade enquanto o usuário digita

```text
Fluxo atual (bugado):
Tecla → updateBlock() → DB request + onBlocksChange() → re-render pai → re-render textarea → valor conflita

Fluxo corrigido:
Tecla → setLocalText() → render local instantâneo
       └→ debounce 500ms → updateBlock() → DB request + onBlocksChange()
```

Essa é uma correção cirúrgica que resolve o bug sem alterar a estrutura geral do editor.

