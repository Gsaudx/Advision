# Execução de Redesign — Página de Análises

> Documento gerado após refatoração concluída. Registra o que foi efetivamente alterado.

## 1. Stack visual usada

- **Library de UI:** Tailwind CSS com tokens Sovereign customizados (mesmos de `src/index.css`)
- **Library de gráficos:** Recharts 3.6 (pré-existente) — re-skinned com paleta Sovereign
- **Tokens:** `--color-primary`, `--color-tertiary`, `--color-error`, `--color-surface-*`, `--color-on-surface*`, `--color-outline-variant`
- **Ícones:** Lucide React (pré-existente)
- **Animações:** CSS keyframes `skel-shimmer` para skeletons; `backdrop-blur` no cabeçalho sticky

## 2. Princípios aplicados

1. **Tema Sovereign integral** — fundo `bg-surface-container-lowest` (#0d1b2a), bordas `border-outline-variant/15`, sem sombra pesada
2. **Tipografia Manrope** (`font-headline font-extrabold tracking-tighter`) para valores em destaque; Inter para corpo e tabelas; mono para números tabulares
3. **Semântica de cor consistente** — positivo `text-tertiary` (#34d399), negativo `text-error` (#fca5a5), aviso `text-amber-400`
4. **Bento layout assimétrico** — PatrimonyEvolution é hero (8/12 colunas), demais widgets em hierarquia secundária
5. **Skeleton dark** — gradiente em tons de azul-marinho (não cinza claro) via classe `.skel`
6. **Estado vazio com ilustração** — `WidgetEmptyState` com ícone centralizado e hint contextual
7. **Cabeçalho sticky** com `backdrop-blur-sm` e gradiente de fade para o fundo

## 3. Reorganização do layout

```
ANTES (grade 3×3 simétrica):
┌──────────┬──────────┬──────────┐
│Patrimônio│Benchmark │BestWorst │
├──────────┼──────────┼──────────┤
│OptionsExp│Pendências│Dividendos│
├──────────┼──────────┼──────────┤
│Concentraç│Exposiçset│Ranking   │
└──────────┴──────────┴──────────┘

DEPOIS (bento assimétrico):
┌────────────────────┬────────────┐  Linha 1 (8+4)
│  PatrimonyEvolution│ Benchmark  │
│     (hero, 8/12)   │  (4/12)    │
├──────────┬──────────┬──────────┤  Linha 2 (4+4+4)
│ Pendentes│ Opções   │BestWorst │
├───────────────────┬────────────┤  Linha 3 (7+5)
│   Concentração    │ Dividendos │
├──────────┬─────────────────────┤  Linha 4 (5+7)
│  Setorial│     Ranking         │
└──────────┴─────────────────────┘
```

## 4. Catálogo de mudanças por widget

### Widget 1 — Evolução Patrimonial
- **Antes:** Gráfico de linha simples azul-600, variação percentual em texto pequeno cinza, card branco `rounded-xl`
- **Depois:** Card hero `rounded-[2rem]` com decoração emerald (gradiente radial + faixa vertical), valor patrimonial em Manrope 6xl, badge de variação com bg-tertiary/15 ou bg-error/15, tarjas "Início / Hoje / Pico / Vale", AreaChart com gradient fill emerald, tooltip dark custom
- **Arquivos tocados:** `widgets/PatrimonyEvolution.tsx`

### Widget 2 — Rentabilidade vs IBOV
- **Antes:** Duas linhas azul/âmbar, legenda genérica, sem indicador de performance
- **Depois:** Três métricas em Manrope 2xl (Carteira / IBOV / Δ Alpha), linha emerald sólida + IBOV pontilhada slate, tooltip dark com duas séries, pill final "Batendo o índice em X%" ou "Abaixo do índice"
- **Arquivos tocados:** `widgets/BenchmarkComparison.tsx`

### Widget 3 — Melhores e Piores Ativos
- **Antes:** Listas planas com divisores invisíveis, verde/vermelho nos tons antigos
- **Depois:** Badge ticker com bg-tertiary/12 ou bg-error/12, valores em `text-tertiary`/`text-error`, rótulos "Top ganhos" e "Top perdas" em uppercase colored
- **Arquivos tocados:** `widgets/BestWorstAssets.tsx`

### Widget 4 — Risco de Vencimento de Opções
- **Antes:** BarChart horizontal com paleta arco-íris sem semântica
- **Depois:** Barras de proporção customizadas com gradiente de urgência (error → amber → tertiary → tertiary-soft → slate-soft), total em Manrope 3xl, contagem de contratos por janela, badge crítico no rodapé
- **Arquivos tocados:** `widgets/OptionsExpiry.tsx`

### Widget 5 — Ações Pendentes
- **Antes:** Lista com ícones de alerta e link azul, sem contagem no cabeçalho
- **Depois:** Contagem "N críticas · M avisos" em Manrope 4xl/2xl, linhas clicáveis com hover, ícones em containers rounded-xl (bg-error/15 ou bg-amber-500/15), chevron de navegação com hover tertiary
- **Arquivos tocados:** `widgets/PendingActions.tsx`

### Widget 6 — Proventos Recebidos
- **Antes:** Total embutido em texto corrido, barras azuis uniformes, lista cru
- **Depois:** Total em Manrope 4xl + média mensal em tertiary, BarChart com Cell colors em gradiente de opacidade emerald, top pagadores com ProportionBar proporcional e ranking numerado
- **Arquivos tocados:** `widgets/Dividends.tsx`

### Widget 7 — Concentração de Ativos
- **Antes:** bg-yellow-50/bg-red-50 (invisíveis no dark), números puros nas colunas
- **Depois:** Borda lateral 2px amber/error por linha, ProportionBar inline em "% Book" e "Clientes", badges "N sobrepeso / N super-concentrado" no cabeçalho, cabeçalho sticky
- **Arquivos tocados:** `widgets/AssetConcentration.tsx`

### Widget 8 — Exposição Setorial
- **Antes:** Todas as barras em índigo uniforme, sem distinção setorial
- **Depois:** Paleta categórica (emerald, blue-400, amber, pink, violet, rose, green, teal, orange) por setor, barras de proporção CSS com transição, % e valor compacto por linha
- **Arquivos tocados:** `widgets/SectorExposure.tsx`

### Widget 9 — Ranking de Clientes
- **Antes:** Cabeçalhos sem indicador de sort ativo, "90d" sem contexto, sem minibar de patrimônio
- **Depois:** Ícones ChevronDown/Up/ChevronsUpDown por coluna (ativo em tertiary), pill "INATIVO" âmbar para >90 dias, ProportionBar de 3px abaixo do nome, AlertCircle com contagem de alertas
- **Arquivos tocados:** `widgets/ClientRanking.tsx`

## 5. Tokens / paleta usados

| Token | Hex / valor | Onde aparece |
|-------|-------------|--------------|
| `text-tertiary` | `#34d399` | Positivo, ganhos, accent hero |
| `text-error` | `#fca5a5` | Negativo, perdas, críticos |
| `text-amber-400` | `#fbbf24` | Avisos operacionais |
| `bg-surface-container-lowest` | `#0d1b2a` | Fundo de todos os cards |
| `bg-surface-container-low` | `#112233` | Controles (toggle, pills de período) |
| `bg-surface-container-high` | `#1e3347` | Hover em tabelas, inputs de data |
| `border-outline-variant/15` | `#334155/15%` | Bordas dos cards |
| `font-headline` | Manrope | Títulos e valores em destaque |
| `font-sans` | Inter | Corpo, tabelas, labels |
| `font-mono` | ui-monospace | Números tabulares, tickers |

## 6. Arquivos criados / modificados / com backup

**Novos:**
- `features/analytics/utils/formatters.ts`
- `features/analytics/components/WidgetEyebrow.tsx`
- `features/analytics/components/WidgetEmptyState.tsx`
- `features/analytics/components/ProportionBar.tsx`
- `src/index.css` (adição: classe `.skel` e `@keyframes skel-shimmer`)

**Modificados:**
- `features/analytics/components/WidgetCard.tsx`
- `features/analytics/components/AnalyticsToggle.tsx`
- `features/analytics/components/PeriodSelector.tsx`
- `features/analytics/pages/AnalyticsPage.tsx`
- `features/analytics/components/widgets/PatrimonyEvolution.tsx`
- `features/analytics/components/widgets/BenchmarkComparison.tsx`
- `features/analytics/components/widgets/BestWorstAssets.tsx`
- `features/analytics/components/widgets/OptionsExpiry.tsx`
- `features/analytics/components/widgets/PendingActions.tsx`
- `features/analytics/components/widgets/Dividends.tsx`
- `features/analytics/components/widgets/AssetConcentration.tsx`
- `features/analytics/components/widgets/SectorExposure.tsx`
- `features/analytics/components/widgets/ClientRanking.tsx`

**Backups (.bak — conteúdo original preservado):**
- Todos os 13 arquivos modificados têm `.bak` ao lado (ex: `WidgetCard.bak`)

## 7. Como reverter

Para reverter um widget específico, restaurar o `.bak` correspondente:
```bash
cp src/features/analytics/components/WidgetCard.bak src/features/analytics/components/WidgetCard.tsx
# Repetir para cada arquivo desejado
```

Para reverter o redesign inteiro:
```bash
ANALYTICS=src/features/analytics
for f in $(find "$ANALYTICS" -name "*.bak"); do
  cp "$f" "${f%.bak}.tsx"
done
# Remover também os novos arquivos criados:
rm $ANALYTICS/utils/formatters.ts
rm $ANALYTICS/components/WidgetEyebrow.tsx
rm $ANALYTICS/components/WidgetEmptyState.tsx
rm $ANALYTICS/components/ProportionBar.tsx
# E remover a classe .skel do src/index.css manualmente
```

## 8. Notas para futuros refinamentos

- **Animações de entrada (motion/react):** A página de Análises ainda não usa Framer Motion como o `HomePageAdvisor`. Pode ser adicionado com `motion.div` nas linhas do grid para um efeito de fade+slide cascata igual ao dashboard.
- **OptionsExpiry:** O campo `urgency` não existe nos tipos backend (`OptionsExpiryWindow`). As cores de urgência são aplicadas por posição na array (0=crítico, 1=alto, etc.). Se o backend expor um campo de urgência no futuro, a lógica de cor pode ser atualizada.
- **ClientRanking:** O cabeçalho "Cliente" usa o mesmo `k` de "Patrimônio" para sort — isso é intencional para manter compatibilidade com o tipo `SortKey` existente. Futuramente pode ser adicionado sort por nome com comparação de strings.
- **Recharts tooltip em Recharts 3:** O `TooltipProps` do Recharts 3.x mudou a assinatura. Os tooltips customizados usam tipagem manual (`{ active?: boolean; payload?: ...; label?: string }`) para evitar incompatibilidade.
