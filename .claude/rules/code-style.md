# Cashly — Code Style Guide

## General principles

- Prefer clarity over cleverness. Code is read far more often than it is written.
- Every file should have a single, obvious responsibility.
- Fail loudly in development; fail gracefully in production.

---

## TypeScript

- Strict mode is always on (`"strict": true` in `tsconfig.json`). No exceptions.
- Never use `any`. Use `unknown` and narrow with guards, or define a proper type.
- Prefer `interface` for object shapes that describe data (e.g. `Invoice`, `Client`). Use `type` for unions, intersections, and utility types.
- Export types from a co-located `types.ts` or from the module's index file — not scattered inline.
- All async functions must have explicit return types: `Promise<Invoice>`, not inferred.

```ts
// ✅ Good
async function getInvoice(id: string): Promise<Invoice> { ... }

// ❌ Bad
async function getInvoice(id) { ... }
```

---

## Naming conventions

| Thing                 | Convention        | Example               |
| --------------------- | ----------------- | --------------------- |
| Files                 | `kebab-case`      | `invoice-service.ts`  |
| React components      | `PascalCase`      | `InvoiceBuilder.tsx`  |
| Variables / functions | `camelCase`       | `markAsPaid()`        |
| Constants             | `SCREAMING_SNAKE` | `MAX_LINE_ITEMS`      |
| DB table names        | `snake_case`      | `invoice_line_items`  |
| Env vars              | `SCREAMING_SNAKE` | `PAYSTACK_SECRET_KEY` |

---

## Project structure

```
/apps
  /web          # Next.js frontend
  /api          # Express / Fastify backend
/packages
  /db           # Prisma schema, migrations, seed
  /email        # Resend email templates
  /shared       # Shared types, utils, constants
```

- Keep domain logic in `/api/src/services/` — never in route handlers.
- Route handlers are thin: validate input → call service → return response.
- React components live in `/web/src/components/`; page-level logic in `/web/src/app/`.

---

## Frontend (Next.js + React)

- Use the App Router. No Pages Router.
- Prefer Server Components by default. Add `'use client'` only when you need interactivity or browser APIs.
- All form state is handled with **React Hook Form**. Do not manage form fields with `useState`.
- Co-locate component styles, tests, and types in the same folder:

```
/components/InvoiceBuilder/
  InvoiceBuilder.tsx
  InvoiceBuilder.test.tsx
  types.ts
  index.ts       # re-exports the component
```

- Never fetch data in a `useEffect` if a Server Component or a Route Handler can do it instead.

---

## Backend (Node.js + Prisma)

- All database access goes through the **Prisma client** — no raw SQL unless absolutely necessary, and even then, document why.
- Services return domain objects, not raw Prisma results. Map at the boundary.
- Use **Zod** for all request body validation in route handlers. Validate before the service layer sees the data.

```ts
// Route handler pattern
router.post('/invoices', async (req, res) => {
  const body = CreateInvoiceSchema.parse(req.body) // throws on invalid input
  const invoice = await invoiceService.create(body)
  res.status(201).json(invoice)
})
```

- Use `async/await` throughout. No `.then()` chains.
- Every service function that can fail should either throw a typed error or return a `Result` type — never silently return `null`.

---

## Error handling

- Define a small set of typed application errors in `/packages/shared/errors.ts`:
  - `NotFoundError`
  - `ValidationError`
  - `PaymentError`
  - `UnauthorisedError`
- The global Express error handler catches these and maps them to the correct HTTP status codes.
- Never expose raw database errors or stack traces to the client in production.

---

## Imports

- Use absolute imports everywhere. Configure path aliases in `tsconfig.json`:
  - `@cashly/db` → Prisma client and types
  - `@cashly/shared` → shared types and utils
  - `@/` → app-level alias within each app
- No relative imports that go up more than one level (`../../..` is a smell — move the file or create a shared module).

---

## Formatting and linting

- **ESLint** + **Prettier** are enforced in CI. PRs that fail lint do not merge.
- Run `pnpm lint` and `pnpm format` before pushing.
- Prettier config: 2-space indent, single quotes, trailing commas, 100-char line width.
- No `eslint-disable` comments without a code-comment explaining why.

---

## Comments

- Write comments for _why_, not _what_. The code says what; the comment says why.
- All public service functions get a one-line JSDoc describing what they do and any side effects.
- Mark non-obvious behaviour with `// NOTE:` and known debt with `// TODO(username):`.

```ts
// NOTE: Paystack sends the webhook twice on retries — this function must be idempotent.
async function handlePaymentWebhook(payload: PaystackWebhookPayload): Promise<void> { ... }
```
