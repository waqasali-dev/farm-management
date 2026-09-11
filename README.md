# Farm Data Management System

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Fastify](https://img.shields.io/badge/Fastify-v5.2-black?logo=fastify&logoColor=white)](https://fastify.dev/)
[![React](https://img.shields.io/badge/React-v18.3-61dafb?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-v6.1-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon_Cloud-336791?logo=postgresql&logoColor=white)](https://neon.tech/)
[![Redis](https://img.shields.io/badge/Redis-Upstash_REST-DC382D?logo=redis&logoColor=white)](https://upstash.com/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v3.4-38bdf8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Vitest-Tested-yellow?logo=vitest&logoColor=black)](https://vitest.dev/)

A multi-tenant, real-time commercial poultry flock operations, daily ledger tracking, and production auditing platform. Engineered for speed, strict data consistency, high-density tabular logging, and distributed idempotency.

Deployed in production with the **Frontend on Vercel**, **Backend on Render**, **PostgreSQL on Neon Serverless**, and **Cache on Upstash Redis**.

---

## 📑 Table of Contents

- [System Architecture](#-system-architecture)
- [Key Features](#-key-features)
- [Monorepo Directory Structure](#-monorepo-directory-structure)
- [Database Schema & Data Model](#-database-schema--data-model)
- [Environment Variables](#-environment-variables)
- [Local Development Setup](#-local-development-setup)
- [Testing & Quality Assurance](#-testing--quality-assurance)
- [Production Deployment](#-production-deployment)
  - [Backend on Render](#1-backend-deployment-render)
  - [Frontend on Vercel](#2-frontend-deployment-vercel)
  - [Cloud Database & Cache (Neon & Upstash)](#3-cloud-database--cache-neon--upstash)
- [API Reference](#-api-reference)

---

## 🏛 System Architecture

The repository is structured as an npm workspaces monorepo containing an isolated, decoupled backend and frontend:

```
┌─────────────────────────────────────────────────────────┐
│                    Browser Client                       │
│        React 18 + Vite SPA (Vercel Production)          │
│   Industrial Monochrome High-Density Tabular UI / JWT   │
└───────────────────────────▲─────────────────────────────┘
                            │ HTTPS / REST (JSON)
┌───────────────────────────▼─────────────────────────────┐
│                    Fastify Backend                      │
│            Node.js / TypeScript (Render)                │
│    JWT Authentication Guard & Role Authorization        │
│    Distributed Request Locks & Idempotency Filter       │
└─────────────┬─────────────────────────────┬─────────────┘
              │                             │
              ▼                             ▼
┌───────────────────────────┐ ┌───────────────────────────┐
│     Neon PostgreSQL       │ │       Upstash Redis       │
│  AWS Cloud (Drizzle ORM)  │ │   REST & Distributed Lock │
│  Multi-tenant Relational  │ │  15s Mutex & Query Cache  │
└───────────────────────────┘ └───────────────────────────┘
```

- **Frontend**: Single-Page Application built with React 18, Vite, TypeScript, Tailwind CSS, TanStack Query, and Lucide icons. Designed with a strict high-contrast, brutalist monochrome aesthetic tailored for rapid warehouse and farm-floor data entry.
- **Backend**: High-performance HTTP server built on Fastify v5 with Drizzle ORM, Zod payload validation, `@fastify/jwt` session management, and bcrypt password encryption.
- **Distributed Cache & Concurrency**: Dual-layer Redis client supporting both Upstash HTTPS REST (optimal for serverless/PaaS egress) and standard TCP Redis. Employs distributed locks (`lock:req:...`) to prevent duplicate concurrent ledger submissions.

---

## 🚀 Key Features

### 1. Multi-Tenant User Authentication & Scoping
- **Self-Registration & Login**: Secure registration and login issuing 7-day cryptographic JWT bearer tokens.
- **Tenant Flock Isolation**: Each user exclusively sees and manages their own flocks. Cross-tenant reads and mutations are rejected at the route level with HTTP 403.
- **Admin Control Panel (`/admin`)**: Root administrators can:
  - View all registered accounts, roles, and flock ownership metrics.
  - Create new accounts with specified roles (`user` or `admin`).
  - Directly update user email and name.
  - **Direct Password Override**: Reset any user's password directly without requiring their current password.
  - Safely remove user accounts with confirmation safeguards.

### 2. Flock Lifecycle Management
- Manage active and historical closed flocks with custom flock codes (`FL-001`), breed details, start dates, and initial bird stocking capacity.
- Set opening balances (cumulative mortality, initial feed bags, egg peti/trays, diesel reserves).
- Seamless flock switching with persistent browser session caching.

### 3. Unified Daily Operational Ledger
Complete daily recording for all operational farm inputs and outputs:
- **Mortality & Bird Population**: Daily bird deaths, culls, and automatic closing population computations.
- **Feed Management**: Morning and evening feed consumption (kg and bags), feed deliveries, and remaining stock balances.
- **Egg Production**: Production counts in peti, commercial trays, and single eggs, plus broken/damaged egg tracking and Hen-Day Egg Production % calculation.
- **Resource Tracking**: Diesel generator consumption and fuel deliveries, wood chips/litter bedding usage, and egg carton/tray stock.
- **Health & Medication**: Body weight sampling, medication logs (dosage, route, purpose), and scheduled vaccination audits.

### 4. Financial & Production Audits (PDF Reports)
- Complete historical audit ledgers per flock.
- Tabular reports for Feed, Eggs, Mortality, Diesel, Bedding, and Health.
- High-fidelity PDF generation with `jspdf` and `jspdf-autotable` for export and offline printing.

---

## 📁 Monorepo Directory Structure

```
farm-management/
├── backend/
│   ├── src/
│   │   ├── app.ts                  # Fastify application setup & plugins
│   │   ├── server.ts               # HTTP listener entrypoint
│   │   ├── config/                 # Environment validation (env.ts)
│   │   ├── db/
│   │   │   ├── client.ts           # PostgreSQL client via 'postgres' & Drizzle
│   │   │   ├── redis.ts            # Upstash REST & TCP Redis with redlock
│   │   │   ├── schema/index.ts     # Drizzle ORM relational schemas
│   │   │   └── mock-store.ts       # Resilient fallback memory store
│   │   ├── modules/
│   │   │   ├── auth/routes.ts      # /api/v1/auth (login, register, me)
│   │   │   ├── admin/routes.ts     # /api/v1/admin/users (user lifecycle)
│   │   │   ├── flocks/routes.ts    # /api/v1/flocks (scoped CRUD)
│   │   │   ├── daily-records/      # /api/v1/flocks/:id/daily-record
│   │   │   ├── dashboard/          # /api/v1/flocks/:id/dashboard
│   │   │   └── reports/            # /api/v1/flocks/:id/reports
│   │   └── services/               # Production & FCR calculation logic
│   ├── tests/
│   │   ├── auth.test.ts            # Authentication, admin & isolation tests
│   │   ├── calculations.test.ts    # Formulas & Hen-Day % verification
│   │   └── redis-lock.test.ts      # Concurrency & idempotency tests
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── App.tsx             # Root wrapper with Auth & Query providers
│   │   │   └── router.tsx          # Protected & Admin route definitions
│   │   ├── components/
│   │   │   ├── auth/               # ProtectedRoute & AdminRoute guards
│   │   │   └── layout/             # Header, Sidebar, AppLayout
│   │   ├── context/
│   │   │   └── AuthContext.tsx     # Global auth state & session recovery
│   │   ├── features/
│   │   │   ├── auth/               # LoginPage & RegisterPage
│   │   │   ├── admin/              # AdminPage (user table, reset modal)
│   │   │   ├── dashboard/          # Metrics, summary cards, chart views
│   │   │   ├── flocks/             # Flock creation modal & list
│   │   │   ├── daily-record/       # Unified operational daily entry form
│   │   │   ├── reports/            # Printable & exportable audit tables
│   │   │   └── settings/           # System status & database health
│   │   ├── lib/
│   │   │   ├── api-client.ts       # Unified API client with JWT bearer injection
│   │   │   └── queries.ts          # TanStack Query hooks
│   │   └── types/index.ts          # Shared TypeScript domain contracts
│   └── package.json
│
├── package.json                    # Monorepo workspaces configuration
└── README.md
```

---

## 🗄 Database Schema & Data Model

The PostgreSQL schema is managed using **Drizzle ORM** with foreign-key referential integrity:

| Table | Description |
| :--- | :--- |
| `users` | User accounts (`id`, `email`, `password_hash`, `name`, `role`, timestamps) |
| `flocks` | Flock records (`id`, `user_id` FK, `flock_code`, `name`, `start_date`, `initial_birds`, `status`, opening balances) |
| `bird_daily_records` | Daily bird population updates, mortality count, and culls |
| `feed_daily_records` | Feed consumption (bags/kg), deliveries, and remaining stock |
| `egg_daily_records` | Egg production (peti, commercial trays, single eggs, breakage) |
| `diesel_daily_records` | Generator fuel logging (liters consumed, liters received, remaining) |
| `chips_daily_records` | Wood chip bedding bags used, received, and remaining |
| `tray_daily_records` | Plastic and paper egg tray usage and stock |
| `weight_records` | Weekly bird sample weights for growth monitoring |
| `medicines` | Master dictionary of farm medicines and vaccines |
| `medicine_daily_records` | Daily medicine and vaccine administration entries |

---

## ⚙️ Environment Variables

### Backend Configuration (`backend/.env`)

```env
# Server
PORT=4000
HOST=0.0.0.0
NODE_ENV=development

# Allowed Frontend URL for CORS
FRONTEND_URL=http://localhost:5173

# PostgreSQL Database (Neon Cloud or Local)
DATABASE_URL=postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require

# Upstash Redis (REST API over HTTPS)
UPSTASH_REDIS_REST_URL=https://your-upstash-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_upstash_rest_token

# Local Redis (TCP fallback)
REDIS_URL=redis://localhost:6379

# In-memory storage fallback if database is unreachable
FALLBACK_STORAGE=false

# Authentication Secret (min 32 characters)
JWT_SECRET=your-secure-jwt-secret-key-production
```

### Frontend Configuration (`frontend/.env`)

```env
# URL pointing to the running backend API
# In local development:
VITE_API_URL=http://localhost:4000

# In production (e.g. deployed on Render):
# VITE_API_URL=https://farm-management-backend.onrender.com
```

---

## 💻 Local Development Setup

### 1. Prerequisites
- **Node.js**: `v20.0.0` or higher
- **npm**: `v10.0.0` or higher

### 2. Clone and Install Dependencies
```bash
git clone https://github.com/waqasali-dev/farm-management.git
cd farm-management

# Install dependencies across all workspaces
npm install
```

### 3. Configure Environment Files
- Copy `backend/.env.example` to `backend/.env` and update credentials.
- Copy `frontend/.env.example` to `frontend/.env` (or create it with `VITE_API_URL=http://localhost:4000`).

### 4. Run Database Schema Setup
```bash
# Apply schema to PostgreSQL
npm run db:apply-schema --workspace=backend
```

### 5. Start Development Servers
Open two terminal windows:

**Terminal 1 — Backend API Server (Port 4000):**
```bash
cd backend
npm run dev
```

**Terminal 2 — Frontend Dev Server (Port 5173):**
```bash
cd frontend
npm run dev
```

Visit **`http://localhost:5173`** to access the application.

---

## 🧪 Testing & Quality Assurance

The backend includes a comprehensive suite of automated tests powered by **Vitest**:

```bash
# Run all backend unit and integration tests
npm test --workspace=backend
```

### Verification Coverage:
- **`tests/auth.test.ts`**: Verifies user registration, password hashing, JWT creation, flock ownership scoping, cross-tenant isolation, and admin password overrides.
- **`tests/calculations.test.ts`**: Verifies Hen-Day Egg Production %, Feed Conversion Ratio (FCR), mortality percentage, and cumulative balance tracking.
- **`tests/redis-lock.test.ts`**: Verifies distributed lock acquisition, TTL auto-release, and idempotency protection against concurrent POST requests.

### Static Type Checking & Production Build:
```bash
# TypeScript verification across workspaces
npm run typecheck --workspace=backend
npm run typecheck --workspace=frontend

# Frontend bundle verification
npm run build --workspace=frontend
```

---

## 🌐 Production Deployment

### 1. Backend Deployment (Render)
1. Create a new **Web Service** on [Render](https://render.com/).
2. Connect your GitHub repository.
3. Configure the service settings:
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm run render-build` (or `npm install && npm run build`)
   - **Start Command**: `npm run start` (executes `node dist/server.js`)
4. Add the Environment Variables:
   - `DATABASE_URL`: Your Neon PostgreSQL connection string with `?sslmode=require`.
   - `UPSTASH_REDIS_REST_URL`: Your Upstash Redis REST URL.
   - `UPSTASH_REDIS_REST_TOKEN`: Your Upstash Redis token.
   - `JWT_SECRET`: A strong production cryptographic key.
   - `FRONTEND_URL`: Your production frontend domain (e.g., `https://your-app.vercel.app`).
   - `NODE_ENV`: `production`

### 2. Frontend Deployment (Vercel)
1. Import the repository in [Vercel](https://vercel.com/).
2. Set the **Root Directory** to `frontend`.
3. Build & Output settings:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add Environment Variable:
   - `VITE_API_URL`: Your deployed Render backend URL (e.g. `https://farm-management-backend.onrender.com`).

### 3. Cloud Database & Cache (Neon & Upstash)
- **Neon Cloud PostgreSQL**: Create a database project in AWS `us-east-2`. Neon provides pooled serverless connection strings with SSL enabled by default.
- **Upstash Redis**: Create a Redis database with REST enabled. Fastify uses the HTTPS REST protocol, ensuring reliable connections from Render without TCP port timeouts.

---

## 📡 API Reference

All backend endpoints are prefixed with `/api/v1`:

### Authentication & Profiles
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Register a new tenant account | No |
| `POST` | `/api/v1/auth/login` | Authenticate and receive JWT | No |
| `GET` | `/api/v1/auth/me` | Fetch currently authenticated user | Bearer Token |

### Admin User Management
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/admin/users` | List all accounts and flock counts | Admin Role |
| `POST` | `/api/v1/admin/users` | Create an account with designated role | Admin Role |
| `PATCH` | `/api/v1/admin/users/:id` | Update email, name, or **override password** | Admin Role |
| `DELETE` | `/api/v1/admin/users/:id` | Delete user account | Admin Role |

### Flock Management
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/flocks` | List flocks (scoped to active user) | Bearer Token |
| `POST` | `/api/v1/flocks` | Create flock assigned to user | Bearer Token |
| `GET` | `/api/v1/flocks/:id` | Get flock details | Bearer Token |
| `PATCH` | `/api/v1/flocks/:id` | Update flock properties | Bearer Token (Owner) |
| `POST` | `/api/v1/flocks/:id/close` | Mark flock as completed/closed | Bearer Token (Owner) |
| `DELETE` | `/api/v1/flocks/:id` | Delete flock record | Bearer Token (Owner) |

### Daily Operational Records
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/flocks/:id/daily-record?date=YYYY-MM-DD` | Fetch unified ledger for date | Bearer Token (Owner) |
| `POST` | `/api/v1/flocks/:id/daily-record` | Submit unified daily record (Redis locked) | Bearer Token (Owner) |

### Dashboard & Analytics
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/flocks/:id/dashboard` | Key performance indicators & charts | Bearer Token (Owner) |
| `GET` | `/api/v1/flocks/:id/reports/summary` | Full audit report across all dates | Bearer Token (Owner) |
| `GET` | `/api/v1/health` | System health check (DB, Redis, storage mode) | No |

---

## 🔒 Security & Concurrency Controls

- **Distributed Idempotency**: All `POST /daily-record` submissions acquire an Upstash Redis distributed lock based on `(flockId, date)`. Duplicate concurrent clicks or parallel requests are intercepted with HTTP 409, preventing double-entry in production.
- **Password Security**: Passwords are encrypted with bcrypt using 10 salt rounds before storage. Plain-text passwords are never logged or stored.
- **Route Authorization**: Fastify decorators verify JWT signatures and attach user claims to every incoming request. Scoped queries ensure strict tenant data isolation.

---

## 📄 License

This software is developed and maintained for commercial poultry farm operations. All rights reserved.
