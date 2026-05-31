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

---

## Busca de Strike Histórico em Registros Retroativos

**Implementado em:** commit `4cffa78` — 30/05/2026

### O Problema

Ao registrar uma operação com opção em data passada (operação retroativa), o sistema anteriormente buscava o strike do **preço atual** na OpLab, em vez do strike **historicamente correto** para a data informada. Opções mudam de strike ao longo do tempo (splits, derivadas, exercício), tornando os registros retroativos imprecisos.

Adicionalmente, opções já expiradas retornavam `404 NotFoundException` da OpLab, impedindo qualquer registro retroativo.

### Novo Endpoint/Método de Busca Histórica no Backend

A OpLab expõe um endpoint dedicado para dados históricos de opções:

```
GET /market/historical/options/{spot}/{date}/{date}?symbol={ticker}
```

Exemplo — buscar dados de `PETRA240` em 15/05/2026:
```
GET /market/historical/options/PETR4/2026-05-15/2026-05-15?symbol=PETRA240
```

Resposta esperada:
```json
[{ "symbol": "PETRA240", "strike": 28.50, "due_date": "2026-05-24", "type": "CALL" }]
```

O método `getHistoricalOptionDetails()` foi adicionado ao `OpLabMarketService` e ao `CompositeMarketService`. O endpoint de wallets `GET /wallets/options/:ticker/details` passou a aceitar os query params `date` e `underlying`; quando `date < today`, roteia internamente para a busca histórica.

### Lógica de Fallback por Dias (D-0 até D-3)

Quando a data exata não tem dados (fim de semana, feriado), o sistema recua automaticamente:

```typescript
for (let offset = 0; offset <= 3; offset++) {
  const d = new Date(date);
  d.setDate(d.getDate() - offset);
  // tenta buscar; se tiver dados, retorna imediatamente
}
// Se nenhum dos 4 dias retornar dados → retorna null
```

D-3 (até ~1 semana corrida) cobre a maioria dos feriados e pontes. Se ainda assim não houver dados, o campo strike permanece vazio e o assessor preenche manualmente.

### Override de Metadados para Opções Expiradas

Para opções que já não existem na OpLab (expiradas há muito tempo), o payload agora aceita um campo opcional `optionMetadata`:

```typescript
interface OptionMetadata {
  strikePrice: number;           // validado: positive()
  expirationDate: string;
  optionType: 'CALL' | 'PUT';   // validado: enum
  underlyingTicker: string;
}
```

Quando a OpLab retorna `NotFoundException`, o `AssetResolverService.ensureAssetExists()` usa esse override para criar o registro no banco via `createOptionFromOverride()`, usando `Prisma.asset.upsert()` com `update: {}` para tolerar race conditions (o primeiro a chegar vence; o segundo recebe o registro existente).

### Frontend: Campo Strike Editável vs Auto-Preenchido

O modal de operações (`UnifiedTradeModal.tsx`) ganhou um campo **Strike** com comportamento condicional:

| Situação | Comportamento do campo Strike |
|----------|-------------------------------|
| Data atual (não retroativa) | Auto-preenchido via `optionDetails?.strike ?? selectedOption?.strike` |
| Data retroativa + histórico disponível | Auto-preenchido com strike histórico (read-only até editar) |
| Data retroativa + histórico indisponível | Vazio + aviso amarelo "Strike histórico indisponível — informe manualmente" |
| Assessor edita manualmente | `isStrikeManual = true`; useEffect de auto-fill é ignorado nas próximas renderizações |

Em modo retroativo, **nunca há fallback para o strike atual** — se o histórico não retornar dados, o campo fica vazio e força entrada manual. Isso evita que o assessor submeta inadvertidamente o strike de hoje como se fosse o strike da data passada.

### Arquivos Afetados

| Arquivo | Tipo | Mudanças |
|---------|------|----------|
| `backend/src/modules/derivatives/schemas/option-trade.schema.ts` | Schema | `OptionMetadataSchema` + campo opcional em `BuyOptionInputSchema` e `SellOptionInputSchema` |
| `backend/src/modules/derivatives/services/derivatives.service.ts` | Service | `buyOption()` e `sellOption()` passam `optionMetadata` ao resolver |
| `backend/src/modules/wallets/controllers/wallets.controller.ts` | Controller | Endpoint `GET /wallets/options/:ticker/details` aceita `date` e `underlying` como query params |
| `backend/src/modules/wallets/providers/composite-market.service.ts` | Service | Novo método `getHistoricalOptionDetails()` |
| `backend/src/modules/wallets/providers/oplab-market.service.ts` | Service | Novo método `getHistoricalOptionDetails()` com fallback D-0 até D-3 |
| `backend/src/modules/wallets/services/asset-resolver.service.ts` | Service | `ensureAssetExists()` aceita `overrideMetadata`; novo método `createOptionFromOverride()` |
| `frontend/src/features/derivatives/options/components/OptionTickerAutocomplete.tsx` | Component | Propagação de `underlyingTicker` ao pai |
| `frontend/src/features/derivatives/types/index.ts` | Types | Interface `OptionMetadata` exportada |
| `frontend/src/features/wallets/api/useOptionsSearch.ts` | Hook | `useOptionDetails()` aceita `date` e `underlying` |
| `frontend/src/features/wallets/api/wallets.api.ts` | API | `walletsApi.getOptionDetails()` constrói query params dinâmicos |
| `frontend/src/features/wallets/components/UnifiedTradeModal.tsx` | Component | Campo strike com auto-fill, lógica retroativa, construção de `optionMetadata` antes de submeter |

### Gaps e Limitações Conhecidas

- **Histórico limitado na OpLab:** opções expiradas há mais de ~1 ano geralmente não estão acessíveis; fallback depende do assessor ter a informação correta.
- **Fuso horário:** `date` é enviado como `YYYY-MM-DD` (UTC midnight); sem validação de TZ local, mas funcionando conforme esperado.
- **`optionType` incorreto no override:** se o assessor digitar o tipo errado, o asset será criado com tipo errado no banco; cálculo de Greeks pode falhar silenciosamente. Mitigado pelo enum Zod.
- **Strike null enganoso:** quando histórico não encontra dados, a resposta retorna `strike: null` mesmo que `expirationDate` esteja presente. Frontend trata corretamente (mantém campo vazio), mas é enganoso para consumidores futuros da API (documentado também na seção "Limitação conhecida no response do backend" acima).
