# Notification System — Sistema de Notificações de Vencimento de Opções

## Visão Geral

O Advision é usado por assessores que gerenciam simultaneamente 10–20 carteiras de clientes. Antes desta entrega, não havia mecanismo centralizado de alerta para opções próximas do vencimento — o assessor precisava navegar carteira a carteira para identificar posições críticas.

Esta entrega implementa um sistema de notificações internas baseado em **gatilhos naturais de uso** (login, abertura do dashboard, criação/edição de operação). Não há cron jobs, workers ou schedulers — o sistema é 100% local e sincronizado com as ações do usuário.

**O que foi entregue:**

1. Tabela `notifications` com deduplicação via `UNIQUE` constraint.
2. Três campos de configuração adicionados ao model `User`.
3. `NotificationsModule` isolado com controller, service e schemas próprios.
4. Sino de notificações no header com badge de não lidas e painel dropdown.
5. Tela de configurações em `/advisor/settings`.
6. Gatilhos em 4 módulos existentes (auth, activity, derivatives, wallets) via fire-and-forget.

---

## 1. Problema Observado

### Sintoma

O assessor recebia no dashboard um card "Opções próximas do vencimento" (feature pré-existente), mas:

- O card estava **fora da área focal** — exigia scroll e navegação ativa.
- **Sem severidade**: opções vencendo hoje e em 6 dias aparecem com o mesmo peso visual.
- **Sem persistência**: o card some ao navegar para outra rota.
- **Sem histórico**: não havia como saber quando uma opção foi identificada como crítica.

### Causa Raiz

Ausência de um sistema de alertas persistentes e graduados. O card existente servia para consulta, não para alerta proativo.

---

## 2. Decisões de Design

### 2.1 Sem cron — gatilhos naturais de uso

O sistema é local (sem servidor de background), então não há suporte a cron jobs. A alternativa adotada é disparar `generateExpiryNotifications` em 4 pontos naturais do fluxo:

| Gatilho | Módulo | `forceRefresh` | Stale check |
|---|---|---|---|
| Login do assessor | `auth.controller` | `false` | Respeitado (24h) |
| Abertura do dashboard | `activity.controller` (`getAdvisorMetrics`) | `false` | Respeitado (24h) |
| Compra/venda/fechamento de opção | `derivatives.controller` | `true` | Ignorado |
| Criação de carteira | `wallets.controller` | `true` | Ignorado |

Gatilhos que **modificam dados** usam `forceRefresh: true` — a nova posição precisa de notificação imediata, independentemente do stale check.

### 2.2 Stale check de 24h

Gatilhos passivos (login, dashboard) respeitam um intervalo de 24h via `lastNotificationCheckAt` no `User`. Isso evita reprocessamento desnecessário a cada navegação. O campo é atualizado ao final de cada execução bem-sucedida.

### 2.3 Severidade proporcional à janela configurável

A severidade não é fixa — é proporcional à **janela de antecedência** configurada pelo assessor (padrão: 7 dias, faixa: 1–30 dias):

```
CRITICAL  → dias_restantes < 20% da janela  (ou opção já vencida)
WARNING   → dias_restantes entre 20% e 50% da janela
INFO      → dias_restantes entre 50% e 100% da janela
Sem notif → dias_restantes > janela
```

Isso significa que ao mudar a janela de 7 para 14 dias, uma opção com 10 dias restantes que antes ficava fora do radar passa a gerar `INFO` (10/14 = 71%).

### 2.4 Deduplicação via UNIQUE constraint

A constraint `@@unique([advisorId, type, relatedEntityId])` garante que cada par (assessor, posição) tem no máximo uma notificação. O `upsert` do Prisma atualiza `severity` e `message` sem criar duplicatas, preservando `isRead`.

### 2.5 Configurações no model `User` (não tabela separada)

Optou-se por adicionar 3 colunas em `User` em vez de criar uma tabela `advisor_settings`. Justificativa: zero over-engineering para configurações simples e atômicas de um único model.

---

## 3. Modelo de Dados

### 3.1 Enums adicionados (`schema.prisma`)

```prisma
enum NotificationType {
  OPTION_EXPIRY
  // Extensível: CONCENTRATION_ALERT, DIVIDEND_REMINDER, etc.
}

enum NotificationSeverity {
  INFO
  WARNING
  CRITICAL
}
```

### 3.2 Campos adicionados ao model `User`

```prisma
model User {
  // ... campos existentes ...
  notificationsEnabled    Boolean   @default(true)
  notificationWindowDays  Int       @default(7)
  lastNotificationCheckAt DateTime?

  notifications Notification[]
}
```

| Campo | Tipo | Default | Descrição |
|---|---|---|---|
| `notificationsEnabled` | Boolean | `true` | Toggle para desabilitar o sistema inteiro |
| `notificationWindowDays` | Int | `7` | Janela de antecedência em dias (1–30) |
| `lastNotificationCheckAt` | DateTime? | `null` | Timestamp do último processamento (stale check) |

### 3.3 Tabela `notifications`

```prisma
model Notification {
  id              String               @id @default(uuid())
  advisorId       String
  type            NotificationType
  relatedEntityId String               -- FK lógica para positions.id
  severity        NotificationSeverity
  message         String
  isRead          Boolean              @default(false)
  readAt          DateTime?
  walletId        String?              -- Cache para navegação direta
  createdAt       DateTime             @default(now())
  updatedAt       DateTime             @updatedAt

  advisor User @relation(fields: [advisorId], references: [id], onDelete: Cascade)

  @@unique([advisorId, type, relatedEntityId])
  @@index([advisorId, isRead])
  @@index([advisorId, createdAt])
  @@map("notifications")
}
```

**Por que `walletId` como cache?**

`relatedEntityId` aponta para `positions.id`. Para navegar para a carteira ao clicar na notificação, seria necessário um JOIN. Armazenar `walletId` diretamente evita esse JOIN no frontend e no endpoint de listagem.

**Por que `relatedEntityId` não é FK com `@relation`?**

O campo é genérico por design — suporta futuros tipos de notificação (CONCENTRATION_ALERT, etc.) que podem apontar para entidades diferentes. Uma FK tipada forçaria uma tabela por tipo.

### 3.4 Migration (`20260517003953_add_notifications`)

```sql
CREATE TYPE "NotificationType" AS ENUM ('OPTION_EXPIRY');
CREATE TYPE "NotificationSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

ALTER TABLE "users"
  ADD COLUMN "lastNotificationCheckAt" TIMESTAMP(3),
  ADD COLUMN "notificationWindowDays"  INTEGER NOT NULL DEFAULT 7,
  ADD COLUMN "notificationsEnabled"    BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "notifications" (
  "id"              TEXT NOT NULL,
  "advisorId"       TEXT NOT NULL,
  "type"            "NotificationType" NOT NULL,
  "relatedEntityId" TEXT NOT NULL,
  "severity"        "NotificationSeverity" NOT NULL,
  "message"         TEXT NOT NULL,
  "isRead"          BOOLEAN NOT NULL DEFAULT false,
  "readAt"          TIMESTAMP(3),
  "walletId"        TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notifications_advisorId_isRead_idx"    ON "notifications"("advisorId", "isRead");
CREATE INDEX "notifications_advisorId_createdAt_idx" ON "notifications"("advisorId", "createdAt");
CREATE UNIQUE INDEX "notifications_advisorId_type_relatedEntityId_key"
  ON "notifications"("advisorId", "type", "relatedEntityId");

ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_advisorId_fkey"
  FOREIGN KEY ("advisorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

**Obs sobre convenção de colunas:** A tabela `notifications` usa camelCase sem `@map()` (mesmo padrão da tabela `users`). Queries SQL diretas requerem aspas duplas: `SELECT "advisorId", "isRead" FROM notifications`.

---

## 4. Algoritmo de Geração (`generateExpiryNotifications`)

```
Input: advisorId, { forceRefresh?: boolean }

1. Buscar configurações do assessor (enabled, windowDays, lastCheck)
2. Se notificationsEnabled = false → return (sem processar)
3. Se !forceRefresh AND lastCheck < 24h atrás → return (stale check)
4. Calcular janela: today..today+windowDays
5. Buscar clientes do assessor
6. Buscar carteiras dos clientes
7. Buscar posições de opção com:
   - quantity != 0 (posição aberta, long ou short)
   - asset.type = 'OPTION'
   - optionDetail.expirationDate <= today+windowDays  (inclui vencidas)
8. Para cada posição:
   a. Calcular daysUntilExpiry = ceil((expirationDate - today) / 86400000)
   b. Calcular severity (CRITICAL/WARNING/INFO)
   c. Construir message rica
   d. upsert(where: {advisorId, type, relatedEntityId}, update: {severity, message})
9. Atualizar lastNotificationCheckAt = now()
```

### 4.1 Cálculo de severidade

```typescript
const pct20 = windowDays * 0.2;
const pct50 = windowDays * 0.5;

if (daysUntilExpiry <= 0 || daysUntilExpiry < pct20) → CRITICAL
if (daysUntilExpiry <= pct50)                         → WARNING
else                                                   → INFO
```

### 4.2 Formato da mensagem

```
Opção {TICKER} ({N} contratos {TIPO}, strike R$ {STRIKE})
— {comprada|vendida} —
da carteira {CARTEIRA} do cliente {CLIENTE}
vence em {N} dias ({DD/MM/AAAA}).
```

Para opções vencidas: `"... está VENCIDA ({DD/MM/AAAA})."` (sem dias).

A direção (`comprada`/`vendida`) é derivada do sinal de `quantity`: positivo = long (comprada), negativo = short (vendida).

---

## 5. Módulo Backend (`NotificationsModule`)

```
backend/src/modules/notifications/
  controllers/
    notifications.controller.ts   -- 6 endpoints REST
    index.ts
  services/
    notifications.service.ts      -- toda a lógica de negócio
    index.ts
  schemas/
    notification.schema.ts        -- Zod schemas + DTOs + types
    index.ts
  notifications.module.ts
```

### 5.1 Endpoints

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `GET` | `/notifications` | ADVISOR, ADMIN | Lista não lidas + lidas nas últimas 24h (máx 50) |
| `GET` | `/notifications/unread-count` | ADVISOR, ADMIN | Contador de não lidas |
| `PATCH` | `/notifications/:id/read` | ADVISOR, ADMIN | Marca uma como lida |
| `PATCH` | `/notifications/read-all` | ADVISOR, ADMIN | Marca todas como lidas |
| `GET` | `/notifications/settings` | ADVISOR, ADMIN | Retorna configurações atuais |
| `PUT` | `/notifications/settings` | ADVISOR, ADMIN | Atualiza configurações + força reprocessamento |

Todos os endpoints usam `AuthGuard('jwt') + RolesGuard` em nível de controller.

**Segurança IDOR:** `markAsRead` filtra por `{ id, advisorId }` — impede que um assessor marque notificações de outro.

---

## 6. Frontend

```
frontend/src/features/notifications/
  api/
    notifications.api.ts          -- funções axios (6 endpoints)
    useNotifications.ts           -- useNotifications, useUnreadCount
    useMarkAsRead.ts              -- mutation + invalidate
    useMarkAllAsRead.ts           -- mutation + invalidate
    useNotificationSettings.ts   -- useNotificationSettings, useUpdateNotificationSettings
    index.ts
  components/
    NotificationBell.tsx          -- sino + badge + popover de aviso
    NotificationPanel.tsx         -- dropdown com lista
    NotificationItem.tsx          -- item individual com ícone, mark-as-read e navegação
  pages/
    NotificationSettingsPage.tsx  -- /advisor/settings
  types/
    notification.types.ts         -- tipos manuais (ver §9 — gap SSOT)
```

### 6.1 NotificationBell

- Exibe badge vermelho com contador (máx `9+`)
- Popover "Você tem novas notificações" aparece por 5s quando o contador aumenta
- Clique abre `NotificationPanel` e fecha o popover

### 6.2 NotificationItem

- Ícone de severidade: `Info` (azul) / `AlertTriangle` (âmbar) / `AlertCircle` (vermelho)
- Mensagem truncada em 2 linhas (`line-clamp-2`)
- Ponto colorido ao lado da data quando não lida
- Botão ✓ aparece no hover para marcar individualmente (sem navegar)
- Clique no item: marca como lida + navega para `/wallets/:walletId`

### 6.3 NotificationSettingsPage (`/advisor/settings`)

- Toggle para habilitar/desabilitar o sistema
- Slider (1–30 dias) sincronizado com input numérico manual
- Salvar persiste via `PUT /notifications/settings` e dispara reprocessamento imediato

### 6.4 Estratégia de atualização do badge

Sem polling. O badge usa `useUnreadCount` com `staleTime: 60_000`. Após qualquer mutation (markAsRead, markAllAsRead, updateSettings), o React Query invalida as queries de notificações, atualizando o badge imediatamente.

---

## 7. Integração nos Módulos Existentes

Todos os gatilhos usam fire-and-forget (`void service.method()`) para não bloquear a resposta principal.

```typescript
// Gatilho passivo — login (auth.controller.ts)
void this.notificationsService.generateExpiryNotifications(req.user.id);

// Gatilho passivo — dashboard (activity.controller.ts → getAdvisorMetrics)
void this.notificationsService.generateExpiryNotifications(user.id);

// Gatilho ativo — criação/edição de derivativo (derivatives.controller.ts)
void this.notificationsService.generateExpiryNotifications(actor.id, { forceRefresh: true });

// Gatilho ativo — criação de carteira (wallets.controller.ts)
void this.notificationsService.generateExpiryNotifications(user.id, { forceRefresh: true });
```

Cada módulo consumidor importa `NotificationsModule` em seu `imports: []` e injeta `NotificationsService` no constructor do controller.

---

## 8. Rollback

O sistema foi projetado para rollback limpo em 3 etapas:

```
1. Comentar <NotificationBell /> no Header.tsx
   → Sino desaparece. Resto do header intacto.

2. Comentar chamadas void generateExpiryNotifications nos 4 controllers
   → Para de gerar. Notificações existentes permanecem no banco.

3. Comentar NotificationsModule em app.module.ts
   → Módulo inteiro desligado. API retorna 404 nas rotas /notifications.
```

Migration e dados ficam — sem impacto ao sistema principal.

---

## 9. Gaps Conhecidos

### 9.1 Frontend com tipos manuais em vez de `api.d.ts` (SSOT)

`features/notifications/types/notification.types.ts` define interfaces manualmente em vez de usar o `api.d.ts` gerado via `npm run generate:types`. Risco: mudanças no backend não propagam automaticamente.

**Fix:** Rodar `npm run generate:types` com o backend ativo e substituir imports de `notification.types.ts` pelos tipos de `@/types/api`.

### 9.2 Escalada de severidade silenciosa em notificações já lidas

Quando uma notificação lida (ex: INFO) é atualizada para CRITICAL via upsert, o campo `isRead` não é resetado. O badge não aumenta e o assessor não é re-alertado. Comportamento intencional para não gerar ruído, mas sem evidência visual de escalada.

**Mitigação possível:** Resetar `isRead = false` quando `severity` sobe (INFO→WARNING ou WARNING→CRITICAL).

### 9.3 Posições short (quantity < 0) incluídas

A query filtra `quantity: { not: 0 }`, incluindo posições vendidas (short). A mensagem indica `"vendida"`. O comportamento é correto, mas o assessor pode precisar de contexto adicional sobre o risco de uma opção vendida vencendo (exercício automático).

### 9.4 Janela de exibição de lidas hardcoded = `STALE_CHECK_MS`

`getNotifications` retorna lidas das últimas 24h (= `STALE_CHECK_MS`). Se o stale check mudar de intervalo no futuro, a janela de exibição muda junto — acoplamento implícito por compartilhamento da constante. Atualmente deliberado.

---

## 10. Blast Radius

| Camada | Arquivos | Risco |
|---|---|---|
| **Database** | `schema.prisma`, migration `add_notifications` | Baixo — ALTER TABLE com defaults seguros, sem locks longos |
| **Backend novo** | `notifications/` (controller, service, schemas, module) | Baixo — módulo isolado |
| **Backend modificado** | `auth`, `activity`, `derivatives`, `wallets` controllers | Muito baixo — 1 linha `void` adicionada em cada |
| **Backend módulos** | `auth`, `activity`, `derivatives`, `wallets` modules | Muito baixo — `NotificationsModule` adicionado em `imports[]` |
| **Frontend novo** | `features/notifications/` inteiro | Baixo — feature isolada |
| **Frontend modificado** | `Header.tsx` | Muito baixo — 1 linha `<NotificationBell />` condicional |
| **Frontend modificado** | `routes/index.tsx` | Muito baixo — 1 rota `/advisor/settings` |

---

## 11. Relação com Outros Módulos

| Módulo | Relação |
|---|---|
| `auth` | Gatilho de login dispara geração passiva |
| `activity` | Gatilho de dashboard (`getAdvisorMetrics`) dispara geração passiva |
| `derivatives` | Gatilhos ativos em buy/sell/close de opção (forceRefresh) |
| `wallets` | Gatilho ativo em criação de carteira (forceRefresh) |
| Card de vencimentos (pré-existente) | **Intacto.** As notificações são complementares, não substitutas |

---

## 12. Arquivos Relevantes

### Backend — criados

| Arquivo | Responsabilidade |
|---|---|
| `modules/notifications/notifications.module.ts` | Registra controller, service e exporta service |
| `modules/notifications/controllers/notifications.controller.ts` | 6 endpoints REST |
| `modules/notifications/services/notifications.service.ts` | Toda a lógica: geração, stale check, severidade, upsert, configurações |
| `modules/notifications/schemas/notification.schema.ts` | Zod schemas, DTOs e types exportados |
| `prisma/migrations/20260517003953_add_notifications/migration.sql` | DDL completo |

### Backend — modificados

| Arquivo | Mudança |
|---|---|
| `prisma/schema.prisma` | Enums `NotificationType`, `NotificationSeverity`; model `Notification`; 3 campos em `User` |
| `app.module.ts` | `NotificationsModule` em `imports[]` |
| `auth/controllers/auth.controller.ts` | Injeção + gatilho passivo no login |
| `activity/controllers/activity.controller.ts` | Injeção + gatilho passivo em `getAdvisorMetrics` |
| `derivatives/controllers/derivatives.controller.ts` | Injeção + gatilhos ativos em buy/sell/close |
| `wallets/controllers/wallets.controller.ts` | Injeção + gatilho ativo em create wallet |

### Frontend — criados

| Arquivo | Responsabilidade |
|---|---|
| `features/notifications/api/notifications.api.ts` | Funções axios para os 6 endpoints |
| `features/notifications/api/useNotifications.ts` | `useNotifications`, `useUnreadCount` |
| `features/notifications/api/useMarkAsRead.ts` | Mutation + invalidate |
| `features/notifications/api/useMarkAllAsRead.ts` | Mutation + invalidate |
| `features/notifications/api/useNotificationSettings.ts` | Settings query + update mutation |
| `features/notifications/components/NotificationBell.tsx` | Sino, badge, popover |
| `features/notifications/components/NotificationPanel.tsx` | Dropdown com lista |
| `features/notifications/components/NotificationItem.tsx` | Item individual |
| `features/notifications/pages/NotificationSettingsPage.tsx` | `/advisor/settings` |
| `features/notifications/types/notification.types.ts` | Tipos (gap SSOT — ver §9.1) |

### Frontend — modificados

| Arquivo | Mudança |
|---|---|
| `components/layout/Header.tsx` | `<NotificationBell />` condicional para ADVISOR/ADMIN |
| `routes/index.tsx` | Rota `/advisor/settings` → `NotificationSettingsPage` |
