# 🚀 Prompt de Bootstrap — Feature: Análises

> **Como usar:** Cole este prompt inteiro em uma nova sessão do Claude Code no projeto Advision. O agente vai te perguntar onde criar a estrutura, gerar todos os arquivos, e te direcionar para a próxima sessão. Nesta sessão **nada de código de feature é escrito** — só a estrutura de documentação.

---

## INSTRUÇÕES PARA O AGENTE

Você é um arquiteto de software inicializando o workflow de uma feature nova no projeto **Advision**. Sua tarefa nesta sessão é estritamente delimitada:

1. Perguntar onde criar a estrutura
2. Criar a pasta da feature, o `PROGRESS.md`, os 7 placeholders de fase (cada um com o prompt da sua fase embutido), o `licoes-aprendidas.md`, e atualizar o índice mestre
3. Apresentar a árvore criada e direcionar o usuário para a próxima sessão

**Você NÃO vai nesta sessão:**
- Investigar o código do projeto
- Planejar a implementação
- Escrever código de feature
- Tomar decisões de produto/arquitetura (já foram tomadas — estão abaixo)
- Editar qualquer arquivo fora da pasta de docs que será criada

**Regras:**
- Faça as perguntas em **um único lote curto** no início
- Após criar tudo, apresente a árvore final e pare
- Não use suposição — se algo não estiver claro, pergunte

---

## ETAPA 1 — Perguntas obrigatórias antes de criar nada

Faça estas perguntas ao usuário e aguarde a resposta:

1. **Caminho absoluto da raiz do projeto Advision?** (ex: `/mnt/c/Repos/Advision`)
2. **Onde deve ficar a pasta de documentação de features?** Sugestões: `docs/features/`, `documentation/features/`, `.workflows/`. Se já existe outra pasta de features pela feature de notificações, usar a mesma.
3. **Já existe um índice mestre de features?** Se sim, qual o caminho. Se não, criar `<pasta-de-docs>/README.md`.

Após resposta, apresente a árvore que será criada e peça confirmação **antes de criar qualquer arquivo**:

```
Vou criar:

<raiz>/<pasta-de-docs>/
├── README.md                       (índice mestre — atualizar adicionando entrada)
└── analytics/
    ├── PROGRESS.md
    ├── 01-investigacao.md          (placeholder com prompt embutido)
    ├── 02-planejamento.md          (idem)
    ├── 03-implementacao.md         (idem)
    ├── 04-guia-qa.md               (idem)
    ├── 05-prd.md                   (idem)
    ├── 06-techspec.md              (idem)
    └── licoes-aprendidas.md        (vazio, atualizado a cada fase)

Confirma? (sim/ajustar)
```

Só prossiga para a Etapa 2 após confirmação explícita.

---

## ETAPA 2 — Conteúdo dos arquivos a criar

Use exatamente os templates abaixo, substituindo `<RAIZ>` e `<PASTA-DOCS>` pelos valores confirmados pelo usuário.

---

### 📄 Arquivo 1: `<RAIZ>/<PASTA-DOCS>/analytics/PROGRESS.md`

```markdown
# Progresso — Análises

## Sumário de Localização

> Mapa de onde cada arquivo deste workflow mora. Sempre consulte aqui ao abrir uma nova sessão.

| Tipo | Caminho |
|------|---------|
| Pasta desta feature | `<RAIZ>/<PASTA-DOCS>/analytics/` |
| Este arquivo (controle de fases) | `<RAIZ>/<PASTA-DOCS>/analytics/PROGRESS.md` |
| Fase 1 — Investigação | `<RAIZ>/<PASTA-DOCS>/analytics/01-investigacao.md` |
| Fase 2 — Planejamento | `<RAIZ>/<PASTA-DOCS>/analytics/02-planejamento.md` |
| Fase 3 — Checklist de Implementação | `<RAIZ>/<PASTA-DOCS>/analytics/03-implementacao.md` |
| Fase 4 — Execução do código | (no projeto) + `licoes-aprendidas.md` |
| Fase 5 — Guia de QA | `<RAIZ>/<PASTA-DOCS>/analytics/04-guia-qa.md` |
| Fase 6 — PRD final | `<RAIZ>/<PASTA-DOCS>/analytics/05-prd.md` |
| Fase 7 — Tech Spec final | `<RAIZ>/<PASTA-DOCS>/analytics/06-techspec.md` |
| Lições aprendidas (transversal) | `<RAIZ>/<PASTA-DOCS>/analytics/licoes-aprendidas.md` |
| Índice mestre de features | `<RAIZ>/<PASTA-DOCS>/README.md` |

## Status das Fases

| Fase | Arquivo | Status | Data |
|------|---------|--------|------|
| FASE 1 — Investigação | `01-investigacao.md` | PENDENTE | — |
| FASE 2 — Planejamento | `02-planejamento.md` | PENDENTE | — |
| FASE 3 — Checklist de Implementação | `03-implementacao.md` | PENDENTE | — |
| FASE 4 — Execução do código | (no projeto) + `licoes-aprendidas.md` | PENDENTE | — |
| FASE 5 — Guia de QA | `04-guia-qa.md` | PENDENTE | — |
| FASE 6 — PRD final | `05-prd.md` | PENDENTE | — |
| FASE 7 — Tech Spec final | `06-techspec.md` | PENDENTE | — |

## Legenda de Status
- PENDENTE: Ainda não iniciada
- EM ANDAMENTO: Fase atual sendo executada
- ENTREGUE: Arquivo gerado, aguardando aprovação humana
- APROVADA: Usuário aprovou, pode avançar
- REVISÃO: Usuário pediu alterações, refazer antes de avançar

## Contexto permanente

**Feature:** Página dedicada de análise dos dados do book do assessor, com 9 widgets organizados em 4 categorias (Performance, Operacional, Risco, Comparativo).

**Quem é afetado:** Assessor (usuário principal). Hoje ele gerencia 10-20 carteiras sem visão centralizada de performance, risco e oportunidades. A página de Análises consolida tudo em uma única tela.

**Features relacionadas:**
- **Sentinela** (proventos via OpLab) — Analytics consome `wallet_dividend_payments` no W08
- **Notificações de vencimento** — Analytics consome `notifications` no W07 e W13
- **Card de vencimentos no dashboard** — mantido, não é substituído

**Projeto:** Advision (MVP de TCC, gestão de carteiras). Stack: React (frontend), NestJS (backend), Prisma + PostgreSQL. **Sistema local — sem cloud, sem cron, sem workers, sem schedulers.**

### Decisões de produto já tomadas (não rediscutir)

**Estrutura geral da página:**
- **Toggle obrigatório** entre **Consolidado** (todas as carteiras do assessor agregadas) e **Drill-down** (uma carteira específica)
- **Filtro de período** no topo: 1M, 3M, 6M, 1A, YTD, Personalizado
- **Período default:** 1 mês
- **Restrição de fontes de dados:** somente dados do Advision + endpoints da OpLab. Nenhuma outra API externa.
- **Cache:** Estratégia A — cache por sessão de usuário com TTL de 5 minutos (chave = `advisorId`). Botão "Atualizar dados" no topo da página invalida o cache manualmente.

**Lista final de widgets (9 confirmados):**

#### Categoria 1 — Performance e Rentabilidade

**W01 — Evolução patrimonial**
- Pergunta: "O dinheiro sob minha gestão está crescendo, parado ou diminuindo?"
- Visualização: gráfico de linha. Eixo X = tempo. Eixo Y = valor total em R$.
- Modo: Consolidado / Drill-down
- Fontes: `PerformanceService.aggregate()` (replay histórico) + `CompositeMarketService.getBatchPrices()` (cotações atuais)
- Observação: Advision não tem aportes de cliente. A linha reflete exclusivamente variação de mercado + execuções (BUY/SELL).

**W02 — Rentabilidade vs IBOV**
- Pergunta: "Estou rendendo mais ou menos que a bolsa em geral?"
- Visualização: gráfico de linha com 2 séries (carteira + IBOV) normalizadas em variação % desde data inicial do período
- Modo: Consolidado / Drill-down
- Fontes:
  - Carteira: lógica do W01 normalizada em %
  - IBOV: `GET https://api.oplab.com.br/v3/market/historical/IBOV/1d?from={from}&to={to}&smooth=true&df=iso` — usar `data[].time` e `data[].close`. `smooth=true` é obrigatório.
- Cálculo: `variacao(t) = ((valor(t) − valor(t0)) / valor(t0)) × 100`

**W03 — Melhores e piores ativos**
- Pergunta: "Quais ativos estão puxando o resultado pra cima ou pra baixo?"
- Visualização: duas listas lado a lado — top 5 maiores ganhos e top 5 maiores perdas (% e R$) com ticker e cliente
- Modo: Consolidado / Drill-down
- Fontes: `position.averagePrice` (já persistido em `schema.prisma:251`) + `CompositeMarketService.getBatchPrices()`
- Cálculo: `resultado = (cotacao_atual − averagePrice) × quantity`; ordena e separa top/bottom 5

#### Categoria 2 — Operacional

**W05 — Risco de vencimento em opções**
- Pergunta: "Quanto dinheiro tenho preso em opções vencendo logo?"
- Visualização: barras horizontais agrupadas por janela de tempo (7d / 8-15d / 16-30d / 31-60d / 60+d). Cada barra mostra valor financeiro total.
- Modo: Consolidado / Drill-down
- Fontes: `positions` filtrado por `asset.type = 'OPTION'` e `dueDate` futura. Decidir no planejamento se valor = `quantity × averagePrice` ou cotação atual.

**W07 — Ações pendentes do assessor**
- Pergunta: "O que eu preciso fazer e ainda não fiz?"
- Visualização: lista priorizada com ícone de severidade, descrição e link de navegação
- Modo: Consolidado apenas
- Fontes:
  - Notificações `OPTION_EXPIRY` com `severity IN ('critical', 'warning')` e `is_read = false`
  - Clientes sem operação há > 90 dias (configurável) — derivado via `MAX(transactions.executedAt) GROUP BY walletId` (campo `lastTransactionAt` **não existe** no schema)
  - Carteiras sem operação há > 180 dias

**W08 — Histórico de proventos recebidos**
- Pergunta: "Quanto entrou de provento no book nos últimos meses?"
- Visualização: barras mensais com total recebido + lista lateral dos top ativos pagadores
- Modo: Consolidado / Drill-down
- Fontes: `wallet_dividend_payments` (tabela da Sentinela). Eixo X = `exDividendDate` truncado por mês. Eixo Y = `SUM(totalReceived)`. Top pagadores agrupando por `ticker`.
- Observação: `wallet_dividend_payments.ticker` é string solta — sem FK para `assets`. Pra exibir nome completo, navegar via `positionId → positions.assetId → assets`.

#### Categoria 3 — Risco e Composição

**W10 — Concentração de ativos no book (top holdings)**
- Pergunta: "Estou apostando demais no mesmo ativo entre vários clientes?"
- Visualização: barras horizontais com top 10 ativos por valor agregado. Colunas: ticker, valor R$, % do book, presença em N clientes, valorização % desde compra
- Modo: Consolidado / Drill-down
- Fontes: `positions` agrupado por ticker + `CompositeMarketService` + `averagePrice`
- Alertas visuais: amarelo se ativo > 20% do book; vermelho se ativo presente em > 50% dos clientes

**W11 — Exposição setorial**
- Pergunta: "Quanto do meu book está em cada setor da economia?"
- Visualização: treemap ou barras horizontais agrupando ativos por setor
- Modo: Consolidado / Drill-down
- Fontes:
  - Tabela nova `asset_sectors`: `ticker (PK)`, `sector`, `createdAt`
  - OpLab: `GET https://api.oplab.com.br/v3/market/instruments/{ticker}`, campo `sector` (texto livre em PT, ex: "PETRÓLEO E GÁS")
- Gatilho de população: quando ativo novo é inserido em `assets`, sistema chama OpLab e popula `asset_sectors`. Ativos existentes precisam de script único de reidratação.
- Tratamento de falha: OpLab indisponível ou `sector` null → ativo aparece como "Não classificado".
- Justificativa do design: tabela separada (e não coluna em `assets`) permite extensão futura com outros metadados da OpLab.

#### Categoria 4 — Comparativo

**W13 — Ranking de clientes**
- Pergunta: "Quais clientes preciso atender com prioridade?"
- Visualização: tabela ordenável, 1 linha por cliente, 6 colunas: nome, patrimônio R$, rentabilidade %, resultado R$, última operação (com destaque visual quando > 90 dias), notificações críticas pendentes
- Modo: Consolidado apenas
- Ordenação default: rentabilidade desc
- Fontes:
  - Patrimônio: `positions` × cotações atuais
  - Rentabilidade: `PerformanceService.aggregate()` agregado por cliente (não por carteira)
  - Última operação: `MAX(transactions.executedAt) GROUP BY clientId`
  - Alertas: `COUNT(*)` em `notifications` filtrado por critical + não lida + `clientId`

### Decisões arquiteturais já tomadas (não rediscutir)

- Sistema local → **proibido** cron, workers, schedulers
- Restrição de fontes: apenas dados do Advision + OpLab. Sem BCB, sem brapi, sem outras APIs.
- Cache de página: Estratégia A (TTL 5 min por `advisorId`, em memória do NestJS)
- Botão "Atualizar dados" no topo invalida cache manualmente
- Toda implementação isolada em **`AnalyticsModule`** próprio
- Reuso obrigatório de serviços existentes: `PerformanceService`, `CompositeMarketService`. Zero infraestrutura nova de cotação ou cálculo.
- Tabela `asset_sectors` populada por gatilho na criação de novos `assets` + script de reidratação inicial

### Widgets considerados e descartados (com motivo registrado)

- **W04 — Cards de KPIs no topo:** página é de análise, não resumo. Espaço nobre não deve ser ocupado por números que os próprios gráficos mostram.
- **W05 original — Calendário misto de eventos:** misturava 3 conceitos (vencimentos, proventos, aniversários) sem resolver bem nenhum. Substituído por W05 atual (risco de vencimento) e W08 (proventos).
- **W06 — Fluxo de caixa projetado:** projeção de proventos futuros é estatisticamente frágil com poucos dados. Risco de passar informação enganosa.
- **W09 — Composição por tipo de ativo:** duplicação — cada carteira individual já tem esse donut.
- **W12 — Retorno × Risco (scatter de volatilidade):** volatilidade exige 60-90 dias de histórico diário confiável. Advision não persiste valor diário; calcular sob demanda seria caro demais.
- **W14 — Indicador macro (CDI/SELIC):** decidido não adicionar. Manter foco nos 9 widgets confirmados.

### Escopo OUT (não fazer agora)

- Cache invalidável por eventos de domínio (fica em Estratégia A fixa)
- Métricas profissionais de finanças (Sharpe, Sortino, TWR, MWR) — usar rentabilidade simples
- Indicadores macro (taxa de juros, inflação)
- Comparação com CDI no W02 — apenas IBOV
- Exportação de relatório (PDF, Excel)
- Widget de retorno × risco (volatilidade)
- Período personalizado mais flexível (datepicker custom além dos presets)

## Regras universais de implementação (FASE 4)

Estas regras valem para qualquer código alterado:

1. **Nunca deletar — sempre comentar.** Código existente que precise ser substituído deve ser comentado com o marcador `// [ANALYTICS]`, nunca deletado.

   ```typescript
   // ANTES — não deletar, comentar assim:
   // const oldCalculation = ...; // [ANALYTICS] substituído

   // DEPOIS — nova linha logo abaixo:
   const newCalculation = this.analyticsService.compute(...);
   ```

2. **Isolamento em módulo próprio.** Toda lógica vive em `AnalyticsModule`. Não misturar com módulos existentes.

3. **Card de vencimentos existente, feature de Notificações e feature de Sentinela permanecem 100% intactos.** Analytics consome dados dessas features (só leitura), nunca modifica.

4. **Reuso obrigatório:** `PerformanceService.aggregate()` para cálculos de histórico, `CompositeMarketService.getBatchPrices()` para cotações. Não criar serviços paralelos para essas funcionalidades.

5. **Ordem de reversão em caso de falha:**
   ```
   1. Comentar link/rota da página Analytics no frontend → página inacessível
   2. Comentar registro de AnalyticsModule no app.module.ts → backend não expõe rotas
   3. Manter tabela asset_sectors e migrations — não causa prejuízo a outras features
   ```
   Sentinela, Notificações e card de vencimentos seguem funcionando normalmente em qualquer cenário.

## Log de Sessões
- [YYYY-MM-DD] Workflow inicializado via prompt de bootstrap. Fase atual: FASE 1. Status: PENDENTE.

## Decision Log
- [YYYY-MM-DD] [BOOTSTRAP] Slug `analytics`, marcador `// [ANALYTICS]`. 9 widgets confirmados. Estrutura criada em `<PASTA-DOCS>/analytics/`.
- [YYYY-MM-DD] [BOOTSTRAP] Restrição de fontes: apenas dados internos + OpLab. Nenhuma outra API externa.
- [YYYY-MM-DD] [BOOTSTRAP] Cache: Estratégia A (TTL 5 min por advisorId) + botão de invalidação manual.
- [YYYY-MM-DD] [BOOTSTRAP] Período default: 1 mês.
- [YYYY-MM-DD] [BOOTSTRAP] Tabela nova `asset_sectors` populada por gatilho na criação de ativos + script de reidratação inicial.

---

## Como o agente deve operar este workflow

Em **qualquer nova sessão**, o usuário vai colar uma instrução curta tipo *"Continue o workflow de análises"*. O agente deve:

1. **Ler primeiro este `PROGRESS.md`** — identificar a fase atual pela tabela de status
2. **Abrir o arquivo `.md` da fase correspondente** — ele contém o prompt completo e os inputs a ler
3. **Ler APENAS os inputs listados** na fase — economia de tokens
4. **Executar a fase** preenchendo o conteúdo do próprio arquivo da fase (substituindo o placeholder)
5. **Atualizar este `PROGRESS.md`**: status da fase para `ENTREGUE` + entrada no Log de Sessões + qualquer decisão nova no Decision Log
6. **Atualizar `licoes-aprendidas.md`** se houver erro, trade-off ou decisão fora do plano
7. **Parar e aguardar aprovação humana** — não avançar automaticamente

> Quando o usuário aprovar, ele mesmo atualiza o status para `APROVADA` ou diz "aprovado" e a próxima sessão começa pela próxima fase pendente.
```

---

### 📄 Arquivo 2: `<RAIZ>/<PASTA-DOCS>/analytics/01-investigacao.md`

```markdown
# FASE 1 — Investigação do Codebase

> **Status:** PENDENTE
> **Pré-requisitos:** nenhum
> **Inputs a ler nesta fase:** apenas `PROGRESS.md` + acesso ao código do projeto
> **Output:** este arquivo, preenchido com todas as seções abaixo

---

## 🤖 Prompt da fase (execute este conteúdo)

> Leia `PROGRESS.md` para contexto. Investigue o codebase do Advision e **substitua o conteúdo deste arquivo** pelas seções abaixo preenchidas. Não invente caminhos — referencie arquivos reais.
>
> ### 1. Estrutura de pastas relevante
> Árvore mostrando onde ficam: modules do backend, módulo de wallets/dashboard, módulo de positions/operações, módulo de notifications, módulo de sentinel, models do Prisma, features do frontend, layout principal. Comentários laterais identificando o papel de cada pasta.
>
> ### 2. Padrões identificados
> Tabela Aspecto/Padrão cobrindo: ORM e versão, HTTP client (back e front), state management frontend (React Query?), validação de DTOs, migrations, auth (JWT? Roles/Guards?), convenção de naming no banco (snake_case via `@@map`? camelCase?).
>
> ### 3. Modelo de dados — confirmação dos campos esperados
> Confirme/refute presença destes campos com referência `arquivo:linha`:
> - `Position.averagePrice` (esperado em `schema.prisma:251`)
> - `Position.quantity`, `Position.assetId`, `Position.walletId`
> - `Asset.type` (STOCK / OPTION / outros?)
> - `Asset.ticker`, `Asset.name`
> - `Transaction.executedAt`, `Transaction.type` (BUY/SELL), `Transaction.walletId`
> - `Wallet.clientId`, `Wallet.advisorId` (ou path equivalente)
> - `Client` model — relação com `Wallet` e com `Advisor`
> - `Notification` (da feature de Notificações) — campos: `severity`, `is_read`, `advisorId`, `clientId`, `type`
> - `WalletDividendPayment` (da Sentinela) — `walletId`, `positionId`, `ticker`, `exDividendDate`, `totalReceived`
>
> Listar tipos exatos e nullability de cada campo.
>
> ### 4. PerformanceService — interface atual
> Examinar `performance.service.ts`. Documentar:
> - Assinatura completa do método `aggregate()` ou equivalente
> - Que parâmetros aceita
> - Que retorna (tipo)
> - Se permite filtrar por `clientId` ou só por `walletId`
> - Como agregar múltiplas carteiras de um mesmo cliente — método já existe? Ou precisamos implementar?
>
> ### 5. CompositeMarketService — interface atual
> Examinar `composite-market.service.ts`. Documentar:
> - Assinatura de `getBatchPrices()`
> - Resolução por tipo de ativo (Brapi para STOCK, OpLab para OPTION)
> - TTL de cache interno
> - Token de injeção usado (`MARKET_DATA_PROVIDER`?)
>
> ### 6. Layout principal e roteamento
> - Caminho do AppLayout / Header / Sidebar
> - Como rotas são adicionadas (react-router? next?)
> - Onde adicionar item de menu "Análises" pra navegar pra nova página
> - Existe contexto de usuário (`useUser()` ou similar) disponível globalmente?
>
> ### 7. Padrão de chamadas API no frontend
> - Cliente HTTP usado (axios? fetch? wrapper custom?)
> - Padrão de hooks (`useQuery` do React Query? hook custom?)
> - Onde ficam definidos os types compartilhados frontend↔backend
>
> ### 8. Lugar para criar o gatilho de população de `asset_sectors`
> A tabela nova `asset_sectors` precisa ser populada quando um novo `Asset` for criado. Investigar:
> - Existe um único ponto de criação de assets, ou está espalhado?
> - Há service `AssetService.create()` ou método equivalente?
> - Que arquivos chamam esse método hoje?
>
> ### 9. Convenções da tabela `wallet_dividend_payments`
> Confirmar nomenclatura das colunas (camelCase ou snake_case com `@@map`):
> - `walletId`, `positionId`, `ticker`, `exDividendDate`, `totalReceived`
> - Como queries Prisma referenciam essas colunas
> - Há FK para `assets`? (Spoiler do PROGRESS.md: não há, apenas via `positionId → positions.assetId → assets`)
>
> ### 10. Estado das features dependentes
> - Feature de Notificações: implementada e funcional? Confirmar status no índice mestre de features.
> - Feature Sentinela: implementada e funcional? `wallet_dividend_payments` tem dados?
> - Card de vencimentos no dashboard: caminho do componente, lógica atual.
>
> ### 11. Riscos e observações
> - Bugs do ambiente (Prisma 7.x, watch mode em WSL)
> - Particularidades do `CompositeMarketService` (rate limits, falhas conhecidas)
> - Padrões de cache existentes no projeto (se houver — vamos seguir o mesmo)
>
> **Não gere código. Não implemente nada.** Apenas mapeie e documente com referências precisas a arquivos reais.
>
> Ao final:
> - Atualize `PROGRESS.md`: status da FASE 1 para `ENTREGUE`, entrada no Log de Sessões com a data, qualquer decisão nova no Decision Log.
> - Pare. Aguarde aprovação humana.

---

## Conteúdo gerado

<!-- A ser preenchido pelo agente na execução desta fase -->
```

---

### 📄 Arquivo 3: `<RAIZ>/<PASTA-DOCS>/analytics/02-planejamento.md`

```markdown
# FASE 2 — Planejamento da Implementação

> **Status:** PENDENTE
> **Pré-requisitos:** FASE 1 APROVADA
> **Inputs a ler nesta fase:** `PROGRESS.md`, `01-investigacao.md`
> **Output:** este arquivo, preenchido com todas as seções abaixo

---

## 🤖 Prompt da fase (execute este conteúdo)

> Leia `PROGRESS.md` e `01-investigacao.md`. **Substitua o conteúdo deste arquivo** pelas seções abaixo.
>
> ### Seção 0 — Regras obrigatórias na FASE 4
> Replicar regras universais do `PROGRESS.md` com exemplos de código mostrando o marcador `// [ANALYTICS]`.
>
> ### Seção 1 — Modelagem de dados
> - SQL completo da tabela nova `asset_sectors` (decidir snake_case com `@@map` ou camelCase conforme convenção identificada na investigação)
> - Índices recomendados
> - Constraint UNIQUE em `ticker`
> - Migration: nome sugerido + comando para gerar e aplicar
>
> ### Seção 2 — Estrutura do AnalyticsModule
> - Arquivos a criar:
>   - `analytics.module.ts`
>   - `analytics.controller.ts` (endpoints da página)
>   - Services especializados (1 por categoria? ou 1 service único com métodos? Decidir)
>   - Schemas TypeScript (interfaces de retorno de cada widget)
>   - Cache provider (in-memory com TTL 5 min)
> - Estrutura de pastas dentro de `src/modules/analytics/`
> - Responsabilidade de cada arquivo
>
> ### Seção 3 — AnalyticsCacheService
> - Implementação: Map em memória com chave `advisorId` + valor `{ data, expiresAt }`
> - TTL: 5 minutos
> - Métodos: `get(advisorId)`, `set(advisorId, data)`, `invalidate(advisorId)`
> - Endpoint dedicado pra invalidação manual: `POST /analytics/refresh`
>
> ### Seção 4 — Service de população de `asset_sectors`
> - Onde plugar o gatilho (ponto exato identificado na investigação)
> - Snippet do código a adicionar (com marcador `// [ANALYTICS]`)
> - Tratamento de falha: chamada à OpLab pode falhar — não bloquear criação do asset
> - Script de reidratação inicial: criar como endpoint admin `POST /analytics/sectors/reseed` ou como migration de dados? Decidir.
>
> ### Seção 5 — Implementação de cada widget
> Para cada widget (W01, W02, W03, W05, W07, W08, W10, W11, W13):
> - Endpoint backend (método, path)
> - Query principal (Prisma + qualquer agregação JS)
> - Estratégia para Consolidado vs Drill-down (parâmetro de query? rotas separadas?)
> - Reuso de PerformanceService / CompositeMarketService
> - Forma da resposta JSON
>
> Para o **W02 especificamente:**
> - Endpoint OpLab a chamar: `GET https://api.oplab.com.br/v3/market/historical/IBOV/1d?from={from}&to={to}&smooth=true&df=iso`
> - Service Nest a criar (cliente HTTP da OpLab): reutilizar o que já existe (Sentinela) ou criar novo?
> - Tratamento de campos: usar `data[].time` e `data[].close`
> - Normalização em base % a partir do primeiro valor do período
>
> Para o **W11 especificamente:**
> - Endpoint OpLab: `GET https://api.oplab.com.br/v3/market/instruments/{ticker}`
> - Extrair campo `sector` (texto livre em PT)
> - Tratamento de `null` ou falha: armazenar `sector = NULL` em `asset_sectors`, e widget exibe como "Não classificado"
>
> ### Seção 6 — Rotas da API
> Lista completa: método, path, request, response, guards/auth. Padronizar prefixo `/api/analytics/*`.
>
> ### Seção 7 — Frontend
> - Componentes a criar (1 por widget + componente página principal + componente de filtros)
> - Hooks de API (1 por endpoint)
> - Roteamento: caminho `/analytics` ou similar
> - Modificação no menu principal (com marcador `// [ANALYTICS]`)
> - Estratégia de loading/erro/empty state
> - Implementação do toggle Consolidado/Drill-down (estado local? URL params?)
>
> ### Seção 8 — Estratégia de rollback
> - Passos exatos pra reverter
> - Confirmação de que Sentinela, Notificações e card de vencimentos seguem funcionando
>
> Ao final:
> - Atualize `PROGRESS.md`: FASE 2 para `ENTREGUE`, Log de Sessões, Decision Log.
> - Atualize `licoes-aprendidas.md` se houver decisão de design relevante.
> - Pare. Aguarde aprovação humana.

---

## Conteúdo gerado

<!-- A ser preenchido pelo agente na execução desta fase -->
```

---

### 📄 Arquivo 4: `<RAIZ>/<PASTA-DOCS>/analytics/03-implementacao.md`

```markdown
# FASE 3 — Checklist de Implementação

> **Status:** PENDENTE
> **Pré-requisitos:** FASE 2 APROVADA
> **Inputs a ler nesta fase:** `PROGRESS.md`, `02-planejamento.md`
> **Output:** este arquivo, preenchido como checklist com checkboxes

---

## 🤖 Prompt da fase (execute este conteúdo)

> Leia `PROGRESS.md` e `02-planejamento.md`. **Substitua o conteúdo deste arquivo** por um checklist completo, organizado em blocos sequenciais.
>
> Modelo de estrutura:
>
> ```markdown
> # FASE 3 — Checklist de Implementação
>
> ## Regra geral
> - Nunca deletar — sempre comentar com `// [ANALYTICS]`
> - Commitar após cada item concluído
>
> ## BLOCO 1 — Banco de dados
>
> #### ☐ 1. Adicionar model `AssetSector` ao schema.prisma
> **Arquivo:** caminho/exato/schema.prisma
> [bloco de código completo a adicionar]
>
> #### ☐ 2. Gerar e aplicar a migration
> [comandos exatos]
>
> ## BLOCO 2 — Backend: AnalyticsModule (base)
>
> #### ☐ 3. Criar src/modules/analytics/schemas/analytics.schema.ts
> [conteúdo completo do arquivo]
>
> #### ☐ 4. Criar AnalyticsCacheService...
> ```
>
> **Cobertura mínima:**
> - **BLOCO 1:** Migrations Prisma (`asset_sectors`) + comandos
> - **BLOCO 2:** Schemas TypeScript, AnalyticsCacheService, módulo base
> - **BLOCO 3:** Service de população de `asset_sectors` (gatilho + script de reidratação)
> - **BLOCO 4:** Services e endpoints dos 9 widgets — ordem sugerida: W04 não existe, W01 → W03 → W05 → W08 → W10 → W11 → W07 → W13 → W02 (W02 por último por ter dependência externa OpLab IBOV)
> - **BLOCO 5:** Registro do `AnalyticsModule` em `app.module.ts`
> - **BLOCO 6:** Frontend — componente de página, filtros (período + toggle), 9 componentes de widget, hooks de API, botão "Atualizar dados"
> - **BLOCO 7:** Integração no menu/router do frontend (com marcador `// [ANALYTICS]`)
> - **BLOCO 8:** Validação manual rápida pós-implementação (smoke test)
>
> Cada item deve ser **autocontido** — copiar e colar deve ser suficiente.
>
> Ao final:
> - Atualize `PROGRESS.md`: FASE 3 para `ENTREGUE`, Log de Sessões, Decision Log.
> - Pare. Aguarde aprovação humana.

---

## Conteúdo gerado

<!-- A ser preenchido pelo agente na execução desta fase -->
```

---

### 📄 Arquivo 5: `<RAIZ>/<PASTA-DOCS>/analytics/04-guia-qa.md`

```markdown
# FASE 5 — Guia de QA

> **Status:** PENDENTE
> **Pré-requisitos:** FASE 4 (Execução do código) concluída
> **Inputs a ler nesta fase:** `PROGRESS.md`, `02-planejamento.md`, `03-implementacao.md`, `licoes-aprendidas.md`
> **Output:** este arquivo, preenchido com manual de QA executável

> **Sobre a FASE 4:** Não tem arquivo de prompt separado. A FASE 4 é a execução do `03-implementacao.md` no projeto. O agente que executa a FASE 4 deve ler `PROGRESS.md` + `02-planejamento.md` + `03-implementacao.md`, marcar os checkboxes conforme avança, e registrar qualquer divergência no `licoes-aprendidas.md`.

---

## 🤖 Prompt da fase (execute este conteúdo)

> Leia os inputs. **Substitua o conteúdo deste arquivo** por um manual de QA executável pelo humano.
>
> ### Estrutura obrigatória
>
> **Pré-requisitos:** comandos para subir backend, frontend, banco; setup mínimo (1 assessor, 3 clientes, 5+ carteiras com mix de ações e opções, algumas com proventos da Sentinela, algumas com notificações pendentes); nota sobre convenções de coluna.
>
> **BLOCO A — População inicial de `asset_sectors`:** rodar script de reidratação; verificar via SQL que todos os ativos existentes ganharam linha; verificar tratamento de ativos cuja OpLab retornou `null`.
>
> **BLOCO B — Gatilho de população em novo asset:** criar um asset novo no sistema; verificar que `asset_sectors` recebeu nova linha automaticamente; testar com ticker inválido (OpLab vai falhar) e confirmar que asset foi criado mesmo assim.
>
> **BLOCO C — Toggle Consolidado vs Drill-down:** alternar entre modos e confirmar que todos os widgets recalculam corretamente.
>
> **BLOCO D — Filtro de período:** trocar entre 1M, 3M, 6M, 1A, YTD e confirmar que widgets temporais (W01, W02, W08) reagem.
>
> **BLOCO E — Cache (Estratégia A):** abrir página, trocar período rapidamente — devem usar cache. Aguardar 5 min, recarregar — deve buscar dados frescos. Clicar "Atualizar dados" — deve invalidar imediatamente.
>
> **BLOCO F — Widget por widget:** um bloco de teste pra cada um dos 9 widgets, validando:
> - Dados aparecem corretamente
> - Modo consolidado e drill-down funcionam
> - Cálculos batem com SQL manual de conferência
> - Estados de loading/erro/empty
>
> **BLOCO G — Regressão de features dependentes:** Sentinela continua detectando proventos; Notificações continuam sendo geradas; card de vencimentos no dashboard segue funcionando.
>
> **BLOCO H — Performance:** mediar tempo de primeiro load com 1, 5, 20 clientes; mediar tempo de load após cache aquecido.
>
> **BLOCO I — Rollback:** comentar import da página Analytics no menu; confirmar que sistema volta ao estado anterior sem erro.
>
> Cada bloco com: cenário (1 frase), passos numerados com SQL ou UI, resultado esperado claro.
>
> **Queries SQL de diagnóstico rápido** (seção final reutilizável).
>
> **Checklist de aprovação final:** tabela Bloco | Teste | Resultado ☐.
>
> Ao final:
> - Atualize `PROGRESS.md`: FASE 5 para `ENTREGUE`, Log de Sessões.
> - Pare. Aguarde aprovação humana.

---

## Conteúdo gerado

<!-- A ser preenchido pelo agente na execução desta fase -->
```

---

### 📄 Arquivo 6: `<RAIZ>/<PASTA-DOCS>/analytics/05-prd.md`

```markdown
# FASE 6 — PRD final (pós-implementação)

> **Status:** PENDENTE
> **Pré-requisitos:** FASE 5 APROVADA
> **Inputs a ler nesta fase:** `PROGRESS.md`, `02-planejamento.md`, `licoes-aprendidas.md`, `04-guia-qa.md`
> **Output:** este arquivo, descrevendo o que foi entregue (não o que será feito)

---

## 🤖 Prompt da fase (execute este conteúdo)

> Leia os inputs. **Substitua o conteúdo deste arquivo** por um PRD pós-implementação.
>
> ### Estrutura obrigatória
>
> 1. **Problema** — qual dor do assessor estava sendo resolvida
> 2. **Solução entregue** — descrição de alto nível
> 3. **Requisitos funcionais entregues** — formato RF-01, RF-02... incluindo um por widget + os transversais (toggle, filtro de período, cache, botão Atualizar)
> 4. **Requisitos não entregues / fora de escopo** — tabela: Item | Motivo (incluir os widgets descartados W04, W06, W09, W12, W14 e seus motivos)
> 5. **Dados de validação (QA realizado)** — tabela referenciando blocos do guia de QA: Bloco | Resultado (✅ / ⏳ / ❌)
>
> **Tom:** factual, pós-mortem, sem promessas futuras.
>
> Ao final:
> - Atualize `PROGRESS.md`: FASE 6 para `ENTREGUE`, Log de Sessões.
> - Pare. Aguarde aprovação humana.

---

## Conteúdo gerado

<!-- A ser preenchido pelo agente na execução desta fase -->
```

---

### 📄 Arquivo 7: `<RAIZ>/<PASTA-DOCS>/analytics/06-techspec.md`

```markdown
# FASE 7 — Tech Spec final (pós-implementação)

> **Status:** PENDENTE
> **Pré-requisitos:** FASE 6 APROVADA
> **Inputs a ler nesta fase:** `PROGRESS.md`, `02-planejamento.md`, `03-implementacao.md`, `licoes-aprendidas.md`, `05-prd.md`
> **Output:** este arquivo, descrevendo a especificação técnica do que foi entregue

---

## 🤖 Prompt da fase (execute este conteúdo)

> Leia os inputs. **Substitua o conteúdo deste arquivo** por uma especificação técnica completa.
>
> ### Estrutura obrigatória
>
> 1. **Arquitetura geral** — diagrama ASCII Frontend → AnalyticsController → Services → (Cache | Prisma | OpLab | PerformanceService | CompositeMarketService) → Banco
> 2. **Modelo de dados** — tabelas com todas as colunas, tipos, constraints (foco em `asset_sectors`)
> 3. **Fluxo de dados completo** — passo a passo de uma sessão típica: usuário abre página → backend monta resposta de cada widget → frontend renderiza
> 4. **Arquivos criados/modificados** — duas tabelas: novos | modificados
> 5. **Divergências do planejamento original** — D-01, D-02... cada uma com planejado vs implementado vs motivo. Puxar de `licoes-aprendidas.md`
> 6. **Bugs do ambiente encontrados** — tabela Ambiente | Sintoma | Causa | Workaround
> 7. **Contratos de API** — para cada endpoint Analytics: auth, response shape, exemplo JSON
> 8. **Dependências adicionadas** — lista de pacotes npm novos (ou "nenhuma")
>
> Ao final:
> - Atualize `PROGRESS.md`: FASE 7 para `ENTREGUE` + nota final "Workflow concluído. Feature pronta para apresentação."
> - Pare.

---

## Conteúdo gerado

<!-- A ser preenchido pelo agente na execução desta fase -->
```

---

### 📄 Arquivo 8: `<RAIZ>/<PASTA-DOCS>/analytics/licoes-aprendidas.md`

```markdown
# Lições Aprendidas — Análises

> Atualizado em toda fase. Registre aqui qualquer decisão tomada fora do plano original, trade-off, problema encontrado, bug do ambiente, ou divergência.

## Formato de registro

```
### [YYYY-MM-DD] [FASE N] Erro/Decisão/Trade-off — <título curto>

**Contexto:** ...
**Problema/Decisão:** ...
**Solução adotada:** ...
**Arquivo(s) afetado(s):** ...
**Justificativa:** ...
```

## Registros

<!-- Vazio até a primeira fase começar -->
```

---

### 📄 Arquivo 9: `<RAIZ>/<PASTA-DOCS>/README.md` (atualizar)

> Se já existe um README.md com a feature de Notificações, **adicione apenas a linha nova** na tabela sem destruir o conteúdo existente. Se não existe, crie completo:

```markdown
# Índice de Features

| Feature | Slug | Status geral | Pasta | Última atualização |
|---------|------|--------------|-------|--------------------|
| Sistema de Notificações de Vencimento | notifications | (estado atual) | [./notifications/](./notifications/) | (data) |
| Análises | analytics | EM INVESTIGAÇÃO | [./analytics/](./analytics/) | YYYY-MM-DD |

## Legenda de Status Geral
- EM INVESTIGAÇÃO: Fase 1 ativa
- EM PLANEJAMENTO: Fase 2 ou 3 ativa
- EM IMPLEMENTAÇÃO: Fase 4 ativa
- EM VALIDAÇÃO: Fase 5 ativa
- DOCUMENTANDO: Fases 6-7 ativas
- CONCLUÍDA: Todas as fases aprovadas
- PAUSADA: Trabalho interrompido (anotar motivo na pasta da feature)
- ARQUIVADA: Feature descartada

## Como usar este índice

Cada feature tem sua própria pasta com `PROGRESS.md` controlando o estado. Para retomar trabalho em qualquer feature, abra o `PROGRESS.md` correspondente.
```

---

## ETAPA 3 — Confirmação final

Após criar todos os 9 arquivos, apresente ao usuário:

```
✅ Workflow inicializado.

Estrutura criada em <RAIZ>/<PASTA-DOCS>/analytics/:

📁 analytics/
├── 📄 PROGRESS.md              ← estado das fases + decisões + sumário + 9 widgets
├── 📄 01-investigacao.md       ← prompt da FASE 1 embutido (placeholder)
├── 📄 02-planejamento.md       ← prompt da FASE 2 embutido (placeholder)
├── 📄 03-implementacao.md      ← prompt da FASE 3 embutido (placeholder)
├── 📄 04-guia-qa.md            ← prompt da FASE 5 embutido (placeholder)
├── 📄 05-prd.md                ← prompt da FASE 6 embutido (placeholder)
├── 📄 06-techspec.md           ← prompt da FASE 7 embutido (placeholder)
└── 📄 licoes-aprendidas.md     ← transversal, vazio

📄 <PASTA-DOCS>/README.md       ← índice mestre (atualizado com nova entrada)

🎯 Próximo passo:
Abra uma nova sessão (para economizar tokens) e cole:

    "Continue o workflow em <RAIZ>/<PASTA-DOCS>/analytics/PROGRESS.md"

O agente vai:
1. Ler o PROGRESS.md
2. Identificar que FASE 1 está PENDENTE
3. Abrir 01-investigacao.md e seguir o prompt embutido
4. Preencher o conteúdo, atualizar o PROGRESS, e parar para sua revisão.
```

**Pare aqui. Não execute nada além disso nesta sessão.**
