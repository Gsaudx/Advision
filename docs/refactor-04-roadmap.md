# Refactor UI — Parte 4: Roadmap Executável

> Documento gerado em 2026-04-12.
> Dependências: Respostas aos GAPs Funcionais do documento `refactor-02-mapeamento-stitch.md §6` são necessárias antes de iniciar a Etapa 5.

---

## Visão Geral das Etapas

```
Etapa 0 — Resolução dos GAPs (blocking)
Etapa 1 — Fundação: Tokens + Tipografia
Etapa 2 — Componentes Base (ui/)
Etapa 3 — Shell de Layout (Sidebar, Header, ProtectedLayout)
Etapa 4 — Páginas Públicas (Login, Register)
Etapa 5 — Feature: Dashboard Advisor
Etapa 6 — Feature: Clientes
Etapa 7 — Feature: Carteiras (WalletDashboard)
Etapa 8 — Features menores (Proventos, Client Home)
Etapa 9 — Polish e Revisão Final
```

---

## Etapa 0 — Resolução dos GAPs Funcionais

**Status:** Blocking — precisa de decisão do dono do produto antes de qualquer implementação.

**Ações:**
- Responder as 5 perguntas do documento `refactor-02 §6`:
  - GAP 1: O que fazer com a feature Derivatives/Opções no novo design?
  - GAP 2: ProventosPage — manter como está ou integrar em outra tela?
  - GAP 3: Login/Register — adaptar tema ou redesenhar?
  - GAP 4: Dashboard do Cliente — adaptar ou expandir?
  - GAP 5: Tela "Análises e Gráficos" — fora do escopo ou nova feature?

**Estimativa:** Decisão do produto (sem código)

---

## Etapa 1 — Fundação: Tokens + Tipografia

**Objetivo:** Estabelecer a base do novo design system sem tocar em nenhum componente.

**Arquivos a modificar:**
- `tailwind.config.js` — adicionar paleta `adv-*`, fontFamily `headline`
- `index.html` — adicionar Google Fonts (Manrope + Inter)
- `src/index.css` — atualizar scrollbar colors (track: `adv-s2`, thumb: `adv-s3`)

**Critério de conclusão:** As classes `bg-adv-bg`, `text-adv-text`, `font-headline`, etc. funcionam no projeto. Nenhum componente existente quebra (pois usam classes slate nativas).

**Dependências:** Nenhuma

**Prioridade:** P0 — fundação de tudo

---

## Etapa 2 — Componentes Base (ui/)

**Objetivo:** Criar/refatorar os componentes base do design system. Todos os componentes novos já nascem no tema light.

**Ações (em ordem de dependência):**

### 2.1 — Criar `components/ui/Button.tsx`
- Variantes: `primary | secondary | ghost | danger`
- Sizes: `sm | md | lg`
- Props: `variant`, `size`, `loading`, `icon`, `full`, `children`
- Sem `mt-4` embutido
- Primário: gradiente `adv-primary → adv-primary-ct`

### 2.2 — Deprecar `components/ui/ButtonSubmit.tsx`
- Fazer re-export de `Button` com defaults equivalentes
- Manter para não quebrar imports existentes

### 2.3 — Refatorar `components/ui/Input.tsx`
- Novo visual: `bg-adv-s4` sem borda inativa, focus ring `adv-accent`
- Label: `text-adv-text`

### 2.4 — Refatorar variantes de Input (Email, Password, Name, etc.)
- Herdam do Input.tsx — ajuste automático após 2.3

### 2.5 — Refatorar `components/ui/Select.tsx`
- Remover hex hard-coded, alinhar com Input.tsx refatorado
- Dropdown: `bg-adv-s0 shadow-xl border-none`

### 2.6 — Criar `components/ui/SearchInput.tsx`
- Input de busca padronizado com ícone de lupa
- Substitui os 3 estilos inline existentes

### 2.7 — Criar `components/ui/Badge.tsx`
- Variantes: `success | warning | error | info | neutral`
- Substitui os inline `px-2 py-1 rounded-full` espalhados

### 2.8 — Criar `components/ui/Card.tsx`
- Wrapper de card com variantes
- `default`: `bg-adv-s0 shadow-ambient rounded-xl`
- `section`: `bg-adv-s1 rounded-xl`

### 2.9 — Criar `components/ui/Tabs.tsx`
- Extrai o padrão de tabs do WalletDashboard

### 2.10 — Criar `components/ui/Table.tsx`
- Componentes compostos: `Table`, `Table.Head`, etc.

### 2.11 — Criar `components/ui/EmptyState.tsx`
- Padroniza estados vazios

### 2.12 — Adaptar `components/ui/LoadingSpinner.tsx`
- Trocar cor para `text-adv-primary`

### 2.13 — Adaptar `components/ui/LoadingScreen.tsx`
- Background: `bg-adv-bg`

### 2.14 — Refatorar `components/layout/ModalBase.tsx`
- Novo visual glassmorphism
- Adicionar `ModalBase.Header`, `ModalBase.Body`, `ModalBase.Footer`
- Mover animações CSS para `tailwind.config.js`

**Critério de conclusão:** Todos os componentes base existem com visual light. Storybook manual (abrir cada componente isolado) confirma visual correto.

**Dependências:** Etapa 1 concluída

**Prioridade:** P0

---

## Etapa 3 — Shell de Layout

**Objetivo:** Migrar a shell da aplicação para o tema light. **Esta etapa deve ser commitada atomicamente** — não pode ter sidebar light com conteúdo dark por mais de um commit.

**Ações:**

### 3.1 — Refatorar `components/layout/ProtectedLayout.tsx`
- Background raiz: `bg-adv-bg`
- Layout: sem mudança estrutural

### 3.2 — Refatorar `components/layout/Sidebar.tsx`
- Background: `bg-adv-s1`
- Remover borda direita
- Nav items: novo visual com cores `adv-*`
- Logo no topo do sidebar
- User avatar: iniciais com `bg-adv-primary-ct/20`

### 3.3 — Refatorar `components/layout/Header.tsx`
- Background: `bg-adv-s1` sem borda inferior
- Search: `bg-adv-s2`
- Cores de texto e ícones

**Critério de conclusão:** A aplicação abre com o novo layout light. Navegação entre páginas funciona. Sidebar collapsa corretamente.

**Dependências:** Etapas 1 e 2 concluídas

**Prioridade:** P0 — visualmente mais impactante

---

## Etapa 4 — Páginas Públicas (Login e Register)

**Objetivo:** Refatorar as telas de entrada da aplicação.

> ⚠️ Depende da decisão do GAP 3 sobre Login/Register.

### 4.1 — Refatorar `features/login-register/pages/LoginPage.tsx`
- Background: `bg-adv-bg`
- Card: `bg-adv-s0 shadow-ambient` — remover borda azul
- Branding panel: `bg-adv-primary text-adv-on-primary`
- Botão: usar `Button variant="primary"`
- Inputs: já atualizados pela Etapa 2

### 4.2 — Refatorar `features/login-register/pages/RegisterPage.tsx`
- Mesma abordagem do LoginPage

**Dependências:** Etapas 1, 2, 3

---

## Etapa 5 — Feature: Dashboard Advisor

**Objetivo:** Refatorar `HomePageAdvisor` e todos os seus componentes.

### 5.1 — Migrar `features/home/components/advisor/StatCard.tsx`
- Remover gradient text
- Novo visual: `Card.tsx` base + `font-headline` para valores
- Considerar mover para `components/ui/StatCard.tsx`

### 5.2 — Migrar `features/home/components/advisor/WelcomeSection.tsx`
- Adaptar cores ao tema light

### 5.3 — Migrar `features/home/components/advisor/RecentActivity.tsx`
- Cards de atividade: `Card.tsx` variant
- Ícones de ação: cores `adv-*`

### 5.4 — Migrar `features/home/components/advisor/QuickActions.tsx`
- Botões de ação rápida: usar `Button.tsx`

### 5.5 — Migrar `features/home/components/advisor/UpcomingDueDates.tsx`
- Adaptar tabela/lista para novo estilo

### 5.6 — Migrar modais do advisor
- `ActivityDetailModal.tsx` → usar `ModalBase.Header` + `ModalBase.Body`
- `ActivityHistoryModal.tsx` → idem

**Dependências:** Etapas 1-3

---

## Etapa 6 — Feature: Clientes

### 6.1 — Migrar `features/clients-page/components/ClientCard.tsx`
- Usar `Card.tsx` base
- Avatar com iniciais
- Status badge: usar `Badge.tsx`

### 6.2 — Migrar `features/clients-page/components/ClientStatsCard.tsx`
- Stats do topo da página

### 6.3 — Migrar `features/clients-page/pages/ClientsPage.tsx`
- Inline search → usar `SearchInput.tsx`
- Layout da página adaptar para tema light

### 6.4 — Migrar modais de cliente
- `ClientModal.tsx` → `ModalBase.Header` + `ModalBase.Body`
- `NewClientModal.tsx` → idem
- `EditClientModal.tsx` → idem
- `DeleteClientDialog.tsx` → `ConfirmationDialog.tsx` refatorado

**Dependências:** Etapas 1-3, 2.6, 2.7

---

## Etapa 7 — Feature: Carteiras (a mais complexa)

Esta etapa deve ser quebrada em sub-etapas por tamanho.

### 7.1 — Migrar `features/wallets/components/WalletCard.tsx`
- Usar `Card.tsx` base

### 7.2 — Migrar `features/wallets/components/WalletStatsCard.tsx`
- Stats do topo da WalletsPage

### 7.3 — Migrar `features/wallets/pages/WalletsPage.tsx`
- Inline search → `SearchInput.tsx`
- Layout geral

### 7.4 — Migrar `features/wallets/components/WalletDashboard.tsx`
- Header do modal → `ModalBase.Header`
- Summary cards → `Card.tsx`
- Action buttons → `Button.tsx` com variantes corretas
- Tabs → `Tabs.tsx`
- Separadores → remover `w-px bg-slate-700`, usar gap

### 7.5 — Migrar `features/wallets/components/PositionTable.tsx`
- Usar `Table.tsx` novo
- Adaptar cores, hover states

### 7.6 — Migrar `features/wallets/components/TransactionTimeline.tsx`
- Adaptar cores do timeline

### 7.7 — Migrar `features/wallets/components/TradeModal.tsx`
- `ModalBase.Header` + `ModalBase.Body`
- Inputs já atualizados

### 7.8 — Migrar `features/wallets/components/CashOperationModal.tsx`
- Idem

### 7.9 — Migrar `features/wallets/components/NewWalletModal.tsx`
- Idem

### 7.10 — Migrar feature Derivatives (condicionado ao GAP 1)
- `OptionPositionCard` → adaptar cores
- `OptionTradeModal`, `CloseOptionModal`, etc. → `ModalBase.Header`
- `UpcomingExpirationsWidget` → adaptar

**Dependências:** Etapas 1-3, 2.8, 2.9, 2.10, 2.14

---

## Etapa 8 — Features Menores

### 8.1 — Migrar `features/proventos/pages/ProventosPage.tsx`
- Adaptar tema (condicionado ao GAP 2)

### 8.2 — Migrar `features/home/pages/HomePageClient.tsx`
- Dashboard do cliente (condicionado ao GAP 4)

### 8.3 — Migrar `features/home/components/client/InviteTokenPrompt.tsx`
- Adaptar cores

**Dependências:** Etapas 1-3

---

## Etapa 9 — Polish e Revisão Final

### 9.1 — Ajuste de gráficos (recharts)
- Trocar cores dos gráficos para `adv-accent`, `adv-primary`
- Fundo de gráficos: `transparent` sobre `bg-adv-s0`

### 9.2 — Scrollbar
- Atualizar `index.css` para tema light: track `adv-s2`, thumb `adv-s3`

### 9.3 — Testes visuais de contraste
- Verificar WCAG AA em todos os pares texto/fundo críticos

### 9.4 — Verificação mobile
- Testar Header mobile no tema light
- Testar modais em viewport pequena

### 9.5 — Limpar ButtonSubmit deprecado
- Após todas as features migrarem, substituir re-exports pelos imports diretos de `Button`
- Remover `ButtonSubmit.tsx`

### 9.6 — Atualizar `CLAUDE.md`
- Documentar novo design system (tokens, componentes base)

---

## Mapa de Dependências

```
Etapa 1 (Tokens)
    └── Etapa 2 (Componentes Base)
            └── Etapa 3 (Shell Layout)  ──────────────────┐
                    ├── Etapa 4 (Login/Register)           │
                    ├── Etapa 5 (Dashboard)                │
                    ├── Etapa 6 (Clientes)                 │
                    ├── Etapa 7 (Carteiras)                │
                    └── Etapa 8 (Features menores)         │
                            └── Etapa 9 (Polish)  ←────────┘
```

---

## Priorização

| Etapa | Prioridade | Impacto Visual | Risco |
|---|---|---|---|
| 0 — GAPs | P0 🔴 | Blocking | - |
| 1 — Tokens | P0 🔴 | Fundação | Baixo |
| 2 — Componentes Base | P0 🔴 | Alto | Médio |
| 3 — Shell Layout | P0 🔴 | Máximo | Médio |
| 4 — Login/Register | P1 🟡 | Alto | Baixo |
| 5 — Dashboard | P1 🟡 | Alto | Baixo |
| 6 — Clientes | P1 🟡 | Alto | Baixo |
| 7 — Carteiras | P1 🟡 | Máximo | Alto |
| 8 — Features menores | P2 🟢 | Médio | Baixo |
| 9 — Polish | P2 🟢 | Médio | Baixo |

---

## Regras de Execução

1. **Nunca misturar lógica de negócio com refatoração visual** — cada PR deve ser puramente visual
2. **Testar funcionalmente cada feature após migração** — login, criar carteira, comprar ação, etc.
3. **Commitar por componente ou por sub-etapa** — nunca um único commit gigante
4. **Etapa 3 (Shell) é o único commit obrigatório atômico** — Sidebar + Header + ProtectedLayout juntos
5. **Não remover `ButtonSubmit` até que todas as features estejam migradas**
6. **Documentar no CLAUDE.md** os novos tokens e componentes ao finalizar Etapa 9
