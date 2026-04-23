# PRD — Módulo de Proventos (Advision)

**Versão:** 1.0  
**Data:** 2026-04-19  
**Status:** Draft — baseado em análise técnica do codebase atual

---

## 1. Contexto e Objetivo

O módulo de Proventos permite que assessores e clientes visualizem, de forma automática e atualizada, todos os dividendos, JCP e outros rendimentos distribuídos pelos ativos mantidos em carteiras gerenciadas pela Advision.

A proposta de valor central é: **o sistema deve calcular automaticamente quanto cada carteira recebeu (ou irá receber) em proventos, sem intervenção manual**, integrando dados da BRAPI com as transações registradas em cada carteira.

---

## 2. Usuários e Personas

| Persona | Papel | Necessidade principal |
|---|---|---|
| **Assessor** | ADVISOR | Monitorar o yield recebido por cada carteira de clientes; demonstrar valor tangível da alocação em fundamentos |
| **Cliente** | CLIENT | Saber quanto recebeu em proventos e quando o próximo pagamento ocorrerá |
| **Admin** | ADMIN | Auditar o processo de sync, acionar sync manual em caso de falha, visualizar eventos globais |

---

## 3. Fluxo de Produto

### 3.1 Descoberta de Proventos Novos

1. O sistema consulta a BRAPI (API de dados financeiros) para obter eventos de dividendo dos ativos em carteira.
2. Cada ativo do tipo `STOCK` com posição aberta (`quantity > 0`) é elegível para consulta.
3. A consulta ocorre no máximo **uma vez por dia** (lock via banco), priorizando tickers que ainda não foram atualizados na semana corrente.
4. O sync é disparado por três gatilhos: startup do servidor (dev), login de administrador, e endpoint manual temporário.

### 3.2 Cálculo dos Proventos por Carteira

1. Quando o usuário abre uma carteira, o sistema verifica se alguma posição STOCK precisa ser reprocessada (dados novos ou nunca processados).
2. Para cada posição elegível, o sistema determina **quantas ações o cliente possuía na data-ex** de cada evento de dividendo (somando BUY − SELL até aquela data).
3. O total recebido é calculado: `quantidade × valor_por_ação`.
4. O resultado é armazenado em cache por carteira (tabela `wallet_dividend_payments`) e reprocessado apenas quando há dados novos (staleness check).

### 3.3 Exibição para o Usuário

**Página Global `/proventos`:**
- Lista paginada de todos os eventos de dividendo registrados no sistema.
- Busca por ticker.
- Colunas: Ticker, Tipo, Data Ex, Data Pagamento, Valor/Ação.

**Aba "Proventos" na carteira:**
- Card com total recebido em proventos pela carteira.
- Grid de cards agrupados por ticker: total, quantidade de eventos, última data de pagamento.
- Tabela detalhada por evento: ativo, tipo, data ex, data pagamento, quantidade na data-ex, valor/ação, total recebido.

**Indicador na tabela de posições:**
- Tag verde "Provento a ser pago" para ações com pagamento previsto nos próximos 30 dias.

### 3.4 Ajuste de P&L

Posições com dividendo registrado têm o P&L calculado em relação ao preço do ativo **na data-ex do último dividendo** (obtido via OPLAB), em vez do preço médio de compra. Isso evita mostrar prejuízo artificial causado pela queda de preço na data-ex.

---

## 4. Requisitos Funcionais

### RF-01 — Sync Automático
- O sistema deve buscar novos eventos de dividendo da BRAPI para todos os tickers STOCK com posição aberta.
- O sync deve ocorrer no máximo uma vez por dia por ambiente.
- Deve haver resistência a race conditions (lock distribuído por unique constraint).
- Tickers já consultados na semana atual não devem ser re-consultados (reference week).

### RF-02 — Desduplicação de Eventos
- Eventos idênticos (mesmo ticker, tipo, datas e valor) não devem ser duplicados no banco.
- Usar SHA-256 como `integrityHash` para garantir idempotência no import.

### RF-03 — Cálculo Lazy com Cooldown
- O cálculo de proventos por carteira deve ser disparado na leitura, não em batch.
- Uma vez processada, uma posição não deve ser reprocessada por no mínimo 1 hora (cooldown).
- O reprocessamento só ocorre se houver eventos novos mais recentes que o último processamento (staleness check).

### RF-04 — Precisão Decimal
- Todos os cálculos financeiros devem usar Decimal (Decimal.js), nunca `float`.
- `totalReceived = quantity * valuePerShare` com precisão de 2 casas decimais no armazenamento.

### RF-05 — Idempotência no Upsert
- O resultado calculado (`WalletDividendPayment`) deve ser upserted pela chave `(walletId, ticker, exDividendDate)`.
- Reprocessamentos atualizam valores revisados da BRAPI sem duplicar registros.

### RF-06 — Segurança de Acesso
- Endpoints de proventos por carteira devem verificar que o actor tem acesso à carteira (advisor do cliente ou o próprio cliente).
- UUIDs devem ser validados por regex antes de qualquer query.

### RF-07 — Exibição de Provento Futuro
- Posições STOCK com `paymentDate` entre hoje e hoje+30 dias devem exibir tag de aviso no frontend.

### RF-08 — Auditoria de Sync
- Todo sync deve gerar log em `dividend_sync_logs` com trigger, métricas (tickers found, events created, errors, duration) e domain events (`DividendSyncStarted`, `DividendSyncCompleted`, `DividendSyncFailed`).

### RF-09 — Soft Delete de Eventos
- Eventos podem ser marcados como `active = false` para exclusão lógica.
- O cálculo deve ignorar eventos inativos.

---

## 5. Requisitos Não-Funcionais

| Requisito | Valor |
|---|---|
| Latência de leitura de proventos por carteira | < 500ms em P95 (dado cooldown de 1h, maioria será cache hit) |
| Timeout de consulta à BRAPI | 10s por ticker |
| Delay entre requests à BRAPI | 200ms (free tier) |
| Tamanho máximo de página na listagem global | 100 itens |
| Precisão decimal | Decimal(18, 8) para `valuePerShare`, Decimal(18, 2) para `totalReceived` |
| Sync máximo por dia | 1 por ambiente (hard lock por DB) |

---

## 6. Gaps Identificados e Débitos Técnicos

### GAP-01 — Módulo de Opções não integrado com Proventos *(crítico)*
**Situação atual:** Nenhuma lógica do módulo de derivativos/opções (`DerivativesService`, `StrategyBuilderService`, `OptionLifecycleService`) considera proventos. Strikes, prêmios, P&L e gregas de operações em opções não são ajustados quando um dividendo é registrado.

**Impacto:** Um dividendo relevante (ex: dividendo extraordinário) pode mover o preço do ativo subjacente e tornar strikes calculados antes do evento desatualizados, sem que o sistema reflita isso nas estratégias ativas.

**Ação recomendada:** Definir política: (a) ajuste retroativo de strike (como B3 faz), (b) flag de "strike pré-dividendo" nas estratégias, ou (c) ignorar (aceitar limitação explícita). Documentar a decisão.

### GAP-02 — Splits não tratados (task-005)
**Situação atual:** `getQuantityAtDate` soma BUY − SELL sem considerar splits. Uma posição que sofreu desdobramento entre a compra e a data-ex terá quantidade histórica calculada incorretamente.

**Impacto:** Valor total de proventos calculado errado para ativos com histórico de splits.

### GAP-03 — Transação DIVIDEND não criada (task-004 pausada)
**Situação atual:** O `cashBalance` da carteira não reflete o recebimento de proventos. Não há `Transaction.type = DIVIDEND` gerada automaticamente.

**Impacto:** O saldo da carteira não representa a realidade financeira completa do cliente.

### GAP-04 — Sync só em startup (dev) e login admin
**Situação atual:** Em produção, o sync só é disparado por login de admin. Se o admin não logar por vários dias, os dados ficam desatualizados.

**Ação recomendada:** Implementar cron job de sync diário independente de ação do usuário.

### GAP-05 — Endpoint `POST /proventos/sync` deve ser removido antes de produção
**Situação atual:** Endpoint manual de sync sem controle adequado está ativo e acessível por ADVISOR e ADMIN.

### GAP-06 — Tipos do frontend desatualizados (`api.d.ts`)
**Situação atual:** `api.d.ts` não reflete `lastDividendDate` e `priceAtLastDividend` em `Position`. Os tipos foram estendidos localmente em `features/wallets/types/index.ts` como workaround.

---

## 7. Fora do Escopo (versão atual)

- Proventos de FIIs (Fundos Imobiliários) — apenas `STOCK` é suportado.
- Proventos de ETFs.
- Tratamento de rendimentos tributados na fonte vs. isentos.
- Cálculo de IR sobre proventos (DARF, DIRF).
- Histórico de splits e bonificações.
- Reinvestimento automático de proventos (DRIP).
- Ajuste de strike de opções por provento.

---

## 8. Métricas de Sucesso

| Métrica | Alvo |
|---|---|
| % de carteiras com proventos calculados corretamente | 100% (para ativos sem splits) |
| Tempo entre novo evento BRAPI e exibição para o usuário | < 1h (cooldown) |
| Taxa de falha no sync diário | < 1% |
| Duplicatas em `dividend_events` | 0 (garantido por hash único) |
