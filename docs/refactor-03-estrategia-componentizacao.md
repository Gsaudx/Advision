# Refactor UI — Parte 3: Estratégia e Plano de Componentização

> Documento gerado em 2026-04-12.

---

## 1. Estratégia: Incremental por Camada

### Por que NÃO big-bang

Um big-bang (trocar tudo de uma vez) seria inviável porque:
- O projeto tem múltiplas features complexas com lógica de negócio acoplada à UI
- Risco de regredir funcionalidades críticas (derivatives lifecycle é complexo)
- Impossível testar tudo de uma vez
- O repositório não tem testes de componente/visual

### Por que incremental por camada

A abordagem correta é **de baixo para cima (bottom-up)**:

```
Camada 0: Tokens de Design (cores, tipografia, configuração Tailwind)
    ↓
Camada 1: Componentes base (Button, Input, Card, Modal shell, Badge, Tabs)
    ↓
Camada 2: Componentes de layout (Sidebar, Header, ProtectedLayout)
    ↓
Camada 3: Componentes de feature (StatCard, WalletCard, ClientCard, PositionTable)
    ↓
Camada 4: Páginas (Dashboard, Clients, Wallets, Login)
```

**Cada camada só começa quando a anterior está estável.** Isso garante que cada novo componente já nasce no novo visual.

### Princípio de compatibilidade

Durante a transição, o projeto vai ter **dois "estados"** coexistindo:
- Componentes já migrados (novo tema light)
- Componentes ainda no tema dark

Para evitar conflito visual, o `ProtectedLayout` (Camada 2) deve ser migrado **junto** com o Sidebar e Header — pois eles formam a shell visual. Não faz sentido ter sidebar light com conteúdo dark.

**Solução prática:** A migração do layout shell (Sidebar + Header + ProtectedLayout + index.css) deve ocorrer em um único commit, seguida imediatamente pelas páginas.

---

## 2. Abordagem de Tokens

Em vez de CSS custom properties (que exigiria trocar todo o tailwind), vamos **estender o tailwind.config.js** com os tokens do STITCH como cores nomeadas. Isso mantém o padrão `cn()` + classes tailwind que o projeto já usa.

```js
// tailwind.config.js — extensão proposta
theme: {
  extend: {
    colors: {
      // Tokens primários
      'adv-primary':    '#000f22',
      'adv-primary-ct': '#0a2540',  // primary-container
      'adv-on-primary': '#ffffff',
      
      // Superfícies (hierarquia de fundo)
      'adv-bg':         '#f7f9fb',  // background
      'adv-s0':         '#ffffff',  // surface-container-lowest (cards)
      'adv-s1':         '#f2f4f6',  // surface-container-low (seções)
      'adv-s2':         '#eceef0',  // surface-container (componentes)
      'adv-s3':         '#e6e8ea',  // surface-container-high (hover)
      'adv-s4':         '#e0e3e5',  // surface-container-highest (active)
      
      // Texto
      'adv-text':       '#191c1e',  // on-surface
      'adv-text-2':     '#43474d',  // on-surface-variant
      
      // Acento positivo (emerald)
      'adv-accent':     '#009e6d',  // on-tertiary-container
      'adv-accent-dim': '#4edea3',  // tertiary-fixed-dim (gráficos)
      
      // Bordas (uso restrito — preferir mudança de bg)
      'adv-outline':    '#74777e',
      'adv-outline-2':  '#c4c6ce',  // outline-variant (ghost borders)
      
      // Erros
      'adv-error':      '#ba1a1a',
      'adv-error-ct':   '#ffdad6',
    },
    fontFamily: {
      sans:     ['Inter', 'sans-serif'],
      headline: ['Manrope', 'sans-serif'],
    },
  }
}
```

**Nota de prefixo:** O prefixo `adv-` evita conflito com as classes tailwind nativas (ex: `bg-primary` pode conflitar com alguma lib futura).

---

## 3. Plano de Componentização

### 3.1 Componentes a CRIAR (novos)

#### `components/ui/Button.tsx` — componente genérico novo

```tsx
// Variantes: primary | secondary | ghost | danger
// Sizes: sm | md | lg
// Props: variant, size, loading, icon, full, children
// Sem mt-4 embutido — posicionamento é responsabilidade do pai
// Named export: export function Button(...)
```

`ButtonSubmit` **permanece** como está (não é deprecado, não é re-export). Motivo: `DEVELOPMENT.md` o documenta como padrão oficial de formulários com loading state. Ele será apenas refatorado internamente para usar as novas classes `adv-*`.

Regra de uso:
- **Novas telas e componentes:** usar `Button` com as variantes
- **Componentes existentes com `ButtonSubmit`:** manter até migração deliberada

#### `components/ui/Badge.tsx`

```tsx
// Variantes: success | warning | error | info | neutral
// Usado em: status de convite, status de opção, tipo de transação
// Substitui os inline px-2 py-1 rounded-full espalhados pelo código
```

#### `components/ui/Tabs.tsx`

```tsx
// Props: tabs: {id, label, icon?}[], activeTab, onTabChange
// Extraído do WalletDashboard — padrão reutilizável
// Usado em: WalletDashboard, e potencialmente WalletsPage, ClientsPage
```

#### `components/ui/Card.tsx`

```tsx
// Wrapper padrão de card com variantes
// Variantes: default (s0 bg) | elevated (shadow) | section (s1 bg)
// Props: children, className, onClick?, hover?
// Resolve a duplicação entre CardWallet, CardClient, StatCard base
```

#### `components/ui/Table.tsx`

```tsx
// Componente Table genérico com slots:
// Table, Table.Head, Table.Body, Table.Row, Table.Cell, Table.HeaderCell
// Suporte a: hover rows, align (left/right/center), loading state
// Usado em: PositionTable, TransactionTimeline, futura AnalyticsPage
```

#### `components/ui/EmptyState.tsx`

```tsx
// Estado vazio padronizado (ícone + mensagem + ação opcional)
// Resolve o pattern repetido de:
// <Icon /><p className="text-gray-400">...</p>
// Aparece em: WalletsPage, ClientsPage, PositionTable, etc.
```

#### `components/ui/SearchInput.tsx`

```tsx
// Resolve a inconsistência entre os 3 estilos de search input
// Props: value, onChange, placeholder, className?
// Padroniza bg-adv-s4 border-none focus:ring-adv-accent
```

---

### 3.1.1 — Migrar UI color constants nos arquivos types/

Existem mapeamentos de cor acoplados ao tema dark nos arquivos de tipos das features. Devem ser atualizados para classes `adv-*` durante a refatoração da respectiva feature:

```typescript
// features/wallets/types/index.ts — antes:
BUY: 'text-blue-400',
SELL: 'text-orange-400',

// depois (tema light):
BUY: 'text-adv-primary',
SELL: 'text-adv-error',
```

Arquivos afetados:
- `features/wallets/types/index.ts` → `transactionTypeColors`
- `features/clients-page/types/index.ts` → `inviteStatusColors`

Esses são tipos de UI (não vêm do backend) — podem ser alterados diretamente.

---

### 3.1.2 — Padrão de export para novos componentes

**Todos os novos componentes em `components/ui/`** usam **named exports**:
```tsx
// ✅ correto para novos componentes
export function Button(...) { }
export function Badge(...) { }

// componentes existentes com default export NÃO são alterados
// export default function Input — MANTER como está
```

---

### 3.2 Componentes a ADAPTAR (refatorar visual)

#### `components/layout/ModalBase.tsx`

**Problema atual:** Container sem header próprio. Cada modal recria o header.

**Solução:** Adicionar seções compostas ao ModalBase:

```tsx
// ModalBase recebe children e renderiza wrapper glassmorphism
// Adicionar subcomponentes:
// ModalBase.Header — flex + título + botão close padrão
// ModalBase.Body   — padding padronizado + overflow-y-auto
// ModalBase.Footer — ações do modal

// Estilo novo:
// bg: rgba(255, 255, 255, 0.92)
// backdrop-filter: blur(20px)
// border-radius: 0.75rem
// shadow: 0 24px 64px rgba(0,15,34,0.12)
```

Todos os modais existentes (WalletDashboard, ClientModal, TradeModal, etc.) devem ser migrados para usar `ModalBase.Header` + `ModalBase.Body`.

#### `components/layout/Sidebar.tsx`

- Trocar `bg-slate-900` → `bg-adv-s1`
- Trocar `border-r border-slate-800` → remover borda (No-Line Rule)
- Nav item ativo: `bg-adv-s2 text-adv-primary` com indicador left accent `border-l-2 border-adv-primary`
- Nav item hover: `hover:bg-adv-s3`
- Texto: `text-adv-text-2` → ativo: `text-adv-primary`
- Avatar: `bg-adv-primary-ct` com `text-adv-on-primary`
- Adicionar logo da Advision no topo do sidebar (atualmente logo só no header)

#### `components/layout/Header.tsx`

- Background: `bg-adv-s1` sem border
- Search bar: `bg-adv-s2 rounded-lg` sem border
- Notificação: manter ícone, ajustar cores
- User profile: ajustar para `text-adv-text`

#### `components/layout/ProtectedLayout.tsx`

- Background raiz: `bg-adv-bg` (trocar `bg-slate-950`)
- Main content: `bg-adv-bg`

#### `components/ui/Input.tsx` + variantes

- Background: `bg-adv-s4` (surface-container-highest)
- Border: remover borda inativa, manter apenas focus ring
- Focus: `focus:ring-2 focus:ring-adv-accent`
- Label: `text-adv-text font-medium`
- Placeholder: `placeholder-adv-text-2`
- Error state: `ring-adv-error`

Todos os inputs especializados (InputEmail, InputPassword, etc.) herdam do Input base — a mudança é centralizada.

#### `components/ui/Select.tsx`

- Remover hex hard-coded (`#1e1e1e`, `#2a2a2a`)
- Alinha com o mesmo estilo do `Input.tsx` refatorado
- Dropdown: glassmorphism ou `bg-adv-s0 shadow-xl`

#### `components/ui/ButtonSubmit.tsx` → deprecar para `Button.tsx`

Após criar `Button.tsx`, fazer `ButtonSubmit` ser um re-export:
```tsx
// ButtonSubmit.tsx (temporário — para não quebrar imports)
export { Button as default } from './Button';
```

---

### 3.3 Componentes a REUTILIZAR sem grandes mudanças

| Componente | Ação | Justificativa |
|---|---|---|
| `LoadingSpinner.tsx` | Só trocar cor → `text-adv-primary` | Lógica ok, visual minor |
| `LoadingScreen.tsx` | Trocar bg dark → `bg-adv-bg` | Estrutura ok |
| `RoleToggle.tsx` | Adaptar cores ao tema light | Lógica intacta |
| `ConfirmationDialog.tsx` | Adaptar cores, usa ModalBase | Sem mudança estrutural |
| `PageTitle.tsx` | Trocar cor do texto → `text-adv-text` | Simples |
| `NotFound.tsx` | Adaptar tema | Simples |

---

### 3.3.1 Componentes a REUTILIZAR — `ButtonSubmit`

Refatorar internamente para usar classes `adv-*`, mas manter API e comportamento:
```tsx
// Antes: bg-blue-600 hover:bg-blue-700
// Depois: bg-adv-primary hover:bg-adv-primary-ct (ou gradiente)
// Props: sem alteração
```

---

### 3.4 Componentes de Feature a REFATORAR

#### `features/home/components/advisor/StatCard.tsx`

- Remover gradient text → usar `font-headline text-adv-primary font-bold`
- Background: `bg-adv-s0 shadow-ambient`
- Icon bg: `bg-adv-primary-ct/20` (azul escuro suave)
- Considerar mover para `components/ui/StatCard.tsx` (é reutilizável)

#### `features/wallets/components/WalletCard.tsx`

- Remover `bg-slate-900 border border-slate-800`
- Aplicar `bg-adv-s0 shadow-ambient hover:shadow-ambient-lg`
- Ícone avatar: iniciais com `bg-adv-accent/20 text-adv-accent`
- Valores: `text-adv-accent` para positivo

#### `features/clients-page/components/ClientCard.tsx`

- Mesma lógica do WalletCard
- Avatar user: iniciais com `bg-adv-primary-ct/20 text-adv-primary`
- Status badge: usar novo `Badge.tsx`

#### `features/wallets/components/PositionTable.tsx`

- Refatorar para usar `Table.tsx` novo
- Header: `bg-adv-s3`
- Hover rows: `hover:bg-adv-s3`
- Sem borders de linha

#### `features/wallets/components/WalletDashboard.tsx`

- Header do modal: migrar para `ModalBase.Header`
- Summary cards: migrar para `Card.tsx` variant
- Action buttons: migrar para `Button.tsx` variant ghost/secondary
- Tabs: migrar para `Tabs.tsx` componente
- Separadores `w-px h-8 bg-slate-700` → remover, usar gap maior

#### `features/home/pages/HomePageAdvisor.tsx`

- Migrar `StatCard` para usar novo visual
- `QuickActions`, `RecentActivity`, `WelcomeSection`: adaptar cores
- `UpcomingDueDates`: adaptar cores

#### `features/clients-page/pages/ClientsPage.tsx`

- Inline search input → usar `SearchInput.tsx`
- Stats card: adaptar visual

#### `features/login-register/pages/LoginPage.tsx` + `RegisterPage.tsx`

- Background: `bg-adv-bg`
- Card principal: `bg-adv-s0` com shadow
- Border do card: remover border azul (`border-2 border-blue-400`) → shadow ambient
- Branding panel: `bg-adv-primary` com `text-adv-on-primary`
- Botão: usar `Button variant="primary"` novo

---

## 4. Decisão sobre Ícones

**Atual:** `lucide-react` (bem integrado, em uso massivo)

**STITCH:** Material Symbols Outlined

**Recomendação: MANTER lucide-react.** A troca de ícones é uma mudança cosmética de altíssimo custo (centenas de imports) com ganho visual marginal. O lucide-react é igualmente profissional. Foco do refactor deve ser cores, tipografia e estrutura.

---

## 5. Riscos Técnicos

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Contraste de texto ruim no tema light | Alta | Alto | Testar WCAG AA para cada par texto/fundo antes de finalizar |
| Glassmorphism com performance ruim em Safari | Média | Médio | Testar `backdrop-filter: blur()` — fallback `bg-adv-s0` solid |
| Fonts externas lentas (Google Fonts) | Baixa | Médio | Usar `display=swap` + preconnect |
| `ButtonSubmit` quebrar em import default/named | Alta | Baixo | Manter re-export durante transição |
| CSS de animações duplicadas no ModalBase | Certeza | Baixo | Mover animações para tailwind.config.js |
| Inputs masked (CPF/CNPJ/Phone) com estilo inconsistente | Média | Médio | Testar cada input especializado individualmente |
| recharts em tema light pode precisar de ajuste de cores de gráfico | Alta | Médio | Ajustar `stroke`, `fill` para usar `adv-accent` e `adv-primary` |
