# ReachInbox — Full-Stack Email Job Scheduler

A production-grade email scheduling service built as part of the Outbox Labs SDE Internship assignment.

---

## 🏗 Architecture Overview

```
Frontend (Next.js :3000)
    │  Google OAuth redirect → backend
    │  JWT stored in localStorage
    │  REST API calls with Authorization: Bearer header
    ▼
Backend (Express :4000)
    │
    ├── Google OAuth (Passport.js) → issues JWT
    ├── POST /api/emails/schedule
    │     ├── Validate input (Zod)
    │     ├── Create EmailCampaign in MySQL
    │     ├── For each recipient[i]:
    │     │     scheduledFor = startTime + i * delayBetweenMs
    │     │     Create EmailJob in MySQL
    │     │     Enqueue BullMQ delayed job (delay = scheduledFor - now)
    │     └── Return campaign summary
    │
    └── GET /api/emails/scheduled|sent (filtered by userId, paginated)

Redis (BullMQ persistence)
    └── Delayed job fires at scheduledFor (survives restarts)
              ▼
         BullMQ Worker (concurrency=5)
              ├── Idempotency: check DB status → skip if already 'sent'
              ├── Rate limit: Redis Lua atomic check (ratelimit:{email}:{hourWindow})
              │     └── If exceeded → re-enqueue to next hour (NOT failed)
              ├── Send via Ethereal SMTP (nodemailer)
              └── Update EmailJob status → 'sent' / 'failed'

MySQL (source of truth)
    └── users → email_campaigns → email_jobs
```

---

## ⚙️ How Scheduling Works

1. User composes email, uploads CSV, sets start time + delay + hourly limit
2. Backend creates one `email_campaigns` row and one `email_jobs` row per recipient
3. Each recipient gets `scheduledFor = startTime + index * delayBetweenMs`
4. BullMQ job is enqueued with `delay = scheduledFor - Date.now()`
5. BullMQ stores jobs in Redis sorted sets — **persists across server restarts**
6. When a job fires, the worker checks DB status (idempotency) then sends the email

---

## 🔄 Persistence on Restart

- BullMQ delayed jobs are stored in Redis sorted sets, **not in memory**
- Restarting the server does **not** re-enqueue jobs — they're already in Redis
- Worker resumes processing automatically on startup
- DB records serve as the source of truth; worker checks status before sending

---

## 🚦 Rate Limiting

- Each job checks a Redis counter keyed by `ratelimit:{senderEmail}:{hourWindow}`
- Lua script atomically checks and increments — **safe across multiple workers**
- If limit is exceeded: job is **re-enqueued** into the next hour window (not dropped or failed)
- Two limits enforced:
  - **UI-provided `hourlyLimit`** (per campaign, set by user)
  - **Server-side max** `MAX_EMAILS_PER_HOUR_PER_SENDER` env var (ceiling)
  - Effective limit = `min(hourlyLimit, MAX_EMAILS_PER_HOUR_PER_SENDER)`

---

## ⚡ Concurrency & Delay

- **Worker concurrency**: `WORKER_CONCURRENCY` env var (default: 5 parallel jobs)
- **Per-email delay**: computed at enqueue time as `startTime + i * delayBetweenMs`
  - Each recipient gets their own independent BullMQ delayed job
  - No global queue limiter needed — delays are pre-calculated per recipient
- **Documented default**: 2 seconds between emails (`delayBetweenMs: 2000`)

---

## 🔁 Idempotency

- Each BullMQ job uses `emailJob.id` as its BullMQ `jobId` — prevents duplicate enqueue
- Worker checks `emailJob.status === 'sent'` before sending — skips if already done
- Safe for worker restarts, retries, and concurrent workers

---

## 🔁 Retry Strategy

- 3 attempts per job, exponential backoff: 5s → 10s → 20s
- After all attempts fail: job is marked `failed` in DB with error message
- Rate-limited jobs are rescheduled (not counted as failed attempts)

---

## 📦 Features Implemented

### Backend
- [x] Express.js + TypeScript server
- [x] BullMQ delayed jobs (no cron jobs)
- [x] Redis persistence across restarts
- [x] MySQL (Prisma) — users, email_campaigns, email_jobs
- [x] Configurable worker concurrency
- [x] Per-recipient delay calculation
- [x] Redis Lua atomic rate limiting (per sender per hour)
- [x] Rate-exceeded jobs rescheduled to next hour
- [x] Idempotency check before each send
- [x] 3-attempt retry with exponential backoff
- [x] Ethereal Email SMTP (static credentials)
- [x] Google OAuth (Passport.js) + JWT
- [x] All endpoints scoped to authenticated user
- [x] Pagination on list endpoints

### Frontend
- [x] Google OAuth login
- [x] User avatar + name + email in sidebar
- [x] Logout
- [x] Scheduled Emails table (loading skeleton + empty state)
- [x] Sent Emails table (loading skeleton + empty state)
- [x] Compose modal with CSV/text upload
- [x] Client-side email parsing (PapaParse + regex)
- [x] Email count preview before submit
- [x] Start time, delay, hourly limit inputs
- [x] Campaign summary before scheduling
- [x] Toast notifications
- [x] Auto-refresh every 15 seconds
- [x] TypeScript types for all API responses
- [x] Pagination on tables

---

## 🛠 Setup Instructions

### Prerequisites
- Node.js 18+
- Docker Desktop (for Redis + MySQL)

### 1. Clone and configure

```bash
git clone <your-repo-url>
cd ReachInbox
```

### 2. Get Ethereal Email credentials (one-time)

```bash
node -e "require('nodemailer').createTestAccount().then(a => console.log(JSON.stringify(a, null, 2)))"
```

Copy `user` → `ETHEREAL_EMAIL` and `pass` → `ETHEREAL_PASS`.

### 3. Set up backend environment

```bash
cd backend
cp .env.example .env
# Edit .env with your values:
# - GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET (from Google Cloud Console)
# - JWT_SECRET (any random string)
# - ETHEREAL_EMAIL / ETHEREAL_PASS (from step 2)
```

### 4. Set up frontend environment

```bash
cd frontend
cp .env.example .env.local
# NEXT_PUBLIC_API_URL=http://localhost:4000 (already set)
```

### 5. Start Redis + MySQL

```bash
# From project root
docker-compose up -d
```

### 6. Install dependencies + migrate DB

```bash
# Backend
cd backend
npm install
npm run db:push   # applies Prisma schema to MySQL

# Frontend
cd ../frontend
npm install
```

### 7. Run backend

```bash
cd backend
npm run dev
# → http://localhost:4000
```

### 8. Run frontend

```bash
cd frontend
npm run dev
# → http://localhost:3000
```

### 9. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 credentials (Web application)
3. Add authorized redirect URI: `http://localhost:4000/api/auth/google/callback`
4. Copy Client ID + Secret to backend `.env`

---

## 📁 Project Structure

```
ReachInbox/
├── backend/
│   ├── prisma/schema.prisma        # DB schema
│   ├── src/
│   │   ├── config/                 # env, redis, mailer, database
│   │   ├── queues/                 # BullMQ queue + worker
│   │   ├── routes/                 # auth, emails
│   │   ├── middleware/             # requireAuth, errorHandler
│   │   ├── services/               # schedulerService, rateLimitService
│   │   └── index.ts
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/                    # Next.js App Router pages
│   │   ├── components/             # UI components
│   │   ├── context/                # AuthContext
│   │   └── lib/                    # types, api client, utils
│   └── package.json
├── docker-compose.yml
└── README.md
```

---

## 🧪 Testing Rate Limiting

```bash
# Set low limit in backend/.env
MAX_EMAILS_PER_HOUR_PER_SENDER=2

# Schedule 5 emails immediately
# First 2 will send this hour, next 3 are rescheduled to next hour
```

## Demo Video Checklist

- [ ] Login with Google → dashboard appears
- [ ] Upload CSV → Compose modal shows email count
- [ ] Schedule campaign → Scheduled tab populates
- [ ] Wait → emails move to Sent tab
- [ ] Stop backend → restart → pending emails still send
- [ ] (Bonus) Set low rate limit → rescheduling behavior shown

---

## Trade-offs & Assumptions

- **Sender = Google user email**: One SMTP sender per logged-in user (sufficient for assignment scope)
- **Static Ethereal credentials**: Required for restart-survival demo (no `createTestAccount()` on startup)
- **Per-recipient BullMQ delay**: Cleaner than global queue limiter; honors per-campaign delay settings
- **JWT in localStorage**: Standard for SPAs; HttpOnly cookie would be better in production
- **Auto-refresh 15s**: Balances real-time feel vs API load; WebSockets would be ideal at scale
