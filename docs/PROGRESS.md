# Progresso — Análises (Analytics)

---

## ⚠️ REGRAS OBRIGATÓRIAS — LEIA ANTES DE QUALQUER COISA

1. **Nunca reexplorar o codebase.** Todo contexto técnico necessário está nos arquivos desta pasta. Leia o arquivo da fase anterior antes de executar a fase atual.
2. **Cada arquivo de fase só é criado quando aquela fase for entregue.** Não criar placeholders antecipados.
3. **Aguardar aprovação explícita do arquiteto** antes de avançar para a próxima fase. Não avançar automaticamente.
4. **Ordem de leitura em toda sessão:** este `PROGRESS.md` primeiro → arquivo da fase anterior → executar fase atual.
5. **Nunca deletar código existente.** Sempre comentar com o marcador `// [ANALYTICS]`.

---

## Sumário de Localização

| Tipo | Caminho |
|------|---------|
| Pasta desta feature | `/mnt/c/Repos/TCC/advision-docs/planejamentos_v5/` |
| Este arquivo (controle de fases) | `PROGRESS.md` |
| Fase 1 — Investigação | `01-investigacao.md` *(criado após entrega)* |
| Fase 2 — Planejamento | `02-planejamento.md` *(criado após entrega)* |
| Fase 3 — Checklist de Implementação | `03-implementacao.md` *(criado após entrega)* |
| Fase 4 — Execução do código | no projeto + `licoes-aprendidas.md` |
| Fase 5 — Guia de QA | `04-guia-qa.md` *(criado após entrega)* |
| Fase 6 — PRD final | `05-prd.md` *(criado após entrega)* |
| Fase 7 — Tech Spec final | `06-techspec.md` *(criado após entrega)* |
| Lições aprendidas (transversal) | `licoes-aprendidas.md` |
| Índice mestre de features | `README.md` |
| Raiz do projeto Advision | `/mnt/c/Repos/TCC/Advision` |

---

## Status das Fases

| Fase | Arquivo | Status | Data |
|------|---------|--------|------|
| FASE 1 — Investigação | `01-investigacao.md` | ENTREGUE | 2026-05-18 |
| FASE 2 — Planejamento | `02-planejamento.md` | ENTREGUE | 2026-05-19 |
| FASE 3 — Checklist de Implementação | `03-implementacao.md` | ENTREGUE | 2026-05-19 |
| FASE 4 — Execução do código | (no projeto) + `licoes-aprendidas.md` | PENDENTE | — |
| FASE 5 — Guia de QA | `04-guia-qa.md` | PENDENTE | — |
| FASE 6 — PRD final | `05-prd.md` | PENDENTE | — |
| FASE 7 — Tech Spec final | `06-techspec.md` | PENDENTE | — |

## Legenda de Status

- **PENDENTE:** Ainda não iniciada
- **EM ANDAMENTO:** Fase atual sendo executada
- **ENTREGUE:** Arquivo gerado, aguardando aprovação do arquiteto
- **APROVADA:** Arquiteto aprovou, pode avançar
- **REVISÃO:** Arquiteto pediu alterações, refazer antes de avançar

---

## Como operar este workflow em toda nova sessão

1. Ler este `PROGRESS.md` — identificar a fase atual pela tabela de status
2. Ler o arquivo da fase **anterior** (se existir) para pegar contexto — **nunca reexplorar o codebase**
3. Executar a fase atual, criando o arquivo `.md` da fase ao entregá-la
4. Atualizar este `PROGRESS.md`: status → `ENTREGUE`, Log de Sessões, Decision Log
5. Atualizar `licoes-aprendidas.md` se houver erro, trade-off ou decisão fora do plano
6. **Parar e aguardar aprovação do arquiteto** — não avançar

---

## Contexto permanente

**Feature:** Página dedicada de análise dos dados do book do assessor, com 9 widgets organizados em 4 categorias (Performance, Operacional, Risco, Comparativo).

**Quem é afetado:** Assessor (usuário principal). Hoje ele gerencia 10-20 carteiras sem visão centralizada de performance, risco e oportunidades. A página de Análises consolida tudo em uma única tela.

**Features relacionadas:**
- **Sentinela** (proventos via OpLab) — Analytics consome `wallet_dividend_payments` no W08
- **Notificações de vencimento** — Analytics consome `notifications` no W07 e W13
- **Card de vencimentos no dashboard** — mantido, não é substituído

**Projeto:** Advision (MVP de TCC, gestão de carteiras). Stack: React (frontend), NestJS (backend), Prisma + PostgreSQL. **Sistema local — sem cloud, sem cron, sem workers, sem schedulers.**

---

## Decisões de produto já tomadas (não rediscutir)

**Estrutura geral da página:**
- **Toggle obrigatório** entre **Consolidado** (todas as carteiras do assessor agregadas) e **Drill-down** (uma carteira específica)
- **Filtro de período** no topo: 1M, 3M, 6M, 1A, YTD, Personalizado
- **Período default:** 1 mês
- **Restrição de fontes de dados:** somente dados do Advision + endpoints da OpLab. Nenhuma outra API externa.
- **Cache:** Estratégia A — cache por sessão de usuário com TTL de 5 minutos (chave = `advisorId`). Botão "Atualizar dados" no topo invalida o cache manualmente.

**Lista final de widgets (9 confirmados):**

### Categoria 1 — Performance e Rentabilidade

**W01 — Evolução patrimonial**
- Pergunta: "O dinheiro sob minha gestão está crescendo, parado ou diminuindo?"
- Visualização: gráfico de linha. Eixo X = tempo. Eixo Y = valor total em R$.
- Modo: Consolidado / Drill-down
- Fontes: `PerformanceService.aggregate()` + `CompositeMarketService.getBatchPrices()`
- Observação: linha reflete exclusivamente variação de mercado + execuções (BUY/SELL).

**W02 — Rentabilidade vs IBOV**
- Pergunta: "Estou rendendo mais ou menos que a bolsa em geral?"
- Visualização: gráfico de linha com 2 séries (carteira + IBOV) normalizadas em variação % desde data inicial do período
- Modo: Consolidado / Drill-down
- Fontes: carteira via W01 normalizada em % + IBOV via `GET https://api.oplab.com.br/v3/market/historical/IBOV/1d?from={from}&to={to}&smooth=true&df=iso` (campos `data[].time` e `data[].close`, `smooth=true` obrigatório)
- Cálculo: `variacao(t) = ((valor(t) − valor(t0)) / valor(t0)) × 100`

**W03 — Melhores e piores ativos**
- Pergunta: "Quais ativos estão puxando o resultado pra cima ou pra baixo?"
- Visualização: duas listas lado a lado — top 5 maiores ganhos e top 5 maiores perdas (% e R$) com ticker e cliente
- Modo: Consolidado / Drill-down
- Fontes: `position.averagePrice` (schema.prisma:251) + `CompositeMarketService.getBatchPrices()`
- Cálculo: `resultado = (cotacao_atual − averagePrice) × quantity`; top/bottom 5

### Categoria 2 — Operacional

**W05 — Risco de vencimento em opções**
- Pergunta: "Quanto dinheiro tenho preso em opções vencendo logo?"
- Visualização: barras horizontais agrupadas por janela (7d / 8-15d / 16-30d / 31-60d / 60+d)
- Modo: Consolidado / Drill-down
- Fontes: `positions` filtrado por `asset.type = 'OPTION'` e `dueDate` futura

**W07 — Ações pendentes do assessor**
- Pergunta: "O que eu preciso fazer e ainda não fiz?"
- Visualização: lista priorizada com ícone de severidade, descrição e link de navegação
- Modo: Consolidado apenas
- Fontes: notificações `OPTION_EXPIRY` com `severity IN ('critical', 'warning')` e `is_read = false` + clientes sem operação há > 90 dias via `MAX(transactions.executedAt) GROUP BY walletId`

**W08 — Histórico de proventos recebidos**
- Pergunta: "Quanto entrou de provento no book nos últimos meses?"
- Visualização: barras mensais com total recebido + lista lateral dos top ativos pagadores
- Modo: Consolidado / Drill-down
- Fontes: `wallet_dividend_payments`. Eixo X = `exDividendDate` truncado por mês. Top pagadores por `ticker`.
- Observação: `wallet_dividend_payments.ticker` é string solta (sem FK para `assets`). Para nome completo: `positionId → positions.assetId → assets`.

### Categoria 3 — Risco e Composição

**W10 — Concentração de ativos no book (top holdings)**
- Pergunta: "Estou apostando demais no mesmo ativo entre vários clientes?"
- Visualização: barras horizontais com top 10 ativos por valor agregado. Colunas: ticker, valor R$, % do book, presença em N clientes, valorização % desde compra
- Modo: Consolidado / Drill-down
- Alertas: amarelo se ativo > 20% do book; vermelho se ativo presente em > 50% dos clientes

**W11 — Exposição setorial**
- Pergunta: "Quanto do meu book está em cada setor da economia?"
- Visualização: treemap ou barras horizontais agrupando ativos por setor
- Modo: Consolidado / Drill-down
- Fontes: campo `assets.sector` (já existente em `schema.prisma:213`, populado pelo `AssetResolverService`). Tabela `asset_sectors` descartada — desnecessária.
- Falha: `sector` null → "Não classificado". Script de reidratação via `POST /analytics/sectors/reseed` para assets antigos com `sector IS NULL` (verificado: 8 registros).
- IBOV: endpoint OpLab confirmado funcional (`GET /v3/market/historical/IBOV/1d`).

**W13 — Ranking de clientes**
- Pergunta: "Quais clientes preciso atender com prioridade?"
- Visualização: tabela ordenável, 1 linha por cliente, 6 colunas: nome, patrimônio R$, rentabilidade %, resultado R$, última operação, notificações críticas pendentes
- Modo: Consolidado apenas
- Ordenação default: rentabilidade desc

---

## Decisões arquiteturais já tomadas (não rediscutir)

- Sistema local → **proibido** cron, workers, schedulers
- Fontes: apenas dados internos + OpLab. Sem BCB, sem brapi, sem outras APIs.
- Cache: Estratégia A (TTL 5 min por `advisorId`, em memória do NestJS) + botão de invalidação manual
- Período default: 1 mês
- Toda implementação isolada em **`AnalyticsModule`** próprio
- Reuso obrigatório: `PerformanceService.computeTotals()` (snapshot atual) e `CompositeMarketService.getBatchPrices()`. `aggregate()` é `private` — não acessível externamente.
- Campo `assets.sector` usado diretamente em W11. Tabela `asset_sectors` descartada. Script de reidratação `POST /analytics/sectors/reseed` para registros com `sector IS NULL`.

## Widgets descartados (com motivo registrado)

| Widget | Motivo |
|--------|--------|
| W04 — Cards de KPIs no topo | Página é de análise, não resumo; os próprios gráficos mostram esses números |
| W05 original — Calendário misto de eventos | Misturava 3 conceitos sem resolver bem nenhum |
| W06 — Fluxo de caixa projetado | Projeção de proventos futuros estatisticamente frágil; risco de informação enganosa |
| W09 — Composição por tipo de ativo | Duplicação — cada carteira individual já tem esse donut |
| W12 — Retorno × Risco (volatilidade) | Exige 60-90 dias de histórico diário; calcular sob demanda seria caro demais |
| W14 — Indicador macro (CDI/SELIC) | Fora de foco; manter nos 9 confirmados |

## Escopo OUT

- Cache invalidável por eventos de domínio
- Métricas profissionais (Sharpe, Sortino, TWR, MWR) — usar rentabilidade simples
- Indicadores macro (CDI, SELIC, inflação)
- Comparação com CDI no W02 — apenas IBOV
- Exportação de relatório (PDF, Excel)
- Datepicker custom além dos presets

## Regras universais de implementação (FASE 4)

1. **Nunca deletar — sempre comentar** com marcador `// [ANALYTICS]`
2. **Isolamento em módulo próprio** — toda lógica em `AnalyticsModule`
3. **Sentinela, Notificações e card de vencimentos permanecem 100% intactos** — Analytics só lê, nunca modifica
4. **Reuso obrigatório:** `PerformanceService.computeTotals()` e `CompositeMarketService.getBatchPrices()`
5. **Ordem de reversão em caso de falha:**
   ```
   1. Comentar link/rota da página Analytics no frontend
   2. Comentar registro de AnalyticsModule em app.module.ts
   3. Não há migration de asset_sectors — reversão de schema desnecessária
   ```

---

## Log de Sessões

- [2026-05-18] Workflow inicializado. Estrutura de controle criada. Fase atual: FASE 1. Status: PENDENTE.
- [2026-05-18] FASE 1 executada. `01-investigacao.md` criado. Status: ENTREGUE. Aguardando aprovação.
- [2026-05-19] FASE 1 validada contra codebase real (12/12 pontos confirmados). Gaps identificados e resolvidos. Decisões de produto registradas. PROGRESS.md corrigido. Aguardando aprovação para FASE 2.
- [2026-05-19] FASE 2 executada. `02-planejamento.md` criado. Status: ENTREGUE. Aguardando aprovação.
- [2026-05-19] FASE 3 executada. `03-implementacao.md` criado. 10 blocos, 27 checkboxes, código completo de todos os arquivos. Status: ENTREGUE. Aguardando aprovação.

## Decision Log

- [2026-05-18] [FASE 1] `Asset.sector` já existe em `schema.prisma:213`. Tabela `asset_sectors` desnecessária — W11 usa `assets.sector` diretamente. Script de reidratação ainda necessário para registros com `sector = null`.
- [2026-05-18] [FASE 1] Único ponto de criação de assets: `AssetResolverService.ensureAssetExists()`. Setor já é populado da OpLab no momento da criação. Não há `AssetService` dedicado.
- [2026-05-18] [FASE 1] `PerformanceService.aggregate()` é `private`. Analytics usará `computeTotals()` para snapshots atuais. Para séries históricas (W01, W02), estratégia a decidir na FASE 2.
- [2026-05-18] [FASE 1] `Wallet` sem `advisorId` direto. Acesso via `wallet.client.advisorId`. Todas as queries do Analytics precisam de JOIN em `clients`.
- [2026-05-18] [FASE 1] `Notification` sem `clientId`. W13 usa `walletId → wallet.clientId`. Campo `walletId` é nullable.
- [2026-05-18] [BOOTSTRAP] Marcador `// [ANALYTICS]`. 9 widgets confirmados.
- [2026-05-18] [BOOTSTRAP] Docs ficam em `advision-docs/planejamentos_v5/` (sem subpasta). Arquivos de fase criados individualmente após entrega + aprovação.
- [2026-05-18] [BOOTSTRAP] Regra: sempre ler arquivo anterior para contexto. Nunca reexplorar codebase.
- [2026-05-18] [BOOTSTRAP] Cache: Estratégia A (TTL 5 min por advisorId) + botão de invalidação manual.
- [2026-05-18] [BOOTSTRAP] Tabela nova `asset_sectors` populada por gatilho na criação de ativos + script de reidratação inicial.
- [2026-05-19] [FASE 2] Um endpoint por widget (independência de loading state). Cache granular por `advisorId:widget:params`. Invalidação via `DELETE /analytics/cache`.
- [2026-05-19] [FASE 2] WalletsModule precisa exportar: PerformanceService, CompositeMarketService, OpLabMarketService — adição aditiva com marcador `// [ANALYTICS]`.
- [2026-05-19] [FASE 2] W03 em v1: não agrega por assetId entre wallets — uma entrada por (walletId, assetId). Simplifica lógica de clientName.
- [2026-05-19] [FASE 2] W13 usa N+1 de computeTotals() — aceito para v1 (max ~20 wallets). Batch otimizado como backlog.
- [2026-05-19] [FASE 2] Rota de navegação do W07 a confirmar na Fase 4 (placeholder `/wallets?walletId={id}`).
- [2026-05-19] [FASE 1 — VALIDAÇÃO] IBOV via OpLab confirmado funcional: `GET /v3/market/historical/IBOV/1d` retorna `close` por data. W02 desbloqueado.
- [2026-05-19] [FASE 1 — VALIDAÇÃO] `Client.@@index([advisorId])` confirmado no schema. R03 não é risco de performance — JOIN indexado.
- [2026-05-19] [FASE 1 — VALIDAÇÃO] `Notification.@@unique([advisorId, type, relatedEntityId])` + upsert correto para W07: query `isRead=false AND severity IN (CRITICAL, WARNING)` retorna estado atual de cada posição. Sem limitação.
- [2026-05-19] [FASE 1 — VALIDAÇÃO] 8 assets com `sector IS NULL` no banco. Volume pequeno — script de reidratação é baixa prioridade. W11 exibe "Não classificado" para esses casos.
- [2026-05-19] [FASE 1 — VALIDAÇÃO] `PerformanceService.aggregate()` é `private`. PROGRESS.md corrigido: reuso obrigatório é `computeTotals()`.
- [2026-05-19] [DECISÃO DE PRODUTO] W01 e W02 dependem de série histórica. Decisão: snapshot atual apenas via `computeTotals()`. W01/W02 com série temporal vão para backlog (v2).
- [2026-05-19] [DECISÃO DE PRODUTO] Fonte do IBOV para W02: OpLab `getHistoricalClose('IBOV', date)` — confirmado funcional com dados reais.
