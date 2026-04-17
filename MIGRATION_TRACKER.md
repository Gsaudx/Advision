# Migration Tracker — Sovereign → Advision
> Última atualização: 2026-04-15

## Status Geral
- Total de páginas mapeadas: 5
- Páginas migradas: 1
- Páginas pendentes: 4

## Decisões Globais do Dev
- **Design tokens via CSS variables:** tokens RGB do Sovereign adicionados em `frontend/src/index.css` + mapeados no `tailwind.config.js` (extend.colors). Coexistem com classes slate existentes.
- **Fontes:** Manrope (headline) + Inter (sans) adicionadas globalmente via Google Fonts. `h1–h6` usam `font-headline` por padrão.
- **Border-radius:** Cards usam `rounded-[2rem]` (32px). Modais usam `rounded-3xl` (24px).
- **Animações:** `motion` (v12) instalado. Entrada dos cards com `motion.div` (opacity+y, 0→1, delay escalonado).
- **Componentes com MOCKUP:** dados marcados com comentário `// MOCKUP: ... — remover quando endpoint estiver disponível`.
- **AlertsPanel:** substituiu `QuickActions` no Dashboard. Dados mockados; `QuickActions.tsx` mantido sem uso.

---

## Página: Dashboard
**Status:** 🟢 Migrada
**Arquivo(s) Advision:** `features/home/pages/HomePageAdvisor.tsx`
**Arquivo(s) Sovereign:** `components/Dashboard.tsx`
**Data de início:** 2026-04-15
**Data de conclusão:** 2026-04-15

### Análise
- Componentes no Advision: `WelcomeSection`, `StatCard` ×4, `RecentActivity`, `QuickActions`, `UpcomingDueDates`, `ActivityHistoryModal`, `ActivityDetailModal`, `ActivitySkeleton`
- Componentes no Sovereign: Welcome section, Bento grid (AUM card + Clients card), RecentActivity list, Alertas Críticos sidebar, background aesthetic element
- Componentes exclusivos Advision: `UpcomingDueDates`, `ActivityHistoryModal`, `ActivityDetailModal`, `ActivitySkeleton`, `QuickActions`
- Componentes exclusivos Sovereign: Bento grid layout, AlertsPanel, background "EQLD" element, motion animations

### Perguntas ao Dev
| # | Pergunta | Resposta | Data |
|---|----------|----------|------|
| 1 | Layout de métricas: manter 4 StatCards ou adotar bento grid do Sovereign? | Adotar bento grid com dados reais; mockar o que não tiver endpoint | 2026-04-15 |
| 2 | QuickActions vs Alertas Críticos | Substituir por AlertsPanel com dados mockados | 2026-04-15 |
| 3 | Background estético "EQLD" | Adicionar com "AV" (Advision) | 2026-04-15 |
| 4 | WelcomeSection: manter saudação personalizada? | Sim, manter conteúdo Advision com visual/tipografia Sovereign | 2026-04-15 |
| 5 | Instalar `motion` para animações? | Sim | 2026-04-15 |
| 6 | CSS tokens: global (Caso A) vs por-página (Caso B)? | Caso A — tokens globais em index.css + tailwind.config.js | 2026-04-15 |

### Mudanças realizadas
- `frontend/src/index.css` — adicionado Google Fonts import + `:root` com design tokens RGB do Sovereign + `@layer base` para font-headline em headings
- `frontend/tailwind.config.js` — adicionado `extend.colors` (tokens Sovereign) e `extend.fontFamily` (Manrope/Inter)
- `frontend/package.json` — instalado `motion@^12`
- `features/home/pages/HomePageAdvisor.tsx` — reescrito com bento grid, motion animations, AlertsPanel, background "AV"
- `features/home/components/advisor/WelcomeSection.tsx` — tipografia Sovereign (font-headline, text-on-surface, text-tertiary)
- `features/home/components/advisor/RecentActivity.tsx` — visual Sovereign (rounded-[2rem], ícones circulares, ChevronRight on hover, tokens de cor)
- `features/home/components/advisor/ActivitySkeleton.tsx` — tokens Sovereign (surface-container-high, outline-variant)
- `features/home/components/advisor/ActivityDetailModal.tsx` — tokens Sovereign (rounded-3xl, surface-container-*, outline-variant)
- `features/home/components/advisor/ActivityHistoryModal.tsx` — tokens Sovereign (rounded-3xl, surface-container-*, outline-variant)
- `features/home/components/advisor/UpcomingDueDates.tsx` — tokens Sovereign (rounded-[2rem], surface-container-low, outline-variant, hidden quando vazio)
- `features/home/components/advisor/AlertsPanel.tsx` — **novo** componente, substitui QuickActions no Dashboard

### Componentes criados/adaptados
- `AlertsPanel.tsx` — criado; baseado em "Alertas Críticos" do `Dashboard.tsx` do Sovereign

### Dados MOCKUP (remover quando endpoints disponíveis)
- "Crescimento Mensal +4.2%" — no AUM card (`HomePageAdvisor.tsx`)
- "+12 este mês" — no Clients card (`HomePageAdvisor.tsx`)
- Alertas em `AlertsPanel.tsx` — todos os 3 alertas são estáticos

### Notas
- `StatCard.tsx` não é mais usado no Dashboard; mantido sem modificação para uso futuro
- `QuickActions.tsx` mantido no repositório sem uso
- `UpcomingDueDates` agora retorna `null` quando `expirations` está vazio (não renderiza seção)
- Build TypeScript passou sem erros após todas as mudanças

---

## Página: Configurações
**Status:** 🔴 Não iniciada
**Arquivo(s) Advision:** a mapear
**Arquivo(s) Sovereign:** a mapear

---

## Página: Clientes
**Status:** 🔴 Não iniciada
**Arquivo(s) Advision:** `features/clients-page/pages/ClientsPage.tsx`
**Arquivo(s) Sovereign:** `components/ClientList.tsx`

---

## Página: Carteiras
**Status:** 🔴 Não iniciada
**Arquivo(s) Advision:** `features/wallets/pages/WalletsPage.tsx`
**Arquivo(s) Sovereign:** `components/ClientPortfolio.tsx`

---

## Página: Análises
**Status:** 🔴 Não iniciada
**Arquivo(s) Advision:** `features/proventos/pages/ProventosPage.tsx`
**Arquivo(s) Sovereign:** `components/Analytics.tsx`
