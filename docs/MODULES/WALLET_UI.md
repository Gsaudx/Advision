# WalletPage — Interface e Layout

## Visão Geral

A `WalletPage` é a página central de gestão de uma carteira individual no Advision. Ela exibe posições em ações e opções, permite executar operações e oferece painéis analíticos de concentração e histórico. Este documento registra as decisões de layout e interface realizadas na v6, contemplando o reposicionamento de componentes (Item 10, commit `0571f9e`) e a remoção dos pontos de acesso à funcionalidade de Estratégias (Item 13, commit `029b368`).

---

## 1. Reposicionamento de Componentes (v6)

**Commit:** `0571f9e` — 30 de maio de 2026

### 1.1 Layout Antes vs. Depois

**Antes:**

```
┌─────────────────────────────────────────────────────────────────────┐
│ Coluna Esquerda (lg:col-span-4)                                     │
│ └── ConcentrationPanel (altura variável, sem constrain)             │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ Coluna Direita (lg:col-span-8)                                      │
│                                                                     │
│ Sub-tab: Positions                                                  │
│ └─ ContentPanel (max-h-[475px])                                     │
│                                                                     │
│ Sub-tab: Options                                                    │
│ ├─ ContentPanel (sem altura fixa)                                   │
│ │  └─ OptionFilter + OptionPositionCards                            │
│ ├─ Histórico de Encerradas (no meio da coluna direita)             │
│ └─ UpcomingExpirationsWidget (final)                                │
└─────────────────────────────────────────────────────────────────────┘
```

**Depois:**

```
┌────────────────────────────┬──────────────────────────────────────────┐
│ Esquerda (lg:col-span-4)   │ Direita (lg:col-span-8)                  │
├────────────────────────────┼──────────────────────────────────────────┤
│                            │ Sub-tab: Positions                       │
│                            │ └─ ContentPanel (max-h-[475px])          │
│                            ├──────────────────────────────────────────┤
│ ConcentrationPanel         │ Sub-tab: Options (flex col, gap-4)       │
│ (min-h / max-h: 540px)     │ ├─ ContentPanel (min-max: 540px)         │
│                            │ │  └─ OptionFilter + OptionPositionCards │
│                            │ └─ UpcomingExpirationsWidget             │
│ [-------540px-------]      │ [--------540px--------] [-- Widget --]  │
│                            │                                          │
│ Histórico de Encerradas    │                                          │
│ (condicional, max-h: 280px)│                                          │
│ └─ ClosedOptionHistoryList │                                          │
└────────────────────────────┴──────────────────────────────────────────┘
```

### 1.2 Equalização de Alturas (540px)

O `ConcentrationPanel` e o `ContentPanel` de opções passaram a ter altura mínima e máxima fixada em **540px**, garantindo simetria visual entre as colunas mesmo com conteúdos variáveis.

```tsx
{/* Coluna esquerda — ConcentrationPanel com altura fixa */}
<div className="flex flex-col min-h-[540px] max-h-[540px]">
  <ConcentrationPanel
    byType={wallet.concentration.byType}
    bySector={wallet.concentration.bySector}
    positions={wallet.positions}
    optionPositions={optionPositionsData?.positions ?? []}
    performance={performance}
    currency={wallet.currency}
    totalPositionsValue={wallet.totalPositionsValue}
    view={subTab === 'options' ? 'options' : 'assets'}
  />
</div>

{/* Coluna direita — ContentPanel de opções com altura fixa */}
<ContentPanel
  className="relative flex flex-col min-h-[540px] max-h-[540px]"
  bodyClassName="p-0 overflow-y-auto flex-1"
>
  {/* filtro e cards de opções */}
</ContentPanel>
```

### 1.3 Reposicionamento do ClosedOptionHistoryList

O "Histórico de Encerradas" foi movido da coluna direita (abaixo do ContentPanel de opções) para a coluna esquerda (abaixo do ConcentrationPanel), apenas quando `subTab === 'options'`.

```tsx
{/* Histórico de Encerradas — coluna esquerda, condicional */}
{subTab === 'options' &&
  optionHistoryData &&
  optionHistoryData.history.length > 0 && (
    <ContentPanel
      header={
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.2em]">
            Histórico de Encerradas
          </p>
          <span className="text-[10px] font-bold text-on-surface-variant bg-outline-variant/20 px-2 py-0.5 rounded-full">
            {optionHistoryData.history.length}
          </span>
        </div>
      }
      bodyClassName="p-2 max-h-[280px] overflow-y-auto"
    >
      <ClosedOptionHistoryList
        items={optionHistoryData.history}
      />
    </ContentPanel>
  )}
```

### 1.4 Container de Opções com Gap-4

O bloco da coluna direita para `subTab === 'options'` foi envolto em um `flex flex-col gap-4`, garantindo espaçamento consistente entre o ContentPanel e o UpcomingExpirationsWidget:

```tsx
{subTab === 'options' && (
  <div className="flex flex-col gap-4">
    <ContentPanel
      className="relative flex flex-col min-h-[540px] max-h-[540px]"
      bodyClassName="p-0 overflow-y-auto flex-1"
    >
      {/* conteúdo de opções */}
    </ContentPanel>
    {optionPositionsData?.positions &&
      optionPositionsData.positions.length > 0 && (
        <UpcomingExpirationsWidget
          walletId={walletId!}
          onExercise={config.canTrade ? handleExerciseOption : undefined}
          onExpire={config.canTrade ? handleExpireOption : undefined}
          onAssignment={config.canTrade ? handleAssignmentOption : undefined}
        />
      )}
  </div>
)}
```

### 1.5 Modernização do UpcomingExpirationsWidget

O widget foi reescrito para usar tokens do sistema de design em vez de cores hardcoded da paleta escura legada.

#### Paleta de Cores

| Elemento | Antes | Depois |
|----------|-------|--------|
| Cor de urgência (≤3 dias) | `text-red-400` | `text-error` |
| BG urgência (≤3 dias) | `bg-red-500/10 border-red-500/20` | `bg-error/5 border-error/20` |
| Texto normal | `text-gray-400` | `text-on-surface-variant` |
| BG normal | `bg-slate-800/50 border-slate-700` | `bg-surface-container-low border-outline-variant/10` |
| Container principal | `bg-slate-800/50 rounded-lg` | `bg-surface-container-lowest rounded-[2.5rem] shadow-sm border border-outline-variant/5` |
| Badge CALL | `bg-blue-500/20 text-blue-400` | `bg-tertiary/10 text-tertiary` |
| Badge PUT | `bg-purple-500/20 text-purple-400` | `bg-error/10 text-error` |
| Badge "Venda" (V) | `bg-orange-500/20 text-orange-400` | `bg-outline-variant/20 text-on-surface-variant` |
| Botão exercer | `text-indigo-400 hover:bg-indigo-600/20` | `text-primary hover:bg-primary/10` |
| Botão atribuição | `text-amber-400 hover:bg-amber-600/20` | `text-amber-400 hover:bg-amber-500/10` |
| Botão vencimento | `text-gray-400 hover:bg-gray-600/20` | `text-on-surface-variant hover:bg-surface-container-high` |

#### Funções de Urgência (Antes vs. Depois)

```tsx
// Antes
function getUrgencyColor(days: number): string {
  if (days <= 0) return 'text-red-400';
  if (days <= 3) return 'text-red-400';
  if (days <= 7) return 'text-amber-400';
  return 'text-gray-400';
}

function getUrgencyBg(days: number): string {
  if (days <= 0) return 'bg-red-500/10 border-red-500/20';
  if (days <= 3) return 'bg-red-500/5 border-red-500/10';
  if (days <= 7) return 'bg-amber-500/5 border-amber-500/10';
  return 'bg-slate-800/50 border-slate-700';
}

// Depois
function getUrgencyColor(days: number): string {
  if (days <= 3) return 'text-error';
  if (days <= 7) return 'text-amber-400';
  return 'text-on-surface-variant';
}

function getUrgencyBg(days: number): string {
  if (days <= 3) return 'bg-error/5 border-error/20';
  if (days <= 7) return 'bg-amber-500/5 border-amber-500/20';
  return 'bg-surface-container-low border-outline-variant/10';
}
```

#### Estrutura do Container (Antes vs. Depois)

```tsx
// Antes
<div className="bg-slate-800/50 rounded-lg p-4">
  <div className="flex items-center justify-between mb-3">
    <div className="flex items-center gap-2">
      <Calendar className="w-4 h-4 text-gray-400" />
      <h3 className="text-sm font-medium text-gray-400">Vencimentos Proximos</h3>
    </div>
    <span className="text-xs text-gray-500">{count} posicao(es)</span>
  </div>
  <div className="flex flex-col gap-2">
    {/* linhas */}
  </div>
</div>

// Depois
<div className="bg-surface-container-lowest rounded-[2.5rem] shadow-sm border border-outline-variant/5 overflow-hidden">
  <div className="px-6 pt-5 pb-4 border-b border-outline-variant/5 flex items-center justify-between">
    <div className="flex items-center gap-2">
      <Calendar className="w-4 h-4 text-on-surface-variant" />
      <h3 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
        Vencimentos Próximos
      </h3>
    </div>
    <span className="text-[10px] font-bold text-on-surface-variant bg-outline-variant/20 px-2 py-0.5 rounded-full">
      {count} posição(ões)
    </span>
  </div>
  <div className="p-4 flex flex-col gap-2">
    {/* linhas */}
  </div>
</div>
```

#### Tokens do Sistema de Design Utilizados

| Token | Uso | Função |
|-------|-----|--------|
| `text-error` | Textos críticos (vencimento urgente) | Cor de erro vermelha |
| `bg-error` | Fundos críticos | Cor de fundo para urgência |
| `text-primary` | Botões primários (exercer) | Cor primária da marca |
| `text-tertiary` | Badges CALL | Cor terciária |
| `text-on-surface-variant` | Textos secundários, labels | Cor de texto secundário |
| `bg-surface-container-lowest` | Container principal do widget | Fundo de card padrão |
| `bg-surface-container-low` | Fundos alternativos | Fundo secundário |
| `bg-surface-container-high` | Hover states | Fundo elevado |
| `border-outline-variant` | Bordas sutis | Cor de contorno |

---

## 2. Remoção dos Botões de Estratégia (v6)

**Commit:** `029b368`

### 2.1 O Que Foi Removido

A remoção foi cirúrgica — apenas os pontos de acesso na `WalletPage` foram desativados. Nenhum arquivo foi deletado.

#### Ícone `Layers` removido dos imports

```typescript
// Antes
import {
  ArrowLeft, ChevronRight, Wallet, LineChart,
  LayoutGrid, Layers, Search, X, Pencil, Trash2,
} from 'lucide-react';

// Depois
import {
  ArrowLeft, ChevronRight, Wallet, LineChart,
  LayoutGrid, Search, X, Pencil, Trash2,
} from 'lucide-react';
```

#### Importações de componentes de estratégia removidas

```typescript
// Antes
import {
  useOptionPositions, useOptionHistory, useDeleteOption,
  OptionPositionCard, ClosedOptionHistoryList, CloseOptionModal,
  ExerciseOptionModal, AssignmentModal, ExpirationModal,
  UpcomingExpirationsWidget,
  StrategyBuilderModal,   // ← Removido
  StrategyHistoryList,    // ← Removido
  EditOptionModal,
} from '@/features/derivatives';

// Depois
import {
  useOptionPositions, useOptionHistory, useDeleteOption,
  OptionPositionCard, ClosedOptionHistoryList, CloseOptionModal,
  ExerciseOptionModal, AssignmentModal, ExpirationModal,
  UpcomingExpirationsWidget, EditOptionModal,
} from '@/features/derivatives';
```

#### Type `SubTab` simplificado

```typescript
// Antes
type SubTab = 'positions' | 'options' | 'strategies';

// Depois
type SubTab = 'positions' | 'options';
```

#### Estado `showStrategyModal` removido

```typescript
// Antes
const [showStrategyModal, setShowStrategyModal] = useState(false);

// Depois
// — estado removido, nenhum fluxo o ativaria
```

#### Aba "Estratégias" removida do array `subTabs`

```typescript
// Antes
const subTabs: { id: SubTab; label: string; icon: React.ElementType }[] = [
  { id: 'positions', label: 'Ações', icon: LayoutGrid },
  { id: 'options', label: 'Opções', icon: LineChart },
  { id: 'strategies', label: 'Estratégias', icon: Layers }, // ← Removido
];

// Depois
const subTabs: { id: SubTab; label: string; icon: React.ElementType }[] = [
  { id: 'positions', label: 'Ações', icon: LayoutGrid },
  { id: 'options', label: 'Opções', icon: LineChart },
];
```

#### Botão "Estratégia" no header removido

```typescript
// Antes
{config.canTrade && (
  <>
    <button
      onClick={() => setShowStrategyModal(true)}
      className="flex items-center gap-1.5 bg-surface-container-high text-on-surface-variant px-4 py-2 rounded-full text-xs font-bold hover:bg-surface-container-highest hover:text-on-surface transition-all"
    >
      <LayoutGrid size={12} />
      Estratégia
    </button>
    <button
      onClick={() => handleOpenTrade()}
      className="flex items-center gap-2 bg-tertiary text-white px-4 py-2 rounded-full text-xs font-bold hover:brightness-110 transition-all shadow-lg shadow-tertiary/20"
    >
      Nova Operação
    </button>
  </>
)}

// Depois
{config.canTrade && (
  <button
    onClick={() => handleOpenTrade()}
    className="flex items-center gap-2 bg-tertiary text-white px-4 py-2 rounded-full text-xs font-bold hover:brightness-110 transition-all shadow-lg shadow-tertiary/20"
  >
    Nova Operação
  </button>
)}
```

#### Painel de conteúdo e render do modal removidos

```typescript
// Antes — painel de conteúdo da sub-tab
{subTab === 'strategies' && (
  <ContentPanel bodyClassName="p-0">
    <StrategyHistoryList walletId={walletId!} />
  </ContentPanel>
)}

// Antes — render do modal
<StrategyBuilderModal
  isOpen={showStrategyModal}
  onClose={() => setShowStrategyModal(false)}
  walletId={walletId!}
  walletName={wallet.name}
/>

// Depois — ambos os blocos foram removidos; apenas o EditOptionModal permanece
{editingPosition && (
  <EditOptionModal position={editingPosition} ... />
)}
```

### 2.2 O Que Foi Preservado

Os componentes continuam intactos no repositório — apenas não são importados nem renderizados na `WalletPage`.

| Caminho | Status |
|---------|--------|
| `frontend/src/features/derivatives/strategies/components/StrategyBuilderModal.tsx` | Intacto, não importado |
| `frontend/src/features/derivatives/strategies/components/StrategyHistoryList.tsx` | Intacto, não importado |
| `frontend/src/features/derivatives/strategies/api/` | Intacto, não utilizado |
| `frontend/src/features/derivatives/types.ts` (tipos de estratégia) | Intacto, não referenciado |

As rotas de backend também continuam respondendo:
- `GET /wallets/:id/operations` — retorna estratégias
- `POST /wallets/:id/operations/preview` — funciona
- `POST /wallets/:id/operations/execute` — funciona

### 2.3 Visão Geral do Layout (Antes vs. Depois)

```
Antes (com Estratégias):
┌─────────────────────────────────────────┐
│  ← Wealth Management > Portfolio        │
├─────────────────────────────────────────┤
│ Ações | Opções | Estratégias ×          │  ← 3 abas
├─────────────────────────────────────────┤
│ Carteira XYZ   [Estratégia] [Nova Op]   │  ← 2 botões de ação
└─────────────────────────────────────────┘

Depois (sem Estratégias):
┌─────────────────────────────────────────┐
│  ← Wealth Management > Portfolio        │
├─────────────────────────────────────────┤
│ Ações | Opções                          │  ← 2 abas
├─────────────────────────────────────────┤
│ Carteira XYZ                 [Nova Op]  │  ← 1 botão de ação
└─────────────────────────────────────────┘
```

---

## 3. Arquivos Afetados

| Arquivo | Commits | Tipo | O Que Mudou |
|---------|---------|------|-------------|
| `frontend/src/features/wallets/pages/WalletPage.tsx` | `0571f9e`, `029b368` | Modificado | Reposicionamento do `ClosedOptionHistoryList` para coluna esquerda; equalização de alturas 540px; gap-4 no container de opções; remoção de `Layers`, `StrategyBuilderModal`, `StrategyHistoryList`; type `SubTab` simplificado; estado `showStrategyModal` removido; aba e botão "Estratégia" removidos; painel de conteúdo e modal de estratégias removidos |
| `frontend/src/features/derivatives/lifecycle/components/UpcomingExpirationsWidget.tsx` | `0571f9e` | Modificado | Reescrita completa com tokens do sistema de design; tipografia padronizada (`text-[10px] font-bold uppercase tracking-widest`); border-radius aumentado para `rounded-[2.5rem]`; separador `|` substituído por `·`; badge "V" substituído por "Venda"; padding e gap revisados |

---

## 4. Decisões de Produto

### 4.1 Altura Fixa de 540px

**Decisão:** Equalizar `ConcentrationPanel` e `ContentPanel` (opções) em 540px.

**Racional:**
- Garante simetria visual entre as colunas do layout multi-coluna
- Permite conteúdo scrollável quando necessário, sem crescimento irrestrito
- Mantém proporção harmoniosa com a viewport em diferentes resoluções
- Facilita previsibilidade do layout

### 4.2 Reposicionamento do Histórico para a Coluna Esquerda

**Decisão:** Mover "Histórico de Encerradas" de abaixo do ContentPanel (direita) para abaixo do ConcentrationPanel (esquerda).

**Racional:**
- Agrupa informações analíticas à esquerda: Concentração + Histórico (dados estáticos)
- Agrupa informações operacionais à direita: Posições ativas + Alertas de vencimento (dados dinâmicos)
- Fluxo visual em cascata: análise → ação
- Reduz poluição visual na coluna direita

### 4.3 Design System Tokens vs. Cores Hardcoded

**Decisão:** Substituir todas as cores hardcoded (`slate-*`, `gray-*`, `red-*`, `purple-*`, etc.) pelos tokens do sistema de design.

**Racional:**
- **Manutenção:** Uma mudança no token afeta todo o widget automaticamente
- **Consistência:** Alinha com o padrão de design de toda a aplicação
- **Acessibilidade:** Tokens foram projetados com contraste WCAG verificado
- **Escalabilidade:** Suporte futuro a múltiplos temas sem refatoração

### 4.4 Esconder Estratégias vs. Deletar

**Decisão:** Manter o código subjacente; remover apenas a renderização e os pontos de acesso na `WalletPage`.

**Racional:**
- Reduz o custo de reativação (< 20 linhas de código para restaurar)
- Evita expor ao usuário uma funcionalidade complexa ainda em refinamento
- O código em `/strategies/` está isolado e não aumenta manutenção
- APIs de backend continuam funcionais para quando a feature for reativada

### 4.5 Priorização de Operações Simples

**Decisão:** Focar em Ações + Opções antes de Estratégias.

**Racional:**
- 80% dos casos de uso são operações diretas (compra/venda de ações, ciclo de vida de opções)
- Estratégias multi-perna requerem fluxo de 3 etapas com cálculo de risco
- Interface mais limpa e menor complexidade cognitiva na página principal
- Experiência de onboarding mais direta para novos usuários

### 4.6 Sem Feature Flag

**Decisão:** Remover a UI completamente em vez de escondê-la com uma feature flag.

**Racional:**
- Código morto protegido por flag é mais difícil de manter do que código isolado
- A reativação é trivial: 3 linhas de import + 1 linha de estado + aba + botão + painel + modal
- Não há risco de exposição acidental por configuração incorreta da flag
