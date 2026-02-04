

# Plano: Simplificar Abas do Modulo Fluxos e Automacao

## Objetivo
Remover as abas "Conhecimento", "Treinamento" e "Recomendacoes" do modulo de Fluxos e Automacao, mantendo apenas: **Agentes IA**, **Fluxos**, **Campanhas** e **Insights**.

---

## Alteracoes

### Arquivo: `src/pages/IA.tsx`

**1. Remover imports nao utilizados:**
- `Brain` (icone do Treinamento)
- `Lightbulb` (icone das Recomendacoes)
- `BookOpen` (icone do Conhecimento)
- `TreinamentoIA` (componente)
- `RecomendacoesIA` (componente)
- `BaseConhecimentoIA` (componente)

**2. Atualizar TabsList:**
- Alterar `grid-cols-7` para `grid-cols-4`
- Remover TabsTrigger de "conhecimento"
- Remover TabsTrigger de "treinamento"
- Remover TabsTrigger de "recomendacoes"

**3. Remover TabsContent:**
- Remover `<TabsContent value="conhecimento">` (linhas 251-253)
- Remover `<TabsContent value="treinamento">` (linhas 280-282)
- Remover `<TabsContent value="recomendacoes">` (linhas 284-293)

---

## Resultado Final

| Antes (7 abas) | Depois (4 abas) |
|----------------|-----------------|
| Agentes | Agentes |
| Conhecimento | ~~removido~~ |
| Treinamento | ~~removido~~ |
| Recomendacoes | ~~removido~~ |
| Fluxos | Fluxos |
| Campanhas | Campanhas |
| Insights | Insights |

---

## Detalhes Tecnicos

```text
TabsList (antes)
+----------+-------------+-------------+--------------+--------+-----------+----------+
| Agentes  | Conhecimento| Treinamento | Recomendacoes| Fluxos | Campanhas | Insights |
+----------+-------------+-------------+--------------+--------+-----------+----------+

TabsList (depois)
+----------+--------+-----------+----------+
| Agentes  | Fluxos | Campanhas | Insights |
+----------+--------+-----------+----------+
```

A alteracao e simples e envolve apenas remocao de codigo. Os componentes removidos continuam existindo no projeto caso sejam necessarios futuramente em outros modulos.

