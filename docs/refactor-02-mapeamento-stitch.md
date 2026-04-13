# Refactor UI — Parte 2: Mapeamento STITCH vs Projeto Atual

> Documento gerado em 2026-04-12.

---

## 1. A Grande Mudança: Dark → Light

Esta é a mudança mais impactante e mais disruptiva de toda a refatoração.

| Aspecto | Atual (Dark) | STITCH (Light) |
|---|---|---|
| Background raiz | `#020617` (slate-950) | `#f7f9fb` |
| Superfície de cards | `#0f172a` (slate-900) | `#ffffff` (surface-container-lowest) |
| Superfície de seções | `#1e293b` (slate-800) | `#f2f4f6` (surface-container-low) |
| Cor de texto primário | `#ffffff` | `#191c1e` |
| Cor de texto secundário | `#94a3b8` (slate-400) | `#43474d` |
| Bordas | `#1e293b` (slate-800) | **sem bordas** (separação por cor de fundo) |
| Ação primária | `#2563eb` (blue-600) | `#000f22` (navy deep) com gradiente |
| Acento positivo | `#34d399` (emerald-400) | `#009e6d` |
| Font | sistema (sans-serif default) | **Manrope** (headlines) + **Inter** (body) |

---

## 2. Paleta de Cores STITCH — Token Map

Estes são os tokens que precisamos implementar como CSS custom properties ou extensões do Tailwind:

```js
// tailwind.config.js — colors a adicionar
colors: {
  primary:        '#000f22',
  'primary-container': '#0a2540',
  'on-primary':   '#ffffff',
  'primary-fixed': '#d2e4ff',
  'primary-fixed-dim': '#b0c8eb',
  'inverse-primary': '#b0c8eb',

  secondary:       '#505f76',
  'secondary-container': '#d0e1fb',
  'on-secondary':  '#ffffff',

  tertiary:        '#001209',
  'tertiary-container': '#002a1a',
  'on-tertiary':   '#ffffff',
  'on-tertiary-container': '#009e6d',  // emerald — COR DE AÇÃO POSITIVA
  'tertiary-fixed-dim': '#4edea3',     // emerald claro — gráficos

  background:      '#f7f9fb',
  surface:         '#f7f9fb',
  'surface-dim':   '#d8dadc',
  'surface-bright':'#f7f9fb',
  'surface-container-lowest': '#ffffff',
  'surface-container-low':    '#f2f4f6',
  'surface-container':        '#eceef0',
  'surface-container-high':   '#e6e8ea',
  'surface-container-highest':'#e0e3e5',
  'surface-variant':          '#e0e3e5',
  'surface-tint':             '#49607e',

  'on-surface':           '#191c1e',
  'on-surface-variant':   '#43474d',
  'inverse-surface':      '#2d3133',
  'inverse-on-surface':   '#eff1f3',

  outline:         '#74777e',
  'outline-variant': '#c4c6ce',

  error:           '#ba1a1a',
  'error-container': '#ffdad6',
  'on-error':      '#ffffff',
  'on-error-container': '#93000a',
}
```

---

## 3. Tipografia STITCH

| Elemento | Font | Peso | Uso |
|---|---|---|---|
| Display / Headlines | **Manrope** | 700-800 | Totais financeiros, títulos de seção |
| Body / Labels | **Inter** | 400-500 | Dados em tabelas, labels, metadata |

**Import necessário:**
```html
<!-- No index.html -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Manrope:wght@600;700;800&display=swap" rel="stylesheet">
```

```js
// tailwind.config.js
fontFamily: {
  sans: ['Inter', 'sans-serif'],        // body padrão
  headline: ['Manrope', 'sans-serif'],  // títulos e valores financeiros grandes
}
```

---

## 4. Regras de Design STITCH

### Regra 1: "No-Line Rule"
Bordas de 1px para separação de seções são **proibidas**. Estrutura definida exclusivamente via mudança de cor de fundo.

```
❌ border-b border-slate-800
✓  bg-surface-container-low (diferença de cor é a separação)
```

### Regra 2: Surface Hierarchy
```
Level 0 — background (#f7f9fb)         → fundo da página
Level 1 — surface-container-low (#f2f4f6) → áreas de seção (sidebar, header)  
Level 2 — surface-container-lowest (#fff) → cards "flutuantes" sobre o Level 1
Level 3 — surface-container-high (#e6e8ea) → hover states
```

### Regra 3: Glassmorphism para elementos flutuantes
```css
/* Modais, dropdowns */
background: rgba(255, 255, 255, 0.85);
backdrop-filter: blur(20px);
```

### Regra 4: Gradiente no botão primário
```css
/* Primary button */
background: linear-gradient(135deg, #000f22, #0a2540);
```

### Regra 5: Sombras Ambiente (sem drop-shadow clássico)
```css
/* Cards hover */
box-shadow: 0 8px 32px 0 rgba(0, 15, 34, 0.04);
```

### Regra 6: Border radius máximo `0.75rem` (12px)
Mantém feel "profissional", sem exagero de redondeza.

---

## 5. Mapeamento de Telas

### 5.1 Telas STITCH → Features Atuais

| Tela STITCH | Feature Atual | Status |
|---|---|---|
| **Dashboard Principal** | `HomePageAdvisor` | Mapeado — refatorar visualmente |
| **Gestão de Clientes** | `ClientsPage` | Mapeado — refatorar visualmente |
| **Portfólio com Modal de Cadastro** | `WalletsPage` + `NewWalletModal` | Mapeado — refatorar visualmente |
| **Portfólio com Modal Refinado** | `WalletsPage` + `WalletDashboard` | Mapeado — refatorar visualmente |
| **Carteira do Cliente** | `WalletDashboard` (modal) | Mapeado — mas estrutura difere (ver §5.3) |
| **Análises e Gráficos** | Não existe (`features/optimization/` vazio) | **GAP** — ver §6 |

### 5.2 Telas Atuais sem equivalente STITCH

| Feature/Tela Atual | Descrição | Decisão pendente |
|---|---|---|
| `LoginPage` | Tela de login | Não está no STITCH — manter estrutura, adaptar tema |
| `RegisterPage` | Cadastro de usuário | Idem |
| `HomePageClient` | Dashboard do cliente | Não está no STITCH — manter |
| `InviteTokenPrompt` | Prompt de token de convite | Não está no STITCH — manter |
| `HealthCheckPage` | Admin only | Fora do escopo |
| **Derivatives/Options** | Toda a feature de opções | **GAPS CRÍTICOS** — ver §6 |
| **ProventosPage** | Página de dividendos | Não no STITCH — manter |

---

## 6. Gaps Funcionais — Perguntas Obrigatórias

As funcionalidades abaixo existem no projeto atual mas **não aparecem nas telas do STITCH**. Precisamos de decisão antes de qualquer implementação.

### GAP 1 — Feature Derivatives (Opções e Estratégias)

**O que existe hoje:**
- `OptionPositionCard` — card de posição em opção
- `OptionTradeModal` — compra/venda de opção
- `CloseOptionModal`, `ExerciseOptionModal`, `AssignmentModal`, `ExpirationModal` — lifecycle de opções
- `StrategyBuilderModal` — construção de estratégias multi-perna
- `StrategyHistoryList` — histórico de estratégias
- `UpcomingExpirationsWidget` — widget de vencimentos próximos

**Esses componentes são visíveis no `WalletDashboard` (tab "Opções" e "Estratégias")**

**Pergunta:** As telas do STITCH para o WalletDashboard não mostram a tab de Opções. Devemos:
- (A) Manter as tabs de Opções e Estratégias e adaptar visualmente ao novo tema?
- (B) Remover essas funcionalidades do escopo visual por ora?
- (C) Criar novas telas STITCH especificamente para isso?

### GAP 2 — ProventosPage

**O que existe hoje:**
- Página `/proventos` com `ProventosTab` dentro do WalletDashboard
- `useProventos`, `useWalletProventos`

**Pergunta:** A ProventosPage não aparece no STITCH. Devemos:
- (A) Manter como está e adaptar apenas o tema?
- (B) Integrar na tela de "Análises e Gráficos" do STITCH?

### GAP 3 — Tela de Login/Register

**O que existe hoje:** Telas dark com layout dividido (form + branding sidebar)

**Pergunta:** Devemos:
- (A) Refatorar para o tema light mantendo a estrutura atual?
- (B) Criar um design novo alinhado ao STITCH (tema light, Manrope, paleta navy)?

### GAP 4 — Dashboard do Cliente (HomePageClient)

**O que existe hoje:** Dashboard simplificado para o papel CLIENT com `InviteTokenPrompt`

**Pergunta:** Devemos:
- (A) Adaptar apenas o tema ao light?
- (B) Expandir a tela para algo mais completo conforme o STITCH (que mostra uma view de carteira do cliente)?

### GAP 5 — Tela "Análises e Gráficos"

**No STITCH:** Existe uma tela dedicada de análises com gráficos de performance, alocação de ativos, métricas de risco (Sharpe, volatilidade).

**No projeto atual:** A feature `optimization/` está vazia. A `HomePageAdvisor` tem métricas simples. Os gráficos do WalletDashboard são apenas `recharts` simples.

**Pergunta:** A tela "Análises e Gráficos" do STITCH é:
- (A) Uma nova feature a ser implementada futuramente (fora do escopo desta refatoração visual)?
- (B) Uma versão expandida do dashboard atual (mesmo não implementada)?

---

## 7. Comparação Visual Detalhada por Componente

### 7.1 Sidebar

| Aspecto | Atual | STITCH |
|---|---|---|
| Background | `bg-slate-900` | `bg-surface-container-low` (`#f2f4f6`) |
| Borda direita | `border-r border-slate-800` | **sem borda** (cor de fundo separa) |
| Nav item ativo | `bg-blue-500/20` + `border-l-2 border-blue-400` | `bg-surface-container` com cor primária |
| Nav item hover | `hover:bg-slate-800 hover:text-white` | `hover:bg-surface-container-high` |
| Texto nav | `text-slate-400` / `text-blue-400` | `text-on-surface` / `text-primary` |
| Avatar user | gradiente `blue → emerald` | avatar com `bg-primary-fixed-dim` |
| Logo no sidebar | Não tem (logo no header) | Logo no topo do sidebar |

### 7.2 Header

| Aspecto | Atual | STITCH |
|---|---|---|
| Background | `bg-slate-900 border-b border-slate-800` | `bg-surface-container-low` sem borda |
| Search bar | `bg-slate-800 border border-slate-700` | `bg-surface-container` sem border |
| Notificação | Ícone simples com dot | Ícone com badge numérico |
| Profile | Nome + role + avatar | Avatar + nome + "Senior Advisor" |

### 7.3 StatCard (Dashboard)

| Aspecto | Atual | STITCH |
|---|---|---|
| Background | `bg-slate-900 border border-slate-800` | `bg-surface-container-lowest` sem border |
| Valor | Gradient text (`blue-400 → blue-500`) | Manrope bold, `text-on-surface` |
| Icon background | `bg-blue-500/20` | `bg-primary-fixed/30` ou por categoria |
| Hover | `hover:border-slate-700` | `box-shadow ambient` |
| Trend | `text-emerald-400` / `text-rose-400` | `text-on-tertiary-container` / `text-error` |

### 7.4 WalletCard / ClientCard

| Aspecto | Atual | STITCH |
|---|---|---|
| Background | `bg-slate-900 border border-slate-800` | `bg-surface-container-lowest` |
| Avatar ícone | `bg-emerald-500/20` | Iniciais com `bg-secondary-container` |
| Dados | `text-gray-400` + `text-emerald-400` | `text-on-surface-variant` + `text-on-tertiary-container` |
| Hover border | `hover:border-slate-700` | `hover:shadow-ambient` |

### 7.5 Inputs

| Aspecto | Atual | STITCH |
|---|---|---|
| Background | `bg-slate-800` | `bg-surface-container-highest` |
| Border | `border border-slate-600` | nenhuma border (inactive) |
| Focus | `focus:border-blue-400 focus:ring-1 focus:ring-blue-400` | `focus:outline-tertiary` (`#009e6d`) |
| Placeholder | `placeholder-slate-400` | `placeholder-on-surface-variant` |
| Texto | `text-white` | `text-on-surface` |
| Border radius | `rounded-lg` (8px) | `rounded-md` (6px) |

### 7.6 Buttons

| Tipo | Atual | STITCH |
|---|---|---|
| Primário | `bg-blue-600 hover:bg-blue-700` | gradiente `primary → primary-container` |
| Secundário | `bg-slate-800 border border-slate-700` | `bg-surface-container-high text-on-surface` sem border |
| Terciário (ação) | `bg-emerald-600/20 text-emerald-400` | `transparent text-on-tertiary-container` |
| Destrutivo | `bg-red-600/20 text-red-400` | `bg-error-container text-error` |

### 7.7 ModalBase / WalletDashboard

| Aspecto | Atual | STITCH |
|---|---|---|
| Background | `bg-slate-900 border border-slate-700 rounded-xl` | glassmorphism `rgba(255,255,255,0.85) blur(20px)` |
| Overlay | `bg-black bg-opacity-40 backdrop-blur-sm` | `bg-on-surface/20 backdrop-blur-sm` |
| Header do modal | Cada modal cria o seu | Padronizado: logo/icon + título + close button |
| Tabs internas | `bg-slate-800 rounded-lg` | `bg-surface-container` |
| Tab ativa | `bg-slate-700 text-white` | `bg-surface-container-lowest text-primary` |

### 7.8 Tabelas

| Aspecto | Atual | STITCH |
|---|---|---|
| Header | classes inline sem padronização | `bg-surface-container-high`, `label-md` uppercase |
| Rows | sem alternância | alternância `surface` / `surface-container-low` |
| Hover | sem hover em rows | `hover:bg-surface-container-highest` com transição |
| Borders | sem borders ou com `border-slate-800` | **sem borders** — espaçamento define as linhas |
| Paginação | não implementada em tabelas | controles `1 / 25` com chevrons |
