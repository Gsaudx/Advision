# Database

This document describes the current database schema as of the latest migration (2026-05-24).

## Overview

- **Database:** PostgreSQL 16
- **ORM:** Prisma 7.x with Driver Adapters (PrismaPg)
- **Schema Location:** `backend/prisma/schema.prisma`
- **Total Models:** 21
- **Total Migrations:** 24 (January–May 2026)
- **Multi-tenant Model:** User (Advisor) → Clients → Wallets → Positions/Transactions

---

## Enums

### Core / Auth

```prisma
enum UserRole {
  ADVISOR   // Investment advisor — full access to their own clients
  CLIENT    // End investor — access only to their own wallets
  ADMIN     // System administrator
}

enum InviteStatus {
  PENDING   // No invite generated yet (initial state or after revocation)
  SENT      // Token generated and awaiting acceptance
  ACCEPTED  // Client accepted invite and linked their account
  REJECTED  // Enum value defined but never assigned by current backend
}
```

### Assets / Derivatives

```prisma
enum AssetType {
  STOCK    // Common stock (e.g. PETR4, VALE3)
  OPTION   // Option contract (e.g. PETRA240, PETRD325W5)
}

enum OptionType {
  CALL     // Right to buy
  PUT      // Right to sell
}

enum ExerciseType {
  AMERICAN   // Can exercise any day through expiration
  EUROPEAN   // Can only exercise on expiration date
}

enum TransactionType {
  BUY              // Asset purchase
  SELL             // Asset sale
  EXPIRED          // Option expiration without exercise (OTM)
  DIVIDEND         // Dividend receipt
  SPLIT            // Stock split
  SUBSCRIPTION     // Capital addition
  OPTION_EXERCISE  // Exercise of a long option
  OPTION_ASSIGNMENT // Assignment of a short option
  OPTION_EXPIRY    // Recording of option expiration event
}

enum OptionLifecycleEvent {
  OPENED        // Enum value defined but never created in current code
  EXERCISED     // Long option exercised by holder
  ASSIGNED      // Short option assigned to writer
  EXPIRED_ITM   // Expired in-the-money (no exercise was triggered)
  EXPIRED_OTM   // Expired out-of-the-money (worthless)
  CLOSED        // Position closed via opposite trade
}

enum OperationLegType {
  BUY_CALL    // Long call leg
  SELL_CALL   // Short call leg
  BUY_PUT     // Long put leg
  SELL_PUT    // Short put leg
  BUY_STOCK   // Long stock leg
  SELL_STOCK  // Short stock leg
}

enum StrategyType {
  SINGLE_OPTION     // Single option contract
  STRADDLE          // Long call + long put (same strike)
  STRANGLE          // Long call + long put (different strikes)
  BULL_CALL_SPREAD  // Long lower call + short higher call
  BEAR_PUT_SPREAD   // Short higher put + long lower put
  COVERED_CALL      // Long stock + short call
  PROTECTIVE_PUT    // Long stock + long put
  COLLAR            // Long stock + long put + short call
  CUSTOM            // User-defined multi-leg structure
}

enum OperationStatus {
  PENDING    // Strategy or leg awaiting execution
  EXECUTED   // Successfully executed
  FAILED     // Execution failed
  EXPIRED    // Option expired
  EXERCISED  // Option exercised
  ASSIGNED   // Short option assigned
}
```

### Infrastructure / Events

```prisma
enum AuditAction {
  CREATE   // New record created
  UPDATE   // Existing record modified
  DELETE   // Record deleted
}

enum AggregateType {
  WALLET
  CLIENT
  POSITION
  TRANSACTION
  OPTIMIZATION
  USER
  STRUCTURED_OPERATION
  OPTION_LIFECYCLE
  DIVIDEND_SYNC
}
```

### Notifications / Proventos

```prisma
enum NotificationType {
  OPTION_EXPIRY   // Option approaching expiration (only type in v1.0)
}

enum NotificationSeverity {
  INFO      // > 50% of notification window remaining
  WARNING   // 20–50% of window remaining
  CRITICAL  // < 20% of window remaining (or already expired)
}

enum SentinelStatus {
  ACTIVE       // Actively monitoring option for dividend detection
  UNAVAILABLE  // No liquid options found; retries every 30 days
}

enum OptimizationAlgorithm {
  KNAPSACK   // Integer Knapsack algorithm (planned feature)
}

enum OptimizationStatus {
  GENERATED   // Suggestion created, awaiting advisor decision
  ACCEPTED    // Accepted and applied
  REJECTED    // Rejected by advisor
}
```

---

## Models

### 1. User

```prisma
model User {
  id                       String    @id @default(uuid())
  email                    String    @unique
  passwordHash             String
  name                     String
  cpfCnpj                  String?
  phone                    String?
  role                     UserRole  @default(ADVISOR)
  createdAt                DateTime  @default(now())
  updatedAt                DateTime  @updatedAt
  // Notification preferences
  notificationsEnabled     Boolean   @default(true)
  notificationWindowDays   Int       @default(7)
  lastNotificationCheckAt  DateTime?
  // Relations
  clients          Client[]           @relation("AdvisorClients")
  clientProfile    Client?            @relation("LinkedUser")
  dividendSyncLogs DividendSyncLog[]
  notifications    Notification[]

  @@map("users")
}
```

**Notes:**
- `role` determines access level. ADMIN cannot self-register (manual DB creation required).
- `notificationWindowDays` (1–30): controls how far ahead to look for expiring options and determines severity thresholds (20%/50% of window).
- `lastNotificationCheckAt`: throttle for passive notification generation (24h cooldown).

---

### 2. Client

```prisma
model Client {
  id              String       @id @default(uuid())
  advisorId       String
  userId          String?      @unique
  name            String
  clientCode      String
  inviteToken     String?      @unique
  inviteStatus    InviteStatus @default(PENDING)
  inviteExpiresAt DateTime?
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
  // Relations
  advisor  User     @relation("AdvisorClients", fields: [advisorId], references: [id], onDelete: Cascade)
  user     User?    @relation("LinkedUser", fields: [userId], references: [id], onDelete: SetNull)
  wallets  Wallet[]

  @@index([advisorId])
  @@unique([advisorId, id])
  @@map("clients")
}
```

**Notes:**
- `clientCode` is unique per advisor (not globally unique).
- `inviteToken` format: `INV-XXXXXXXX` (8 chars from unambiguous charset). Expires in 7 days.
- On client delete: all wallets cascade-delete. Linked user account is preserved (SetNull).

---

### 3. Wallet

```prisma
model Wallet {
  id          String   @id @default(uuid())
  clientId    String
  name        String
  description String?
  currency    String   @default("BRL") @db.VarChar(3)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  // Relations
  client              Client
  positions           Position[]
  transactions        Transaction[]
  optimizationRuns    OptimizationRun[]
  rebalanceLogs       RebalanceLog[]
  structuredOperations StructuredOperation[]
  dividendPayments    WalletDividendPayment[]

  @@index([clientId])
  @@map("wallets")
}
```

**Notes:**
- Cash balance was removed (migration 20260512215155). Patrimony is derived exclusively from open positions.

---

### 4. Asset

```prisma
model Asset {
  id        String    @id @default(uuid())
  ticker    String    @unique
  name      String
  type      AssetType
  sector    String?
  market    String    @default("B3") @db.VarChar(10)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  // Relations
  optionDetail     OptionDetail?  @relation("AssetOption")
  underlyingOptions OptionDetail[] @relation("UnderlyingAsset")
  positions        Position[]
  transactions     Transaction[]
  operationLegs    OperationLeg[]

  @@map("assets")
}
```

**Notes:**
- Assets are created lazily on first trade. The backend resolves metadata from OpLab and upserts records.
- `sector` may be null for options (resolved via underlying asset) or for assets not yet reseeded.

---

### 5. OptionDetail

```prisma
model OptionDetail {
  id                String       @id @default(uuid())
  assetId           String       @unique
  underlyingAssetId String
  optionType        OptionType
  exerciseType      ExerciseType
  strikePrice       Decimal      @db.Decimal(18, 2)
  initialStrike     Decimal?     @map("initial_strike") @db.Decimal(18, 2)
  expirationDate    DateTime     @db.Date
  contractSize      Int          @default(100) @map("contract_size")
  // Relations
  asset           Asset @relation("AssetOption")
  underlyingAsset Asset @relation("UnderlyingAsset")

  @@index([underlyingAssetId])
  @@index([expirationDate])
  @@map("option_details")
}
```

**Notes:**
- `contractSize`: number of underlying shares per contract (B3 standard = 100). Stored as SSOT in DB, not as an application constant.
- `initialStrike`: immutable purchase-time strike. `strikePrice` is adjusted downward when dividends are detected (B3 rule). Used to reconcile historical dividend adjustments.
- `quantity` in positions is stored in shares (not contracts).

---

### 6. Position

```prisma
model Position {
  id                  String   @id @default(uuid())
  walletId            String
  assetId             String
  originTransactionId String?  @unique
  quantity            Decimal  @db.Decimal(18, 8)
  averagePrice        Decimal  @db.Decimal(18, 2)
  collateralBlocked   Decimal? @db.Decimal(18, 2)
  dividendsProcessedAt DateTime?
  lastDividendDate     DateTime?
  priceAtLastDividend  Decimal? @db.Decimal(18, 2)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  // Relations
  wallet           Wallet
  asset            Asset
  originTransaction Transaction?         @relation("PositionOriginTx")
  lifecycleEvents  OptionLifecycle[]
  dividendPayments WalletDividendPayment[]

  @@index([walletId, assetId])
  @@index([walletId])
  @@index([assetId])
  @@map("positions")
}
```

**Notes:**
- Multiple lots per asset per wallet are allowed (unique constraint on `(walletId, assetId)` was removed in migration 20260523224014 to support option lot tracking).
- `originTransactionId` (1:1 with Transaction): links position to its opening transaction, enabling atomic edits.
- `collateralBlocked`: used for short PUT positions. Equals `strikePrice × quantity`.
- `priceAtLastDividend`: used as reference price for unrealized P&L calculation after a dividend ex-date.
- When `quantity` reaches 0 after a SELL or lifecycle event, the position record is physically deleted.

---

### 7. Transaction

```prisma
model Transaction {
  id             String          @id @default(uuid())
  walletId       String
  assetId        String?
  type           TransactionType
  quantity       Decimal?        @db.Decimal(18, 8)
  price          Decimal?        @db.Decimal(18, 2)
  totalValue     Decimal         @db.Decimal(18, 2)
  executedAt     DateTime
  notes          String?
  idempotencyKey String?
  createdAt      DateTime        @default(now())
  // Relations
  wallet          Wallet
  asset           Asset?
  operationLeg    OperationLeg?
  lifecycleEvent  OptionLifecycle?
  originPosition  Position?       @relation("PositionOriginTx")

  @@unique([walletId, idempotencyKey])
  @@index([walletId])
  @@index([assetId])
  @@index([executedAt])
  @@map("transactions")
}
```

**Notes:**
- `idempotencyKey`: generated client-side (UUID v4). The composite unique constraint `(walletId, idempotencyKey)` prevents duplicate submissions.
- `assetId` is nullable to support non-asset transaction types (SUBSCRIPTION).

---

### 8. WalletDividendPayment

```prisma
model WalletDividendPayment {
  id             String   @id @default(uuid())
  walletId       String
  positionId     String
  ticker         String   @db.VarChar(20)
  dividendType   String?  @db.VarChar(30)
  exDividendDate DateTime @db.Date
  paymentDate    DateTime? @db.Date
  valuePerShare  Decimal  @db.Decimal(18, 8)
  quantityAtDate Decimal  @db.Decimal(18, 8)
  totalReceived  Decimal  @db.Decimal(18, 2)
  createdAt      DateTime @default(now())
  // Relations
  wallet   Wallet
  position Position

  @@unique([walletId, ticker, exDividendDate])
  @@index([walletId])
  @@map("wallet_dividend_payments")
}
```

**Notes:**
- Records dividend payments received per position per ex-dividend date.
- `quantityAtDate`: shares held on the ex-dividend date, reconstructed from transaction history.
- Deduplication via unique constraint `(walletId, ticker, exDividendDate)`.

---

### 9. OptionLifecycle

```prisma
model OptionLifecycle {
  id                    String               @id @default(uuid())
  structuredOperationId String?
  positionId            String?
  event                 OptionLifecycleEvent
  underlyingQuantity    Decimal?             @db.Decimal(18, 8)
  strikePrice           Decimal?             @db.Decimal(18, 2)
  settlementAmount      Decimal?             @db.Decimal(18, 2)
  resultingTransactionId String?             @unique
  occurredAt            DateTime             @default(now())
  notes                 String?
  // Relations
  structuredOperation  StructuredOperation?
  position             Position?
  resultingTransaction Transaction?

  @@index([positionId])
  @@index([structuredOperationId])
  @@map("option_lifecycle")
}
```

**Notes:**
- Records terminal events on option positions. Write-only in current v1.0 (no read endpoint).
- `positionId` is nullable (SET NULL on position delete).
- Used to enforce the rule: edit/delete of a position is blocked if any lifecycle event exists.

---

### 10. StructuredOperation

```prisma
model StructuredOperation {
  id             String          @id @default(uuid())
  walletId       String
  strategyType   StrategyType
  status         OperationStatus @default(PENDING)
  totalPremium   Decimal         @db.Decimal(18, 2)
  executedAt     DateTime?
  expirationDate DateTime?       @db.Date
  notes          String?
  idempotencyKey String?
  correlationId  String?         @db.VarChar(36)
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt
  // Relations
  wallet          Wallet
  legs            OperationLeg[]
  lifecycleEvents OptionLifecycle[]

  @@unique([walletId, idempotencyKey])
  @@index([walletId])
  @@index([status])
  @@index([expirationDate])
  @@map("structured_operations")
}
```

---

### 11. OperationLeg

```prisma
model OperationLeg {
  id                    String          @id @default(uuid())
  structuredOperationId String
  legOrder              Int
  legType               OperationLegType
  assetId               String
  quantity              Decimal         @db.Decimal(18, 8)
  price                 Decimal         @db.Decimal(18, 2)
  totalValue            Decimal         @db.Decimal(18, 2)
  transactionId         String?         @unique
  status                OperationStatus @default(PENDING)
  executedAt            DateTime?
  createdAt             DateTime        @default(now())
  // Relations
  structuredOperation StructuredOperation
  asset               Asset
  transaction         Transaction?

  @@index([structuredOperationId])
  @@index([assetId])
  @@map("operation_legs")
}
```

---

### 12. SentinelOption

```prisma
model SentinelOption {
  id               String         @id @default(uuid())
  underlyingSymbol String         @unique @map("underlying_symbol") @db.VarChar(10)
  optionSymbol     String?        @map("option_symbol") @db.VarChar(20)
  status           SentinelStatus @default(ACTIVE)
  initialStrike    Decimal?       @map("initial_strike") @db.Decimal(18, 2)
  currentStrike    Decimal?       @map("current_strike") @db.Decimal(18, 2)
  dueDate          DateTime?      @map("due_date") @db.Date
  monitoringSince  DateTime       @map("monitoring_since") @db.Date
  lastCheckedAt    DateTime       @map("last_checked_at") @db.Date
  scanningFrom     DateTime?      @map("scanning_since") @db.Date
  createdAt        DateTime       @default(now()) @map("created_at")
  updatedAt        DateTime       @updatedAt @map("updated_at")
  // Relations
  dividendsHistory DividendHistory[]

  @@map("sentinel_options")
}
```

**Notes:**
- One sentinel per `underlyingSymbol` (globally unique — not per wallet).
- `lastCheckedAt`: used for the daily lock (max 1 OpLab call per symbol per calendar day).
- `scanningFrom`: set during retroactive scan to indicate in-progress state; reset to null on completion.
- `status = UNAVAILABLE`: no liquid options found; automatically retried every 30 days.

---

### 13. DividendHistory

```prisma
model DividendHistory {
  id               String   @id @default(uuid())
  underlyingSymbol String   @map("underlying_symbol") @db.VarChar(10)
  sentinelOptionId String   @map("sentinel_option_id")
  detectedAt       DateTime @map("detected_at") @db.Date
  previousStrike   Decimal  @map("previous_strike") @db.Decimal(18, 2)
  newStrike        Decimal  @map("new_strike") @db.Decimal(18, 2)
  dividendAmount   Decimal  @map("dividend_amount") @db.Decimal(18, 8)
  createdAt        DateTime @default(now()) @map("created_at")
  // Relations
  sentinelOption SentinelOption

  @@unique([underlyingSymbol, detectedAt, dividendAmount])
  @@index([underlyingSymbol])
  @@index([sentinelOptionId])
  @@map("dividends_history")
}
```

**Notes:**
- Records are derived from OpLab option strike history (not from external dividend feeds).
- `dividendAmount = previousStrike - newStrike` (B3 rule: dividend ex-date reduces all option strikes).
- Idempotent: unique constraint prevents duplicate detection records.

---

### 14. DividendEvent ⚠️ Legacy — Orphaned Table

```prisma
model DividendEvent {
  id             String    @id @default(uuid())
  ticker         String    @db.VarChar(20)
  dividendType   String?   @db.VarChar(30)
  approvedDate   DateTime? @db.Date
  paymentDate    DateTime? @db.Date
  exDividendDate DateTime? @db.Date
  valuePerShare  Decimal?  @db.Decimal(18, 8)
  source         String    @db.VarChar(20)
  integrityHash  String    @unique @db.VarChar(200)
  rawPayload     Json
  referenceWeek  String    @db.VarChar(10)
  importedAt     DateTime  @default(now())
  active         Boolean   @default(true)

  @@index([ticker])
  @@index([referenceWeek])
  @@index([ticker, referenceWeek])
  @@map("dividend_events")
}
```

**Notes:**
- **This table has no active writer in the current codebase.** It was populated by a Brapi dividend sync service (`brapi-dividends.service.ts`, `proventos-sync.service.ts`) that was completely removed in commit `50009f1` (2026-05-30) when the system migrated to the Sentinel architecture.
- `ProventosCalculationService` still contains code that reads from this table, but all queries return empty results since nothing populates it. This code path is effectively dead.
- All active dividend data flows through the Sentinel system: `sentinel_options` → `dividends_history` → `wallet_dividend_payments`.
- The table and schema are preserved to avoid migration complexity, but are functionally unused.

---

### 15. DividendSyncLog ⚠️ Legacy — Orphaned Table

```prisma
model DividendSyncLog {
  id             String   @id @default(uuid())
  syncDate       DateTime @unique @db.Date
  trigger        String   @db.VarChar(30)
  userId         String?
  tickersFound   Int      @default(0)
  tickersPending Int      @default(0)
  eventsCreated  Int      @default(0)
  errors         Int      @default(0)
  durationMs     Int?
  createdAt      DateTime @default(now())
  // Relations
  user User?

  @@map("dividend_sync_logs")
}
```

**Notes:**
- **This table has no active writer.** It was maintained by the removed Brapi sync orchestrator (`proventos-sync.service.ts`). Preserved in schema alongside `dividend_events` as a legacy artifact.

---

### 16. Notification

```prisma
model Notification {
  id              String               @id @default(uuid())
  advisorId       String
  type            NotificationType
  relatedEntityId String
  severity        NotificationSeverity
  message         String
  isRead          Boolean              @default(false)
  readAt          DateTime?
  walletId        String?
  createdAt       DateTime             @default(now())
  updatedAt       DateTime             @updatedAt
  // Relations
  advisor User

  @@unique([advisorId, type, relatedEntityId])
  @@index([advisorId, isRead])
  @@index([advisorId, createdAt])
  @@map("notifications")
}
```

**Notes:**
- `relatedEntityId`: holds the `Position.id` for `OPTION_EXPIRY` type.
- Unique constraint ensures one notification per position per advisor (upserted on each check).
- Severity escalation: if a notification is re-generated with higher severity, `isRead` is reset to false.

---

### 17. AuditLog

```prisma
model AuditLog {
  id             String      @id @default(uuid())
  tableName      String
  recordId       String
  action         AuditAction
  actorId        String?
  actorRole      String?
  snapshotBefore Json?
  snapshotAfter  Json?
  context        Json?
  createdAt      DateTime    @default(now())

  @@index([tableName, recordId])
  @@index([actorId])
  @@index([createdAt])
  @@map("audit_logs")
}
```

**Notes:**
- Write-only in v1.0 (no read endpoint). Used by `AuditService` across 5 services (derivatives, trading, wallets) to log user actions with before/after snapshots.

---

### 18. DomainEvent

```prisma
model DomainEvent {
  id            String        @id @default(uuid())
  aggregateType AggregateType
  aggregateId   String
  eventType     String        @db.VarChar(100)
  occurredAt    DateTime      @default(now())
  actorId       String?
  actorRole     String?       @db.VarChar(20)
  requestId     String?       @db.VarChar(36)
  correlationId String?       @db.VarChar(36)
  payload       Json
  sequence      Int

  @@unique([aggregateId, sequence])
  @@index([aggregateType, aggregateId])
  @@index([eventType])
  @@index([occurredAt])
  @@index([correlationId])
  @@map("domain_events")
}
```

**Notes:**
- Event sourcing table. Written by `DomainEventsService` (SharedModule) with PostgreSQL advisory locks for sequence safety.
- Read by `ActivityService` and transformed into human-readable `ActivityItem` objects (exposed via `/activity/*` endpoints).
- Not exposed as raw events via any public API.

---

### 19–20. OptimizationRun / RebalanceLog

These tables exist in the schema for a planned future feature. No backend service writes to them in the current version.

---

## Relationship Diagram

```
User ─1:N─> Client ─1:N─> Wallet
                             │
                    ┌────────┼────────┐──────────────────┐
                    │        │        │                  │
               Position  Transaction  StructuredOperation  WalletDividendPayment
                    │        │        │
               (asset FK)   (asset FK)  OperationLeg
                    │
               OptionLifecycle (event log)

Asset ─1:1─> OptionDetail

SentinelOption ─1:N─> DividendHistory
DividendEvent (external source, read-only by backend)

User ─1:N─> Notification
User ─1:N─> DividendSyncLog (external source)

DomainEvent (event sourcing log — all aggregates)
AuditLog    (audit trail — key user actions)
```

---

## Migration History (Chronological)

| Date | Migration | Key Changes |
|------|-----------|-------------|
| 2026-01-05 | `init_complete_schema` | Initial schema |
| 2026-01-12 | `add_user_role_rbac` | UserRole enum (ADVISOR, CLIENT, ADMIN) |
| 2026-01-13 | `add_client_invite_system` | InviteStatus enum + invite fields on Client |
| 2026-01-18 | `add_wallet_module_schema` | AuditLog, Wallet.currency, Transaction.idempotencyKey |
| 2026-01-19 | `refactor_client_model` | Client.clientCode; removed cpf/email/phone from Client |
| 2026-01-20 | `add_domain_events` | DomainEvent table + AggregateType enum |
| 2026-01-25 | `add_derivatives_and_structured_operations` | StructuredOperation, OperationLeg, OptionLifecycle + related enums |
| 2026-02-16 | `make_option_lifecycle_position_nullable` | OptionLifecycle.positionId → nullable |
| 2026-04-04 | `add_dividend_sync_models` | DividendEvent, DividendSyncLog |
| 2026-04-11 | `add_dividend_fields_to_position` | Position.lastDividendDate, Position.priceAtLastDividend |
| 2026-04-12 | `add_dividend_payment_fields` | Position.dividendsProcessedAt + WalletDividendPayment |
| 2026-04-26 | `add_sentinel_options_and_dividends_history` | SentinelOption, DividendHistory + SentinelStatus |
| 2026-04-27 | `add_initial_strike_to_option_details` | OptionDetail.initialStrike |
| 2026-04-28 | `add_expired_to_transaction_type` | TransactionType.EXPIRED |
| 2026-05-10 | `add_contract_size_to_option_details` | OptionDetail.contractSize (default 100) |
| 2026-05-12 | `remove_cash_flow` | **Removed** Wallet.cashBalance + TransactionType.DEPOSIT/WITHDRAWAL |
| 2026-05-17 | `add_notifications` | Notification model + User notification fields |
| 2026-05-23 | `remove_position_unique_allow_option_lots` | Dropped unique(walletId, assetId) from Position |
| 2026-05-24 | `add_origin_transaction_id_to_positions` | Position.originTransactionId (unique FK to Transaction) |

---

## Database Commands

```bash
# Generate Prisma Client (required before running)
npx prisma generate

# Apply migrations in development
npx prisma migrate dev

# Apply migrations in production
npx prisma migrate deploy

# Open Prisma Studio (database browser)
npx prisma studio

# Reset database (development only)
npx prisma migrate reset
```
