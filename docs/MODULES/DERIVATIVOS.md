# Derivativos — Opções: Compra, Venda, Ciclo de Vida e Calculadora de Payoff

## 1. Visão Geral

O módulo de Derivativos gerencia todo o ciclo de vida de posições em opções dentro do Advision. Ele cobre desde a abertura de uma posição (compra ou venda de opção) até seu encerramento (fechamento antecipado, exercício, atribuição ou vencimento), incluindo busca de opções disponíveis no mercado, calculadora de payoff interativa e suporte a estratégias multi-leg no backend.

---

## 2. Problema que Resolve

Opções são instrumentos financeiros com comportamento distinto das ações: têm data de vencimento, podem ser exercidas, atribuídas ou expirar sem valor, e seu resultado depende de eventos ao longo do tempo (não apenas da diferença entre compra e venda). Um sistema genérico de carteiras não é capaz de modelar corretamente esses eventos — é necessário registrar o tipo de encerramento, calcular o impacto correto no portfólio e manter o histórico de cada evento para fins de auditoria e análise.

---

## 3. Objetivos

- Permitir o registro de posições compradas (long) e vendidas (short) em opções.
- Suportar todos os eventos do ciclo de vida: fechamento, exercício, atribuição e vencimento.
- Impedir edições e deleções em posições que já tiveram eventos de ciclo de vida.
- Fornecer busca paginada de opções disponíveis no mercado B3.
- Oferecer calculadora de payoff para visualizar o resultado esperado de uma posição.

---

## 4. Escopo

**O que faz:**
- Compra (long) e venda (short) de opções.
- Fechamento antecipado de posições (buy to close / sell to close).
- Exercício de opções compradas (CALL e PUT).
- Registro de atribuição em opções vendidas (CALL e PUT).
- Registro de vencimento (ITM e OTM).
- Edição e deleção de entradas incorretas (bloqueado se já houve evento de ciclo de vida).
- Busca paginada de séries de opções com scroll infinito.
- Calculadora de payoff (100% no frontend).
- Histórico de posições encerradas.
- Estratégias multi-leg (backend implementado; interface removida da versão atual).

**O que não faz:**
- Não suporta exercício automático no vencimento — o assessor precisa registrar manualmente.
- Não executa ordens diretamente na bolsa — é um sistema de registro.
- Não exibe preços de gregas em tempo real na listagem de posições abertas.
- Estratégias multi-leg não têm interface disponível na versão atual.

---

## 5. Personas / Atores Envolvidos

| Ator | Papel |
|------|-------|
| Assessor | Registra operações, executa eventos de ciclo de vida, consulta histórico |
| Admin | Acesso idêntico ao assessor para fins de suporte |
| Sistema | Dispara notificações de vencimento após cada operação; atualiza colateral bloqueado |

---

## 6. Funcionalidades

### 6.1 Compra de Opção (Long)

O assessor registra a compra de uma opção informando o ticker, quantidade (em ações), prêmio por ação e data. Cada compra cria um lote separado — nunca é consolidado com uma posição existente do mesmo ticker. Isso permite rastreamento exato do custo de cada lote.

Se o ativo não existir no banco, é criado automaticamente via OpLab. Para opções com expiração passada (onde a OpLab não retorna mais dados), o assessor pode fornecer os metadados manualmente.

Após a compra, o sistema dispara automaticamente a verificação de notificações de vencimento para o assessor.

### 6.2 Venda de Opção (Short)

O assessor registra a venda de uma opção. O comportamento varia conforme o contexto:

- **Se não existe posição:** cria posição com quantidade negativa (short).
- **Se existe posição long:** reduz a quantidade (fechamento parcial ou total).
- **Se existe posição short:** acumula a nova venda com recálculo de preço médio.

Para opções vendidas a descoberto do tipo PUT, o sistema registra o valor do colateral bloqueado (`strikePrice × quantidade`).

### 6.3 Fechamento Antecipado (Close)

O assessor encerra uma posição antes do vencimento comprando de volta (para shorts) ou vendendo (para longs). Gera um evento `CLOSED` no ciclo de vida e registra o valor de liquidação.

### 6.4 Exercício (Exercise)

Disponível apenas para posições compradas (long). O sistema valida o tipo de exercício:
- **Opções americanas:** podem ser exercidas a qualquer momento.
- **Opções europeias:** apenas no dia do vencimento.

**CALL exercida:** O sistema cria ou atualiza uma posição no ativo subjacente. O preço médio do subjacente é calculado como `strike + prêmio pago por ação` — o prêmio é incorporado ao custo de aquisição.

**PUT exercida:** O sistema valida que o assessor possui ações suficientes do subjacente, reduz a posição do subjacente e registra a venda no strike.

### 6.5 Atribuição (Assignment)

Ocorre quando uma posição vendida (short) é exercida contra o assessor.

**CALL atribuída:** O assessor deve entregar ações no strike. O sistema reduz a posição do subjacente.

**PUT atribuída:** O assessor deve comprar ações no strike. O sistema cria ou atualiza a posição do subjacente com o preço de aquisição igual ao strike.

### 6.6 Vencimento (Expiry)

O assessor registra o vencimento de uma opção. O sistema determina se ela venceu dentro do dinheiro (ITM) ou fora do dinheiro (OTM) com base no preço atual do subjacente, registra o evento e remove a posição.

O vencimento não cria posição no subjacente automaticamente — o exercício deve ser feito separadamente se desejado.

### 6.7 Restrições de Edição e Deleção

Posições que já tiveram qualquer evento de ciclo de vida (fechamento, exercício, atribuição, vencimento) não podem ser editadas nem deletadas. Isso garante a integridade do histórico de operações.

### 6.8 Histórico de Posições Encerradas

O assessor pode consultar todas as posições já encerradas de uma carteira. Para cada encerramento, o histórico exibe o tipo de evento, ticker, strike, data, quantidade e valor de liquidação.

### 6.9 Busca de Opções (Search)

O assessor busca opções disponíveis em duas etapas:

1. **Seleciona o ativo subjacente:** busca pela ação (ex: PETR4).
2. **Navega pelas séries disponíveis:** filtra por tipo (CALL/PUT) ou busca por ticker específico.

Os resultados são paginados (50 por página) com carregamento automático por scroll infinito. Cada item exibe: ticker da opção, strike, vencimento, tipo, bid, ask e gregas.

O assessor também pode digitar o ticker diretamente se já souber o código.

### 6.10 Calculadora de Payoff

Uma calculadora interativa mostra o resultado esperado de uma posição de opção em função do preço do ativo subjacente no vencimento. O gráfico exibe:

- O payoff para cada preço possível do subjacente.
- Linhas de referência: strike, preço atual e ponto de equilíbrio (breakeven).
- Área verde para resultados positivos e área vermelha para negativos.

A calculadora funciona exclusivamente no frontend — sem consulta ao backend.

### 6.11 Estratégias Multi-Leg (Backend)

O backend suporta a execução de estratégias com múltiplas pernas: Straddle, Strangle, Covered Call, Protective Put, Collar e estratégias customizadas (até 4 pernas). A interface de usuário foi removida da versão atual do produto, mas toda a lógica de backend permanece funcional e disponível via API.

---

## 7. Regras de Negócio

| Código | Regra |
|--------|-------|
| BR-DERIV-01 | Cada compra de opção cria um lote separado — nunca é consolidada com uma posição existente. |
| BR-DERIV-02 | Operações com a mesma chave de idempotência na mesma carteira são rejeitadas como duplicatas. |
| BR-DERIV-03 | Edição e deleção de posições são bloqueadas se qualquer evento de ciclo de vida já foi registrado. |
| BR-DERIV-04 | Quantidade em sistema é sempre em ações, nunca em contratos. O tamanho padrão do contrato B3 é 100 ações. |
| BR-DERIV-05 | Short PUTs têm colateral registrado: `strikePrice × quantidade de ações`. |
| BR-DERIV-06 | Covered Calls são validadas: o assessor deve ter ações suficientes do subjacente. |
| BR-DERIV-07 | No exercício de CALL, o custo médio das ações adquiridas é `strike + prêmio por ação`. |
| BR-DERIV-08 | Opções europeias só podem ser exercidas no dia do vencimento. Opções americanas podem ser exercidas a qualquer momento. |
| BR-DERIV-09 | Exercício é all-or-nothing — sempre processa a quantidade total da posição. Atribuição aceita quantidade parcial (`data.quantity <= posição atual`), permitindo atribuições parciais em posições short. |
| BR-DERIV-10 | Atribuição é válida apenas para posições short (quantidade negativa). Exercício é válido apenas para posições long (quantidade positiva). |
| BR-DERIV-11 | Vencimento exige que a data atual seja igual ou posterior ao vencimento da opção. |
| BR-DERIV-12 | O limiar de ATM (At The Money) é de 1% do strike — se o preço do subjacente estiver dentro dessa faixa, a opção é classificada como ATM. |
| BR-DERIV-13 | Após compra, venda ou fechamento de opção, o sistema dispara verificação de notificações de vencimento com reprocessamento imediato (ignora throttle de 24h). |
| BR-DERIV-14 | O prêmio no histórico de fechamentos realizados (CLOSED) é calculado como: +valor para sell-to-close, -valor para buy-to-close. |

---

## 8. Fluxos Principais

### 8.1 Compra de Opção (Long)

1. Assessor seleciona ativo subjacente e busca série de opções.
2. Escolhe a opção desejada e informa quantidade e prêmio.
3. Frontend gera chave de idempotência.
4. Backend valida idempotência, garante que o ativo existe, cria posição long.
5. Cria registro de transação (BUY) e evento de ciclo de vida (OPENED).
6. Dispara verificação de notificações de vencimento em background.
7. Retorna dashboard atualizado.

### 8.2 Venda de Opção (Short)

1. Assessor informa ticker, quantidade e prêmio recebido.
2. Backend verifica se existe posição long (para sell-to-close) ou cria posição short.
3. Para Short PUT: registra colateral bloqueado.
4. Para Covered Call: valida que existe posição de ações suficiente.
5. Cria transação (SELL) e evento de ciclo de vida.
6. Dispara notificações.
7. Retorna dashboard atualizado.

### 8.3 Exercício de CALL Comprada

1. Assessor clica em "Exercer" na posição.
2. Sistema valida: posição é long, opção é CALL, data permitida para tipo de exercício.
3. Cria transação de exercício no preço de strike.
4. Cria ou atualiza posição do subjacente com custo médio = `strike + prêmio/ação`.
5. Remove posição da opção.
6. Registra evento EXERCISED no ciclo de vida.

### 8.4 Vencimento de Opção

1. Assessor clica em "Registrar Vencimento".
2. Sistema valida que a data atual é >= data de vencimento.
3. Consulta preço atual do subjacente.
4. Determina ITM ou OTM com base no preço e tipo (CALL/PUT).
5. Cria transação com preço zero.
6. Registra evento EXPIRED_ITM ou EXPIRED_OTM.
7. Remove posição da opção.
8. Dispara notificações com forceRefresh.

### 8.5 Consulta de Histórico

1. Assessor acessa a carteira e navega para o histórico de opções encerradas.
2. Sistema retorna todos os eventos terminais (CLOSED, EXERCISED, ASSIGNED, EXPIRED_ITM, EXPIRED_OTM) ordenados por data.
3. O histórico exibe o resultado líquido de prêmios em fechamentos.

---

## 9. Entidades e Relacionamentos

### Detalhe de Opção (OptionDetail)

Armazenado por ativo do tipo OPTION. Captura as características do contrato.

| Atributo | Descrição |
|----------|-----------|
| optionType | CALL ou PUT |
| exerciseType | AMERICAN (exercível a qualquer momento) ou EUROPEAN (apenas no vencimento) |
| strikePrice | Preço de exercício atual (pode ser ajustado por dividendos) |
| initialStrike | Preço de exercício original — nunca modificado |
| expirationDate | Data de vencimento |
| contractSize | Tamanho do contrato em ações (padrão B3: 100) |

### Evento de Ciclo de Vida (OptionLifecycle)

Registra cada evento significativo de uma posição de opção. Funciona como log imutável.

| Atributo | Descrição |
|----------|-----------|
| event | OPENED (reservado — definido no enum mas não criado pelo código atual), CLOSED, EXERCISED, ASSIGNED, EXPIRED_ITM, EXPIRED_OTM |
| strikePrice | Snapshot do strike no momento do evento |
| settlementAmount | Valor de liquidação (para CLOSED, EXERCISED, ASSIGNED) |
| underlyingQuantity | Quantidade de ações do subjacente afetadas |
| occurredAt | Timestamp do evento |

**Restrição de integridade:** Enquanto existir ao menos um OptionLifecycle para uma posição, essa posição não pode ser editada nem deletada.

### Operação Estruturada (StructuredOperation)

Agrupa múltiplas pernas de uma estratégia. Contém a estratégia e seu resultado agregado.

### Perna de Operação (OperationLeg)

Representa cada perna individual de uma estratégia multi-leg. Tipos: BUY_CALL, SELL_CALL, BUY_PUT, SELL_PUT, BUY_STOCK, SELL_STOCK.

---

## 10. Integrações com Outros Módulos

| Módulo | Tipo | Descrição |
|--------|------|-----------|
| **Carteiras** | Dependência | As posições de opções são armazenadas no mesmo modelo de Position das ações; o módulo de Derivativos opera sobre as carteiras |
| **Integração de Mercado** | Dependência | Busca séries de opções, cotações e metadados para resolução de ativos |
| **Notificações** | Consumidor | Dispara reprocessamento de alertas de vencimento após cada operação |
| **Proventos / Sentinel** | Relacionado | O `initialStrike` é mantido imutável para que o Sentinel possa detectar quedas de strike causadas por dividendos |

---

## 11. Dependências Externas

| Dependência | Uso |
|-------------|-----|
| OpLab API | Busca de séries de opções, cotações para exercício/atribuição/vencimento, metadados de ativos |
| recharts (frontend) | Renderização do gráfico de payoff |

---

## 12. Considerações e Limitações Conhecidas

- **Exercício manual:** O sistema não exerce opções automaticamente no vencimento — o assessor precisa registrar cada evento manualmente. Isso é uma decisão de design para manter controle explícito sobre operações.
- **Sem exercício parcial:** Um exercício ou atribuição sempre afeta a posição inteira — não é possível exercer apenas parte de uma posição.
- **Estratégias multi-leg sem UI:** O backend suporta straddle, strangle, covered call, protective put, collar e estratégias customizadas, mas a interface de usuário foi removida. O motivo foi a complexidade de uso vs. benefício percebido na versão atual do MVP.
- **Payoff sem gregas:** A calculadora de payoff mostra o resultado teórico no vencimento, mas não considera o valor temporal (theta) nem variações de volatilidade (vega) antes do vencimento.
- **Colateral informativo:** O campo `collateralBlocked` registra a margem bloqueada para short PUTs, mas o sistema não valida se o assessor tem saldo suficiente — é um registro informativo, não um controle de risco.
