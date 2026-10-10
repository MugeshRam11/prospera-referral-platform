# Prospera Referral Platform

Backend rebuild and modern API service for the Prospera Referral Platform.

## 1. Approved Architecture

- **Runtime & Language:** Node.js (v20+ / v22+) with TypeScript
- **Web Framework:** Express 4.x / 5.x
- **API Style:** RESTful, versioned under `/api/v1`
- **Validation:** Zod schema validation
- **ORM:** Prisma ORM
- **Database:** PostgreSQL
- **Testing:** Vitest and Supertest
- **Code Quality:** ESLint & TypeScript strict type checking

---

## 2. Project Structure

```
prospera-referral-platform/
├── docs/
│   └── existing-platform-audit.md   # Architectural & security audit of legacy codebase
├── prisma/
│   └── schema.prisma                # Prisma schema with PostgreSQL datasource
├── src/
│   ├── app.ts                       # Express application factory & middleware setup
│   ├── server.ts                    # HTTP server entrypoint and lifecycle handlers
│   ├── config/                      # Environment and app configuration validated by Zod
│   ├── lib/                         # Shared utilities and database clients (Prisma)
│   ├── middleware/                  # Express middlewares (error handling, 404, etc.)
│   ├── modules/                     # Domain modules (auth, referrals, commissions, etc.)
│   ├── routes/                      # API routing (versioned under /api/v1)
│   └── types/                       # Shared TypeScript interfaces and types
├── tests/                           # Unit and integration tests (Vitest + Supertest)
├── .env.example                     # Environment template with placeholder values
├── .gitignore                       # Git ignore rules for node_modules, env, build, etc.
├── package.json                     # Project scripts and dependencies
├── tsconfig.json                    # TypeScript compiler configuration
└── README.md                        # Documentation
```

---

## 3. Getting Started

### Prerequisites

- Node.js (v20.x or v22.x recommended)
- npm (v10.x+)
- PostgreSQL (for future database integration)

### Installation

1. Clone or navigate to the repository:
   ```bash
   cd prospera-referral-platform
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` to configure your local development values. Never commit `.env` to source control.

4. Generate Prisma Client:
   ```bash
   npm run prisma:generate
   ```

---

## 4. Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server with hot-reload via `tsx watch` |
| `npm run build` | Compile TypeScript source code into `dist/` |
| `npm start` | Run production compiled server from `dist/server.js` |
| `npm test` | Run test suite with Vitest in single-run mode |
| `npm run test:watch` | Run test suite with Vitest in interactive watch mode |
| `npm run lint` | Run ESLint across `src/` and `tests/` |
| `npm run prisma:generate` | Generate Prisma client from `prisma/schema.prisma` |

---

## 5. Environment Configuration

Environment variables are validated on startup using **Zod** (`src/config/index.ts`). If required variables are missing or malformed, the process logs validation issues and safely exits.

| Variable | Type | Default | Description |
|---|---|---|---|
| `NODE_ENV` | `development \| production \| test` | `development` | Runtime environment |
| `PORT` | `number` | `3000` | HTTP port for Express server |
| `API_PREFIX` | `string` | `/api/v1` | Base route prefix for API endpoints |
| `DATABASE_URL` | `string` | *(placeholder)* | PostgreSQL connection string for Prisma |
| `CORS_ORIGIN` | `string` | `http://localhost:3000` | Allowed CORS origin |

---

## 6. Endpoints (Foundation Phase)

### Health Check

- **Method:** `GET`
- **Path:** `/api/v1/health`
- **Description:** Verifies service uptime and configuration status.
- **Sample Response:**
  ```json
  {
    "success": true,
    "data": {
      "status": "ok",
      "uptime": 1.452,
      "environment": "development",
      "timestamp": "2026-10-10T18:30:00.000Z",
      "version": "1.0.0"
    },
    "timestamp": "2026-10-10T18:30:00.000Z"
  }
  ```

### 404 Handler

Requests to unrecognized paths return structured JSON:
```json
{
  "success": false,
  "error": {
    "message": "Cannot GET /api/v1/unknown"
  },
  "timestamp": "2026-10-10T18:30:00.000Z"
}
```

---

## 7. Architecture & Safety Rules

- **Zero Legacy Contamination:** Legacy Odoo controllers and insecure auth patterns are referenced only via `docs/existing-platform-audit.md` and are **not** ported into this codebase.
- **Phase Isolation:** Business domains (authentication, referrals, commissions, withdrawals, KYC) will be implemented in subsequent phases under `src/modules/` following domain-driven design.
- **Database Safety:** No migrations or direct connections are executed in Phase 1; Prisma is prepared with a PostgreSQL datasource using environment variables.
