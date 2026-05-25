# Preço Histórico de Opções

## Comportamento

O endpoint `/wallets/assets/:ticker/historical-price` retorna `price: null` e `message: "Sem dados para esta data"` para opções que nunca foram negociadas. Esse é o **comportamento correto e esperado**.

## Por que opções ilíquidas não têm dados históricos

O histórico de prêmio só existe quando houve um **negócio executado** (cruzamento de ordens de compra e venda na B3). Qualquer provedor de dados de mercado (OpLab, Bloomberg, etc.) segue essa regra.

Quando uma opção tem `lastPrice: 0` na busca ao vivo, significa que ela está listada mas nunca foi negociada — portanto não existe histórico de prêmio para nenhuma data.

**Exemplo:** `PETRQ310W5` (PETR4 PUT, strike R$30,46, venc. 29/05/2026) é profundamente fora do dinheiro com PETR4 negociada a ~R$37–44. Nenhum participante teve interesse em comprar ou vender, logo não há negócios e nem dados históricos.

## Apreçamento teórico da B3

A B3 possui uma metodologia interna de apreçamento teórico (usando a média do spread bid/ask) para fins de liquidação quando não há negócios. Esse valor **não é exposto** como preço histórico de mercado pela OpLab nem por nenhuma API padrão de dados.

## Experiência do usuário

Quando o assessor seleciona uma data retroativa para uma opção sem histórico de negócios:
- O sistema exibe: **"Prêmio histórico indisponível para esta data — digite manualmente."**
- O strike continua pré-preenchido (vindo do endpoint `/options/:ticker/details`, não do histórico)
- O assessor deve informar o prêmio manualmente

Esse é o comportamento correto. Se o assessor realmente comprou a opção, o prêmio pago por ele é a fonte de verdade — mesmo que a OpLab não tenha registro (comum em opções muito ilíquidas).

## Limitação conhecida no response do backend

Quando nenhuma entrada histórica é encontrada, `fetchOptionHistoricalPrice` retorna `strike: null` (`wallets.service.ts`). O strike é uma propriedade fixa da opção e deveria ser retornado mesmo quando `price` é null. Isso não quebra a UI porque o frontend usa o strike vindo da chamada prévia ao `/details`, mas é enganoso para qualquer consumidor futuro do endpoint `historical-price`.
