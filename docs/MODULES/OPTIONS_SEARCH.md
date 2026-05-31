# Busca de Opções — Modal de Nova Operação

## Visão Geral

Este documento descreve a refatoração completa do mecanismo de busca e seleção de opções no modal de compra/venda. O componente anterior (`OptionTickerAutocomplete`) operava com um fluxo sequencial em múltiplas telas e limitava a listagem de opções a no máximo 50 resultados via `limit` hard-coded. A nova arquitetura apresenta **dois campos independentes ("Ticker Pai" e "Ticker Opção")** com scroll infinito via `IntersectionObserver`, busca textual processada no servidor e acesso irrestrito às ~4.360+ opções disponíveis no cache do OpLab.

---

## 1. Problema Anterior — Select Único com Rate Limit

### 1.1 Fluxo Sequencial (3 telas)

O fluxo original exigia que o usuário navegasse por três etapas distintas dentro do mesmo modal:

1. Digitar o ativo subjacente e aguardar a busca (≥ 2 caracteres)
2. Clicar no resultado para abrir a seleção de opção
3. Filtrar ou digitar a opção manualmente num campo separado

**Problema de UX:** navigation overhead alto; retornar a uma etapa anterior forçava resetar o estado parcial; nenhuma indicação visual do progresso.

### 1.2 Limite Hard-Coded no Backend

O endpoint original aceitava um parâmetro `limit` (padrão 20, máximo 50) e retornava um array flat:

```
GET /wallets/options/search?underlying=PETR4&type=CALL&limit=20
→ AssetSearchResult[]   (array plano, sem metadados de paginação)
```

**Consequência:** com PETR4 podendo ter 100+ séries ativas por ano, a maioria das opções era invisível ao usuário. Não havia paginação implementada no frontend para compensar.

### 1.3 Filtro de Texto no Cliente

A filtragem por texto era feita no cliente com um array fixo de resultados. Como o servidor só enviava os primeiros N itens, filtrar no cliente era ineficaz — opções fora do primeiro "bloco" nunca apareciam, mesmo que correspondessem ao texto digitado.

---

## 2. Solução Implementada — Dual Select com Paginação Infinita

### 2.1 Separação em Dois Selects

O componente foi reescrito para exibir dois campos simultaneamente, empilhados verticalmente:

| Campo | Exemplo de valor | Comportamento |
|-------|-----------------|---------------|
| **Ticker Pai** | `PETR4` | Input com autocomplete de ativos do tipo `STOCK`; ao selecionar, exibe chip readOnly |
| **Ticker Opção** | `PETRE310W5` | Habilitado apenas após seleção do Ticker Pai; abre painel inline com lista paginada e filtros CALL/PUT |

**Interação entre os campos:**

- Ao selecionar o Ticker Pai, o foco é movido automaticamente para o input de opção (após 80 ms para garantir que o painel tenha renderizado).
- Ao limpar o Ticker Pai (`handleClearUnderlying`), o estado do Ticker Opção é integralmente resetado.
- O painel de opções abre-se inline (não como dropdown sobreposto), evitando problemas de z-index em modais com `overflow: hidden`.

### 2.2 Paginação Server-Side (Scroll Infinito)

#### Endpoint atualizado: `GET /wallets/options/search`

**Antes:**
```
GET /wallets/options/search?underlying=PETR4&type=CALL&limit=20
→ AssetSearchResult[]
```

**Depois:**
```
GET /wallets/options/search?underlying=PETR4&type=CALL&page=1&pageSize=50&q=PETRD3
→ OptionSearchPageResponse {
    results:  AssetSearchResult[],
    total:    number,
    page:     number,
    pageSize: number,
    hasMore:  boolean
}
```

**Parâmetros de query:**

| Parâmetro | Tipo | Padrão | Descrição |
|-----------|------|--------|-----------|
| `underlying` | string | — | Ticker do ativo subjacente (ex: `PETR4`) — obrigatório |
| `type` | `CALL` \| `PUT` | — | Filtra por tipo de opção — opcional |
| `page` | string | `1` | Número da página (1-indexed) |
| `pageSize` | string | `50` | Registros por página (máximo 50) |
| `q` | string | — | Filtro por ticker, substring case-insensitive; processado no servidor |

#### Hook `useOptionsSearchInfinite`

```typescript
// frontend/src/features/wallets/api/useOptionsSearch.ts

export function useOptionsSearchInfinite(
  underlying: string,
  optionType?: 'CALL' | 'PUT',
  pageSize = 50,
  q?: string,
) {
  return useInfiniteQuery({
    queryKey: [
      ...optionsQueryKeys.search(underlying, optionType),
      'infinite',
      pageSize,
      q ?? '',
    ],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      walletsApi.searchOptionsPaginated(
        underlying,
        optionType,
        pageParam as number,
        pageSize,
        q,
      ),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
    enabled: underlying.length >= 2,
    staleTime: 60 * 1000,
  });
}
```

**Comportamento do hook:**

- `enabled: underlying.length >= 2` — só dispara requisição após seleção de ativo pai válido.
- `initialPageParam: 1` — inicia sempre pela primeira página.
- `getNextPageParam` — retorna o número da próxima página se `hasMore === true`; retorna `undefined` quando não há mais páginas (sinaliza fim ao `useInfiniteQuery`).
- `staleTime: 60 s` — resultado é considerado fresco por 1 minuto; revalida em background após esse tempo.
- Mudança no valor de `q` invalida o `queryKey` inteiro e reinicia da página 1.

### 2.3 Busca Server-Side

O parâmetro `q` é enviado ao backend a cada mudança de valor no input de opção. O servidor aplica o filtro diretamente sobre o cache em memória antes de paginar, garantindo que o campo `total` na resposta reflita o número real de matches — não o total geral de opções.

**Exemplo de requisição com filtro:**
```
GET /wallets/options/search?underlying=PETR4&page=1&pageSize=50&q=PETRD3
```

**Exemplo de resposta:**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "ticker": "PETRD310W5",
        "name": "PETR4 310 CALL 30/08",
        "type": "OPTION",
        "strike": 31.0,
        "expirationDate": "2026-08-30",
        "optionType": "CALL"
      }
    ],
    "total": 243,
    "page": 1,
    "pageSize": 50,
    "hasMore": true
  }
}
```

O componente exibe um contador no topo do painel: **"X de Y opções · filtrando por `q`"**, onde X é o número já carregado e Y é o `total` retornado na primeira página.

#### Como o `IntersectionObserver` aciona a próxima página

Um elemento sentinel invisível (`<div ref={sentinelRef} className="h-1" />`) é posicionado após o último item da lista. O `IntersectionObserver` monitora esse elemento dentro do container scrollável (`listRef`):

```typescript
// Dentro do componente OptionTickerAutocomplete

const handleIntersection = useCallback(
  (entries: IntersectionObserverEntry[]) => {
    if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  },
  [hasNextPage, isFetchingNextPage, fetchNextPage],
);

useEffect(() => {
  const sentinel = sentinelRef.current;
  if (!sentinel) return;
  const observer = new IntersectionObserver(handleIntersection, {
    root: listRef.current,  // container scrollável, não o viewport
    threshold: 0.1,         // dispara quando 10% do sentinel está visível
  });
  observer.observe(sentinel);
  return () => observer.disconnect();
}, [handleIntersection]);
```

Quando o usuário rola a lista até o fim e o sentinel fica 10% visível, `fetchNextPage()` é chamado. O React Query busca a próxima página e acrescenta os resultados ao array acumulado (`data.pages`). O componente achata todas as páginas com `flatMap` antes de renderizar:

```typescript
const filteredOptions = (data?.pages ?? []).flatMap((page) =>
  page.results.map((opt) => { /* enriquecimento com optionType derivado do código de mês */ })
);
```

---

## 3. Arquitetura Backend

### 3.1 Schema `OptionSearchPageResponse`

```typescript
// backend/src/modules/wallets/schemas/wallet.schema.ts

export const OptionSearchPageResponseSchema = z.object({
  results:  z.array(AssetSearchResultSchema),
  total:    z.number(),
  page:     z.number(),
  pageSize: z.number(),
  hasMore:  z.boolean(),
});

export type OptionSearchPageResponse = z.infer<
  typeof OptionSearchPageResponseSchema
>;

export class OptionSearchPageApiResponseDto extends createZodDto(
  createApiResponseSchema(OptionSearchPageResponseSchema),
) {}
```

### 3.2 Controlador

```typescript
// backend/src/modules/wallets/controllers/wallets.controller.ts

@Get('options/search')
@ApiQuery({ name: 'underlying', required: true,  description: 'Ticker subjacente' })
@ApiQuery({ name: 'type',       required: false, enum: ['CALL', 'PUT'] })
@ApiQuery({ name: 'page',       required: false, description: 'Página (padrão: 1)' })
@ApiQuery({ name: 'pageSize',   required: false, description: 'Resultados por página (padrão: 50)' })
@ApiQuery({ name: 'q',          required: false, description: 'Filtro por ticker (ex: PETRG3)' })
@ApiResponse({ status: 200, description: 'Página de opções encontradas' })
async searchOptions(
  @Query('underlying') underlying: string,
  @Query('type')       optionType?: 'CALL' | 'PUT',
  @Query('page')       page?:     string,
  @Query('pageSize')   pageSize?: string,
  @Query('q')          q?:        string,
): Promise<ApiResponseType<OptionSearchPageResponse>> {
  const parsedPage     = page     ? Math.max(1, parseInt(page, 10)     || 1)  : 1;
  const parsedPageSize = pageSize ? Math.max(1, parseInt(pageSize, 10) || 50) : 50;

  const data = await this.marketService.searchOptions(
    underlying,
    optionType,
    parsedPage,
    parsedPageSize,
    q,
  );

  return ApiResponseDto.success(data);
}
```

### 3.3 Serviço OpLab (`OpLabMarketService.searchOptions`)

**Assinatura anterior:**
```typescript
async searchOptions(
  underlying: string,
  optionType?: 'CALL' | 'PUT',
  limit = 20,
): Promise<AssetSearchResult[]>
```

**Assinatura atual:**
```typescript
async searchOptions(
  underlying: string,
  optionType?: 'CALL' | 'PUT',
  page = 1,
  pageSize = 50,
  q?: string,
): Promise<OptionSearchPageResponse>
```

**Implementação:**

```typescript
// backend/src/modules/wallets/providers/oplab-market.service.ts

async searchOptions(
  underlying: string,
  optionType?: 'CALL' | 'PUT',
  page = 1,
  pageSize = 50,
  q?: string,
): Promise<OptionSearchPageResponse> {
  if (!this.isConfigured()) {
    return { results: [], total: 0, page, pageSize, hasMore: false };
  }

  const upperUnderlying = underlying.toUpperCase();
  const series = await this.getOptionSeries(upperUnderlying);

  // Filtro por tipo de opção (sem I/O externo — opera sobre array em memória)
  let filtered = optionType
    ? series.filter((s) => s.type === optionType)
    : series;

  // Filtro por texto — substring case-insensitive sobre o cache completo
  if (q) {
    const upperQ = q.toUpperCase();
    filtered = filtered.filter((s) => s.symbol.includes(upperQ));
  }

  // Paginação: calcula offset e fatia o array
  const total  = filtered.length;
  const offset = (page - 1) * pageSize;
  const slice  = filtered.slice(offset, offset + pageSize);

  return {
    results: slice.map((option) => ({
      ticker:         option.symbol,
      name:           this.buildOptionName(option),
      type:           'OPTION' as const,
      exchange:       'B3',
      strike:         option.strike,
      expirationDate: option.due_date,
      optionType:     option.type,
      lastPrice:      option.close ?? option.bid ?? option.ask,
    })),
    total,
    page,
    pageSize,
    hasMore: offset + pageSize < total,
  };
}
```

**Pontos chave da implementação:**

- `getOptionSeries()` consulta o cache OpLab **uma única vez** por underlying; chamadas subsequentes (paginação, mudança de filtro) reutilizam o cache já aquecido.
- Filtragem por tipo e por texto ocorre inteiramente em memória — sem nova requisição à API externa.
- `hasMore = offset + pageSize < total` — cálculo simples e correto para o caso limite da última página.

---

## 4. Arquitetura Frontend

### 4.1 Interface `OptionSearchPage`

```typescript
// frontend/src/features/wallets/api/wallets.api.ts

export interface OptionSearchPage {
  results:  AssetSearchResult[];
  total:    number;
  page:     number;
  pageSize: number;
  hasMore:  boolean;
}
```

### 4.2 Método do API Client

```typescript
// frontend/src/features/wallets/api/wallets.api.ts

export const walletsApi = {
  searchOptionsPaginated: async (
    underlying: string,
    optionType?: 'CALL' | 'PUT',
    page = 1,
    pageSize = 50,
    q?: string,
  ): Promise<OptionSearchPage> => {
    const params: Record<string, string> = {
      underlying,
      page:     String(page),
      pageSize: String(pageSize),
    };
    if (optionType) params.type = optionType;
    if (q)          params.q    = q;

    const response = await api.get<ApiResponse<OptionSearchPage>>(
      '/wallets/options/search',
      { params },
    );

    return response.data.data;
  },
};
```

### 4.3 Fluxo de Seleção (diagrama)

```
┌─────────────────────────────────────────────────────────────────┐
│ Modal "Comprar Opção"                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Ticker Pai                                                     │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ [Busca  Ex: PETR4            ]                            │ │
│  └───────────────────────────────────────────────────────────┘ │
│  ↓ ao digitar 2+ caracteres                                    │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ PETR4   Petrobras PN         [B3]                         │ │
│  │ PETR3   Petrobras ON         [B3]                         │ │
│  └───────────────────────────────────────────────────────────┘ │
│  ↓ ao clicar em PETR4                                          │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ PETR4                                               [X]   │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Ticker Opção                                                   │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ [Busca  Buscar opção...      ]                            │ │
│  └───────────────────────────────────────────────────────────┘ │
│  ↓ ao digitar "PETRD3"                                         │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ [Filtrar:  Todas | CALL | PUT]                            │ │
│  │ 45 de 243 opções · filtrando por "PETRD3"                │ │
│  │ ─────────────────────────────────────────────────────── │ │
│  │ PETRD310W5   CALL   R$ 25,00   30 ago                    │ │
│  │ PETRD320W5   CALL   R$ 24,50   30 ago                    │ │
│  │ PETRD330W5   CALL   R$ 24,00   30 ago                    │ │
│  │   (scroll → sentinel → fetchNextPage automático)         │ │
│  │ ─────────────────────────────────────────────────────── │ │
│  │ [Digitar manualmente]                        [Fechar]    │ │
│  └───────────────────────────────────────────────────────────┘ │
│  ↓ ao clicar numa opção                                        │
│  Painel fecha; onChange() + onOptionSelect() disparados        │
└─────────────────────────────────────────────────────────────────┘
```

### 4.4 Enriquecimento de Dados — Derivação de `optionType`

O componente deriva o tipo (CALL/PUT) de cada opção a partir do código de mês no ticker, sem depender exclusivamente do campo `optionType` retornado pelo backend:

```typescript
const callCodes = 'ABCDEFGHIJKL';  // A=jan CALL, B=fev CALL, ...
const putCodes  = 'MNOPQRSTUVWX';  // M=jan PUT, N=fev PUT, ...

const suffix    = opt.ticker.slice(base.length - 1);
const monthCode = suffix.charAt(0);

const optionType = callCodes.includes(monthCode)
  ? ('CALL' as OptionType)
  : putCodes.includes(monthCode)
    ? ('PUT' as OptionType)
    : (opt as OptionSearchResult).optionType;  // fallback para dado do backend
```

---

## 5. Arquivos Afetados

| Arquivo | Tipo | Mudanças Principais |
|---------|------|---------------------|
| `backend/src/modules/wallets/schemas/wallet.schema.ts` | Modificado | `+OptionSearchPageResponseSchema`, `+OptionSearchPageApiResponseDto` |
| `backend/src/modules/wallets/controllers/wallets.controller.ts` | Modificado | Endpoint `/options/search` aceita `page`, `pageSize`, `q`; retorna `OptionSearchPageResponse` |
| `backend/src/modules/wallets/providers/oplab-market.service.ts` | Modificado | Assinatura de `searchOptions()` alterada; paginação + filtro por texto implementados |
| `backend/src/modules/wallets/providers/composite-market.service.ts` | Modificado | Adapta chamadas a `searchOptions()` para nova assinatura; acessa `.results` em vez do array flat |
| `backend/src/modules/wallets/__tests__/oplab-market.service.spec.ts` | Modificado | Expects atualizados: `results.results[]`, `results.total`, `results.hasMore` |
| `frontend/src/features/wallets/api/useOptionsSearch.ts` | Modificado | `+useOptionsSearchInfinite()` com `useInfiniteQuery` |
| `frontend/src/features/wallets/api/wallets.api.ts` | Modificado | `+OptionSearchPage` interface; `+searchOptionsPaginated()` |
| `frontend/src/features/wallets/api/index.ts` | Modificado | Re-export de `useOptionsSearchInfinite` |
| `frontend/src/features/derivatives/options/components/OptionTickerAutocomplete.tsx` | Reescrito | Arquitetura dual-select com painel inline e scroll infinito |

---

## 6. Decisões Arquiteturais

### 6.1 Filtro de Texto no Servidor (parâmetro `q`)

**Decisão:** o filtro por texto é processado no servidor, não no cliente.

**Justificativa:**
- O backend já mantém o array completo de séries em cache (`getOptionSeries()`); aplicar substring é O(n) sobre dados em memória — custo desprezível mesmo para 4.360+ opções.
- Reduz o volume de bytes transmitidos pela rede (o cliente recebe apenas os matches, não todos os registros).
- Permite ao cliente saber o `total` de correspondências sem ter todos os dados localmente.

**Alternativa rejeitada:** enviar todas as ~4.360 opções na primeira resposta.
- Payload estimado em 2–3 MB de JSON.
- Renderização de 4.360 itens no DOM seria lenta.
- Sem ganho real sobre paginação com filtro server-side.

### 6.2 Painel Inline em vez de Dropdown Sobreposto

**Decisão:** o painel de opções abre inline abaixo do input, não como dropdown absoluto.

**Justificativa:**
- Modais com altura limitada (ex: `80vh`) ocultam dropdowns posicionados com `position: absolute` quando o pai tem `overflow: hidden`.
- O painel inline força o scroll dentro de si mesmo, mantendo o modal estável.
- Comportamento mais previsível em viewports reduzidos e em dispositivos móveis.

### 6.3 Sem Rate Limit na Cache OpLab

**Decisão:** requisições ao endpoint `/options/search` (com ou sem `q`) não respeitam rate limit da API externa do OpLab.

**Justificativa:**
- Os dados vêm exclusivamente do cache em memória do servidor; a API OpLab é consultada **uma única vez** por underlying para popular esse cache.
- Sem I/O externo por requisição de busca, não há risco de throttling.
- O usuário pode digitar e filtrar livremente sem impacto em cotas.
- Contrasta com endpoints de market data em tempo real (ex: cotação atual), que consultam a API OpLab a cada chamada e, esses sim, devem respeitar rate limits.

### 6.4 Confirmação Imediata (All-or-Nothing na Seleção)

**Decisão:** clicar em uma opção da lista confirma a seleção imediatamente; o painel fecha e `onChange()` + `onOptionSelect()` são disparados.

**Justificativa:**
- A seleção de opção é uma ação terminal no fluxo do modal, não uma etapa intermediária.
- Eliminar um passo de confirmação explícito reduz o número de cliques.
- O usuário pode reabrir o modal para alterar a seleção se necessário.

### 6.5 `queryKey` com `q` Incluso

**Decisão:** o parâmetro `q` faz parte do `queryKey` do `useInfiniteQuery`.

**Justificativa:**
- Mudança no texto de busca deve reiniciar a paginação do zero (página 1 com novos matches), não acumular sobre resultados anteriores.
- O React Query invalida e descarta o cache automaticamente quando qualquer parte do `queryKey` muda.

---

## 7. Gaps Conhecidos

### 7.1 Sem Histórico de Pesquisas

O componente não persiste histórico de tickers pesquisados entre aberturas do modal. Cada vez que o modal é aberto, os campos começam em branco.

**Mitigação:** o autocomplete de Ticker Pai responde a partir de 2 caracteres; a latência é baixa o suficiente para não representar fricção significativa.

### 7.2 Sem Deduplicação de Registros

Se o cache OpLab contiver registros duplicados ou malformados, eles serão renderizados normalmente na lista.

**Mitigação:** a ingestão no OpLab valida o schema esperado; monitorar logs de `getOptionSeries()` para detectar anomalias.

### 7.3 Modo Manual Sem Validação Imediata

O campo "Digitar manualmente" aceita qualquer string; a validação de existência do ticker na B3 ocorre somente no POST do formulário pai.

**Mitigação:** o backend retorna erro claro caso o ticker não exista; o usuário recebe feedback no momento da tentativa de compra.

### 7.4 Cache Client-Side Não Persistente

O React Query expira o cache após 60 s. Ao reabrir o modal após esse período, uma nova requisição é disparada.

**Mitigação:** a requisição atinge o cache em memória do servidor (já aquecido), tornando a latência imperceptível ao usuário.

### 7.5 Busca por Substring Exata (sem fuzzy)

O parâmetro `q` aplica `symbol.includes(upperQ)` — correspondência por substring, sem tolerância a erros de digitação ou transposição de letras.

**Exemplo:** "PETR" encontra "PETR4D310W5", mas "PTR" não encontra nada.

**Mitigação:** tickers de opções seguem nomenclatura padronizada da B3; usuários que operam com opções conhecem o padrão e raramente cometem erros de transposição.

### 7.6 Breaking Change no Contrato da API

O endpoint `/wallets/options/search` mudou de retornar `AssetSearchResult[]` para `OptionSearchPageResponse`. Qualquer cliente externo que consuma esse endpoint precisará ser atualizado.

**Parâmetro legado `limit`:** foi removido. Requisições que ainda o enviem não causam erro — o parâmetro é ignorado — mas também não surtem efeito.

**Mitigação:** todos os consumidores internos (frontend) foram atualizados. Verificar se há integrações externas antes de fazer deploy.
