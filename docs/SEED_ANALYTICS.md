# Guia de Seed pela UI — Página de Análises

> Siga este guia do início ao fim para ter a página de **Análises** completamente preenchida usando só o frontend.
> Pré-requisito: backend rodando (`npm run start:dev` em `/backend`) e frontend rodando (`npm run dev` em `/frontend`).
>
> **Dados retroativos:** as compras do Passo 3 cobrem **maio/2025 → abril/2026** (~1 ano).
> Com o filtro **"1A"** na página `/analytics` você verá o histórico completo nos gráficos.

---

## Estado atual dos widgets (revisado em 2026-05-23)

| Widget | Label na UI | Observação |
|---|---|---|
| W01 | Evolução Patrimonial | Gráfico de área — 1 ponto por data de transação |
| W02 | Rentabilidade vs IBOV | 2 linhas normalizadas em % desde o início do período |
| W03 | Melhores & piores ativos | Top 5 ganhos + top 5 perdas (% e R$) |
| W05 | Risco de vencimento de opções | 5 janelas: 0–7d / 8–30d / 31–60d / 61–90d / >90d |
| W07 | Radar de inatividade | **Mock ativo no frontend** — exibe lista fixa. Dados reais do backend existem mas não conectados ainda |
| W08 | Proventos recebidos | Barras mensais + top pagadores. Populado pelo Sentinel ao abrir a carteira |
| W10 | Concentração de ativos | Tabela com alertas de sobrepeso/super concentrado |
| W11 | Exposição setorial | Barras por setor. Setor vem da OpLab ao criar o ativo |
| W13 | Ranking de clientes | Tabela ordenável — default por patrimônio |

---

## O que cada widget precisa

| Widget | Depende de |
|---|---|
| W01 Evolução Patrimonial | Compras de ações com datas no passado (1 por mês = 1 ponto por mês) |
| W02 Rentabilidade vs IBOV | Mesmo que W01 |
| W03 Melhores/Piores | Posições abertas com preços de compra variados (acima e abaixo do mercado atual) |
| W05 Risco de Vencimento | Opções com vencimento futuro em janelas distintas |
| W07 Radar de Inatividade | **Mock hardcoded** — independe de dados reais por enquanto |
| W08 Proventos | Abrir cada carteira para o Sentinel detectar dividendos via OpLab |
| W10 Concentração | Posições abertas (mesmo ativo em múltiplas carteiras aciona alertas) |
| W11 Exposição Setorial | Posições abertas + setor buscado na OpLab (reseed se ativos já existiam) |
| W13 Ranking de Clientes | Múltiplos clientes com posições e datas de operação variadas |

---

## PASSO 1 — Criar Clientes

**Rota:** `/clients` → botão **"Novo Cliente"**

1. Clique em **"Novo Cliente"**
2. Preencha **Apelido** e **Código** (só dígitos)
3. Clique em **"Cadastrar Cliente"**
4. Repita para todos os clientes abaixo

**Dados sugeridos:**

| Apelido | Código |
|---|---|
| João Silva | 10001 |
| Maria Oliveira | 10002 |
| Carlos Mendes | 10003 |
| Ana Ferreira | 10004 |

> Quatro clientes tornam o **W13 (Ranking)** mais interessante e permitem ver alertas de patrimônio variados.

---

## PASSO 2 — Criar Carteiras

**Rota:** `/wallets` → botão **"Nova Carteira"**

1. Clique em **"Nova Carteira"**
2. Selecione o **Cliente**, preencha **Nome** e deixe moeda em BRL
3. Clique em **"Criar Carteira"**

**Dados sugeridos:**

| Cliente | Nome da Carteira |
|---|---|
| João Silva | Carteira Principal |
| Maria Oliveira | Carteira Conservadora |
| Carlos Mendes | Carteira Agressiva |
| Ana Ferreira | Carteira Dividendos |

---

## PASSO 3 — Comprar Ações (histórico de 1 ano)

**Rota:** `/wallets` → clique na carteira → botão **"Nova Operação"**

No modal:
- Aba: **"Ativo"**
- Direção: **"Comprar"**
- **Edite o campo "Data"** para a data indicada abaixo — isso cria pontos históricos nos gráficos W01 e W02
- O campo "Preço" é livre — use os valores sugeridos

> **Regra de ouro:** cada compra com uma data diferente = um ponto a mais na curva de evolução patrimonial. Com 12 compras distribuídas mensalmente você tem uma curva de 1 ano.

---

### João Silva — Carteira Principal

| Ticker | Qtd | Preço | Data |
|---|---|---|---|
| PETR4 | 300 | 38,00 | 15/05/2025 |
| VALE3 | 100 | 62,00 | 16/06/2025 |
| ITUB4 | 200 | 30,00 | 14/07/2025 |
| PETR4 | 100 | 40,50 | 12/08/2025 |
| BBDC4 | 150 | 16,00 | 09/09/2025 |
| VALE3 | 50 | 58,00 | 13/10/2025 |
| WEGE3 | 60 | 48,00 | 10/11/2025 |
| ITUB4 | 80 | 29,00 | 08/12/2025 |
| PETR4 | 50 | 44,00 | 12/01/2026 |
| ABEV3 | 200 | 14,00 | 10/02/2026 |
| VALE3 | 80 | 65,00 | 10/03/2026 |
| BBDC4 | 100 | 17,50 | 08/04/2026 |

### Maria Oliveira — Carteira Conservadora

| Ticker | Qtd | Preço | Data |
|---|---|---|---|
| BBDC4 | 400 | 15,50 | 20/05/2025 |
| WEGE3 | 80 | 45,00 | 18/07/2025 |
| ITUB4 | 120 | 31,00 | 15/09/2025 |
| BBDC4 | 200 | 14,80 | 17/11/2025 |
| WEGE3 | 40 | 52,00 | 15/01/2026 |
| ABEV3 | 300 | 13,20 | 16/03/2026 |

### Carlos Mendes — Carteira Agressiva

| Ticker | Qtd | Preço | Data |
|---|---|---|---|
| PETR4 | 600 | 36,00 | 22/05/2025 |
| ABEV3 | 300 | 12,80 | 20/07/2025 |
| VALE3 | 150 | 60,00 | 18/09/2025 |
| PETR4 | 200 | 42,00 | 15/11/2025 |
| ABEV3 | 100 | 15,00 | 12/01/2026 |
| VALE3 | 100 | 68,00 | 10/03/2026 |

### Ana Ferreira — Carteira Dividendos

| Ticker | Qtd | Preço | Data |
|---|---|---|---|
| ITUB4 | 500 | 29,50 | 01/06/2025 |
| BBDC4 | 600 | 15,00 | 01/08/2025 |
| PETR4 | 200 | 37,00 | 01/10/2025 |
| VALE3 | 120 | 63,00 | 02/12/2025 |
| ITUB4 | 200 | 33,00 | 02/02/2026 |
| BBDC4 | 300 | 16,50 | 01/04/2026 |

---

> **Dicas para W03 (Melhores/Piores):**
> - Compras com preço **abaixo** do valor atual aparecem como **ganhos** (ex: VALE3 a 58,00 e BBDC4 a 14,80)
> - Compras com preço **acima** do valor atual aparecem como **perdas** (ex: PETR4 a 44,00 e ABEV3 a 15,00)
> - Você controla o campo "Preço" livremente — ajuste se quiser forçar ganhos ou perdas específicas

> **Dicas para W10 (Concentração):**
> - PETR4 aparece em 3 carteiras → deve acionar alerta **"super concentrado"** (vermelho)
> - BBDC4 aparece em 3 carteiras → idem
> - VALE3 aparece em 4 carteiras → também aparece em destaque

> **Dicas para W13 (Ranking):**
> - João tem o histórico mais longo (12 compras) — patrimônio e rentabilidade mais ricos
> - Ana tem concentração em ações pagadoras de dividendos (ITUB4, BBDC4) — aparece bem no W08

---

## PASSO 4 — Opções (histórico completo com 3 fluxos)

> **Todos os tickers abaixo são reais e verificados na OpLab** (consultados em 23/mai/2026).

### Os 3 fluxos disponíveis na UI

**Fluxo A — Opção aberta (aparece no W05):**
> Nova Operação → Opção → Comprar → digitar ticker → alterar data → confirmar → **não fechar**

**Fluxo B — Opção que venceu sem valor:**
> Mesmo que A → depois ir na aba **"Opções"** da carteira → botão **"Expirar"** na posição → confirmar

**Fluxo C — Opção exercida (foi lucrativa):**
> Mesmo que A → depois ir na aba **"Opções"** da carteira → botão **"Exercer"** na posição → confirmar

### Como registrar cada opção

**Rota:** `/wallets/:id` → botão **"Nova Operação"** → aba **"Opção"** → direção **"Comprar"**

1. Digite o ticker diretamente no campo (não precisa do autocomplete)
2. Aguarde carregar os detalhes — se o prêmio não preencher, insira manualmente
3. Preencha **Contratos** com o valor da tabela
4. **Altere a data** para a data de compra indicada
5. Confirme — para Fluxo B e C, vá na aba Opções e use os botões da posição

---

### João Silva — Carteira Principal

| # | Ticker | Tipo | Contratos | Ações equiv. | Vencimento | Data compra | Prêmio sugerido | Fluxo | W05 janela | Como inserir |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | PETRE310W5 | CALL | 3 | 300 | 29/mai/2026 | 15/mai/2026 | 1,20 | **A** — Aberta | Vermelha (5d) | Digitar direto |
| 2 | PETRF173 | CALL | 5 | 500 | 19/jun/2026 | 20/abr/2026 | 0,50 | **A** — Aberta | Âmbar (19d) | Digitar direto |
| 3 | PETRG748 | CALL | 4 | 400 | 17/jul/2026 | 15/mar/2026 | 2,80 | **C** — Exercer | — | Digitar direto |
| 4 | PETRH694 | CALL | 2 | 200 | 21/ago/2026 | 10/fev/2026 | 3,50 | **A** — Aberta | Verde-suave (64d) | Digitar direto |
| 5 | PETRJ253 | CALL | 3 | 300 | 16/out/2026 | 05/jan/2026 | 1,80 | **A** — Aberta | Cinza (102d) | Digitar direto |

### Maria Oliveira — Carteira Conservadora

| # | Ticker | Tipo | Contratos | Ações equiv. | Vencimento | Data compra | Prêmio sugerido | Fluxo | W05 janela | Como inserir |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | VALEE600W5 | CALL | 2 | 200 | 29/mai/2026 | 05/mai/2026 | 0,80 | **B** — Expirar | — | Digitar direto |
| 2 | VALEF251 | CALL | 3 | 300 | 19/jun/2026 | 01/abr/2026 | 2,00 | **A** — Aberta | Âmbar (19d) | Digitar direto |
| 3 | VALEG161 | CALL | 2 | 200 | 17/jul/2026 | 20/fev/2026 | 1,50 | **C** — Exercer | — | Digitar direto |
| 4 | VALEH159 | CALL | 2 | 200 | 21/ago/2026 | 10/jan/2026 | 3,00 | **A** — Aberta | Verde-suave (64d) | Digitar direto |

### Carlos Mendes — Carteira Agressiva

| # | Ticker | Tipo | Contratos | Ações equiv. | Vencimento | Data compra | Prêmio sugerido | Fluxo | W05 janela | Como inserir |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | PETRQ310W5 | PUT | 6 | 600 | 29/mai/2026 | 02/mai/2026 | 1,50 | **B** — Expirar | — | Digitar direto |
| 2 | PETRS304W2 | PUT | 4 | 400 | 10/jul/2026 | 15/jan/2026 | 2,80 | **C** — Exercer | — | Digitar direto |
| 3 | PETRT694 | PUT | 3 | 300 | 21/ago/2026 | 10/mar/2026 | 3,50 | **A** — Aberta | Verde-suave (64d) | Digitar direto |
| 4 | VALER251 | PUT | 2 | 200 | 19/jun/2026 | 01/mai/2026 | 2,20 | **A** — Aberta | Âmbar (19d) | Digitar direto |
| 5 | VALEJ169 | CALL | 3 | 300 | 16/out/2026 | 20/abr/2026 | 4,80 | **A** — Aberta | Cinza (102d) | Digitar direto |

### Ana Ferreira — Carteira Dividendos

| # | Ticker | Tipo | Contratos | Ações equiv. | Vencimento | Data compra | Prêmio sugerido | Fluxo | W05 janela | Como inserir |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | ITUBE356W5 | CALL | 5 | 500 | 29/mai/2026 | 05/mai/2026 | 1,00 | **B** — Expirar | — | Digitar direto |
| 2 | ITUBG825 | CALL | 4 | 400 | 17/jul/2026 | 15/dez/2025 | 0,80 | **C** — Exercer | — | Digitar direto |
| 3 | ITUBG190 | CALL | 3 | 300 | 17/jul/2026 | 01/fev/2026 | 2,60 | **A** — Aberta | Verde (39d) | Digitar direto |
| 4 | ITUBH993 | CALL | 2 | 200 | 21/ago/2026 | 15/mar/2026 | 4,50 | **A** — Aberta | Verde-suave (64d) | Digitar direto |
| 5 | BBDCG972 | CALL | 6 | 600 | 17/jul/2026 | 01/abr/2026 | 1,40 | **A** — Aberta | Verde (39d) | Digitar direto |

---

### Cobertura do W05 após o seed

| Janela | Cor | Opções abertas |
|---|---|---|
| 0–7d | Vermelha | PETRE310W5 |
| 8–30d | Âmbar | PETRF173, VALEF251, VALER251 |
| 31–60d | Verde | ITUBG190, BBDCG972 |
| 61–90d | Verde-suave | PETRH694, VALEH159, PETRT694, ITUBH993 |
| >90d | Cinza | PETRJ253, VALEJ169 |

---

## PASSO 5 — Gerar Proventos via Sentinel (W08)

O widget de proventos lê a tabela `wallet_dividend_payments`, populada pelo **Sentinel** automaticamente ao abrir qualquer carteira.

1. Vá em `/wallets`
2. Clique na **Carteira Principal** do João — aguarde ~5 segundos
3. Clique na **Carteira Conservadora** da Maria — aguarde ~5 segundos
4. Clique na **Carteira Agressiva** do Carlos — aguarde ~5 segundos
5. Clique na **Carteira Dividendos** da Ana — aguarde ~5 segundos

> Ativos com maior histórico de dividendos detectáveis: **ITUB4, BBDC4, PETR4, VALE3, ABEV3, WEGE3**.
>
> O widget W08 respeita o filtro de período. Para ver todos os dividendos do ano, selecione **"1A"** na página de análises.

---

## PASSO 6 — W07 Radar de Inatividade

> **Importante:** o widget W07 está com **mock hardcoded** no componente `PendingActions.tsx`.
> Ele exibe uma lista fixa de clientes fictícios independente do que existir no banco — isso é comportamento esperado no estado atual do desenvolvimento.
>
> Quando o mock for removido, o widget passará a consumir dados reais. Para que esses dados existam, a **Carteira Conservadora da Maria** já fica com última operação em 16/03/2026 (>60 dias atrás), o que alimentará o backend corretamente.

---

## PASSO 7 — Verificar Exposição Setorial (W11)

O setor de cada ativo é buscado na OpLab **no momento em que a operação é registrada**. Se os ativos já existiam no banco antes da tabela `asset_sectors` ser criada, os setores não foram preenchidos.

**Como verificar se precisa de reseed:**
1. Abra `/analytics` e observe o widget **"Exposição setorial"**
2. Se todos aparecerem como **"Não classificado"**, o reseed é necessário

**Como fazer o reseed:**
1. Abra o Swagger em `http://localhost:3000/api`
2. Localize `POST /analytics/sectors/reseed`
3. Execute — preenche o setor de todos os ativos existentes a partir da OpLab

---

## PASSO 8 — Ver os dados na página

**Rota:** `/analytics`

1. Acesse `/analytics`
2. Clique no botão **"Atualizar dados"** no topo (invalida o cache de 5 min)
3. Selecione o período **"1A"** para ver o histórico completo nos gráficos W01, W02 e W08

---

## Checklist final

| Widget | O que fazer | Passo |
|---|---|---|
| W01 Evolução Patrimonial | 12 compras mensais de mai/2025 a abr/2026 | 3 |
| W02 Rentabilidade vs IBOV | Mesmo que W01, selecionar período "1A" | 3 |
| W03 Melhores/Piores | Compras com preços variados (acima e abaixo do mercado) | 3 |
| W05 Risco de Vencimento | 4 opções cobrindo as 4 primeiras janelas de tempo | 4 |
| W07 Radar de Inatividade | Sem ação — mock ativo, dados fixos por design | — |
| W08 Proventos | Abrir cada carteira e aguardar o Sentinel varrer | 5 |
| W10 Concentração | PETR4/BBDC4/VALE3 em múltiplas carteiras já aciona alertas | 3 |
| W11 Exposição Setorial | Executar reseed se ativos aparecerem como "Não classificado" | 7 |
| W13 Ranking de Clientes | 4 clientes com posições e datas variadas | 1–3 |

---

## Troubleshooting

**W01/W02 com poucos pontos ou linha plana:**
Com o filtro em "1M" você verá apenas as compras de abril/maio 2026 — mude para **"1A"** para ver o histórico completo. Se ainda assim estiver vazio, verifique se as datas foram salvas corretamente ao registrar a operação.

**W03 sem ganhos ou sem perdas:**
O resultado é calculado como `(cotação_atual − preço_médio) × quantidade`. Se todas as compras foram feitas com preços similares ao mercado atual, o resultado será próximo de zero. Ajuste os preços de compra nos registros (alguns bem abaixo, outros bem acima do mercado atual).

**W05 vazio:**
Confirme que as opções têm vencimento **futuro**. Opções com vencimento no passado não aparecem. Refaça a operação se necessário com uma série de vencimento futuro.

**W07 sempre mostra os mesmos clientes:**
Comportamento esperado — o componente usa mock hardcoded em `PendingActions.tsx:52–66`. Os dados reais do backend existem mas ainda não estão conectados no componente.

**W08 vazio mesmo após abrir as carteiras:**
O Sentinel precisa encontrar opções ativas com liquidez (bid > 0) na OpLab para monitorar dividendos via queda de strike. Ativos sem opções líquidas ficam como `UNAVAILABLE`. Prefira PETR4, ITUB4, BBDC4 e VALE3.

**W11 com todos os ativos como "Não classificado":**
Execute `POST /analytics/sectors/reseed` pelo Swagger em `http://localhost:3000/api`.

**W13 sem dados:**
O ranking exige pelo menos 1 cliente com pelo menos 1 carteira com pelo menos 1 posição aberta. Confirme que as compras do Passo 3 foram registradas com sucesso.
