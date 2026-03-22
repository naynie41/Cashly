# Cashly — Claude Code Project Guide

## What this project is

Cashly is a fullstack invoice and cash flow management tool for small business owners and freelancers. It lets users create branded invoices, track payments, send automatic overdue reminders, and get a plain-English AI summary of their monthly cash flow.

This is a portfolio project built with DevOps in mind. The fullstack app is being built first; a full AWS + Terraform + Docker + CI/CD layer will be added after the app is complete. Every code decision should make that future DevOps layer easier, not harder.

---

## Monorepo structure

```
cashly/
├── apps/
│   ├── web/                  # Next.js 14 (App Router) — deployed on Vercel
│   └── api/                  # Fastify + Prisma — deployed on Railway (then AWS ECS)
├── packages/
│   └── types/                # Shared TypeScript types between web and api
├── package.json              # pnpm workspace root
├── pnpm-workspace.yaml
└── CLAUDE.md                 # This file
```

Use `pnpm` workspaces. Run everything from the root. Never use `npm` or `yarn`.

---

## Tech stack

### Frontend — `apps/web`
- **Next.js 14** with App Router (not Pages Router)
- **Tailwind CSS** for styling
- **React Hook Form** for all forms
- **Recharts** for dashboard charts
- **Deployed on Vercel**

### Backend — `apps/api`
- **Fastify** (not Express) with TypeScript
- **Prisma ORM** with PostgreSQL (Supabase)
- **Better Auth** for authentication (email/password + Google OAuth)
- **BullMQ + Redis** for background job queue
- **node-cron** for scheduled jobs (nightly overdue checker)
- **Deployed on Railway** (migrating to AWS ECS in the DevOps phase)

### Integrations
- **Supabase** — hosted PostgreSQL database only. Use Prisma for all queries, never the Supabase JS client for DB access
- **Paystack** — payments (NGN). Payment links per invoice, webhook for `charge.success`
- **Resend + React Email** — transactional emails (invoice delivery, overdue reminders)
- **Puppeteer** — server-side PDF generation for invoices
- **AWS S3** — PDF storage with signed URLs via CloudFront
- **Claude API (Anthropic SDK)** — AI monthly cash flow summary
- **Google OAuth** — social login

### Dev tooling
- **TypeScript** everywhere — no plain JS files
- **Zod** for all runtime validation (API request bodies, env vars)
- **ESLint + Prettier** — enforced on all files
- **pnpm** workspaces

---

## Database schema

Managed by Prisma. Migrations live in `apps/api/prisma/migrations/`.

### Models

```prisma
model User {
  id            String    @id @default(uuid())
  name          String
  email         String    @unique
  passwordHash  String?
  googleId      String?   @unique
  businessName  String?
  logoUrl       String?
  brandColor    String?   @default("#6366f1")
  currency      String    @default("NGN")
  createdAt     DateTime  @default(now())
  clients       Client[]
  invoices      Invoice[]
}

model Client {
  id        String    @id @default(uuid())
  userId    String
  name      String
  email     String
  phone     String?
  address   String?
  createdAt DateTime  @default(now())
  user      User      @relation(fields: [userId], references: [id])
  invoices  Invoice[]
}

model Invoice {
  id            String      @id @default(uuid())
  userId        String
  clientId      String
  invoiceNumber String      @unique
  status        InvoiceStatus @default(DRAFT)
  issueDate     DateTime
  dueDate       DateTime
  subtotal      Decimal     @db.Decimal(12, 2)
  taxRate       Decimal     @db.Decimal(5, 2) @default(0)
  discount      Decimal     @db.Decimal(12, 2) @default(0)
  total         Decimal     @db.Decimal(12, 2)
  pdfUrl        String?
  notes         String?
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
  user          User        @relation(fields: [userId], references: [id])
  client        Client      @relation(fields: [clientId], references: [id])
  lineItems     LineItem[]
  payment       Payment?
}

model LineItem {
  id          String   @id @default(uuid())
  invoiceId   String
  description String
  quantity    Int
  unitPrice   Decimal  @db.Decimal(12, 2)
  amount      Decimal  @db.Decimal(12, 2)
  invoice     Invoice  @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
}

model Payment {
  id           String   @id @default(uuid())
  invoiceId    String   @unique
  paystackRef  String   @unique
  amountPaid   Decimal  @db.Decimal(12, 2)
  currency     String
  paidAt       DateTime
  invoice      Invoice  @relation(fields: [invoiceId], references: [id])
}

enum InvoiceStatus {
  DRAFT
  SENT
  PAID
  OVERDUE
}
```

**Rules:**
- Never mutate the schema without creating a Prisma migration (`prisma migrate dev --name <name>`)
- Always run `prisma generate` after schema changes
- `Payment` is a separate table — not a field on `Invoice` — because Paystack sends a reference that must be stored and verified independently

---

## API structure — `apps/api`

### Route layout

```
apps/api/src/
├── index.ts                  # Fastify server bootstrap
├── plugins/
│   ├── prisma.ts             # Prisma client plugin
│   ├── auth.ts               # Better Auth plugin
│   ├── redis.ts              # Redis + BullMQ plugin
│   └── env.ts                # Zod-validated env vars
├── routes/
│   ├── auth/                 # POST /auth/signup, /auth/login, /auth/google
│   ├── clients/              # CRUD /clients
│   ├── invoices/             # CRUD /invoices + send + duplicate
│   ├── payments/             # POST /payments/webhook (Paystack)
│   └── dashboard/            # GET /dashboard/summary, /dashboard/ai-summary
├── workers/
│   ├── emailWorker.ts        # BullMQ worker — processes email jobs
│   └── overdueWorker.ts      # node-cron — nightly overdue checker
├── services/
│   ├── pdf.ts                # Puppeteer PDF generation
│   ├── email.ts              # Resend email sending
│   ├── storage.ts            # S3 upload + signed URL
│   ├── paystack.ts           # Paystack API calls
│   └── ai.ts                 # Claude API — monthly summary
└── lib/
    ├── invoiceNumber.ts      # Auto-generate invoice numbers (INV-0001)
    └── errors.ts             # Typed API errors
```

### Fastify conventions
- All routes are Fastify plugins registered with `fastify-plugin`
- Every route handler has a Zod schema for request body and params — use `fastify-type-provider-zod`
- Authentication middleware checks JWT on every protected route
- Errors must use Fastify's `reply.code(n).send({ error: '...' })` pattern — never throw raw errors
- Structured logging via Fastify's built-in Pino logger — use `request.log.info(...)` not `console.log`

### Environment variables — `apps/api/.env`

```env
DATABASE_URL=             # Supabase pooled connection string
DIRECT_URL=               # Supabase direct connection (for migrations)
REDIS_URL=                # Redis connection string
JWT_SECRET=               # Random 32+ char string
BETTER_AUTH_SECRET=       # Better Auth secret

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

PAYSTACK_SECRET_KEY=
PAYSTACK_WEBHOOK_SECRET=

RESEND_API_KEY=
EMAIL_FROM=               # e.g. invoices@cashly.app

AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
S3_BUCKET_NAME=
CLOUDFRONT_DOMAIN=

ANTHROPIC_API_KEY=

FRONTEND_URL=             # e.g. http://localhost:3000
```

Validate all env vars at startup using Zod inside `plugins/env.ts`. If any required var is missing, the server must crash immediately with a clear error — never silently use undefined values.

---

## Frontend structure — `apps/web`

### Route layout (Next.js App Router)

```
apps/web/src/app/
├── (auth)/
│   ├── login/page.tsx
│   └── signup/page.tsx
├── (dashboard)/
│   ├── layout.tsx            # Sidebar + nav shell
│   ├── page.tsx              # Dashboard home — summary + AI paragraph
│   ├── clients/
│   │   ├── page.tsx          # Client list
│   │   └── [id]/page.tsx     # Client detail
│   └── invoices/
│       ├── page.tsx          # Invoice list
│       ├── new/page.tsx      # Invoice builder
│       └── [id]/page.tsx     # Invoice detail + PDF preview
├── layout.tsx                # Root layout
└── globals.css
```

### Frontend conventions
- All data fetching in Server Components where possible; use Client Components only when interactivity is needed
- API calls go through a typed fetch wrapper in `lib/api.ts` — never call `fetch` directly in components
- React Hook Form for every form — no uncontrolled inputs
- Zod for client-side form validation schemas — reuse types from `packages/types` where possible
- Never store sensitive data in `localStorage` — auth tokens are handled by Better Auth via httpOnly cookies
- Use Tailwind utility classes only — no custom CSS except in `globals.css`
- Loading states on every async action — no bare `onClick` without feedback

### Environment variables — `apps/web/.env.local`

```env
NEXT_PUBLIC_API_URL=      # e.g. http://localhost:3001
NEXT_PUBLIC_APP_URL=      # e.g. http://localhost:3000
BETTER_AUTH_URL=          # Same as API URL
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

---

## Build phases

Build in this exact order. Do not skip ahead.

### Phase 1 — Foundation (current)
- [x] Monorepo scaffold with pnpm workspaces
- [ ] Prisma schema + Supabase connection
- [ ] Fastify bootstrap with plugins (prisma, auth, env, cors)
- [ ] Better Auth — email/password + Google OAuth
- [ ] Login + signup pages (Next.js)
- [ ] Protected route middleware
- **Done when:** A user can sign up, log in with Google, and hit a protected API route that returns their profile

### Phase 2 — Clients + invoice builder
- [ ] Client CRUD (API + UI)
- [ ] Invoice form with line items, tax, discount, live total calculation
- [ ] Invoice list with status badges
- [ ] Invoice detail page
- [ ] Auto-generated invoice numbers (INV-0001 format)
- **Done when:** A user can create a client, build an invoice, and see it in the list

### Phase 3 — PDF + email delivery
- [ ] Puppeteer PDF generation (branded with user logo + color)
- [ ] S3 upload + CloudFront signed URL
- [ ] Resend email — send invoice to client with PDF attached and Pay Now button
- [ ] React Email template for invoice email
- **Done when:** Clicking "Send invoice" delivers a real email with a PDF

### Phase 4 — Paystack + webhooks + reminders
- [ ] Paystack payment link per invoice
- [ ] Webhook endpoint (`POST /payments/webhook`) — verify signature, mark invoice paid
- [ ] BullMQ email queue for reliable delivery
- [ ] node-cron nightly job — find overdue invoices, enqueue reminder emails
- [ ] React Email template for reminder email
- **Done when:** A test payment flips the invoice to PAID automatically; overdue invoices trigger reminder emails

### Phase 5 — Dashboard + charts
- [ ] Summary cards: total invoiced, received, outstanding, overdue
- [ ] Monthly bar chart (Recharts) — income vs outstanding last 6 months
- [ ] Client breakdown table — who owes what
- [ ] Revenue trend line
- **Done when:** The dashboard gives a full financial picture at a glance

### Phase 6 — AI monthly summary
- [ ] Pull current month invoice data
- [ ] Build structured prompt with real numbers
- [ ] Call Claude API (`claude-sonnet-4-20250514`)
- [ ] Render plain-English paragraph on dashboard
- [ ] Cache summary per user per month (Redis) — don't re-call on every page load
- **Done when:** The dashboard shows a paragraph like "You invoiced ₦420k this month..."

---

## Key business logic rules

### Invoice numbers
- Format: `INV-0001`, `INV-0002`, etc. — scoped per user
- Generated server-side, never client-side
- Find the user's highest existing invoice number, increment by 1, zero-pad to 4 digits

### Invoice status transitions
```
DRAFT → SENT       (when user clicks "Send invoice")
SENT  → PAID       (when Paystack webhook fires charge.success)
SENT  → OVERDUE    (when nightly cron finds dueDate < today and status = SENT)
PAID  → (terminal) (never change a paid invoice's status)
```

### Invoice total calculation
```
subtotal = sum of (lineItem.quantity × lineItem.unitPrice)
taxAmount = subtotal × (taxRate / 100)
total = subtotal + taxAmount - discount
```
This calculation must happen server-side before saving. Never trust the client-sent total.

### Paystack webhook verification
Always verify the `x-paystack-signature` header using HMAC-SHA512 with `PAYSTACK_WEBHOOK_SECRET` before processing any webhook. Reject unverified requests with 401. This is a security requirement, not optional.

### PDF generation
- Render an HTML invoice template server-side
- Puppeteer screenshots it as PDF
- Upload to S3 with key: `invoices/{userId}/{invoiceId}.pdf`
- Store the CloudFront signed URL in `Invoice.pdfUrl`
- Signed URLs expire in 7 days — regenerate on demand if expired

### AI summary prompt structure
```
You are a financial assistant for a small business owner.
Given the following invoice data for [Month Year], write a 2-3 sentence 
plain-English summary of their cash flow. Be specific with numbers. 
Mention the biggest overdue client by name if one exists.
Be direct and friendly — no jargon.

Data:
- Total invoiced: ₦{amount}
- Total received: ₦{amount}
- Outstanding: ₦{amount}
- Overdue invoices: {count} totalling ₦{amount}
- Biggest overdue client: {name} — ₦{amount}, {days} days overdue
- Number of invoices sent: {count}
- Number of invoices paid: {count}
```

---

## Code quality rules

- **TypeScript strict mode** — `"strict": true` in all `tsconfig.json` files. No `any` types.
- **No `console.log`** in API code — use `request.log.info/warn/error` (Pino)
- **No raw `fetch`** on the frontend — always go through `lib/api.ts`
- **No hardcoded secrets** — every secret comes from env vars validated at startup
- **Zod on every API boundary** — request body, query params, and env vars
- **Prisma transactions** for operations that touch multiple tables (e.g. creating an invoice + its line items)
- **Idempotent webhook handler** — if Paystack sends the same event twice, the second call must be a no-op. Check if `Payment.paystackRef` already exists before processing.
- **Error boundaries** on all Next.js pages — never let an unhandled error show a blank screen

---

## DevOps notes (for later — do not implement now)

These decisions are made now so the code is ready when the DevOps phase starts:

- **Structured JSON logs** — Fastify + Pino already outputs JSON. CloudWatch will ingest these directly.
- **Health check endpoint** — `GET /health` must return `{ status: 'ok' }` with 200. ECS needs this for its target group health check.
- **Graceful shutdown** — Fastify's `fastify.close()` on `SIGTERM`. ECS sends SIGTERM before killing a container.
- **No local file storage** — PDFs go to S3, never written to the local filesystem. Containers are ephemeral.
- **Stateless API** — no in-memory session state. All state lives in Postgres or Redis.
- **Port from env** — `PORT=3001` from environment variable, never hardcoded. ECS maps container ports dynamically.
- **Docker-ready** — no `devDependencies` imported in production code. Keep `dependencies` vs `devDependencies` clean.

---

## Running locally

```bash
# Install dependencies
pnpm install

# Start Supabase (or use cloud Supabase project)
# Set DATABASE_URL in apps/api/.env

# Run database migrations
cd apps/api && pnpm prisma migrate dev

# Start API (port 3001)
pnpm --filter api dev

# Start web (port 3000)
pnpm --filter web dev

# Start both simultaneously from root
pnpm dev
```

### Local Redis
```bash
docker run -d -p 6379:6379 redis:alpine
```

Redis is required for BullMQ. Run it in Docker locally even during the fullstack phase.

---

## Common commands

```bash
# Add a package to a workspace
pnpm --filter api add <package>
pnpm --filter web add <package>

# Run Prisma commands
pnpm --filter api exec prisma migrate dev --name <migration-name>
pnpm --filter api exec prisma studio

# Type check everything
pnpm typecheck

# Lint everything
pnpm lint

# Build everything
pnpm build
```

---

## Debugging and error iteration

When an error occurs during development, do not give up after one attempt and do not work around the error. Debug it systematically until it is resolved. The rules below apply to every error encountered.

### The debugging loop

Follow this loop every time something breaks. Do not skip steps.

```
1. READ the full error message — not just the first line
2. IDENTIFY the error category (see below)
3. FORM a hypothesis about the root cause
4. MAKE one targeted change to test the hypothesis
5. RUN the code / command again
6. If still failing → go back to step 1 with the new output
7. Repeat until fixed — there is no maximum iteration count
```

Never make multiple unrelated changes at once. Change one thing, observe the result, then decide the next step. Scattergun fixes hide the real cause and create new bugs.

### Error categories and first actions

**TypeScript type errors**
- Read the exact line and type mismatch reported
- Check if the type comes from Prisma generated types — run `prisma generate` if schema changed recently
- Check if a Zod schema's inferred type doesn't match what the function expects
- Never cast to `any` to silence a type error — fix the underlying mismatch
- If a type is genuinely unknown, use `unknown` and narrow it properly

**Prisma / database errors**
- `P2002` (unique constraint) — something already exists with that value; check for duplicate invoice numbers, emails, or paystackRef
- `P2025` (record not found) — the ID doesn't exist or belongs to a different user; check the `where` clause includes `userId`
- `P2003` (foreign key constraint) — parent record doesn't exist; check creation order
- `P1001` (can't reach database) — check `DATABASE_URL` in `.env`, check Supabase project is active
- Migration conflicts — run `prisma migrate reset` in dev only, never in production
- After any schema change: always run `prisma generate` then restart the API

**Fastify / API errors**
- `FST_ERR_VALIDATION` — the request body failed Zod schema validation; log `request.body` to see what arrived vs what was expected
- Route not found (404) — check the plugin is registered in `index.ts` and the prefix matches
- `reply already sent` — a route handler is calling `reply.send()` more than once; check for missing `return` statements
- CORS errors from the frontend — check `FRONTEND_URL` env var and the `@fastify/cors` origin config
- Plugin not decorated — a plugin depends on another plugin that isn't registered first; check registration order in `index.ts`

**Next.js / frontend errors**
- Hydration mismatch — a Server Component is rendering something that differs between server and client (e.g. `Date.now()`, `Math.random()`, or reading `localStorage`); move to a Client Component with `useEffect`
- `useRouter` / `useSearchParams` outside Client Component — add `'use client'` directive at top of file
- API fetch returning HTML instead of JSON — the API URL is wrong or the API server isn't running; check `NEXT_PUBLIC_API_URL`
- Module not found — check the import path, check the package is installed in the correct workspace (`pnpm --filter web add <pkg>`)
- Build errors that don't appear in dev — run `pnpm --filter web build` locally before assuming it works

**Authentication / Better Auth errors**
- Session not found — the httpOnly cookie isn't being sent; check `credentials: 'include'` on fetch calls and CORS `credentials: true`
- Google OAuth redirect mismatch — the redirect URI in Google Cloud Console must exactly match what Better Auth is configured with
- JWT invalid — `JWT_SECRET` mismatch between where the token was signed and where it's being verified; ensure both API and web use the same secret

**BullMQ / Redis errors**
- `ECONNREFUSED` on Redis — Redis isn't running locally; start it with `docker run -d -p 6379:6379 redis:alpine`
- Jobs stuck in waiting — the worker process isn't running; start it separately or check it's registered at startup
- Job failing silently — add a `worker.on('failed', (job, err) => ...)` listener and log the error

**Paystack webhook errors**
- Signature verification failing — log both the computed HMAC and the received header to compare; check `PAYSTACK_WEBHOOK_SECRET` matches the Paystack dashboard
- Webhook not reaching local dev — use the Paystack CLI or ngrok to tunnel; never skip verification to "test faster"
- Duplicate payment processed — check the idempotency guard (`Payment.paystackRef` unique check) is in place before any DB write

**S3 / AWS errors**
- `AccessDenied` — IAM credentials don't have the right permissions; check the bucket policy and IAM role
- `NoSuchBucket` — `S3_BUCKET_NAME` env var is wrong or the bucket doesn't exist in the specified region
- Signed URL expired — default expiry is 7 days; regenerate on demand if `Invoice.pdfUrl` is older than that

**Environment variable errors**
- Any `undefined` value that should come from env — the Zod env validation in `plugins/env.ts` should have caught this at startup; if it didn't, the var is missing from `.env` or isn't in the Zod schema
- Works locally but fails on Railway/Vercel — env vars aren't set in the platform dashboard; set them there explicitly, they are never committed to the repo

### What to do when stuck after 3+ iterations

If the same error persists after three focused attempts:

1. **Log everything at the failure point** — add temporary `request.log.info(...)` or `console.log(...)` statements around the failing code to inspect actual values, not assumed ones
2. **Isolate the problem** — write the smallest possible reproduction: a single function call, a single API request, a single query
3. **Check the library's own docs / changelog** — the error may be a known breaking change in a recent version (especially Prisma, Better Auth, BullMQ)
4. **Check types bottom-up** — start from the database result, trace the type through every transformation until you find where it breaks
5. **Revert the last change** — if the error appeared after a specific change, revert it completely and approach differently
6. **Never comment out the failing code and move on** — a skipped error is a bug that will surface later in a harder-to-debug context

### Logging during debugging

In the API, temporarily increase log verbosity:

```typescript
// Temporary debug — remove before committing
request.log.info({ body: request.body, user: request.user }, 'debug checkpoint')
```

In Next.js, use the browser console and Network tab. Check the actual request payload and response body — not just the status code.

Remove all temporary debug logs before committing. If a log is useful enough to keep permanently, use the correct log level (`info`, `warn`, `error`) and keep it in the codebase properly.

### Errors that must never be silenced

These patterns are forbidden — they hide bugs instead of fixing them:

```typescript
// NEVER do this
try { ... } catch (e) {}                          // swallowed error
try { ... } catch (e) { return null }             // silent failure
const result = value as any                        // type escape hatch
// @ts-ignore                                      // ignored type error
// @ts-expect-error                                // ignored type error (unless genuinely needed with comment)
if (error) console.log(error)                     // logged but not handled
```

Every `catch` block must either re-throw, return a typed error response, or log with `request.log.error` and handle the fallback explicitly.

---

## What to avoid

- **Do not use the Supabase JS client for database queries** — Prisma only. Supabase is just the hosted Postgres.
- **Do not use the Pages Router** — App Router only in Next.js.
- **Do not use `any` in TypeScript** — if you don't know the type, derive it from Prisma's generated types or Zod's infer.
- **Do not write raw SQL** — Prisma ORM only. Exception: complex analytics queries that Prisma can't express cleanly.
- **Do not skip Zod validation** on any API route that accepts user input.
- **Do not store PDFs locally** — always S3.
- **Do not use `console.log`** in production API code.
- **Do not implement the DevOps layer yet** — that comes after the fullstack app is fully working.