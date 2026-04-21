# ReachInbox — Email Job Scheduler

A full-stack email scheduling system built for the Outbox Labs SDE Internship assignment.

The idea is simple: you upload a list of email recipients, set a start time and some scheduling rules, and the system handles the rest — even if the server goes down and comes back up.

---

## 🔗 Live Links

| | Link |
|---|---|
| 🌐 **Live App** | [https://reach-inbox-assignment-ten.vercel.app](https://reach-inbox-assignment-ten.vercel.app) |
| 🎬 **Demo Video** | [https://www.loom.com/share/53470bc23e144e4ca1bb500ffecb0365](https://www.loom.com/share/53470bc23e144e4ca1bb500ffecb0365) |
| ⚙️ **Backend API** | [https://reachinbox-assignment-production-ad48.up.railway.app](https://reachinbox-assignment-production-ad48.up.railway.app) |

---

## What I built

At its core, this is a **persistent job queue** for email delivery. Not a simple "send email on button click" — but an actual scheduling engine where:

- Each recipient gets their own delayed job in BullMQ
- Jobs survive server restarts because they live in Redis, not memory
- A configurable hourly rate limit is enforced atomically (using a Redis Lua script so it works even with multiple concurrent workers)
- If the rate limit is exceeded, emails are rescheduled to the next hour automatically — they don't fail
- The frontend gives you a live dashboard showing what's scheduled, what's been sent, and what failed

I also added Google OAuth for login because a multi-user system needs some form of identity — each user only sees their own campaigns.

---

## Tech choices and why

**Backend: Node.js + Express + TypeScript**  
TypeScript saved me from a lot of silly bugs. The added compile-time safety is worth the setup cost, especially for something with this many moving parts.

**BullMQ + Redis**  
The assignment explicitly said "no cron jobs." BullMQ stores delayed jobs in Redis sorted sets — so if you restart the server, jobs are still sitting there waiting, and the worker picks them back up automatically.

**MySQL + Prisma**  
I needed a relational database because campaigns and email jobs have a real relationship. Prisma gave me type-safe queries without having to write raw SQL everywhere.

**Nodemailer + Ethereal**  
Ethereal is a fake SMTP service that lets you "send" emails and preview them in a real inbox. No actual emails go out, which is ideal for a demo. I used static credentials (not `createTestAccount()` on startup) so the Ethereal inbox stays consistent across server restarts.

**Next.js + Tailwind CSS**  
Tailwind made it fast to build a clean UI without writing a ton of custom CSS. Next.js App Router handled routing cleanly.

**PapaParse**  
Client-side CSV parsing. The user uploads a CSV, we extract the email column in the browser, show a preview, and only send the data to the backend when they click Schedule.

---

## How scheduling works

When you hit "Schedule":

1. The backend creates one `email_campaigns` row in MySQL
2. For each recipient, it creates one `email_jobs` row
3. For each job, it calculates: `scheduledFor = startTime + (index × delayBetweenMs)`
4. A BullMQ delayed job is enqueued with `delay = scheduledFor - Date.now()`
5. BullMQ stores everything in Redis

When the timer fires, the worker:
1. Checks if the job was already sent (idempotency — won't send twice)
2. Checks the rate limit via Redis Lua script
3. Sends the email if allowed, or reschedules to next hour if rate-limited
4. Updates the DB status to `sent` or `failed`

---

## Surviving server restarts

This was the trickiest part to get right. The key insight is that BullMQ's delayed jobs live in Redis, not in application memory. So restarting the Node.js process doesn't wipe any pending jobs.

When the server restarts:
- The worker reconnects to Redis
- Pending jobs are still in the queue with their original timestamps
- Everything processes normally

I also made sure each BullMQ job uses the `emailJob.id` from MySQL as its job ID. That way, even if a job somehow gets enqueued twice, BullMQ deduplicates it.

---

## Rate limiting

Each sender gets a counter in Redis keyed by `ratelimit:{email}:{hourWindow}`.

I used a Lua script to check and increment atomically:

```lua
local current = tonumber(redis.call('GET', key) or '0')
if current >= limit then
  return 0  -- denied
end
redis.call('INCR', key)
redis.call('EXPIREAT', key, expireAt)
return 1  -- allowed
```

This matters because without atomicity, two workers running in parallel could both read the same count, both decide "we're under the limit," and both send — exceeding the limit. The Lua script prevents that.

The effective limit is always `min(user-set limit, MAX_EMAILS_PER_HOUR_PER_SENDER)` from env.

---

## Project structure

```
ReachInbox/
├── backend/
│   ├── prisma/schema.prisma        ← 3 tables: users, email_campaigns, email_jobs
│   ├── src/
│   │   ├── config/                 ← env validation, Redis, Prisma, Nodemailer
│   │   ├── queues/                 ← BullMQ queue definition + worker
│   │   ├── services/               ← scheduling logic + rate limiter
│   │   ├── routes/                 ← auth (Google OAuth) + emails (schedule/list)
│   │   ├── middleware/             ← JWT auth guard + error handler
│   │   └── index.ts                ← Express app entry point
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── app/                    ← Login, Dashboard, /auth/callback pages
│   │   ├── components/             ← Sidebar, ComposeModal, tables, skeletons
│   │   ├── context/                ← AuthContext (JWT management)
│   │   └── lib/                    ← API client, TypeScript types, utils
│   └── package.json
│
├── docker-compose.yml              ← MySQL 8 + Redis 7
└── README.md
```

---

## Running it locally

**Prerequisites:** Node.js 18+, Docker Desktop

**1. Start infrastructure**
```bash
docker-compose up -d
```

**2. Set up backend**
```bash
cd backend
cp .env.example .env
# Fill in GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and Ethereal credentials
# Everything else (DB URL, Redis URL, JWT secret) is already set in .env.example
npm install
npm run db:push
npm run dev
```

**3. Get Ethereal credentials** (one-time setup)
```bash
node -e "require('nodemailer').createTestAccount().then(a => console.log(a.user, a.pass))"
```
Copy the output into `ETHEREAL_EMAIL` and `ETHEREAL_PASS` in `.env`.

**4. Set up frontend**
```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

**5. Google OAuth**
- Go to [Google Cloud Console](https://console.cloud.google.com) → Create OAuth 2.0 credentials
- Add redirect URI: `http://localhost:4000/api/auth/google/callback`
- Copy client ID + secret into `backend/.env`

Now open `http://localhost:3000`.

---

## API overview

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/auth/google` | Start Google OAuth flow |
| GET | `/api/auth/google/callback` | OAuth callback → issues JWT |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/emails/schedule` | Create campaign + enqueue jobs |
| GET | `/api/emails/scheduled` | List pending jobs (paginated) |
| GET | `/api/emails/sent` | List sent/failed jobs (paginated) |
| GET | `/api/emails/counts` | Counts for sidebar badges |
| GET | `/api/health` | Health check |

---

## Testing the key behaviors

**Restart survival:**
1. Schedule a campaign 5 minutes from now
2. Stop the backend (`Ctrl+C`)
3. Restart it (`npm run dev`)
4. Emails still send at the scheduled time

**Rate limiting:**
1. Set `MAX_EMAILS_PER_HOUR_PER_SENDER=2` in `.env`
2. Schedule 5 emails immediately
3. First 2 send, remaining 3 get rescheduled to next hour

**Viewing sent emails:**
Go to [ethereal.email](https://ethereal.email) and log in with your Ethereal credentials.

---

## Decisions I made and why

**Static Ethereal credentials instead of `createTestAccount()`**  
If you generate a new Ethereal account every time the server starts, your preview inbox changes. Emails sent before a restart would go to a different inbox than ones sent after. Static credentials keep everything in one place.

**Per-recipient BullMQ jobs instead of one loop per campaign**  
If I had one job per campaign that loops through all recipients, a single SMTP failure would block the whole campaign. With individual jobs, each recipient can retry independently without affecting others.

**JWT in localStorage**  
Standard approach for SPAs. An HttpOnly cookie would be slightly more secure in production, but for this assignment scope, localStorage + Bearer token is the right call.

**15-second polling instead of WebSockets**  
Simple and reliable for a demo. WebSockets would be better at scale, but overkill here.
