# Authentication

This document describes the authentication system, registration flow, role-based access, and the client invite system.

## Overview

The system uses **JWT (JSON Web Token) stateless** authentication with **HttpOnly cookies**, a more secure approach than localStorage storage.

### Why HttpOnly Cookies?

| Approach            | Vulnerable to XSS? | Vulnerable to CSRF? | Recommendation     |
| ------------------- | ------------------ | ------------------- | ------------------ |
| localStorage        | Yes                | No                  | Avoid              |
| Regular cookie      | Yes                | Yes                 | Avoid              |
| **HttpOnly Cookie** | No                 | Mitigated*          | **Recommended**    |

*Mitigated with `SameSite=Strict` and origin validation (CORS).

**HttpOnly** means the cookie cannot be accessed via JavaScript (`document.cookie`), protecting against XSS attacks.

## Authentication Flow

### Login Flow

1. Frontend sends `POST /auth/login { email, password }`
2. LocalStrategy validates credentials (`bcrypt.compare`)
3. AuthService generates JWT: `{ sub: id, email, role }`
4. Backend sets HttpOnly cookie in response:
   `Set-Cookie: tcc_auth=<jwt>; HttpOnly; Secure; SameSite=Strict`
5. Browser stores cookie automatically (inaccessible to JS)

### Authenticated Request Flow

1. Frontend makes `GET /health` (axios with `withCredentials: true`)
2. Browser attaches cookie automatically: `Cookie: tcc_auth=<jwt>`
3. JwtStrategy validates signature and expiration
4. If valid: `req.user = { id, email, role }`, controller processes request
5. If invalid: returns `401 Unauthorized`

## JWT Structure

A JWT has 3 parts separated by dots: `header.payload.signature`

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1dWlkIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwicm9sZSI6IkFEVklTT1IifQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

| Part          | Content                                          | Function                                     |
| ------------- | ------------------------------------------------ | -------------------------------------------- |
| **Header**    | `{ "alg": "HS256", "typ": "JWT" }`               | Signature algorithm                          |
| **Payload**   | `{ "sub": "id", "email": "...", "role": "..." }` | User data (Base64, not encrypted)            |
| **Signature** | HMAC-SHA256(header + payload, JWT_SECRET)        | Ensures integrity (not tampered)             |

> **Important:** The payload is only encoded (Base64), not encrypted. Anyone can decode and read it. The signature only ensures it wasn't altered.

## API Endpoints

### Authentication Endpoints

| Method | Endpoint         | Description                  | Authenticated? |
| ------ | ---------------- | ---------------------------- | -------------- |
| POST   | `/auth/register` | Create new account           | No             |
| POST   | `/auth/login`    | Authenticate and get cookie  | No             |
| POST   | `/auth/logout`   | Remove cookie                | No             |
| GET    | `/auth/me`       | Get user profile             | Yes            |

## Backend: Protecting Routes

```typescript
// Protect route with JWT authentication
@UseGuards(JwtAuthGuard)
@Get('protected')
getProtected() { ... }

// Protect route with authentication + role check
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Delete(':id')
deleteUser() { ... }

// Access authenticated user data
@Get('me')
getProfile(@CurrentUser() user: RequestUser) {
  return user; // { id, email, role }
}
```

## Cookie Configuration

```typescript
// auth.controller.ts
res.cookie("tcc_auth", token, {
  httpOnly: true, // Inaccessible via JavaScript (protects against XSS)
  secure: true, // HTTPS only in production
  sameSite: "strict", // Not sent in cross-site requests (protects CSRF)
  maxAge: 12 * 60 * 60 * 1000, // 12 hours
  path: "/", // Available on all routes
});
```

## Frontend: Auth Context

```typescript
// Usage in any component
const { user, isAuthenticated, signIn, signOut } = useAuth();

// Login
await signIn({ email: "user@example.com", password: "123456" });

// Logout (removes cookie via API)
await signOut();
```

## Environment Variables

| Variable         | Description                                        | Example                                    |
| ---------------- | -------------------------------------------------- | ------------------------------------------ |
| `JWT_SECRET`     | Secret key for signing tokens (min 32 chars)       | `your-secret-key-here-min-32-characters`   |
| `JWT_EXPIRES_IN` | Token expiration time                              | `12h`                                      |
| `COOKIE_SECURE`  | Use HTTPS for cookies                              | `true` (production)                        |
| `COOKIE_DOMAIN`  | Cookie domain (optional)                           | `.example.com`                             |
| `CORS_ORIGIN`    | Allowed origin for CORS                            | `https://app.example.com`                  |

---

## Multi-Role Registration

The system supports two user types with distinct experiences:

### Account Types

| Role        | Description                                    | Dashboard            |
| ----------- | ---------------------------------------------- | -------------------- |
| **ADVISOR** | Investment advisor (client management)         | `/advisor/home`      |
| **CLIENT**  | Client (portfolio viewing)                     | `/client/home`       |

### Registration Flow

1. User accesses `/register`
2. Selects account type: Advisor or Client (toggle)
3. Fills data: name, email, CPF/CNPJ, phone, password
4. `POST /auth/register` - backend validates and creates user
5. Redirect based on role:
   - ADVISOR: `/advisor/home`
   - CLIENT: `/client/home` (shows invite prompt if not linked)

### Registration Fields

| Field      | Type   | Required | Validation                              |
| ---------- | ------ | -------- | --------------------------------------- |
| `name`     | string | Yes      | 2-100 characters                        |
| `email`    | string | Yes      | Valid email                             |
| `password` | string | Yes      | 8-100 characters                        |
| `role`     | enum   | No       | ADVISOR (default) or CLIENT             |
| `cpfCnpj`  | string | No       | 11 digits (CPF) or 14 digits (CNPJ)     |
| `phone`    | string | No       | International format (+DDI + number)    |

### Role-Based Routes

| Route                | Access         | Description                   |
| -------------------- | -------------- | ----------------------------- |
| `/`                  | Authenticated  | Redirects based on role       |
| `/login`             | Public         | Login page                    |
| `/register`          | Public         | Registration page             |
| `/advisor/home`      | ADVISOR, ADMIN | Advisor home                  |
| `/clients`           | ADVISOR, ADMIN | Client management             |
| `/client/home`       | CLIENT         | Client home                   |
| `/admin/health`      | ADMIN          | Health check page             |

### Registration UI Components

- **RoleToggle**: Toggle between Advisor/Client
- **InputCpfCnpj**: Input with automatic CPF/CNPJ mask (react-imask)
- **InputPhone**: Input with country DDI selector (react-phone-number-input)

---

## Client Invite System (Hybrid Client)

The system supports a "Hybrid Client" model where clients can link their user accounts to an existing client profile through a secure invite system.

### Invite Flow

1. Advisor creates a client in the system (basic data)
2. Advisor generates invite: `POST /clients/:id/invite`
3. Advisor shares token with client (email, WhatsApp, etc.)
4. Client creates account: `POST /auth/register`
5. Client accepts invite: `POST /clients/invite/accept { token }`

### Invite Endpoints

| Method | Endpoint                 | Role    | Description                       |
| ------ | ------------------------ | ------- | --------------------------------- |
| POST   | `/clients/:id/invite`    | ADVISOR | Generate invite token             |
| GET    | `/clients/:id/invite`    | ADVISOR | Check invite status/token         |
| DELETE | `/clients/:id/invite`    | ADVISOR | Revoke pending invite             |
| POST   | `/clients/invite/accept` | CLIENT  | Accept invite and link account    |

### Invite States (InviteStatus)

| State      | Description                                     |
| ---------- | ----------------------------------------------- |
| `PENDING`  | Client created, no invite generated yet         |
| `SENT`     | Token generated and available for use           |
| `ACCEPTED` | Client accepted, account linked                 |
| `REJECTED` | Invite was revoked by advisor                   |

### Token Format

- **Pattern:** `INV-XXXXXXXX` (8 alphanumeric characters)
- **Characters:** `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no ambiguous characters like 0/O, 1/I/L)
- **Expiration:** 7 days after generation
- **Single use:** Token is invalidated after acceptance

### Security

- Tokens generated with `crypto.randomBytes()` (cryptographically secure)
- Each token is unique (`@unique` constraint in database)
- Automatic expiration after 7 days
- Token removed after successful use
- Advisor can revoke pending invites at any time
