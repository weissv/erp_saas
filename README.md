# Mirai ERP SaaS

A multifunctional, multi-tenant ERP platform for schools and preschools with an integrated LMS, an AI assistant, an examination module, and deep integration with 1C:Enterprise.

---

## Table of Contents

* [Overview](https://www.google.com/search?q=%23overview)
* [Architecture](https://www.google.com/search?q=%23architecture)
* [Tech Stack](https://www.google.com/search?q=%23tech-stack)
* [Project Structure](https://www.google.com/search?q=%23project-structure)
* [Quick Start](https://www.google.com/search?q=%23quick-start)
* [Environment Variables](https://www.google.com/search?q=%23environment-variables)
* [Backend](https://www.google.com/search?q=%23backend)
* [API Routes](https://www.google.com/search?q=%23api-routes)
* [Modules](https://www.google.com/search?q=%23modules)
* [Services](https://www.google.com/search?q=%23services)
* [Middleware](https://www.google.com/search?q=%23middleware)
* [Authentication & Authorization](https://www.google.com/search?q=%23authentication--authorization)
* [Multi-tenancy](https://www.google.com/search?q=%23multi-tenancy)
* [Queues (BullMQ)](https://www.google.com/search?q=%23queues-bullmq)
* [AI / LLM Integrations](https://www.google.com/search?q=%23ai--llm-integrations)
* [File Uploads](https://www.google.com/search?q=%23file-uploads)


* [Frontend](https://www.google.com/search?q=%23frontend)
* [Pages & Routes](https://www.google.com/search?q=%23pages--routes)
* [Components](https://www.google.com/search?q=%23components)
* [State Management](https://www.google.com/search?q=%23state-management)
* [API Client](https://www.google.com/search?q=%23api-client)
* [Internationalization](https://www.google.com/search?q=%23internationalization)


* [Database](https://www.google.com/search?q=%23database)
* [Control Plane (Master DB)](https://www.google.com/search?q=%23control-plane-master-db)
* [Tenant DB (Schema)](https://www.google.com/search?q=%23tenant-db-schema)


* [1C Integration](https://www.google.com/search?q=%231c-integration)
* [LMS (Learning Management System)](https://www.google.com/search?q=%23lms-learning-management-system)
* [Examination Platform](https://www.google.com/search?q=%23examination-platform)
* [Testing](https://www.google.com/search?q=%23testing)
* [Deployment](https://www.google.com/search?q=%23deployment)
* [Docker Compose](https://www.google.com/search?q=%23docker-compose)
* [Caddy (Reverse Proxy)](https://www.google.com/search?q=%23caddy-reverse-proxy)
* [Cloudflare Tunnel](https://www.google.com/search?q=%23cloudflare-tunnel)
* [Systemd Services](https://www.google.com/search?q=%23systemd-services)
* [Auto-deploy](https://www.google.com/search?q=%23auto-deploy)


* [Scripts](https://www.google.com/search?q=%23scripts)
* [License](https://www.google.com/search?q=%23license)

---

## Overview

**Mirai ERP SaaS** is a cloud platform for managing educational institutions. Each client (school/kindergarten) receives an isolated subdomain and a separate database.

### Key Features

| Module | Description |
| --- | --- |
| **Student Management** | Children, parents, groups/classes, temporary absences |
| **HR / Personnel** | Employees, attendance, staffing table |
| **Finance** | Transactions (income/expense), balance, Excel export |
| **Inventory** | Items, movements, write-offs, expiration dates |
| **Procurement** | Purchase requests with approval workflow (Creator → Director → Facilities Manager) |
| **Clubs** | Enrollment, attendance, grades |
| **Catering** | Menus, dishes, ingredients, recipes |
| **Schedule** | Subjects, classrooms, time slots |
| **LMS** | Gradebook, homework, student attendance |
| **Exams** | Exam creation with AI grading, public links |
| **AI Assistant** | RAG chat based on the knowledge base (Gemini + Groq) |
| **Knowledge Base** | Markdown articles with semantic search (pgvector) |
| **Document Management** | Templates, linking to employees/students |
| **Communications** | Notifications, events, feedback, Telegram |
| **Security** | Incident log, fire safety checks, visitor tracking |
| **1C Integration** | Two-way sync of catalogs, documents, and registers |
| **Audit** | Comprehensive user action log |
| **White-label** | Tenant branding (logo, colors, favicon) |
| **Demo Mode** | Read-only demo tenant for exploration |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Cloudflare Tunnel                       │
│      *.mirai-edu.space → Tunnel → Caddy (localhost:80)      │
└────────────────────────┬────────────────────────────────────┘
                         │
               ┌─────────┴──────────┐
               │    Caddy Server    │
               │  (reverse proxy)   │
               └───┬─────────────┬──┘
                   │             │
           /api, /ws             /*
                   │             │
      ┌────────────┴──┐   ┌──────┴─────────┐
      │   Backend     │   │   Frontend     │
      │ Express:4000  │   │   Nginx:3000   │
      │  TypeScript   │   │   React SPA    │
      └───┬───────┬───┘   └────────────────┘
          │       │
    ┌─────┴─┐  ┌──┴────┐
    │ Redis │  │ PG 16 │
    │   7   │  │pgvector│
    └───────┘  └──┬────┘
                  │
        ┌─────────┴──────────┐
        │                    │
   ┌────┴─────┐   ┌──────────┴────────┐
   │ Master DB│   │    Tenant DBs     │
   │erp_master│   │ erp_db, erp_demo, │
   │(tenants, │   │ erp_test, ...     │
   │ settings)│   │(all business logic)│
   └──────────┘   └───────────────────┘

```

### Request Flow

```
Browser → hogwarts.mirai-edu.space/api/children
       ↓
  Cloudflare Tunnel → Caddy
       ↓
  tenantResolver middleware
       ↓
  Master DB: SELECT * FROM tenants WHERE subdomain = 'hogwarts'
       ↓
  Creation of tenant-scoped Prisma client (dbUrl from tenant)
       ↓
  req.prisma = isolated client → all queries go to the 'hogwarts' DB

```

---

## Tech Stack

### Backend

| Technology | Version | Purpose |
| --- | --- | --- |
| Node.js | 18+ | Runtime |
| TypeScript | 5.3+ | Language |
| Express.js | 4.18 | HTTP framework |
| Prisma | 6.19 | ORM + migrations |
| PostgreSQL | 16 | DBMS (with pgvector extension) |
| Redis | 7 | Cache and queues |
| BullMQ | 5.73 | Background jobs |
| Socket.IO | 4.8 | WebSocket (real-time) |
| JWT | HS256 | Authentication |
| Zod | 3.23 | Validation |
| Stripe | 22.0 | Payments / subscriptions |
| Telegraf | 4.16 | Telegram bot |
| Multer | 2.1 | File uploads |
| AWS S3 SDK | 3.x | File storage (S3/R2) |
| OpenAI SDK | 4.77 | AI (Groq-compatible) |
| Google Generative AI | 0.24 | Embeddings (Gemini) |
| Nodemailer | 8.0 | Email sending |
| ExcelJS | 4.4 | Excel generation |
| Mammoth | 1.11 | DOCX parsing |
| Archiver | 7.0 | ZIP archive creation |
| node-cron | 4.2 | Task scheduler |

### Frontend

| Technology | Version | Purpose |
| --- | --- | --- |
| React | 18.3 | UI library |
| TypeScript | 5.9 | Language |
| Vite | 5.2 | Bundler |
| React Router | 6.24 | Client-side routing |
| Tailwind CSS | 3.4 | Utility-first CSS |
| Radix UI | 1.x–2.x | Headless components (8 packages) |
| Shadcn/ui | — | Design system (CVA + Radix) |
| React Hook Form | 7.52 | Form management |
| Zod | 3.25 | Form validation |
| TanStack Table | 8.21 | Headless tables |
| Recharts | 3.8 | Charts and diagrams |
| Framer Motion | 12.38 | Animations |
| i18next | 25.6 | Internationalization |
| Socket.IO Client | 4.8 | WebSocket |
| Lucide React | 0.408 | Icons (1000+) |
| cmdk | 1.1 | Command palette |
| Sonner | 1.5 | Toast notifications |
| react-grid-layout | 2.2 | Drag & Drop dashboard |
| react-markdown | 9.0 | Markdown rendering |
| html2canvas | 1.4 | HTML to PNG export |
| papaparse | 5.4 | CSV parsing |
| date-fns | 4.1 | Date manipulation |

### Infrastructure

| Technology | Purpose |
| --- | --- |
| Docker + Docker Compose | Containerization |
| Caddy | Reverse proxy with automatic TLS |
| Cloudflare Tunnel | Secure tunnel (no exposed ports) |
| systemd | Service management (auto-start, auto-deploy) |
| pgvector | Vector search for RAG |

---

## Project Structure

```
erp_saas/
├── README.md                    # This file
├── DEPLOYMENT.md                # Detailed deployment guide
├── Caddyfile                    # Reverse proxy configuration
├── docker-compose.yml           # Container orchestration
├── patch_demo_access.js         # Script for demo access setup
│
├── backend/                     # Server-side
│   ├── package.json
│   ├── tsconfig.json
│   ├── Dockerfile               # Multi-stage Docker build
│   ├── vitest.config.ts         # Tests configuration
│   ├── AI_KEYS_SETUP.md         # Instructions for AI API keys
│   ├── prisma/
│   │   ├── schema.prisma        # Tenant DB schema (60+ models)
│   │   ├── master/
│   │   │   └── schema.prisma    # Control Plane schema (Tenant, GlobalSetting)
│   │   ├── migrations/          # Prisma migrations
│   │   ├── seed.ts              # Main seed script
│   │   ├── seed_school.ts       # School data seed
│   │   ├── seed_economics_exam.ts # Economics exam seed
│   │   ├── seed_inventory_items.ts # Inventory items seed
│   │   └── seed_knowledge_base.ts  # Knowledge base seed
│   └── src/
│       ├── index.ts             # Entry point (port 4000)
│       ├── app.ts               # Express application
│       ├── config.ts            # Env configuration
│       ├── prisma.ts            # Prisma clients
│       ├── constants/           # Constants
│       ├── lib/                 # Internal libraries
│       ├── middleware/          # Express middleware
│       ├── modules/             # Business modules (1C, SaaS)
│       ├── queues/              # BullMQ queues
│       ├── routes/              # API routes
│       ├── schemas/             # Zod validation schemas
│       ├── scripts/             # CLI scripts (bootstrap, migrations)
│       ├── services/            # Business logic
│       ├── test/                # Test infrastructure
│       └── utils/               # Utilities
│
├── frontend/                    # Client-side
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.js           # Vite with multi-entry (ERP + LMS)
│   ├── tailwind.config.js       # Design tokens
│   ├── Dockerfile               # Multi-stage Docker build
│   ├── nginx.conf               # Nginx for static file serving
│   ├── index.html               # ERP SPA entry point
│   ├── lms.html                 # LMS SPA entry point (separate app)
│   ├── cypress.config.ts        # E2E tests
│   ├── scripts/
│   │   ├── build.mjs            # Custom build script
│   │   └── serve-dist.mjs       # Local server for dist/
│   └── src/
│       ├── main.tsx             # ERP entry point
│       ├── lms.tsx              # LMS entry point
│       ├── router/              # Routes (30+ ERP pages, 7 LMS pages)
│       ├── pages/               # Pages
│       ├── components/          # Reusable components
│       │   ├── ui/              # Atomic UI primitives (Shadcn)
│       │   ├── DataTable/       # Table components (V1, V2)
│       │   ├── DashboardWidgets/# Dashboard widgets
│       │   ├── dashboard/       # Dashboard personalization
│       │   ├── forms/           # Domain forms (15+)
│       │   └── modals/          # Modal windows
│       ├── features/            # Features (AI, 1C, marketing)
│       ├── contexts/            # React Context (Auth, Tenant, Permissions, Demo)
│       ├── hooks/               # Custom hooks (15+)
│       ├── lib/                 # API client, roles, utilities
│       ├── types/               # TypeScript types
│       ├── i18n/                # Localization
│       ├── layouts/             # Layouts (Auth, Main, LMS)
│       └── styles/              # Global styles, CSS variables
│
├── cloudflared/
│   └── config.yml.example       # Cloudflare Tunnel template
│
├── scripts/
│   ├── setup-ubuntu.sh          # Full setup script for Ubuntu
│   ├── erp-saas-autodeploy.sh   # Auto-deploy from GitHub
│   └── erp-saas-stack-start.sh  # Stack start on system boot
│
└── systemd/
    ├── erp-saas-stack.service         # Stack auto-start unit
    ├── erp-saas-autodeploy.service    # Deploy unit
    └── erp-saas-autodeploy.timer      # GitHub polling every 1 min

```

---

## Quick Start

### Requirements

* **Node.js** ≥ 18
* **PostgreSQL** 16 with `pgvector` extension
* **Redis** 7+
* **Docker** + **Docker Compose** (for production)

### Local Development

```bash
# 1. Clone
git clone https://github.com/weissv/erp_saas.git
cd erp_saas

# 2. Backend
cd backend
cp .env.example .env          # Fill in environment variables
npm install
npm run prisma:generate       # Generate Prisma clients
npm run prisma:master:push    # Create Control Plane schema
npm run prisma:tenant:deploy  # Apply Tenant DB migrations
npm run dev                   # → http://localhost:4000

# 3. Frontend (in a separate terminal)
cd frontend
npm install
npm run dev                   # → http://localhost:5173

```

### Run via Docker Compose

```bash
cd erp_saas

# Fill in backend/.env and frontend/.env.production
docker compose up -d --build

# Verify
docker compose ps
curl http://localhost:4000/api/health
curl http://localhost:3000/health

```

### Ubuntu Installation (Fully Automated)

```bash
sudo -E bash scripts/setup-ubuntu.sh

```

The script performs:

1. Installation of Docker, Caddy, cloudflared
2. Cloning/updating the repository
3. Secret generation (`POSTGRES_PASSWORD`, `JWT_SECRET`, `ENCRYPTION_KEY`)
4. Caddyfile configuration and Caddy reload
5. Docker image building
6. Starting PostgreSQL and Redis
7. Creating the `erp_master` DB and applying migrations
8. Provisioning tenants: `mirai` (primary), `demo` (read-only), `test`
9. Creating the initial administrator
10. Starting the backend and frontend containers

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | Default tenant database URL |
| `MASTER_DATABASE_URL` | ✅ | Control Plane database URL |
| `JWT_SECRET` | ✅ | Secret for signing JWT (required in prod) |
| `ENCRYPTION_KEY` | ✅ | 32-byte hex key for AES-256-GCM encryption |
| `POSTGRES_USER` | ✅ | PostgreSQL user |
| `POSTGRES_PASSWORD` | ✅ | PostgreSQL password |
| `POSTGRES_DB` | ✅ | Default tenant DB name |
| `REDIS_URL` | — | Redis URL (default `redis://redis:6379`) |
| `PORT` | — | Backend port (default `4000`) |
| `NODE_ENV` | — | `development` / `production` |
| `CORS_ORIGIN` | — | Allowed CORS origins |
| `GROQ_API_KEY` | — | Groq API key for AI chat |
| `GEMINI_API_KEY` | — | Google Gemini API key for embeddings |
| `GOOGLE_DRIVE_API_KEY` | — | Google Drive API key for document sync |
| `GOOGLE_DRIVE_FOLDER_ID` | — | Google Drive folder ID |
| `STRIPE_SECRET_KEY` | — | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | — | Stripe webhook secret |
| `TELEGRAM_BOT_TOKEN` | — | Telegram bot token |
| `WAITLIST_TELEGRAM_ADMIN_CHAT_ID` | — | Admin Chat ID for instant waitlist notifications |
| `STORAGE_BUCKET` | — | S3/R2 bucket name |
| `STORAGE_REGION` | — | S3 region |
| `STORAGE_ENDPOINT` | — | S3/R2 endpoint |
| `STORAGE_ACCESS_KEY_ID` | — | S3 access key |
| `STORAGE_SECRET_ACCESS_KEY` | — | S3 secret key |
| `SMTP_HOST` | — | SMTP server |
| `SMTP_PORT` | — | SMTP port |
| `SMTP_USER` | — | SMTP user |
| `SMTP_PASS` | — | SMTP password |
| `INITIAL_ADMIN_EMAIL` | — | First admin's email |
| `INITIAL_ADMIN_PASSWORD` | — | First admin's password |
| `INITIAL_TENANT_SUBDOMAIN` | — | Subdomain for the first tenant (default `mirai`) |

### Frontend (`frontend/.env.production`)

| Variable | Description |
| --- | --- |
| `VITE_API_URL` | Backend URL (e.g., `https://api.mirai-edu.space`) |
| `VITE_TELEGRAM_BOT_NAME` | Telegram bot username for integration |
| `VITE_MARKETING_HOSTNAME` | Marketing page hosts (comma-separated) |

---

## Backend

### API Routes

#### Public (No Auth Required)

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Health check |
| `POST` | `/api/auth/login` | Login |
| `POST` | `/api/auth/demo-access` | Quick access to the demo tenant |
| `GET` | `/api/public/exams/:id` | Public exam access |
| `GET` | `/api/tenant` | Tenant info (branding) |

#### 1C Integration (API Key)

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/v1/integration/*` | Receive data from 1C (push) |
| `GET` | `/api/v1/integration/sync-status` | Synchronization status |

#### Protected Routes (JWT)

| Module | Base Path | Operations |
| --- | --- | --- |
| Children | `/api/children` | CRUD, search, filter, pagination |
| Parents | `/api/children/:id/parents` | CRUD |
| Temporary Absences | `/api/children/:id/absences` | CRUD |
| Groups | `/api/groups` | CRUD |
| Employees | `/api/employees` | CRUD, attendance |
| Users | `/api/users` | CRUD, role management |
| Finance | `/api/finance` | CRUD, balances, exports |
| Inventory | `/api/inventory` | CRUD, movements, expirations |
| Procurement | `/api/procurement` | CRUD, approval workflow |
| Clubs | `/api/clubs` | CRUD, enrollments, ratings |
| Attendance | `/api/attendance` | Marks, statistics |
| Schedule | `/api/schedule` | Subjects, slots, classrooms |
| Catering Menu | `/api/menu` | Menus, dishes, ingredients |
| Maintenance | `/api/maintenance` | Requests with workflow |
| Documents | `/api/documents` | Uploads, templates |
| Security | `/api/security` | Incident logs |
| Notifications | `/api/notifications` | CRUD |
| Events | `/api/events` | CRUD |
| Feedback | `/api/feedback` | CRUD, responses |
| Action Log | `/api/action-log` | Read access |
| Knowledge Base | `/api/knowledge-base` | CRUD, semantic search |
| AI Assistant | `/api/ai` | Chat, document management |
| Exams | `/api/exams` | CRUD, AI grading, results |
| LMS | `/api/lms/*` | Grades, homework, schedule, attendance |
| Uploads | `/api/upload` | Upload to S3/R2 |
| Telegram | `/api/telegram` | Bot config, user linking |
| 1C Settings | `/api/integrations/onec` | Configuration |
| Roles & Permissions | `/api/permissions` | CRUD access rights by role |
| Dashboard | `/api/dashboard` | Personalization |
| Staffing Table | `/api/staffing` | Positions, capacities |

### Modules

#### 1C Integration (`src/modules/onec/`)

Two-way integration with "1C:Enterprise" via OData and Push API:

* **Pull (OData)**: Periodic polling of the 1C server via OData API
* Financial documents (cash receipts, payments, bank statements)
* Counterparties, individuals, cash flow items
* Catalogs (nomenclature, organizations, employees, positions, warehouses, etc.)
* HR documents (hiring, firing, vacations)
* Payroll documents
* Accumulation and information registers
* UTF-8 Basic Auth, configurable timeouts


* **Push (REST)**: 1C sends data to our endpoint
* Bearer-token authentication (SHA-256 hash)
* BullMQ queue for processing
* Audit log for each sync task



#### SaaS Module (`src/modules/saas/`)

Subscription lifecycle management:

```
ACTIVE → SOFT_LOCKED (1 day) → HARD_LOCKED (14 days) → PURGING (60 days) → PURGED

```

* Stripe Webhooks processing
* Tenant provisioning upon payment
* Automatic DB creation and migration application
* Grace periods for unpaid states

### Services

| Service | Description |
| --- | --- |
| `AiService` | Gemini embeddings (768-dim), Groq chat, Google Drive sync |
| `ChildService` | Children management with search, filter, pagination |
| `EmployeeService` | Personnel management + employee attendance |
| `KnowledgeBaseService` | Articles + semantic vector search (pgvector) |
| `StorageService` | S3/R2 uploads with tenant-scoped paths |
| `PermissionService` | RBAC — role-based access control |
| `ProcurementService` | Procurement workflow (Creator → Approver → Receiver) |
| `InventorySyncService` | Syncing inventory documents with 1C |
| `SystemSettingsService` | Persistent key-value settings store |
| `TelegramService` | Telegram bot + user linking |
| `TenantIntegrationsService` | Per-tenant credentials management (1-min cache) |
| `EncryptionService` | AES-256-GCM for BYOK key encryption |
| `UserService` | Authentication and user lifecycle |
| `ExamAiService` | AI grading for exams (open-ended questions) |
| `CronJitterService` | Randomizes cron schedules to prevent thundering herd |

### Middleware

| Middleware | Purpose |
| --- | --- |
| `tenantResolver` | Extracts subdomain → finds tenant in Master DB → creates scoped Prisma client |
| `auth` | JWT from cookie / Auth header → `req.user` (id, role, employeeId) |
| `checkRole` | Role-based access check (array of allowed roles) |
| `validate` | Validates request body/params/query via Zod schemas |
| `errorHandler` | Centralized error handling (Zod, Prisma, JWT, operational errors) |
| `actionLogger` | User action audit (action + details → ActionLog) |
| `cors` | Cross-Origin Resource Sharing |
| `morgan` | HTTP request logging |
| `cookie-parser` | Cookie parsing |

### Authentication & Authorization

* **Method**: JWT (HS256), lifetime — 12 hours
* **Token Storage**: HTTP-only cookie (prod: `secure` + `sameSite: none`)
* **Fallback**: Header `Authorization: Bearer <token>`
* **Roles** (7 types):

| Role | Description | Full Access |
| --- | --- | --- |
| `DEVELOPER` | Developer | ✅ |
| `DIRECTOR` | Director / Principal | ✅ |
| `DEPUTY` | Deputy Principal | — |
| `ADMIN` | Administrator | — |
| `TEACHER` | Teacher | — |
| `ACCOUNTANT` | Accountant | — |
| `ZAVHOZ` | Facilities Manager | — |

* **DEVELOPER** and **DIRECTOR** have full access to all modules.
* For other roles, access is controlled via `RolePermission` (modules + CRUD flags).

### Multi-tenancy

**Database-per-tenant** architecture with full data isolation:

1. **Subdomain-based routing**: `hogwarts.mirai-edu.space` → `subdomain = 'hogwarts'`
2. **Control Plane (Master DB)**: Stores tenant metadata (`subdomain`, `dbUrl`, `status`)
3. **Tenants**: Each gets a separate PostgreSQL DB
4. **Prisma Client**: Created per-request with a connection to the tenant's DB
5. **AsyncLocalStorage**: Tenant context is available anywhere in the code

```
Tenant "hogwarts" → erp_hogwarts (its own isolated DB)
Tenant "demo"     → erp_demo     (read-only demo)
Tenant "mirai"    → erp_db       (main school)

```

**Tenant Lifecycle:**

* `TRIAL` → `ACTIVE` → `SUSPENDED` → `DEACTIVATED`
* Managed by Stripe subscriptions

### Queues (BullMQ)

| Queue | Purpose | Frequency |
| --- | --- | --- |
| `onec-sync` | Synchronization with 1C via OData | Every 15 mins (configurable) |
| `onec-push` | Processing incoming webhooks from 1C | On event |

* **Retry**: 3 attempts with exponential backoff
* **Auto-cleanup**: Keeps the last 50 completed + 100 failed jobs
* **Isolation**: Jobs are tied to specific tenants

### AI / LLM Integrations

| Provider | Purpose | Model | Free Tier |
| --- | --- | --- | --- |
| **Google Gemini** | Embeddings (768-dim vectors) | `text-embedding-004` | 1,500 req/day |
| **Groq** | AI chat (basic / fast / powerful) | `qwen/qwen3-32b`, `llama-3.1-8b-instant`, `openai/gpt-oss-120b` | 14,400 req/day |
| **OpenAI** | BYOK — custom key (per-tenant) | User's choice | User's account |
| **Google Drive** | Auto-sync of educational materials | — | Google API |

**RAG Pipeline:**

1. Documents → split into chunks
2. Chunks → Gemini `text-embedding-004` → 768-dim vector
3. Vectors → PostgreSQL + pgvector
4. User Query → embedding → cosine similarity search → top-K docs
5. Top-K + query → Groq `qwen3-32b` → response with context

**BYOK (Bring Your Own Key):**

* OpenAI key is AES-256-GCM encrypted before saving
* Only ciphertext + IV + auth tag are stored in the DB
* Plaintext key is **never** saved

### File Uploads

* **Storage**: S3 or Cloudflare R2 (via AWS SDK)
* **Path**: `/{tenantId}/{userId}/{randomToken}_{filename}`
* **Max size**: 50 MB
* **Security**: MIME-type validation, filename sanitization
* **Isolation**: Tenant-scoped paths, owner control

---

## Frontend

### Pages & Routes

#### ERP (30+ routes)

| Path | Component | Roles | Description |
| --- | --- | --- | --- |
| `/dashboard` | DashboardPage | All | Main dashboard with widgets |
| `/children` | ChildrenPage | DIRECTOR, DEPUTY, ADMIN | Student list |
| `/children/:id` | ChildDetailPage | DIRECTOR, DEPUTY, ADMIN | Student profile |
| `/employees` | EmployeesPage | DIRECTOR, DEPUTY, ADMIN | Employee list |
| `/schedule` | SchedulePage | DIRECTOR, DEPUTY, ADMIN, TEACHER | Lesson schedule |
| `/attendance` | AttendancePage | DIRECTOR, DEPUTY, ADMIN, TEACHER | Attendance |
| `/clubs` | ClubsPage | DIRECTOR, DEPUTY, ADMIN, ACCOUNTANT, TEACHER | Extracurricular clubs |
| `/finance` | FinancePage | DIRECTOR, DEPUTY, ADMIN, ACCOUNTANT | Finances |
| `/inventory` | InventoryPage | DIRECTOR, DEPUTY, ADMIN, ZAVHOZ | Inventory |
| `/menu` | MenuPage | DIRECTOR, DEPUTY, ADMIN, ZAVHOZ | Catering menu |
| `/recipes` | RecipesPage | DIRECTOR, DEPUTY, ADMIN, ZAVHOZ | Recipes |
| `/procurement` | ProcurementPage | DIRECTOR, DEPUTY, ADMIN, ACCOUNTANT, ZAVHOZ | Procurement |
| `/maintenance` | MaintenancePage | DIRECTOR, DEPUTY, ADMIN, ZAVHOZ | Maintenance |
| `/security` | SecurityPage | DIRECTOR, DEPUTY, ADMIN, ZAVHOZ | Security |
| `/documents` | DocumentsPage | DIRECTOR, DEPUTY, ADMIN | Documents |
| `/calendar` | CalendarPage | DIRECTOR, DEPUTY, ADMIN, ZAVHOZ | Calendar |
| `/feedback` | FeedbackPage | All | Feedback |
| `/integration` | IntegrationPage | DIRECTOR, DEPUTY, ADMIN, ACCOUNTANT | Import/Export |
| `/onec-data` | OneCDataPage | DIRECTOR, DEPUTY, ADMIN, ACCOUNTANT | 1C Data Viewer |
| `/action-log` | ActionLogPage | DIRECTOR, DEPUTY, ADMIN | Audit log |
| `/notifications` | NotificationsPage | DIRECTOR, DEPUTY, ADMIN | Notifications |
| `/ai-assistant` | AiAssistantPage | DIRECTOR, DEPUTY, ADMIN, TEACHER | AI Assistant |
| `/users` | UsersPage | DIRECTOR, DEPUTY, ADMIN | User management |
| `/groups` | GroupsPage | DIRECTOR, DEPUTY, ADMIN | Groups/Classes |
| `/staffing` | StaffingPage | DIRECTOR | Staffing table |
| `/exams` | ExamsPage | DIRECTOR, DEPUTY, ADMIN, TEACHER | Exams |
| `/exams/:id/edit` | ExamEditorPage | DIRECTOR, DEPUTY, ADMIN, TEACHER | Exam Editor |
| `/exams/:id/results` | ExamResultsPage | DIRECTOR, DEPUTY, ADMIN, TEACHER | Results |
| `/exam/:token` | ExamTakePage | **Public** | Taking an exam |
| `/knowledge-base` | KnowledgeBase | All | Knowledge Base |
| `/knowledge-base/:slug` | KnowledgeBase | All | Article |
| `/auth/login` | LoginPage | Public | Authorization |
| `/` | LandingPage | Public (marketing host) | Marketing landing page |

#### LMS (7 routes)

| Path | Component | Description |
| --- | --- | --- |
| `/school` | LmsSchoolDashboard | School LMS dashboard |
| `/school/classes` | LmsClassesPage | Class management |
| `/school/classes/:classId` | LmsClassesPage | Class details page |
| `/school/gradebook` | LmsGradebookPage | Teacher's gradebook |
| `/school/schedule` | LmsSchedulePage | Lesson schedule |
| `/school/homework` | LmsAssignmentsPage | Homework assignments |
| `/school/attendance` | LmsProgressPage | Attendance |
| `/diary` | LmsDiaryPage | Student/Parent diary |

### Components

#### UI Primitives (`components/ui/`)

Built on Radix UI + CVA (class-variance-authority):

* `Button`, `Input`, `Card`, `Badge`, `Checkbox`
* `Dialog`, `DropdownMenu`, `Popover`, `Sheet`, `Tooltip`
* `Command` (command palette)
* `FormError`, `ErrorBoundary`
* `EmptyState`, `LoadingState`
* `InventoryAutocomplete`

#### Tables (`components/DataTable/`)

* `DataTable` — V1 (basic)
* `DataTableV2` — V2 (recommended, with pagination and sorting)

#### Dashboard (`components/dashboard/` + `components/DashboardWidgets/`)

* `DashboardLayout` — dashboard container
* `WidgetRenderer` — dynamic widget rendering
* `WidgetChrome` — widget wrapper
* `PersonalizationPanel` — widget settings UI
* `FinanceChart` — Recharts diagrams
* `KpiCard` — KPI cards
* Drag & Drop layout via `react-grid-layout`

#### Forms (`components/forms/`)

15+ domain forms:

* `ChildForm`, `EmployeeForm`, `UserForm`
* `TransactionForm`, `SupplierForm`, `PurchaseOrderForm`
* `DocumentForm`, `DocumentTemplateForm`
* `IngredientForm`, `DishForm`
* `MaintenanceForm`, `FeedbackForm`, `FeedbackResponseForm`
* `EventForm`, `BugReportForm`

#### Navigation

* `SideNav` — main ERP sidebar
* `LmsSideNav` — LMS sidebar
* `DemoBanner` — read-only demo mode banner
* `CalendarGrid` — calendar component

#### Easter Egg

* `DoomGame` — game activated via Konami Code (↑↑↓↓←→←→BA)

### State Management

#### AuthContext

* Auth state (`user`, `token`, `isAuthenticated`)
* 12-hour auto-expiry
* HttpOnly cookie + localStorage fallback
* Methods: `hasRole()`, `hasPermission()`

#### TenantContext

* White-label branding (`name`, `logoUrl`, `faviconUrl`, `primaryColor`)
* Dynamic CSS variables (`--primary-color`, `--primary-tint`)
* Document title and favicon update

#### PermissionsContext

* Role permissions (`role`, `isFullAccess`, `modules`, `canCreate/Edit/Delete/Export`)
* Module access check: `hasModuleAccess(modulePath)`

#### DemoContext

* `isDemo` flag for read-only mode
* Write operation blocking

### API Client

Centralized HTTP client (`lib/api.ts`, 400+ lines):

```typescript
class API {
  get<T>(path, params)    // GET with query params
  post<T>(path, data)     // POST
  put<T>(path, data)      // PUT
  patch<T>(path, data)    // PATCH
  delete<T>(path)         // DELETE

  setToken(token)                  // JWT management
  setOnUnauthorized(callback)      // 401 handling
  addRequestInterceptor(fn)        // Request interceptor
  addResponseInterceptor(fn)       // Response interceptor
  addErrorInterceptor(fn)          // Error interceptor
}

```

* Automatic Bearer token injection
* `credentials: 'include'` for cookies
* Typed `ApiRequestError` with `statusCode`, `code`, `details`

**Specialized APIs:**

* `lib/exams-api.ts` — Exams API (public + protected)
* `lib/lms-api.ts` — LMS API (70+ methods)

### Internationalization

* Framework: **i18next** + **react-i18next**
* Browser language auto-detection: `i18next-browser-languagedetector`
* Configured in `src/i18n/`

---

## Database

### Control Plane (Master DB)

File: `backend/prisma/master/schema.prisma`

| Model | Description |
| --- | --- |
| `Tenant` | `id`, `subdomain` (unique), `dbUrl`, `stripeId`, `status`, `name` |
| `GlobalSetting` | Key-value store for platform settings |

**Tenant statuses:** `ACTIVE`, `TRIAL`, `SUSPENDED`, `DEACTIVATED`

### Tenant DB (Schema)

File: `backend/prisma/schema.prisma` — **60+ models**, PostgreSQL 16 with pgvector extension.

#### Users & Authorization

| Model | Description |
| --- | --- |
| `User` | System user (email, role, Employee relation, Telegram) |
| `Employee` | Employee (full name, position, rate, dates) |
| `RolePermission` | Role access rights (modules, CRUD flags) |

#### Students / Contingent

| Model | Description |
| --- | --- |
| `Child` | Child/Student (name, DOB, group, health info, docs) |
| `Parent` | Parent (name, phone, email, workplace) |
| `Group` | Class/Group (name, teacher, capacity) |
| `TemporaryAbsence` | Temporary absence of a student |

#### Clubs / Extracurriculars

| Model | Description |
| --- | --- |
| `Club` | Club (name, teacher, schedule, cost) |
| `ClubEnrollment` | Student club enrollment |
| `Attendance` | Attendance (group / club) |
| `ClubRating` | Student's grade in a club (1-5) |

#### Finances

| Model | Description |
| --- | --- |
| `FinanceTransaction` | Financial transaction (amount, type, category, 1C fields) |
| `Contractor` | Counterparty from 1C |
| `Person` | Individual from 1C |
| `CashFlowArticle` | Cash flow item from 1C |
| `Invoice` | Commodity document (receipt / realization) |
| `BalanceSnapshot` | Aggregated balance (cash desk, bank, counterparty) |

#### Inventory & Procurement

| Model | Description |
| --- | --- |
| `InventoryItem` | Inventory item (quantity, unit, expiration date) |
| `InventoryTransaction` | Item movement (receipt, expense, write-off, adjustment) |
| `PurchaseOrder` | Purchase request with workflow |
| `PurchaseOrderItem` | Order item |
| `Supplier` | Supplier |

#### Catering

| Model | Description |
| --- | --- |
| `Ingredient` | Ingredient (Calories/Macros) |
| `Dish` | Dish |
| `DishIngredient` | Dish-ingredient relation |
| `Menu` | Menu for a date (by age group) |
| `MenuDish` | Menu-dish relation (meal type) |

#### Schedule

| Model | Description |
| --- | --- |
| `Subject` | Academic subject |
| `Room` | Classroom |
| `TimeSlot` | Time slot (bell) |
| `TeacherSubject` | Teacher-subject relation |
| `ScheduleSlot` | Schedule slot (lesson) |

#### Facilities & Security

| Model | Description |
| --- | --- |
| `MaintenanceRequest` | Maintenance request (workflow) |
| `MaintenanceItem` | Request item |
| `CleaningSchedule` | Cleaning schedules |
| `CleaningLog` | Cleaning log |
| `Equipment` | Equipment (next inspection date) |
| `SecurityLog` | Security log |
| `StaffingTable` | Staffing table |
| `EmployeeAttendance` | Employee attendance |

#### Document Management & Communications

| Model | Description |
| --- | --- |
| `DocumentTemplate` | Document template |
| `Document` | Document (linked to employee/student) |
| `Notification` | Notification (by role/group) |
| `Event` | Event / Activity |
| `Feedback` | Feedback (complaints, suggestions) |

#### AI / RAG / Knowledge Base

| Model | Description |
| --- | --- |
| `KnowledgeBaseDocument` | Document for RAG (768-dim embedding) |
| `KnowledgeBaseArticle` | KB article (Markdown + embedding + tags) |
| `SystemSetting` | Persistent key-value store (prompts, flags) |

#### LMS

| Model | Description |
| --- | --- |
| `LmsSchoolStudent` | Student-class relation for LMS |
| `LmsSubject` | LMS school subject |
| `LmsScheduleItem` | LMS schedule item |
| `LmsGrade` | Grade (1-5, types: normal/test/exam/term) |
| `LmsHomework` | Homework assignment |
| `LmsHomeworkSubmission` | Homework submission |
| `LmsStudentAttendance` | Student attendance |
| `LmsClassAnnouncement` | Class announcement |

#### Exams

| Model | Description |
| --- | --- |
| `Exam` | Exam (settings, public token) |
| `ExamQuestion` | Question (6 types: choice, text, problem, true/false) |
| `ExamTargetGroup` | Link to classes |
| `ExamSubmission` | Student attempt |
| `ExamAnswer` | Answer (auto + AI + manual grading) |

#### Personalization

| Model | Description |
| --- | --- |
| `DashboardPreference` | Dashboard settings (layout, widgets, filters, presets) |
| `ActionLog` | User action log |

#### Integrations

| Model | Description |
| --- | --- |
| `TenantIntegrations` | Per-tenant API keys (Telegram, Gemini, Groq, OpenAI, Google Drive, 1C) |
| `OneCPushSyncLog` | Audit log for 1C push sync |

#### 1C: Catalogs

| Model | Description |
| --- | --- |
| `OneCOrganization` | Catalog_Organizations |
| `OneCNomenclature` | Catalog_Nomenclature |
| `OneCBankAccount` | Catalog_BankAccounts |
| `OneCContract` | Catalog_CounterpartyContracts |
| `OneCEmployee` | Catalog_Employees |
| `OneCPosition` | Catalog_Positions |
| `OneCFixedAsset` | Catalog_FixedAssets |
| `OneCWarehouse` | Catalog_Warehouses |
| `OneCCurrency` | Catalog_Currencies |
| `OneCDepartment` | Catalog_OrganizationDepartments |
| `OneCCatalog` | Universal catalog (for all other directories) |

#### 1C: Documents

| Model | Description |
| --- | --- |
| `OneCDocument` | Universal document model (invoices, advances, etc.) |
| `OneCHRDocument` | HR documents (hiring, firing, vacation, sick leave) |
| `OneCPayrollDocument` | Payroll documents (accruals, payslips) |
| `OneCRegister` | 1C registers (accumulation and information) |

---

## 1C Integration

The platform supports two synchronization modes with "1C:Enterprise":

### Pull (OData) — ERP pulls data from 1C

```
1C:Enterprise → OData API → BullMQ queue (onec-sync) → Processing → Tenant DB

```

* Interval: configurable via `oneCCronSchedule` (default `*/15 * * * *`)
* Data: financial docs, catalogs, HR docs, payroll, registers
* Authentication: UTF-8 Basic Auth
* Per-tenant credentials from `TenantIntegrations`

### Push (REST) — 1C pushes data to us

```
1C:Enterprise → POST /api/v1/integration/* → BullMQ queue (onec-push) → Processing → Tenant DB

```

* Authentication: Bearer token (SHA-256 hash stored in DB)
* Acknowledgment of each job via `OneCPushSyncLog`
* Batch dispatch support

### Synchronized Entities

**Catalogs:** Organizations, Nomenclature, Bank accounts, Counterparties, Contracts, Employees, Positions, Fixed Assets, Warehouses, Currencies, Departments, and ~10 more via universal `OneCCatalog`.

**Documents:** Cash Inflow/Outflow Warrants, Bank statements, Goods receipts, Sales, Invoices, Expense reports, Inventories, and ~15 more via universal `OneCDocument`.

**HR:** Hiring, Dismissal, Transfer, Vacation, Sick leave.

**Payroll:** Accrual, Payslips, Deductions.

**Registers:** Accumulation and information registers (work schedules, VAT, etc.).

---

## LMS (Learning Management System)

A separate React application with its own entry point (`lms.html` → `lms.tsx`):

* **Gradebook**: Grades 1-5, types (normal, test, exam, term), comments
* **Homework**: Creation, submission, grading with points and feedback
* **Schedule**: Tied to classes, subjects, teachers, classrooms
* **Attendance**: Statuses (present, absent, late, excused)
* **Announcements**: For the class or entire school, with pinning and expiration dates
* **Diary**: Interface for students/parents

Integrates with the main ERP via shared models (`Group`, `Employee`, `Child`).

---

## Examination Platform

A fully-featured system for conducting exams with AI grading:

### Question Types

| Type | Description | Grading |
| --- | --- | --- |
| `MULTIPLE_CHOICE` | Multiple correct options | Auto |
| `SINGLE_CHOICE` | Single correct option | Auto |
| `TEXT_SHORT` | Short text answer | Auto |
| `TEXT_LONG` | Detailed response | AI + manual |
| `PROBLEM` | Problem solving | AI + manual |
| `TRUE_FALSE` | True/False | Auto |

### Features

* Public link for taking the exam (no auth needed) via a unique token
* Time limits, shuffling questions and options
* AI grading for open-ended answers (Groq) with feedback
* Partial credit scoring
* Manual teacher review overriding AI
* Linking to classes/groups
* Results export

---

## Testing

### Backend (Vitest)

```bash
cd backend
npm test                 # Run tests
npm run test:watch       # Watch mode
npm run test:coverage    # Code coverage
npm run test:ui          # UI dashboard

```

* **Framework**: Vitest 2.1.4
* **Pool**: single fork (stability)
* **Coverage**: 60% threshold
* **Mocks**: Prisma client, environment variables
* **Supertest**: for API E2E testing

### Frontend (Vitest + Cypress)

#### Unit Tests (Vitest)

```bash
cd frontend
npm test                 # Vitest

```

* **Testing Library**: `@testing-library/react`, `jest-dom`
* **Environment**: jsdom

#### E2E Tests (Cypress)

```bash
cd frontend
npm run cypress:open     # Open Cypress UI
npm run cypress:run      # Run in CI mode

```

* **Framework**: Cypress 13.13
* 10+ test scenarios
* Automatic dev server startup (port 5172)

---

## Deployment

### Docker Compose

File: `docker-compose.yml`

| Service | Image | Port | Description |
| --- | --- | --- | --- |
| `postgres` | `pgvector/pgvector:pg16` | (internal) | PostgreSQL 16 + pgvector |
| `redis` | `redis:7-alpine` | (internal) | Redis with AOF persistence |
| `backend` | Custom (multi-stage) | `127.0.0.1:4000` | Express API |
| `frontend` | Custom (multi-stage + Nginx) | `127.0.0.1:3000` | React SPA |

All services are in a single Docker network `erp_network`. Ports are bound to `127.0.0.1` (not exposed externally).

#### Backend Dockerfile (multi-stage)

1. `deps` — node_modules installation (cached layer)
2. `builder` — Prisma generation, TypeScript compilation, prune
3. `runner` — minimal production image

#### Frontend Dockerfile (multi-stage)

1. Dependencies installation
2. Vite build (TypeScript check + production build)
3. Nginx to serve statics + SPA fallback

### Caddy (Reverse Proxy)

File: `Caddyfile`

Caddy acts as the single entry point:

```
http://mirai-edu.space         → /api*, /ws* → backend:4000
                               → /* → frontend:3000

http://*.mirai-edu.space       → /api*, /ws* → backend:4000
                               → /* → frontend:3000

http://api.mirai-edu.space     → all         → backend:4000

```

* Injection of `X-Tenant-Subdomain: mirai` for the root domain
* Gzip/zstd compression
* HTTPS via Cloudflare Tunnel (auto_https off)

### Cloudflare Tunnel

Ensures a secure connection without exposed ports:

```
Internet → Cloudflare Edge → Tunnel → localhost:80 (Caddy)

```

* Wildcard DNS `*.mirai-edu.space` — new tenants work automatically
* Configuration: `cloudflared/config.yml.example`
* Automatic setup via `setup-ubuntu.sh` when `CLOUDFLARE_TUNNEL_TOKEN` is present

### Systemd Services

| File | Type | Description |
| --- | --- | --- |
| `erp-saas-stack.service` | oneshot + RemainAfterExit | Stack launch on system boot |
| `erp-saas-autodeploy.service` | oneshot | Checks and deploys updates from Git |
| `erp-saas-autodeploy.timer` | timer | Polling GitHub every 1 minute |

```bash
# Installation
sudo cp systemd/*.service systemd/*.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable erp-saas-stack.service
sudo systemctl enable --now erp-saas-autodeploy.timer

```

### Auto-deploy

Script `scripts/erp-saas-autodeploy.sh`:

1. `git fetch origin main`
2. Compare `HEAD` with `origin/main`
3. If new commits exist — `git pull`
4. Copy env file, update Caddyfile
5. `docker compose build backend frontend`
6. Apply migrations (master + tenant)
7. `bootstrap:mirai` — update tenant
8. `docker compose up -d backend frontend`

---

## Scripts

### Backend (`npm run ...`)

| Command | Description |
| --- | --- |
| `dev` | Run dev server with auto-restart (`ts-node-dev`) |
| `build` | Compile TypeScript (`tsc`) |
| `start` | Run compiled JS |
| `start:runtime` | Run via tsx (without compilation) |
| `prisma:generate` | Generate Prisma clients (tenant + master) |
| `prisma:migrate:deploy` | Apply migrations |
| `prisma:tenant:deploy` | Apply tenant migrations (with fallback to `db push`) |
| `prisma:master:push` | Push Control Plane schema |
| `bootstrap:mirai` | Create/update mirai tenant + first administrator |
| `test` | Run tests (vitest run) |
| `test:watch` | Watch mode for tests |
| `test:coverage` | Coverage report |
| `test:ui` | Tests UI dashboard |

### Frontend (`npm run ...`)

| Command | Description |
| --- | --- |
| `dev` | Vite dev server (port 5173) |
| `build` | Production build (TypeScript check + Vite) |
| `lint` | ESLint (strict mode, 0 warnings) |
| `test` | Vitest unit tests |
| `preview` | Preview production build |
| `cypress:open` | E2E tests (UI) |
| `cypress:run` | E2E tests (CI) |

### Infrastructure

| Script | Description |
| --- | --- |
| `scripts/setup-ubuntu.sh` | Full Ubuntu installation (Docker, Caddy, cloudflared, everything) |
| `scripts/erp-saas-autodeploy.sh` | Auto-deploy from GitHub |
| `scripts/erp-saas-stack-start.sh` | Start stack (for systemd) |

---

## AI Keys Setup

Detailed instructions: [`backend/AI_KEYS_SETUP.md`](https://www.google.com/search?q=backend/AI_KEYS_SETUP.md)

| Key | Provider | How to obtain | Cost |
| --- | --- | --- | --- |
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/app/apikey) | Create API Key | Free (1,500 req/day) |
| `GROQ_API_KEY` | [Groq Console](https://console.groq.com/keys) | Create API Key | Free (14,400 req/day) |
| `GOOGLE_DRIVE_API_KEY` | [Google Cloud Console](https://console.developers.google.com/) | Credentials → API Key | Free |

---

## DNS and Routing

```
mirai-edu.space         → Cloudflare Tunnel → Caddy → frontend / backend
*.mirai-edu.space       → wildcard DNS → Tunnel catch-all → Caddy → tenant resolution
api.mirai-edu.space     → Tunnel → Caddy → backend (direct)

```

The wildcard DNS record means that new tenants (`hogwarts.mirai-edu.space`, `demo.mirai-edu.space`) begin working **without any manual DNS record additions**.

---

## License

**Author:** Izumi Amano

ISC License
