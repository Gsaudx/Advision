# Guia de Seed pela UI — Página de Análises

> Siga este guia do início ao fim para ter a página de **Análises** completamente preenchida usando só o frontend.
> Pré-requisito: backend rodando (`npm run start:dev` em `/backend`) e frontend rodando (`npm run dev` em `/frontend`).

---

## O que cada widget precisa

| Widget | Depende de |
|---|---|
| W01 Evolução Patrimonial | Compras de ações com datas no passado |
| W02 Rentabilidade vs IBOV | Mesmo que W01 |
| W03 Melhores/Piores Ativos | Posições abertas de ações |
| W05 Risco de Vencimento | Opções com vencimento futuro |
| W07 Ações Pendentes | Notificações de opção não lidas + carteiras sem operação recente |
| W08 Proventos | Sentinel detectar dividendos ao abrir carteira com ações |
| W10 Concentração | Posições abertas de ações |
| W11 Exposição Setorial | Posições abertas (setor vem da OpLab automaticamente ao criar ativo) |
| W13 Ranking de Clientes | Múltiplos clientes com posições |

---

## PASSO 1 — Criar Clientes

**Rota:** `/clients`

1. Clique em **"Novo Cliente"** (botão no canto superior direito da página).
2. No modal **"Novo Cliente"**, preencha:
   - **Apelido:** nome do cliente (mín. 2 caracteres)
   - **Código:** número de identificação interno (só dígitos)
3. Clique em **"Cadastrar Cliente"**.
4. Repita para criar pelo menos 3 clientes.

**Sugestão de dados:**

| Apelido | Código |
|---|---|
| João Silva | 10001 |
| Maria Oliveira | 10002 |
| Carlos Mendes | 10003 |

> O W13 (Ranking de Clientes) precisa de múltiplos clientes para ser interessante.

---

## PASSO 2 — Criar Carteiras

**Rota:** `/wallets`

1. Clique em **"Nova Carteira"** (botão no topo da página).
2. No modal **"Nova Carteira"**, preencha:
   - **Cliente:** selecione um cliente do dropdown
   - **Nome da Carteira:** nome descritivo
   - **Descrição:** (opcional)
   - **Moeda:** deixe BRL
3. Clique em **"Criar Carteira"**.
4. Repita para criar pelo menos 1 carteira por cliente.

**Sugestão de dados:**

| Cliente | Nome da Carteira |
|---|---|
| João Silva | Carteira Principal |
| Maria Oliveira | Carteira Conservadora |
| Carlos Mendes | Carteira Agressiva |

---

## PASSO 3 — Comprar Ações (histórico de posições)

**Rota:** `/wallets` → clique na carteira → botão **"Nova Operação"**

Para cada carteira criada:

1. Abra a carteira clicando no card dela.
2. Na página da carteira, clique no botão **"Nova Operação"** (no cabeçalho ou na aba de posições).
3. No modal **"Nova Operação"**:
   - Certifique-se de que a aba selecionada é **"Ativo"** (não "Opção")
   - Selecione a direção **"Comprar"**
   - **Ticker:** comece a digitar (ex: `PETR4`) e selecione no autocomplete
   - **Quantidade:** número de ações
   - **Preço:** preço de compra (o sistema pode sugerir a cotação atual — você pode editar)
   - **Data:** **altere para uma data no passado** (ex: `01/12/2024`) para ter histórico nos gráficos de evolução
4. Confirme a operação.

**Sugestão de compras por carteira:**

### João Silva — Carteira Principal
Registre compras com datas diferentes para ter pontos no gráfico de evolução:

| Ticker | Qtd | Preço aprox. | Data sugerida |
|---|---|---|---|
| PETR4 | 200 | 35,50 | 01/12/2024 |
| VALE3 | 100 | 68,00 | 15/01/2025 |
| ITUB4 | 150 | 32,80 | 10/02/2025 |

### Maria Oliveira — Carteira Conservadora

| Ticker | Qtd | Preço aprox. | Data sugerida |
|---|---|---|---|
| BBDC4 | 300 | 15,20 | 05/01/2025 |
| WEGE3 | 80 | 42,00 | 20/02/2025 |

### Carlos Mendes — Carteira Agressiva

| Ticker | Qtd | Preço aprox. | Data sugerida |
|---|---|---|---|
| PETR4 | 500 | 37,00 | 20/01/2025 |
| ABEV3 | 200 | 13,50 | 01/03/2025 |

> **Dica para W03 (Melhores/Piores):** registre preços acima e abaixo do valor atual de mercado. Ações compradas mais baratas aparecem como "top ganhos"; compradas mais caras aparecem como "top perdas".
>
> **Dica para W01/W02 (gráficos de linha):** distribua as compras ao longo de vários meses. Cada compra cria um ponto na curva patrimonial.

---

## PASSO 4 — Comprar Opções (vencimentos futuros)

**Rota:** `/wallets/:id` → botão **"Nova Operação"** → aba **"Opção"**

As opções geram dados para o **W05 (Risco de Vencimento)** e disparam o Sentinel para detectar proventos (**W08**).

1. Abra a carteira do João (ou Carlos).
2. Clique em **"Nova Operação"**.
3. No modal, selecione a aba **"Opção"** e a direção **"Comprar"**.
4. No campo **Ticker da Opção**, comece a digitar o ativo-base (ex: `PETR4`) — o autocomplete mostrará as séries de opções disponíveis na OpLab.
5. Selecione uma opção com **vencimento futuro** (preferível: 7–30 dias a partir de hoje para aparecer como crítica/aviso no W07).
6. Preencha:
   - **Contratos:** quantidade (ex: 5)
   - **Prêmio:** o sistema sugere o preço atual — pode manter ou editar
   - **Data:** pode deixar hoje
7. Confirme.

**Repita para 2–3 opções em carteiras diferentes** para ter dados no W05 e W07.

> **Se o autocomplete não mostrar opções:** a OpLab pode estar sem séries para aquele ativo. Tente PETR4, VALE3, ITUB4 ou BBDC4 — são os mais ativos.

---

## PASSO 5 — Gerar Histórico de Proventos (W08)

O widget de Proventos lê dados do **Sentinel**, que detecta dividendos automaticamente quando você **abre a página de uma carteira**.

**O que fazer:**

1. Abra cada carteira que tem ações (vá em `/wallets` e clique em cada card).
2. Aguarde ~5 segundos na página aberta — o Sentinel conecta via SSE e varre o histórico de dividendos dos ativos.
3. Repita para todas as carteiras.

Ativos com maior histórico de dividendos detectáveis: **PETR4, VALE3, ITUB4, BBDC4, ABEV3, WEGE3**.

> Se você comprou opções no Passo 4, o Sentinel já foi disparado automaticamente para aqueles ativos-base durante a compra. Mas abrir a carteira garante que todos os ativos (ações também) sejam varridos.

---

## PASSO 6 — Gerar Notificações Pendentes (W07)

O widget de **Ações Pendentes** exibe:
- Notificações de opções vencendo em breve (CRITICAL/WARNING, não lidas)
- Carteiras sem operação há mais de 90 dias

### Ampliar a janela de notificações

Por padrão, o sistema alerta apenas opções vencendo em 7 dias. Para ver mais notificações com os dados de exemplo:

1. Vá em **Configurações** → rota `/advisor/settings`.
2. Aumente a **janela de antecedência** para **30 dias**.
3. Clique em **Salvar** — isso força o reprocessamento imediato das notificações.

### Forçar geração de notificações

As notificações são geradas nos seguintes momentos:
- **Ao fazer login** — faça logout e login novamente.
- **Ao abrir o dashboard** (`/advisor/home`) — a cada acesso.
- **Ao registrar uma operação de opção** — já aconteceu no Passo 4.

Depois de gerar, as notificações aparecem no **sino** no header. Mantenha-as **não lidas** para aparecerem no W07.

---

## PASSO 7 — Invalidar o Cache e Ver os Dados

A página de Análises tem cache de 5 minutos por usuário. Para ver os dados recém-inseridos imediatamente:

1. Vá para a rota `/advisor/analytics` (ou clique em **Análises** no menu lateral).
2. Clique no botão **"Atualizar dados"** no topo da página.

Os 9 widgets vão buscar dados frescos.

---

## Checklist final

| Widget | O que fazer | Passo |
|---|---|---|
| W01 Evolução Patrimonial | Compras de ações com datas históricas (dez/2024 em diante) | 3 |
| W02 Rentabilidade vs IBOV | Mesmo que W01 | 3 |
| W03 Melhores/Piores | Compras com preços variados (acima e abaixo do mercado atual) | 3 |
| W05 Risco de Vencimento | Comprar opções com vencimento futuro | 4 |
| W07 Ações Pendentes | Configurar janela para 30 dias + logout/login | 6 |
| W08 Proventos | Abrir cada carteira e aguardar o Sentinel varrer | 5 |
| W10 Concentração | Posições abertas (PETR4 em múltiplas carteiras para ver o alerta) | 3 |
| W11 Exposição Setorial | Posições abertas (setores vêm da OpLab automaticamente) | 3 |
| W13 Ranking de Clientes | Pelo menos 3 clientes com carteiras e posições | 1–3 |

---

## Troubleshooting

**W08 vazio mesmo após abrir as carteiras:**
O Sentinel precisa encontrar opções ativas na OpLab para monitorar dividendos via queda de strike. Ativos sem opções líquidas (bid > 0) ficam com status `UNAVAILABLE`. Prefira PETR4 e VALE3.

**W11 com todos os ativos como "Não classificado":**
O setor é buscado na OpLab quando o ativo é criado no banco. Se o ativo já existia antes de a tabela `asset_sectors` ser criada, o setor não foi preenchido. Um administrador precisa rodar o reseed via API (`POST /analytics/sectors/reseed`). Se você tiver acesso admin, pode fazer isso pelo Swagger em `http://localhost:3000/api`.

**W07 sem ações pendentes:**
- Verifique se as notificações estão habilitadas em `/advisor/settings`.
- Certifique-se de que a janela está em 30 dias (não 7).
- Confirme que as opções compradas no Passo 4 têm vencimento dentro da janela configurada.
- Faça logout e login para forçar o reprocessamento.

**Gráficos de linha (W01/W02) com poucos pontos:**
Adicione mais compras com datas mensais espalhadas — uma por mês dos últimos 6 meses. O gráfico plota um ponto por data de transação.
