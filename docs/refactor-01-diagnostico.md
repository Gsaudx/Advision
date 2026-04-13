# Refactor UI — Parte 1: Diagnóstico do Frontend Atual

> Documento gerado em 2026-04-12 como parte do planejamento de refatoração visual completa do Advision frontend para o design system do STITCH.

---

## 1. Estrutura de Pastas

```
src/
├── App.tsx                         # Entry point com rotas
├── main.tsx                        # Bootstrap React
├── index.css                       # Reset + scrollbar styles
├── routes/index.tsx                # Definição de rotas
├── types/                          # Tipos globais (api.d.ts, api-response.ts)
├── lib/                            # Utilitários globais
│   ├── axios.ts                    # Instância axios configurada
│   ├── react-query.ts              # QueryClient config
│   ├── utils.ts                    # cn(), getFormErrors(), generateIdempotencyKey()
│   └── formatters.ts               # formatCurrency, formatDateTime
├── assets/logos/                   # Logos da marca
├── components/
│   ├── layout/                     # Componentes estruturais da app
│   │   ├── ProtectedLayout.tsx     # Wrapper de autenticação + Header + Sidebar
│   │   ├── Header.tsx              # Barra de navegação superior (mobile-first)
│   │   ├── Sidebar.tsx             # Navegação lateral colapsável (desktop-only)
│   │   ├── ModalBase.tsx           # Container base para todos os modais
│   │   ├── PageTitle.tsx           # Título de página
│   │   └── NotFound.tsx            # Página 404
│   └── ui/                         # Design system informal (componentes reutilizáveis)
│       ├── Input.tsx               # Input genérico com label
│       ├── InputEmail.tsx          # Input email (wrapper)
│       ├── InputPassword.tsx       # Input password com toggle visibility
│       ├── InputName.tsx           # Input nome com validação
│       ├── InputCpf.tsx            # Input CPF com máscara
│       ├── InputCpfCnpj.tsx        # Input CPF/CNPJ com máscara auto
│       ├── InputPhone.tsx          # Input telefone internacional
│       ├── InputCode.tsx           # Input código de convite
│       ├── ButtonSubmit.tsx        # Botão primário com loading state
│       ├── Select.tsx              # Dropdown customizado com busca
│       ├── ConfirmationDialog.tsx  # Dialog de confirmação
│       ├── StatusCard.tsx          # Card de status (health check)
│       ├── LoadingSpinner.tsx      # Spinner animado (sm/md/lg)
│       ├── LoadingScreen.tsx       # Tela de carregamento full-page
│       └── RoleToggle.tsx          # Toggle ADVISOR/CLIENT
└── features/                       # Features por domínio (colocation)
    ├── auth/                       # Autenticação (AuthProvider, useAuth, API)
    ├── login-register/             # Páginas públicas de login e cadastro
    ├── home/                       # Dashboard (advisor + client views)
    ├── clients-page/               # Gestão de clientes
    ├── wallets/                    # Carteiras (a feature mais complexa)
    ├── derivatives/                # Opções e estratégias (sub-features)
    ├── proventos/                  # Dividendos e proventos
    ├── health-check/               # Status do sistema (admin)
    └── optimization/               # Placeholder (não implementado)
```

**Avaliação:** Estrutura bem organizada. Feature-colocation está bem aplicada. Sem arquivos órfãos ou código morto relevante.

---

## 2. Tecnologias e Dependências

| Categoria | Tecnologia | Versão |
|---|---|---|
| Framework | React | 19 |
| Build | Vite | 7 |
| Linguagem | TypeScript | 5.9 |
| Estilo | TailwindCSS | 3.4 |
| Ícones | lucide-react | 0.562 |
| HTTP | axios | 1.13 |
| Server state | @tanstack/react-query | 5 |
| Roteamento | react-router-dom | 7 |
| Gráficos | recharts | 3.6 |
| Máscaras | react-imask, react-phone-number-input | - |
| Utilitários CSS | clsx + tailwind-merge | - |

**Sem** biblioteca de componentes UI (sem shadcn, Radix, MUI, Headless UI). Tudo custom.

---

## 3. Tema Atual — Dark Theme com Slate

O tema atual é **totalmente dark**, baseado em classes Tailwind da escala `slate`:

| Elemento | Classe Tailwind | Hex aproximado |
|---|---|---|
| Background raiz | `bg-slate-950` | `#020617` |
| Superfície principal (sidebar, header) | `bg-slate-900` | `#0f172a` |
| Superfície secundária (cards) | `bg-slate-900` | `#0f172a` |
| Superfície elevada (inputs, tabs) | `bg-slate-800` | `#1e293b` |
| Borda padrão | `border-slate-800` | `#1e293b` |
| Borda hover | `border-slate-700` | `#334155` |
| Texto primário | `text-white` | `#ffffff` |
| Texto secundário | `text-slate-400` | `#94a3b8` |
| Texto terciário | `text-slate-500` | `#64748b` |
| Ação primária | `bg-blue-600` | `#2563eb` |
| Ação hover | `hover:bg-blue-700` | `#1d4ed8` |
| Sucesso/ganho | `text-emerald-400` | `#34d399` |
| Alerta | `text-amber-400` | `#fbbf24` |
| Erro/perda | `text-rose-400` | `#fb7185` |
| Opções (derivativos) | `text-purple-400` | `#c084fc` |
| Accent ativo sidebar | `bg-blue-500/20` + `border-l-2 border-blue-400` | - |

**Scrollbar**: Customizada com `slate-800` track + `slate-600` thumb.

---

## 4. Padrões de Componentes

### 4.1 ModalBase

```tsx
// Localização: components/layout/ModalBase.tsx
// Props: isOpen, onClose, title?, children, size?, minHeight?, backgroundColor?
// Sizes: sm | md | lg | xl | xxl | 3xl | 4xl | 5xl | 6xl
// Default: backgroundColor='bg-slate-800', minHeight=600
```

**Problema crítico**: O `ModalBase` não renderiza header próprio de forma consistente — o `title` existe como prop mas não tem padding próprio. Cada modal filho cria seu próprio `<div>` de header com `flex items-center justify-between p-6 border-b border-slate-800`. O `ModalBase` basicamente só provê o overlay + o container com `border-radius`. Isso causa inconsistência visual entre modais.

**Exemplo de uso inconsistente:**
- `WalletDashboard` → cria header próprio dentro do `ModalBase`
- `ClientModal` → mesma coisa  
- `TradeModal` → mesma coisa

Nenhum modal usa a prop `title` de forma padronizada.

### 4.2 Inputs

Existe um `Input.tsx` base, mas a variante de inputs em páginas inline (como `WalletsPage` e `ClientsPage`) usa classes hard-coded diretamente no JSX:

```tsx
// Padrão nos componentes UI (Input.tsx):
"bg-slate-800 border border-slate-600 rounded-lg px-3 py-2.5"

// Padrão nos inline search inputs (WalletsPage, ClientsPage):
"bg-[#1e1e1e] border border-[#2a2a2a] rounded-lg pl-10 pr-4 py-3"

// Padrão no Select.tsx (custom):
"bg-[#1e1e1e] border border-[#2a2a2a] rounded-lg"
```

**Inconsistência grave**: três estilos distintos para inputs no mesmo projeto. O `Select.tsx` usa cores hex hard-coded (`#1e1e1e`, `#2a2a2a`) que não pertencem ao sistema slate do Tailwind.

### 4.3 ButtonSubmit

```tsx
// Localização: components/ui/ButtonSubmit.tsx
// Props: full?, loading?, children?, icon?
// Classe base: bg-blue-600 + mt-4
```

**Problema de API**: A prop `full` controla largura (`w-full` vs `w-full sm:w-1/2`), mas a margem `mt-4` é inline e precisa ser sobrescrita com `!mt-0` em múltiplos lugares. Isso é um anti-pattern.

Não existe um `Button` genérico — só `ButtonSubmit`. Botões de ação (Depositar, Sacar, Comprar Ação, etc.) são todos implementados diretamente como `<button>` com classes inline.

### 4.4 Cards

Dois padrões de card coexistem:

```tsx
// Padrão 1 — Cards de conteúdo (WalletCard, ClientCard, StatCard):
"bg-slate-900 rounded-xl p-5 border border-slate-800 hover:border-slate-700"

// Padrão 2 — Cards de métricas (dentro de WalletDashboard):
"bg-slate-800 rounded-xl p-4"
```

O `StatCard` do dashboard está na feature `home/` e não em `components/ui/` — é reutilizável mas não está no lugar correto.

### 4.5 Tabs

O padrão de tabs existe em `WalletDashboard` mas é implementado inline sem componente extraído:

```tsx
"flex items-center gap-1 p-1 bg-slate-800 rounded-lg w-fit"
// item ativo:
"bg-slate-700 text-white"
// item inativo:
"text-gray-400 hover:text-white"
```

### 4.6 Tabelas

`PositionTable` é uma tabela customizada. Não existe um componente `Table` genérico. A tabela usa `<table>` nativo com classes tailwind inline.

---

## 5. Problemas de Consistência

### Críticos
1. **Três estilos de input** coexistem sem padronização
2. **ModalBase sem header próprio** — cada modal reinventa o header
3. **Select usa hex hard-coded** (`#1e1e1e`, `#2a2a2a`) divergindo do sistema
4. **Não existe Button genérico** — apenas ButtonSubmit com API problemática (`mt-4` embutido)

### Moderados
5. **StatCard em `features/home/`** em vez de `components/ui/` — componente reutilizável mal posicionado
6. **Não existe componente Tabs** — padrão de tabs repetido em WalletDashboard sem extração
7. **Não existe componente Table** — cada tabela reinventa markup
8. **Inline search inputs** em `ClientsPage` e `WalletsPage` não usam o `Input` base

### Menores
9. **`ButtonSubmit` com `mt-4` inline** força `!mt-0` como override em vários locais
10. **Ausência de design tokens** — sem CSS custom properties, sem arquivo de tokens
11. **Animações CSS duplicadas** — `scale-in` e `fade-in` definidas inline em `<style>` dentro do `ModalBase` e também no `tailwind.config.js`

---

## 6. Pontos Fortes

1. **Arquitetura de features bem organizada** — colocation clara, boundaries definidos
2. **React Query bem utilizado** — queries por feature, refetch, optimistic updates ausentes mas padrão limpo
3. **ProtectedLayout robusto** — role-based routing funcional
4. **TypeScript rigoroso** — sem `any`, tipos derivados do backend via OpenAPI
5. **Componentes de inputs especializados** — InputCpfCnpj, InputPhone com validação real
6. **ModalBase existe** — há base para padronização, mesmo que subutilizado
7. **Sidebar colapsável** — UX bem implementada para desktop
8. **Responsividade considerada** — Header mobile implementado
