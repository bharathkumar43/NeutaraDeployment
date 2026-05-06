<<<<<<< HEAD
# Neutara Deployment Management System

Enterprise-grade deployment management platform for managing the complete DevOps deployment workflow between Dev, QA, Infra teams.

---

## Tech Stack

| Layer      | Technology                              |
|------------|-----------------------------------------|
| Frontend   | React 18, TypeScript, Tailwind CSS, Vite |
| Backend    | Node.js, Express, TypeScript            |
| Database   | **Microsoft SQL Server** (T-SQL)        |
| DB Driver  | `mssql` (node-mssql / tedious)          |
| Auth       | JWT (Role-Based Access Control)        |
| State Mgmt | Zustand                                 |
| Forms      | React Hook Form                         |
| HTTP       | Axios                                   |
| Upload     | Multer                                  |
| Logging    | Winston                                 |

---

## Prerequisites

- Node.js 18+
- **Microsoft SQL Server 2017 or later** (Express / Developer / Standard / Enterprise)
- npm or yarn

---

## Quick Start

### 1. Clone & Install

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure Environment

```bash
cd backend
cp .env.example .env
# Edit .env with your SQL Server credentials
```

Key variables to set:

| Variable | Description | Example |
|---|---|---|
| `DB_HOST` | SQL Server hostname or IP | `localhost` or `.\SQLEXPRESS` |
| `DB_PORT` | SQL Server port (default 1433) | `1433` |
| `DB_NAME` | Database name to create | `neutara_deployment` |
| `DB_USER` | SQL login username | `sa` |
| `DB_PASSWORD` | SA or dedicated user password | `YourPass!` |
| `DB_TRUST_CERT` | Trust self-signed cert (local dev) | `true` |
| `DB_ENCRYPT` | Use TLS encryption | `false` for local, `true` for Azure |

### 3. Setup SQL Server Database

**Option A — SQL Server Management Studio (SSMS):**
```sql
CREATE DATABASE neutara_deployment;
```

**Option B — sqlcmd CLI:**
```bash
sqlcmd -S localhost -U sa -P YourPassword! -Q "CREATE DATABASE neutara_deployment"
```

**Option C — SQL Server Express (named instance):**
```bash
sqlcmd -S .\SQLEXPRESS -E -Q "CREATE DATABASE neutara_deployment"
# Then in .env: DB_HOST=.\SQLEXPRESS and DB_USER/DB_PASSWORD as appropriate
```

### 4. Run Migrations (creates all tables + seed data)

```bash
cd backend
npm run migrate
```

### 5. Start Servers

```bash
# Backend (port 5000)
cd backend
npm run dev

# Frontend (port 3000) — new terminal
cd frontend
npm run dev
```

Open **http://localhost:3000**

---

## Default Login Credentials

| Role     | Email                 | Password   |
|----------|-----------------------|------------|
| Admin    | admin@neutara.com     | Admin@123  |
| Dev      | dev@neutara.com       | Admin@123  |
| QA       | qa@neutara.com        | Admin@123  |
| Infra    | infra@neutara.com     | Admin@123  |
| Viewer   | pm@neutara.com        | Admin@123  |

---

## Project Structure

```
Deployment/
├── backend/
│   ├── src/
│   │   ├── controllers/        # Request handlers
│   │   │   ├── auth.controller.ts
│   │   │   ├── deployment.controller.ts
│   │   │   ├── qa.controller.ts
│   │   │   ├── infra.controller.ts
│   │   │   └── acknowledgment.controller.ts
│   │   ├── routes/             # Express routes
│   │   ├── middleware/         # Auth, upload, error handlers
│   │   ├── services/           # Audit, notification services
│   │   ├── database/           # DB connection + schema.sql
│   │   ├── types/              # TypeScript types
│   │   ├── utils/              # JWT, logger
│   │   └── server.ts           # Express app entry point
│   └── uploads/                # Uploaded screenshots
│
└── frontend/
    └── src/
        ├── components/
        │   └── common/         # Reusable UI components
        │       ├── AppLayout.tsx
        │       ├── Sidebar.tsx
        │       ├── Header.tsx
        │       ├── Modal.tsx
        │       ├── StatusBadge.tsx
        │       ├── WorkflowProgress.tsx
        │       ├── AuditTimeline.tsx
        │       └── EmptyState.tsx
        ├── pages/              # Route-level page components
        │   ├── LoginPage.tsx
        │   ├── DashboardPage.tsx
        │   ├── DeploymentListPage.tsx
        │   ├── NewDeploymentPage.tsx
        │   ├── DeploymentDetailPage.tsx
        │   ├── QAApprovalPage.tsx
        │   ├── InfraDeploymentPage.tsx
        │   ├── AcknowledgmentPage.tsx
        │   ├── HistoryPage.tsx
        │   └── UserManagementPage.tsx
        ├── services/           # API service layer
        ├── store/              # Zustand state store
        ├── types/              # TypeScript interfaces
        └── utils/              # Formatters, status configs
```

---

## Workflow

```
Dev creates request
       ↓
[Draft] → Submit to QA
       ↓
[Pending QA Approval]
       ↓
QA: Approve / Reject / Send Back
       ↓ (approved)
[Pending Infra Deployment]
       ↓
Infra: Start → Complete (Success/Failed)
       ↓ (success)
[Pending Dev Acknowledgment]
       ↓
Dev: Acknowledge / Raise Issue
       ↓
[Successfully Completed]
```

---

## API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/v1/auth/login | Login |
| GET | /api/v1/auth/profile | Get profile |
| GET | /api/v1/auth/users | List users |
| POST | /api/v1/auth/users | Create user (admin) |

### Deployments
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/deployments | List all (filtered) |
| POST | /api/v1/deployments | Create request |
| GET | /api/v1/deployments/:id | Get detail with all relations |
| PUT | /api/v1/deployments/:id | Update draft |
| GET | /api/v1/deployments/stats/dashboard | Dashboard stats |
| GET | /api/v1/deployments/meta/jobs | Jobs dropdown |
| GET | /api/v1/deployments/meta/branches | Branches dropdown |

### QA
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/qa/pending | Pending QA reviews |
| POST | /api/v1/qa/deployments/:id/approve | Approve/Reject/Send Back |

### Infra
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/infra/queue | Infra deployment queue |
| POST | /api/v1/infra/deployments/:id/start | Start deployment |
| POST | /api/v1/infra/deployments/:id/complete | Complete (with screenshot) |

### Acknowledgments
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/acknowledgments/pending | Pending acks for user |
| POST | /api/v1/acknowledgments/deployments/:id/acknowledge | Submit acknowledgment |

### Notifications
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/notifications | Get all |
| GET | /api/v1/notifications/unread-count | Unread count |
| PUT | /api/v1/notifications/:id/read | Mark read |
| PUT | /api/v1/notifications/mark-all-read | Mark all read |

---

## Role Permissions Matrix

| Feature              | Dev | QA  | Infra | Admin | Viewer |
|----------------------|-----|-----|-------|-------|--------|
| Create Deployment    | ✅  | ✅  | ❌    | ✅    | ❌     |
| View Own Deployments | ✅  | ✅  | ✅    | ✅    | ✅     |
| View All Deployments | ❌  | ✅  | ✅    | ✅    | ✅     |
| QA Approve/Reject    | ❌  | ✅  | ❌    | ✅    | ❌     |
| Start/Complete Infra | ❌  | ❌  | ✅    | ✅    | ❌     |
| Acknowledge          | ✅  | ❌  | ❌    | ✅    | ❌     |
| User Management      | ❌  | ❌  | ❌    | ✅    | ❌     |
| View Audit Logs      | ✅  | ✅  | ✅    | ✅    | ✅     |

---

## Database Schema

- **users** — Auth accounts with roles
- **deployment_requests** — Core deployment records
- **deployment_qa_approvals** — QA review history
- **deployment_infra_logs** — Infra deployment logs + screenshots
- **deployment_acknowledgments** — Dev acknowledgments
- **audit_logs** — Full audit trail with status transitions
- **notifications** — In-app notifications per user
- **jobs** — Jenkins/CI job dropdown data
- **branches** — Git branch dropdown data

---

## Environment Variables

```env
PORT=5000
NODE_ENV=development

# SQL Server
DB_HOST=localhost
DB_PORT=1433
DB_NAME=neutara_deployment
DB_USER=sa
DB_PASSWORD=YourPassword123!
DB_ENCRYPT=false
DB_TRUST_CERT=true

# JWT
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=24h

# Upload
UPLOAD_DIR=uploads
MAX_FILE_SIZE=10485760

# CORS
FRONTEND_URL=http://localhost:3000
```

---

## SQL Server Compatibility Notes

| Feature | PostgreSQL (old) | SQL Server (T-SQL) |
|---|---|---|
| UUID default | `uuid_generate_v4()` | `NEWID()` |
| Insert + return | `RETURNING *` | `OUTPUT inserted.*` |
| Current timestamp | `NOW()` | `GETDATE()` |
| Boolean type | `BOOLEAN` | `BIT` (0/1) |
| Case-insensitive search | `ILIKE` | `LIKE` (case-insensitive by default) |
| Pagination | `LIMIT x OFFSET y` | `OFFSET y ROWS FETCH NEXT x ROWS ONLY` |
| Top N rows | `LIMIT n` | `SELECT TOP (n)` |
| JSON column | `JSONB` | `NVARCHAR(MAX)` |
| Free-text column | `TEXT` | `NVARCHAR(MAX)` |
=======
# NeutaraDeployment
>>>>>>> 6df90a0ca125df6e883f7c3b5fd67de18a48ffcb
