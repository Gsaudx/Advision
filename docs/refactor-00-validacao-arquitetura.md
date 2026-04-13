# Refactor UI — Parte 0: Validação de Arquitetura

> Documento gerado em 2026-04-13.
> Cruza os planejamentos de refatoração com CLAUDE.md, ARCHITECTURE.md, DEVELOPMENT.md, DATABASE.md e AUTHENTICATION.md.
> Resultado: lista de desvios encontrados e correções aplicadas nos demais documentos.

---

## Resultado Geral

| Doc | Status |
|---|---|
| refactor-01-diagnostico | ✅ Alinhado |
| refactor-02-mapeamento-stitch | ✅ Alinhado |
| refactor-03-estrategia-componentizacao | ⚠️ 2 pontos corrigidos |
| refactor-04-roadmap | ⚠️ 2 pontos corrigidos |
| refactor-05-analytics-dashboard | 🔴 3 violações críticas corrigidas |

---

## Desvios Encontrados e Correções

---

### DESVIO 1 — RESOLVIDO POR DECISÃO DE PRODUTO: Mock data para Analytics

**Documento afetado:** `refactor-05-analytics-dashboard.md`

**Contexto:**

O princípio SSOT do projeto exige que tipos de resposta venham de `api.d.ts`. No entanto, o produto tomou a seguinte decisão explícita em 2026-04-13:

> **A feature Analytics não será implementada com backend neste refactor. A página será criada como shell visual com dados mockados. O planejamento do backend ocorrerá separadamente antes da implementação real.**

**Por que esta exceção é válida:**

- A Analytics page é conscientemente uma **casca visual** (v0), não uma feature em produção
- Os mocks são **declaradamente temporários** e serão substituídos quando o backend for planejado e implementado
- Não é uma violação de SSOT porque não há endpoint real sendo contornado — o dado simplesmente ainda não existe no sistema
- Precedente análogo: `OptionDetailsResult` em `wallets/types/index.ts` também é uma interface manual para dados externos (OpLab API), não gerada do backend

**Regra aplicada à Analytics v0:**
- Tipos locais (`PortfolioDataPoint`, `AllocationItem`, `PeriodFilter`) são interfaces manuais temporárias em `features/analytics/types/index.ts`
- Quando o backend for implementado: deletar as interfaces, rodar `npm run generate:types`, substituir pelos tipos de `api.d.ts`
- Hooks chamam dados mockados locais — a assinatura do hook não muda, apenas a `queryFn`

---

### DESVIO 2 — RESOLVIDO POR DECISÃO DE PRODUTO: Backend Analytics fora do escopo

**Decisão (2026-04-13):** A feature Analytics será implementada como shell visual com mocks neste refactor. O backend será planejado e implementado separadamente no futuro.

O mapeamento de endpoints e dados deriváveis do schema está documentado em `refactor-05-analytics-dashboard.md §3` como referência para quando o planejamento do backend ocorrer.

---

### DESVIO 3 — CRÍTICO: Tipos de UI constants precisam ser atualizados no refactor

**Documento afetado:** `refactor-03-estrategia-componentizacao.md`

**O que estava ausente:**

O arquivo `features/wallets/types/index.ts` contém constantes de cor acopladas ao tema dark:
```typescript
export const transactionTypeColors: Record<TransactionType, string> = {
  BUY: 'text-blue-400',
  SELL: 'text-orange-400',
  DEPOSIT: 'text-green-400',
  ...
};
```

Esses mapeamentos de cor são tipos de UI que precisam ser migrados para as classes `adv-*` no refactor visual. Isso não é mapeado em nenhum documento atual.

Da mesma forma em `features/clients-page/types/index.ts`:
```typescript
export const inviteStatusColors = { ... } // dark theme colors
```

**Correção aplicada:**
- Adicionada tarefa explícita de migração de UI constants em `refactor-03`

---

### DESVIO 4: Padrão de API — objeto vs hooks separados

**Documento afetado:** `refactor-05-analytics-dashboard.md §4.1`

**O que estava correto mas incompleto:**

O padrão real do projeto é:
```
features/wallets/api/
  wallets.api.ts          → export const walletsApi = { getAll, getById, create, ... }
  useWallets.ts           → export function useWallets() { useQuery({ queryFn: walletsApi.getAll }) }
  useBuyAsset.ts          → export function useBuyAsset() { useMutation(...) }
  useCreateWallet.ts      → export function useCreateWallet() { useMutation(...) }
```

O `analytics.api.ts` deve ser um **objeto** com as funções axios, não as funções diretamente. Cada hook em arquivo separado.

**Correção aplicada:** Estrutura da feature analytics atualizada em `refactor-05` para espelhar o padrão de `wallets`.

---

### DESVIO 5: Rota `/analytics` precisa estar no grupo correto de roles

**Documento afetado:** `refactor-05-analytics-dashboard.md §4.2`

**Padrão real do routes/index.tsx:**
```tsx
// ADVISOR + ADMIN
<Route element={<ProtectedLayout allowedRoles={['ADVISOR', 'ADMIN']} />}>
  <Route path="/advisor/home" element={<HomePageAdvisor />} />
  <Route path="/clients" element={<ClientsPage />} />
  {/* ADICIONAR AQUI */}
  <Route path="/analytics" element={<AnalyticsPage />} />
</Route>
```

O `/analytics` deve entrar no grupo `['ADVISOR', 'ADMIN']` já existente, **não** em um novo `<Route element>` isolado.

**Correção aplicada:** Instrução de rota atualizada em `refactor-05`.

---

### DESVIO 6: Exports — feature index.ts obrigatório

**Documento afetado:** `refactor-05-analytics-dashboard.md`

**Padrão confirmado no projeto:**
- `features/wallets/index.ts` → `export { WalletsPage } from './pages/WalletsPage'`
- `features/proventos/index.ts` → `export { ProventosPage } from './pages/ProventosPage'`
- `routes/index.tsx` importa sempre do barrel: `import { WalletsPage } from '@/features/wallets'`

A nova feature **deve** ter `features/analytics/index.ts` com barrel exports e a importação no routes deve usar `@/features/analytics`.

**Correção aplicada:** Adicionado `index.ts` no plano da estrutura em `refactor-05`.

---

### DESVIO 7: `ButtonSubmit` — não criar re-export que quebra API documentada

**Documento afetado:** `refactor-03-estrategia-componentizacao.md §3.2`

**O que estava planejado:**
```tsx
// ButtonSubmit.tsx (temporário)
export { Button as default } from './Button';
```

**Por que é problemático:**

`DEVELOPMENT.md` ainda documenta `ButtonSubmit` como padrão oficial:
```tsx
<ButtonSubmit loading={isLoading} full={true}>
  {isLoading ? "Sending..." : "Send"}
</ButtonSubmit>
```

E o padrão de loading em forms usa `ButtonSubmit` diretamente. Fazer re-export silencioso altera o comportamento de `full` e `loading` se `Button` tiver API diferente.

**Correção:**
- `Button.tsx` é um componente **novo** (genérico, sem `mt-4`, sem `full`)
- `ButtonSubmit.tsx` é **mantido como está** internamente, mas refatorado para usar as novas classes `adv-*`
- Em novas telas e componentes, usa-se `Button`. Em componentes existentes com `ButtonSubmit`, mantém-se `ButtonSubmit` até que uma migração deliberada seja feita
- Isso evita quebrar o padrão documentado no DEVELOPMENT.md

**Correção aplicada em `refactor-03`.**

---

### DESVIO 8: Named vs Default exports — padronizar para novos componentes

**Documento afetado:** `refactor-03-estrategia-componentizacao.md`

**Situação atual no projeto:**
- `Input.tsx`, `Select.tsx`, `ButtonSubmit.tsx` → `export default`
- `LoadingSpinner.tsx`, `StatusCard.tsx` → `export function` (named)
- `StatCard.tsx` (em features/) → `export function` (named)

**Decisão para novos componentes:**
Todos os novos componentes em `components/ui/` usam **named exports** (alinha com os mais recentes e com o estilo das features). Componentes existentes com default export não são alterados (evitar quebrar imports existentes).

**Correção aplicada em `refactor-03`.**

---

## Checklist de Conformidade — Regras do Projeto

| Regra | Status nos Planos |
|---|---|
| Tipagem estrita — sem `any`, tipos de response via api.d.ts | ✅ Após correção do DESVIO 1 |
| Feature structure: `pages/`, `api/`, `components/`, `hooks/`, `types/`, `index.ts` | ✅ |
| API hooks em `api/` (TanStack Query), UI hooks em `hooks/` | ✅ |
| Barrel exports em `index.ts` por feature | ✅ Após correção do DESVIO 6 |
| Path alias `@/` para imports | ✅ |
| Código em inglês, UI text em português | ✅ |
| `components/ui/` para componentes base genéricos | ✅ |
| `components/layout/` para estruturas (Sidebar, Header, Modal) | ✅ |
| Rota nova no grupo de roles correto | ✅ Após correção do DESVIO 5 |
| Backend NestJS seguindo estrutura `modules/{feature}/` | ✅ Após correção do DESVIO 2 |
| Sem over-engineering — não criar abstrações desnecessárias | ✅ |
| SSOT: tipos de resposta derivados de api.d.ts | ✅ Após correção do DESVIO 1 |
| `api/xxx.api.ts` como objeto com funções axios | ✅ Após correção do DESVIO 4 |
