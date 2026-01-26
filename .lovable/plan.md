
# Plano de Melhorias para o Menu Agenda

## Resumo das Melhorias Solicitadas

O usuário deseja duas funcionalidades principais para o menu Agenda, especialmente úteis no segmento médico:

1. **Atribuir compromissos a profissionais** - Permitir designar um profissional/colaborador específico para cada compromisso
2. **Agendar retorno/próximo compromisso** - Funcionalidade para remarcar consultas de retorno diretamente após um atendimento

---

## Análise da Situação Atual

### Estrutura do Banco de Dados
A tabela `compromissos` já possui campos que suportam as melhorias:
- `profissional_id` (uuid) - Referência para a tabela `profissionais`
- `agenda_id` (uuid) - Referência para agendas específicas
- `usuario_responsavel_id` (uuid) - Usuário responsável pelo compromisso

A tabela `profissionais` contém:
- `id`, `user_id`, `nome`, `email`, `telefone`, `especialidade`, `company_id`

### Componentes Existentes
- `EditarCompromissoDialog.tsx` - Edição de compromissos (938 linhas)
- `AgendaModal.tsx` - Criação de novos compromissos
- `Agenda.tsx` - Página principal com visualização mensal/semanal/diária

---

## Implementação Proposta

### 1. Seletor de Profissional nos Compromissos

**Onde:** `EditarCompromissoDialog.tsx` e formulário de novo compromisso em `Agenda.tsx`

**Funcionalidades:**
- Dropdown para selecionar profissional responsável
- Exibir especialidade do profissional
- Filtrar profissionais ativos da empresa
- Validar disponibilidade do profissional no horário

**Interface Visual:**
```text
+-------------------------------------------+
| Profissional Responsável                  |
| [v] Dr. João Silva - Cardiologista        |
+-------------------------------------------+
|  > Dr. Maria Santos - Clínico Geral       |
|  > Dr. Carlos Oliveira - Dermatologista   |
|  > Sem profissional atribuído             |
+-------------------------------------------+
```

### 2. Botão "Agendar Retorno" nos Compromissos

**Onde:** No card do compromisso e no `EditarCompromissoDialog.tsx`

**Funcionalidades:**
- Botão destacado para agendar próximo compromisso
- Pré-preencher dados do paciente/lead automaticamente
- Sugerir data de retorno baseada em intervalos comuns (7, 15, 30, 60, 90 dias)
- Manter vínculo com o compromisso original (histórico)
- Notificação opcional ao paciente sobre o retorno

**Interface Visual:**
```text
+-----------------------------------------------------------+
| COMPROMISSO: Consulta - João da Silva                     |
| 26/01/2026 às 14:00 | Status: Realizado                   |
+-----------------------------------------------------------+
|                                                           |
|  [Editar]  [Concluir]  [🔄 Agendar Retorno]               |
|                                                           |
+-----------------------------------------------------------+

Modal "Agendar Retorno":
+-----------------------------------------------------------+
| AGENDAR RETORNO - João da Silva                           |
+-----------------------------------------------------------+
| Paciente: João da Silva (preenchido)                      |
| Telefone: (11) 99999-0000 (preenchido)                    |
|                                                           |
| Retorno em:                                               |
| [7 dias] [15 dias] [30 dias] [60 dias] [Personalizado]    |
|                                                           |
| Data sugerida: 26/02/2026                                 |
| Horário: [v] 14:00 (mesmo horário)                        |
|                                                           |
| Tipo de serviço: [v] Retorno                              |
| Profissional: [v] Dr. João Silva (mesmo)                  |
|                                                           |
| [ ] Notificar paciente sobre agendamento                  |
|                                                           |
| [Cancelar]                      [Agendar Retorno]         |
+-----------------------------------------------------------+
```

### 3. Campo de Vínculo para Histórico de Retornos

**Alteração no banco de dados:**
Adicionar campo `compromisso_origem_id` na tabela `compromissos` para rastrear a cadeia de retornos.

```sql
ALTER TABLE compromissos 
ADD COLUMN compromisso_origem_id UUID REFERENCES compromissos(id);
```

**Benefício:** Permite visualizar histórico completo de consultas do paciente com seus retornos.

---

## Arquivos a Serem Modificados/Criados

### Novos Componentes
| Arquivo | Descrição |
|---------|-----------|
| `AgendarRetornoDialog.tsx` | Modal para agendar retorno com pré-preenchimento |
| `ProfissionalSelector.tsx` | Componente reutilizável para seleção de profissional |

### Arquivos a Modificar
| Arquivo | Alteração |
|---------|-----------|
| `EditarCompromissoDialog.tsx` | Adicionar seletor de profissional + botão retorno |
| `Agenda.tsx` | Integrar seletor de profissional no formulário de criação |
| `AgendaModal.tsx` | Adicionar campo de profissional |

---

## Migração de Banco de Dados

```sql
-- Adicionar campo para vincular retornos ao compromisso original
ALTER TABLE public.compromissos 
ADD COLUMN IF NOT EXISTS compromisso_origem_id UUID REFERENCES public.compromissos(id);

-- Índice para consultas de histórico de retornos
CREATE INDEX IF NOT EXISTS idx_compromissos_origem 
ON public.compromissos(compromisso_origem_id);

-- Comentário explicativo
COMMENT ON COLUMN public.compromissos.compromisso_origem_id IS 
'ID do compromisso original para rastreamento de retornos';
```

---

## Fluxo de Uso (Segmento Médico)

1. **Paciente chega para consulta**
   - Atendente abre compromisso e marca como "Em atendimento"

2. **Após consulta**
   - Médico/atendente clica em "Agendar Retorno"
   - Sistema pré-preenche dados do paciente
   - Seleciona intervalo de retorno (ex: 30 dias)
   - Sistema sugere horário disponível

3. **Paciente confirma**
   - Opção de enviar WhatsApp com confirmação
   - Compromisso de retorno criado com vínculo ao original

4. **Histórico**
   - No perfil do paciente/lead, visualizar todos os atendimentos e retornos vinculados

---

## Benefícios para o Segmento Médico

- **Produtividade**: Agendar retorno em segundos, sem recriar dados
- **Rastreabilidade**: Histórico completo de consultas do paciente
- **Organização**: Profissional responsável claramente definido
- **Comunicação**: Notificação automática ao paciente
- **Redução de faltas**: Paciente recebe lembrete do retorno

---

## Ordem de Implementação

### Fase 1 - Seletor de Profissional (imediato)
1. Criar componente `ProfissionalSelector.tsx`
2. Integrar em `EditarCompromissoDialog.tsx`
3. Integrar no formulário de novo compromisso

### Fase 2 - Funcionalidade de Retorno (após Fase 1)
1. Migração DB para `compromisso_origem_id`
2. Criar `AgendarRetornoDialog.tsx`
3. Adicionar botão de retorno nos cards de compromisso
4. Implementar pré-preenchimento e sugestões de data

### Fase 3 - Histórico e Relatórios (opcional)
1. Visualização de cadeia de retornos no perfil do lead
2. Relatório de taxa de retorno por profissional/período
