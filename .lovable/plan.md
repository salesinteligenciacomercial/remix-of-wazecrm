

## Melhorias para o Módulo de Prospecção

Analisei todo o código atual e identifiquei **6 melhorias concretas**:

### 1. Edição Inline de Registros
Atualmente só é possível excluir registros. Falta poder **editar** um log diário ou interação sem precisar deletar e recriar. Adicionar botão de edição que abre o formulário preenchido.

### 2. Filtros por Responsável e Fonte
A página só filtra por período. Adicionar **filtros de responsável (SDR)** e **fonte/canal** na barra de filtros, permitindo análise segmentada (ex: "só ligações do João nos últimos 30 dias").

### 3. Linha de Totais na Tabela
A planilha original tem uma **linha de totais** no rodapé. Adicionar `<tfoot>` com soma de leads, respostas, oportunidades, reuniões, vendas, bruto e médias das porcentagens — tanto na tabela de Prospecção quanto Follow-Up.

### 4. Ranking de SDRs
Criar um card/componente **"Ranking por Responsável"** que agrupa os dados por `user_id` e mostra quem mais prospectou, quem tem melhor taxa de conversão, quem mais vendeu. Tabela simples com posição, nome, leads, vendas, taxa.

### 5. Edição de Scripts (atualmente só cria/deleta)
A ScriptLibrary permite criar e excluir, mas **não editar** scripts existentes. Adicionar funcionalidade de edição inline.

### 6. Notificações de Próximos Passos
As interações têm campo `next_action_date` mas nenhum alerta. Adicionar um **card "Ações Pendentes"** no topo mostrando interações com próximo passo para hoje ou atrasadas, com link direto ao lead.

---

### Implementação Técnica

**Componentes novos:**
- `src/components/prospeccao/ProspeccaoFilters.tsx` — filtros de responsável + fonte
- `src/components/prospeccao/SDRRanking.tsx` — ranking por responsável  
- `src/components/prospeccao/PendingActions.tsx` — ações pendentes/atrasadas

**Componentes editados:**
- `ProspeccaoTable.tsx` / `FollowUpTable.tsx` — adicionar `<tfoot>` com totais e botão de edição
- `InteractionTimeline.tsx` — botão editar, card de ações pendentes
- `ScriptLibrary.tsx` — modo edição de scripts existentes
- `ProspeccaoFormDialog.tsx` / `FollowUpFormDialog.tsx` — aceitar dados iniciais para modo edição
- `Prospeccao.tsx` — integrar filtros, ranking e ações pendentes

**Banco de dados:** Nenhuma alteração necessária — todas as colunas já existem.

