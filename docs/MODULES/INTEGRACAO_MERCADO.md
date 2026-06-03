# Integração de Mercado — Dados Financeiros em Tempo Real e Histórico

## 1. Visão Geral

O módulo de Integração de Mercado é a camada que conecta o Advision ao mercado financeiro real. Ele é responsável por fornecer cotações atuais, séries de opções, gregas, histórico de preços e metadados de ativos para todos os outros módulos do sistema. A fonte primária de dados é a API da OpLab, especializada no mercado de derivativos brasileiro (B3).

---

## 2. Problema que Resolve

Cálculos de performance de carteira, visualização de opções disponíveis para compra/venda, detecção de dividendos e benchmarking de carteiras requerem dados de mercado atualizados. Consultar a API externa a cada requisição seria lento e potencialmente custoso. O sistema precisa de uma camada que abstraia a fonte de dados, aplique cache inteligente e lide com particularidades do mercado brasileiro (finais de semana, feriados, opções expiradas).

---

## 3. Objetivos

- Fornecer cotações de ativos (ações e opções) com latência aceitável para uso em tempo real.
- Prover séries completas de opções com gregas para o fluxo de compra e busca de derivativos.
- Resolver e criar automaticamente ativos no banco ao primeiro acesso (criação lazy).
- Lidar com ausência de dados em datas não úteis via fallback retroativo.
- Fornecer histórico de preços para cálculos de performance e benchmark.

---

## 4. Escopo

**O que faz:**
- Cotações de ações e opções (individuais e em lote).
- Busca paginada de séries de opções com filtros.
- Retorno de gregas (delta, gamma, theta, vega, IV) via OpLab.
- Histórico OHLCV de ativos para análises de performance e benchmark.
- Histórico de strikes de opções para detecção de dividendos pelo Sentinel.
- Criação automática de ativos no banco ao primeiro acesso.
- Cache em memória para reduzir chamadas à API.
- Fallback retroativo de até 3 dias para datas sem dados (feriados, finais de semana).

**O que não faz:**
- Não fornece dados de fundos de investimento ou renda fixa.
- Não opera com dados de exchanges fora da B3.
- Não oferece dados de IBOV ou benchmarks por índice (não implementado).
- Não implementa streaming de cotações em tempo real (WebSocket/SSE com a OpLab).
- Não possui rate limiting ou circuit breaker — toda proteção é responsabilidade da OpLab.

---

## 5. Personas / Atores Envolvidos

| Ator | Papel |
|------|-------|
| Sistema (módulos internos) | Consome os serviços de mercado para cálculos e exibição |
| OpLab API | Única fonte de dados de mercado efetivamente utilizada |
| Assessor (indiretamente) | Beneficiário final — vê cotações, opções e performance calculadas com esses dados |

---

## 6. Funcionalidades

### 6.1 Cotações (Preços Atuais)

O sistema consulta preços de ativos individualmente ou em lote. O preço retornado segue a ordem de prioridade: preço de fechamento → bid → ask. As cotações ficam em cache por 60 segundos — múltiplas requisições dentro desse intervalo retornam o mesmo valor sem nova chamada à API.

O cache expira por TTL (sem limitação de tamanho), sendo limpo automaticamente a cada nova consulta de preço.

### 6.2 Séries de Opções

O sistema busca todas as opções disponíveis para um ativo subjacente (ex: todas as opções de PETR4). A resposta inclui vencimentos, strikes, tipos (CALL/PUT), e dados de mercado como bid, ask, volume e gregas.

As séries ficam em cache por 5 minutos. A paginação da busca é feita em memória — o sistema busca todas as opções da OpLab e aplica os filtros (tipo, busca por símbolo) e paginação (50 itens por página) localmente.

### 6.3 Gregas

As gregas (volatilidade implícita, delta, gamma, theta, vega, rho) são retornadas junto com as séries de opções — não há endpoint separado para consultá-las. Ao buscar uma série, todas as gregas disponíveis são incluídas na resposta.

### 6.4 Histórico de Preços (OHLCV)

O sistema consulta o histórico diário de fechamento de um ativo em um intervalo de datas. Esse histórico é usado para calcular a evolução patrimonial de carteiras e para comparação com benchmarks.

Se a data solicitada cair em um final de semana ou feriado, o sistema tenta automaticamente os 3 dias úteis anteriores (fallback retroativo até D-3).

### 6.5 Histórico de Strikes de Opções

Para o módulo Sentinel (detecção de dividendos), o sistema consulta o histórico de strikes de uma opção em datas específicas. Aplicam-se os mesmos fallbacks de datas do histórico de preços.

### 6.6 Criação Lazy de Ativos

Quando um usuário realiza uma operação com um ativo que ainda não existe no banco (ex: compra de uma nova opção), o sistema consulta automaticamente a OpLab para obter os metadados do ativo e cria o registro no banco. Esse processo é transparente — o usuário não percebe a criação.

Para opções, o processo cria também o ativo subjacente (ação) caso ele também não exista, de forma recursiva.

Se uma opção já tiver expirado (OpLab não retorna mais seus dados), o sistema aceita que o chamador forneça os metadados manualmente — necessário para registros retroativos.

---

## 7. Regras de Negócio

| Código | Regra |
|--------|-------|
| BR-MKTINT-01 | A OpLab é a única fonte de dados de mercado efetivamente utilizada. O YahooFinance existe no código mas não é delegado pelo CompositeMarketService. |
| BR-MKTINT-02 | Cache de preços: TTL de 60 segundos, por ticker, em memória. |
| BR-MKTINT-03 | Cache de séries de opções: TTL de 5 minutos, por ativo subjacente, em memória. |
| BR-MKTINT-04 | Fallback de datas: se não houver dados para a data D, tenta D-1, D-2, D-3. Não tenta datas futuras. |
| BR-MKTINT-05 | `contractSize` padrão é 100 (padrão B3), podendo ser sobrescrito por metadado da OpLab. |
| BR-MKTINT-06 | `initialStrike` é o strike no momento da criação da opção — imutável. `strikePrice` é o valor atual, ajustável por dividendos. |
| BR-MKTINT-07 | Se a OpLab não retornar dados para um ticker (ex: opção expirada), o sistema lança erro 404 — a menos que o chamador forneça metadados de override. |
| BR-MKTINT-08 | O token de autenticação da OpLab (`OPLAB_ACCESS_TOKEN`) é enviado via header em toda requisição. Se ausente, as funcionalidades de mercado ficam silenciosamente desabilitadas. |

---

## 8. Fluxos Principais

### 8.1 Busca de Cotação em Lote (Performance de Carteira)

1. Módulo de performance solicita preços de todos os ativos de uma carteira.
2. Para cada ticker, verifica o cache (60s TTL).
3. Tickers não cacheados são agrupados em uma única requisição à OpLab.
4. Resultados são cacheados e retornados ao módulo solicitante.

### 8.2 Busca de Opções para Compra/Venda

1. Usuário digita o ticker da ação subjacente.
2. Sistema busca a série completa da OpLab (ou retorna do cache de 5 min).
3. Aplica filtros (tipo CALL/PUT, busca por símbolo) e pagina em memória.
4. Retorna 50 itens por página; usuário navega com scroll infinito.

### 8.3 Criação Lazy de Ativo ao Realizar Operação

1. Usuário tenta comprar uma opção (ex: `PETRA240C`).
2. Sistema verifica se o ativo existe no banco. Não existe.
3. Consulta OpLab para obter metadados: tipo (OPTION), strike, vencimento, tipo de exercício, ativo subjacente.
4. Verifica se o subjacente (`PETR4`) existe. Se não, cria também.
5. Cria `Asset` e `OptionDetail` no banco com `initialStrike = strikePrice` atual.
6. Operação prossegue usando o ativo recém-criado.

### 8.4 Consulta Histórica para Módulo Sentinel

1. Sentinel solicita o strike histórico de uma opção sentinela em uma data específica.
2. Sistema tenta a data exata. Se não houver dados (feriado), tenta D-1, D-2, D-3.
3. Retorna o strike encontrado (ou null se nenhuma das 4 tentativas tiver dados).

---

## 9. Entidades e Relacionamentos

### Ativo (Asset)

Representa qualquer instrumento financeiro negociado: ação ou opção. Criado automaticamente ao primeiro uso.

| Atributo | Descrição |
|----------|-----------|
| ticker | Símbolo único do ativo (ex: PETR4, PETRA240C) |
| type | STOCK (ação) ou OPTION (opção) |
| sector | Setor econômico (obtido da OpLab, opcional) |
| market | Sempre "B3" (hardcoded) |

### Detalhe de Opção (OptionDetail)

Associado a cada ativo do tipo OPTION. Armazena as características específicas da opção.

| Atributo | Descrição |
|----------|-----------|
| optionType | CALL ou PUT |
| exerciseType | AMERICAN ou EUROPEAN (sempre AMERICAN para B3) |
| strikePrice | Strike atual — pode ser ajustado por dividendos |
| initialStrike | Strike original no momento da criação — imutável |
| expirationDate | Data de vencimento |
| contractSize | Tamanho do contrato (padrão: 100 ações) |

**Relacionamentos:**
- Um `Asset` do tipo OPTION tem exatamente um `OptionDetail`.
- Um `OptionDetail` referencia o `Asset` subjacente (a ação sobre a qual a opção é emitida).
- Posições e transações referenciam o `Asset`.

---

## 10. Integrações com Outros Módulos

| Módulo | Tipo | O que consome |
|--------|------|---------------|
| **Wallets** (TradingService) | Consumidor | Cotações para registro de preço histórico em compras/vendas |
| **Wallets** (PerformanceService) | Consumidor | Cotações em lote para calcular valor atual da carteira |
| **Derivatives** | Consumidor | Séries de opções, gregas e metadados para busca e operações |
| **Analytics** (PatrimonyEvolution) | Consumidor | Histórico OHLCV para calcular evolução patrimonial |
| **Analytics** (Benchmark) | Consumidor | Histórico OHLCV para comparação com IBOV |
| **Proventos** (Sentinel) | Consumidor | Histórico de strikes para detecção de dividendos |
| **Wallets** (AssetResolver) | Interno | Criação lazy de ativos com dados da OpLab |

---

## 11. Dependências Externas

| Dependência | Uso |
|-------------|-----|
| OpLab API (`api.oplab.com.br/v3`) | Fonte primária de todos os dados de mercado |
| YahooFinance | Presente no código mas não utilizado como fallback efetivo |

**Configuração necessária:**
- `OPLAB_ACCESS_TOKEN`: token de autenticação da API OpLab. Se ausente, as funcionalidades de mercado ficam silenciosamente desabilitadas — sem erro no startup, sem alerta em produção.

---

## 12. Considerações e Limitações Conhecidas

- **Sem rate limiting:** O sistema não controla o volume de requisições enviadas à OpLab. Em cenários com muitos usuários simultâneos, pode saturar a API.
- **Sem circuit breaker:** Se a OpLab ficar indisponível, todos os módulos que dependem de dados de mercado serão afetados sem mecanismo de degradação graceful.
- **Cache sem limite de tamanho:** O cache em memória cresce indefinidamente enquanto o processo estiver rodando. Em deployments de longa duração com muitos tickers, pode causar pressão de memória.
- **Paginação em memória:** A busca de opções busca todas as séries da OpLab e pagina localmente. Para ativos com muitas opções, isso pode ser ineficiente.
- **Fallback apenas retroativo:** O fallback de datas tenta apenas dias anteriores (D-1 a D-3). Não há tentativa de buscar o próximo dia útil.
- **Token não validado no startup:** A ausência do `OPLAB_ACCESS_TOKEN` não impede a inicialização do sistema — o módulo inicia silenciosamente desabilitado, o que pode passar despercebido em ambiente de produção.
- **IBOV via OpLab:** O widget BenchmarkComparison do módulo Analytics consulta IBOV via `OpLabMarketService.getHistoricalSeries('IBOV', ...)`. A limitação é externa — se a OpLab não retornar dados históricos do IBOV, o widget fica indisponível. A implementação existe, mas não há garantia de disponibilidade dos dados.
- **Sentinel usa acesso direto:** O módulo Sentinel consulta a OpLab diretamente (sem passar pelo CompositeMarketService), duplicando a lógica de autenticação e criando dois pontos de configuração independentes.
