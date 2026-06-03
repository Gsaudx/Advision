# Carteiras — Gestão de Portfólio, Trading e Performance

## 1. Visão Geral

O módulo de Carteiras é o núcleo operacional do Advision. É onde o assessor registra as posições dos clientes, realiza operações de compra e venda, acompanha a performance de cada carteira e visualiza a concentração dos investimentos. Toda a lógica de portfólio — preço médio, P&L, proventos, concentração — está centralizada aqui.

---

## 2. Problema que Resolve

Assessores de investimentos precisam acompanhar, em um único lugar, todas as posições de todos os seus clientes. Eles precisam saber quanto cada posição vale hoje, quanto custou, quanto rendeu, quanto já realizaram em ganhos ou perdas, e quanto receberam em dividendos. Sem uma ferramenta centralizada, esse acompanhamento é feito em planilhas dispersas, sujeitas a erros e sem visão consolidada.

---

## 3. Objetivos

- Permitir o registro e acompanhamento de posições em ações e opções.
- Calcular automaticamente preço médio, P&L realizado e não realizado, e rentabilidade.
- Oferecer visão de concentração por ativo, tipo e setor.
- Suportar correções retroativas (edição e deleção de transações) com recálculo automático.
- Manter idempotência nas operações para evitar duplicações.

---

## 4. Escopo

**O que faz:**
- CRUD de carteiras por cliente.
- Operações de compra e venda de ações e opções.
- Registro de vencimento de opções.
- Edição e deleção de transações com recálculo automático de posições.
- Cálculo de performance: realizado, não realizado, proventos, rentabilidade.
- Cálculo de concentração por ativo, tipo e setor.
- Busca de ativos (ações e opções) com resolução automática via OpLab.
- Consulta de preço histórico retroativo com fallback para datas sem negociação.
- Stream de eventos (SSE) para atualização em tempo real de dividendos.

**O que não faz:**
- Não suporta renda fixa, fundos ou outros tipos de ativos além de ações e opções B3.
- Não calcula retorno ponderado pelo tempo (TWR) — a rentabilidade é simples sobre o custo médio.
- Não segregação de lotes FIFO/LIFO — posições são consolidadas com preço médio ponderado.
- Não possui histórico diário de patrimônio (esse cálculo está no módulo Analytics).
- Módulo de otimização de carteira (Knapsack) está planejado mas não implementado — existe como shell vazio sem endpoints.

---

## 5. Personas / Atores Envolvidos

| Ator | Papel |
|------|-------|
| Assessor | Cria carteiras, registra operações, acompanha performance dos clientes |
| Admin | Acesso idêntico ao assessor para fins de suporte |
| Cliente | Visualiza suas próprias carteiras e performance (somente leitura) |

---

## 6. Funcionalidades

### 6.1 Gestão de Carteiras

O assessor cria carteiras associadas a clientes. Cada carteira tem nome, descrição opcional e moeda (sempre BRL). Não há limite de carteiras por cliente.

A exclusão de uma carteira remove em cascata todas as posições e transações associadas.

### 6.2 Compra de Ativos (BUY)

O assessor registra uma compra informando o ticker, quantidade, preço e data. Se o ativo ainda não existe no banco, o sistema o cria automaticamente consultando a OpLab.

O preço médio é calculado como média ponderada entre a posição existente e a nova compra. Cada operação é identificada por uma chave de idempotência — uma compra repetida com a mesma chave é silenciosamente ignorada, evitando duplicações por retry do frontend.

**Fórmula do preço médio:**
```
Novo Preço Médio = (Qtd Atual × Preço Médio Atual + Qtd Nova × Preço Nova) / (Qtd Atual + Qtd Nova)
```

### 6.3 Venda de Ativos (SELL)

O assessor registra uma venda informando ticker, quantidade, preço e data. O sistema valida que a posição tem quantidade suficiente. Quando a venda zera a posição, o registro é removido automaticamente.

O preço médio da posição não é alterado em vendas parciais — apenas a quantidade diminui.

### 6.4 Vencimento de Opção (EXPIRE)

Quando uma opção vence sem valor, o assessor registra o vencimento informando o ticker e a data. O sistema cria uma transação do tipo `EXPIRED` com preço zero e remove a posição.

### 6.5 Edição e Deleção de Transações

O assessor pode corrigir erros em transações já registradas. Editar uma transação (data, preço ou quantidade) ou deletá-la dispara um recálculo automático da posição: o sistema faz um replay de todas as transações do ativo naquela carteira, do mais antigo ao mais recente, para reconstruir o estado correto da posição.

### 6.6 Histórico de Transações

O assessor pode consultar o histórico completo de operações de uma carteira com paginação por cursor — 50 itens por página, sem limite de histórico.

### 6.7 Cálculo de Performance

Para cada carteira, o sistema calcula:

- **P&L Realizado:** soma dos ganhos e perdas em vendas e vencimentos encerrados.
- **P&L Não Realizado:** diferença entre o valor atual de mercado e o custo de referência das posições abertas.
- **Proventos Recebidos:** dividendos e JCP detectados pelo módulo Sentinel.
- **Rentabilidade %:** P&L total dividido pelo custo total das posições abertas.

O custo de referência para o P&L não realizado é ajustado quando o módulo Sentinel detecta um dividendo: o sistema registra o preço da ação no ex-date, e esse preço passa a ser a referência, evitando que a queda artificial de preço no ex-date distorça o resultado.

### 6.8 Cálculo de Concentração

A visão de concentração mostra a distribuição do portfólio em três dimensões:
- **Por ativo:** percentual de cada ticker no total investido.
- **Por tipo:** ações vs. opções.
- **Por setor:** setor econômico de cada empresa.

### 6.9 Busca e Resolução de Ativos

O assessor pode buscar ativos por ticker ou nome. Ao realizar uma operação com um ativo ainda não cadastrado no sistema, o banco de dados é populado automaticamente com os dados da OpLab — o processo é transparente para o usuário.

### 6.10 Preço Histórico Retroativo

Para registros de operações em datas passadas, o sistema busca o preço do ativo naquela data. Se a data cair em um final de semana ou feriado, o sistema faz até 4 tentativas em sequência: D, D-1, D-2, D-3 (dias calendários, não apenas úteis). Se nenhuma das 4 datas tiver dados, retorna `null`.

### 6.11 Stream de Eventos (SSE)

O endpoint `/wallets/:id/events` (implementado pelo módulo Sentinel) emite eventos via Server-Sent Events para notificar o frontend quando novos dividendos são detectados, permitindo atualização da tela sem recarregar a página. Os eventos emitidos são `dividends_updated` e `check_complete`.

---

## 7. Regras de Negócio

| Código | Regra |
|--------|-------|
| BR-WALLET-01 | O preço médio é calculado como média ponderada: `(Qtd Atual × PM Atual + Qtd Nova × Preço Nova) / (Qtd Atual + Qtd Nova)`. |
| BR-WALLET-02 | Vender tudo (quantidade chega a zero) remove a posição automaticamente. |
| BR-WALLET-03 | Uma operação com a mesma chave de idempotência (`idempotencyKey`) na mesma carteira é rejeitada como duplicata. |
| BR-WALLET-04 | Vender uma quantidade maior do que a posição existente é rejeitado. |
| BR-WALLET-05 | Editar ou deletar uma transação dispara recálculo completo da posição por replay de todas as transações do ativo. |
| BR-WALLET-06 | P&L realizado em venda: `(preço de venda - preço médio) × quantidade`. |
| BR-WALLET-07 | P&L realizado em vencimento (EXPIRED): `(-preço médio) × quantidade` (perda total do prêmio investido). |
| BR-WALLET-08 | O preço de referência para P&L não realizado é `priceAtLastDividend` quando disponível; caso contrário, usa `averagePrice`. Isso evita distorção pelo ex-date. |
| BR-WALLET-09 | Rentabilidade % é calculada sobre o custo total das posições abertas: `P&L Total / Σ(quantidade × preço médio)`. Se não há posições abertas, rentabilidade é 0%. |
| BR-WALLET-10 | Posições são consolidadas em um único registro por ativo — múltiplas compras atualizam o preço médio da posição existente. |
| BR-WALLET-11 | Em caso de concorrência (race condition), o sistema tenta atualizar a posição até 3 vezes antes de falhar. |
| BR-WALLET-12 | Operações de compra e venda são acessíveis apenas para ADVISOR e ADMIN. Clientes têm acesso somente leitura. |
| BR-WALLET-13 | Transações do tipo `EXPIRED` sempre têm preço zero e valor total zero. |
| BR-WALLET-14 | A concentração é calculada apenas sobre posições investidas — sem participação de caixa. |

---

## 8. Fluxos Principais

### 8.1 Compra de Ação ou Opção

1. Assessor informa ticker, quantidade, preço e data.
2. Frontend gera e envia uma chave de idempotência única.
3. Sistema verifica se a chave já foi usada — se sim, rejeita como duplicata.
4. Se o ativo não existe no banco, consulta a OpLab e cria o registro automaticamente.
5. Verifica se já existe uma posição para esse ativo nessa carteira.
6. Se não existe: cria nova posição com quantidade e preço informados.
7. Se existe: recalcula o preço médio ponderado e atualiza a posição.
8. Cria o registro de transação (tipo BUY).
9. Retorna o dashboard atualizado da carteira.

### 8.2 Venda de Ação ou Opção

1. Assessor informa ticker, quantidade e preço de venda.
2. Sistema verifica idempotência.
3. Valida que a posição existe e tem quantidade suficiente.
4. Calcula a nova quantidade: `existente - vendida`.
5. Se nova quantidade = 0: remove a posição.
6. Se nova quantidade > 0: atualiza apenas a quantidade (preço médio não muda em vendas).
7. Cria o registro de transação (tipo SELL).
8. Retorna o dashboard atualizado.

### 8.3 Correção de Transação

1. Assessor edita preço, quantidade ou data de uma transação passada.
2. Sistema atualiza o registro da transação.
3. Faz replay de todas as transações daquele ativo na carteira, em ordem cronológica.
4. Reconstrói a posição (quantidade e preço médio) do zero.
5. Se a posição chegar a zero, remove o registro.
6. Retorna o dashboard atualizado.

### 8.4 Consulta de Performance

1. Assessor (ou cliente) acessa o dashboard da carteira ou a aba de performance.
2. Sistema busca todas as transações e posições abertas.
3. Faz replay das transações para calcular P&L realizado.
4. Consulta preços atuais via OpLab (com cache de 60s) para P&L não realizado.
5. Lê proventos registrados pelo Sentinel.
6. Agrega os três componentes e calcula a rentabilidade %.
7. Retorna o resultado formatado.

---

## 9. Entidades e Relacionamentos

### Carteira (Wallet)

Agrupa posições e transações de um cliente. Um cliente pode ter múltiplas carteiras (ex: uma para ações, outra para derivativos).

| Atributo | Descrição |
|----------|-----------|
| name | Nome da carteira (ex: "Carteira Principal", "Derivativos") |
| description | Descrição opcional |
| currency | Moeda (sempre BRL) |

**Relacionamentos:**
- Pertence a um Client.
- Contém muitas Positions.
- Contém muitas Transactions.
- Recebe Notifications (de vencimento de opções).
- Recebe WalletDividendPayments (do módulo Proventos).

### Posição (Position)

Representa o estado atual de um ativo em uma carteira. Quantidade positiva = comprado (long). Quantidade negativa = vendido (short, apenas para opções).

| Atributo | Descrição |
|----------|-----------|
| quantity | Quantidade atual (em ações — nunca em contratos) |
| averagePrice | Preço médio de compra |
| originTransactionId | ID da transação que criou esta posição (rastreabilidade) |
| priceAtLastDividend | Preço da ação no ex-date do último dividendo — referência para P&L não realizado |
| collateralBlocked | Margem reservada (para opções vendidas a descoberto) |

**Não há unique constraint entre (walletId, assetId)** — o sistema permite múltiplos registros de posição para o mesmo ativo, embora na prática consolide em um único por lote.

### Transação (Transaction)

Registro imutável de cada operação. As posições são o estado derivado das transações — sempre reconstruíveis por replay.

| Tipo | Quando é usado |
|------|----------------|
| BUY | Compra de ação ou opção |
| SELL | Venda de ação ou opção |
| EXPIRED | Opção vencida sem valor |
| DIVIDEND | Dividendo recebido (sem quantidade de ativo) |
| SPLIT | Desdobramento de ações |
| OPTION_EXERCISE | Exercício de opção comprada |
| OPTION_ASSIGNMENT | Atribuição de opção vendida |
| OPTION_EXPIRY | Vencimento processado pelo módulo Derivativos |
| SUBSCRIPTION | Subscrição de direitos (reservado para uso futuro) |

**Chave de idempotência:** única por carteira — garante que a mesma operação não seja registrada duas vezes.

---

## 10. Integrações com Outros Módulos

| Módulo | Tipo | Descrição |
|--------|------|-----------|
| **Integração de Mercado** | Dependência | Consulta cotações e séries de opções; cria ativos automaticamente via OpLab |
| **Proventos / Sentinel** | Consumidor | Após compra de ação, dispara verificação de dividendos em background |
| **Proventos** | Fornecedor | Recebe pagamentos de dividendos via `WalletDividendPayment` que entram no P&L |
| **Notificações** | Consumidor | Após compra ou vencimento de opção, dispara atualização de alertas de vencimento |
| **Analytics** | Fornecedor | Provê dados de posições, transações e proventos para os widgets do painel analítico |
| **Clientes** | Dependência | Uma carteira sempre pertence a um cliente — a exclusão do cliente remove a carteira em cascata |

---

## 11. Dependências Externas

| Dependência | Uso |
|-------------|-----|
| OpLab API | Consulta de preços atuais, séries de opções e preços históricos |

---

## 12. Considerações e Limitações Conhecidas

- **Preço médio consolidado:** O sistema não diferencia lotes — todas as compras do mesmo ativo são consolidadas em uma única posição com preço médio ponderado. Não é possível aplicar métodos de custeio FIFO, LIFO ou específico.
- **Rentabilidade simples:** O cálculo de rentabilidade é sobre o custo médio das posições abertas. Não é ponderado pelo tempo (TWR) — entradas e saídas de capital não são normalizadas.
- **Otimização de carteira não implementada:** O módulo Knapsack está planejado como funcionalidade futura para sugerir alocação ótima de carteira. Atualmente existe apenas como estrutura de código sem endpoints.
- **Setor pode estar ausente:** O campo de setor econômico vem da OpLab e pode estar vazio para alguns ativos. A concentração por setor usa "Sem setor" como fallback.
- **Caixa excluído dos cálculos:** A concentração e rentabilidade consideram apenas posições investidas — sem conta de caixa no modelo de dados (removido em versão anterior).
- **Sem snapshot histórico diário:** Não há tabela de histórico de patrimônio. A evolução patrimonial é calculada dinamicamente pelo módulo Analytics a partir das transações.
