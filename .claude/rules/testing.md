# Cashly — Testing Guide

## Philosophy

- Test behaviour, not implementation. If a test breaks because you renamed a private function, it is the wrong test.
- Every feature that touches money (invoices, payments, webhooks, reminders) must have test coverage before the PR merges.
- Tests are first-class code. They live next to the code they test and are refactored along with it.

---

## Tools

| Layer              | Tool                   | Purpose                                             |
| ------------------ | ---------------------- | --------------------------------------------------- |
| Unit + integration | **Vitest**             | Fast, TypeScript-native, compatible with Jest API   |
| API integration    | **Supertest**          | HTTP-level route testing against a real Express app |
| E2E                | **Playwright**         | Browser automation for critical user flows          |
| DB (tests)         | **Prisma + test DB**   | A separate Postgres database seeded per test suite  |
| Mocking            | **Vitest mocks + MSW** | Mock external APIs (Paystack, Resend, Claude)       |

---

## What to test

### Unit tests — `/src/**/*.test.ts`

Cover pure functions and service logic in isolation. Mock all I/O (database, email, HTTP).

Priority targets:

- `invoiceService.create()` — line item totals, VAT calculation, invoice number generation
- `invoiceService.markAsPaid()` — idempotency (calling twice must not double-credit)
- `cashFlowService.getMonthlySummary()` — correct aggregation of invoice statuses
- `reminderService.getOverdueInvoices()` — correct date boundary logic
- `aiSummaryService.buildPrompt()` — prompt shape given known financial data

```ts
// Example: unit test for invoice total calculation
describe('calculateInvoiceTotal', () => {
  it('applies line item quantities and tax correctly', () => {
    const items = [{ description: 'Shoot', quantity: 1, unitPrice: 200_000 }];
    const result = calculateInvoiceTotal(items, { taxRate: 7.5 });
    expect(result.subtotal).toBe(200_000);
    expect(result.tax).toBe(15_000);
    expect(result.total).toBe(215_000);
  });

  it('applies a percentage discount before tax', () => { ... });
  it('returns zero tax when taxRate is 0', () => { ... });
});
```

### Integration tests — `/src/**/*.integration.test.ts`

Test a full request-response cycle against a real database. Use a seeded test DB, not mocks, for DB calls.

Priority targets:

- `POST /invoices` — creates invoice, persists to DB, returns correct shape
- `GET /invoices/:id` — 404 on unknown ID, 403 on wrong owner
- `POST /webhooks/paystack` — valid signature flips status; invalid signature returns 400
- `POST /invoices/:id/send` — calls Resend (mocked), stores PDF path on invoice record
- `GET /reports/monthly` — returns aggregated totals matching seeded data

```ts
describe('POST /webhooks/paystack', () => {
  it('marks the invoice as paid when the signature is valid', async () => {
    const invoice = await seedInvoice({ status: 'sent' });
    const payload = buildPaystackPayload(invoice.reference);
    const sig = signPayload(payload, process.env.PAYSTACK_SECRET!);

    const res = await request(app)
      .post('/webhooks/paystack')
      .set('x-paystack-signature', sig)
      .send(payload);

    expect(res.status).toBe(200);
    const updated = await db.invoice.findUnique({ where: { id: invoice.id } });
    expect(updated?.status).toBe('paid');
  });

  it('returns 400 and does nothing when the signature is invalid', async () => { ... });
});
```

### E2E tests — `/e2e/**/*.spec.ts`

Cover the two or three flows that, if broken, would make the product unusable. Run against a staging environment in CI on PR merge.

Core flows to cover:

1. **Create and send an invoice** — sign in → create invoice → add line items → send → assert email mock received
2. **Dashboard reflects paid invoice** — seed paid invoice → visit dashboard → assert totals correct
3. **AI summary renders** — stub the Claude API → visit dashboard → assert summary paragraph is visible

```ts
// e2e/invoice-create.spec.ts
test('user can create and send an invoice', async ({ page }) => {
  await page.goto('/login')
  await loginAs(page, testUser)

  await page.click('[data-testid="new-invoice"]')
  await page.fill('[name="client"]', 'Apex Events')
  await page.fill('[name="lineItems.0.description"]', 'Photography')
  await page.fill('[name="lineItems.0.unitPrice"]', '150000')
  await page.click('[data-testid="send-invoice"]')

  await expect(page.getByText('Invoice sent')).toBeVisible()
})
```

---

## Test database

- Tests that hit the database use a dedicated `TEST_DATABASE_URL` Postgres instance.
- Each test suite runs `prisma migrate reset --force` before the suite starts (handled by a global setup file).
- Seed helpers live in `/packages/db/test-helpers/seed.ts`. Use them — do not write raw `prisma.create()` calls in every test file.

```ts
// Seed helpers
export const seedClient = (overrides = {}) =>
  db.client.create({ data: { ...defaultClient, ...overrides } })
export const seedInvoice = (overrides = {}) =>
  db.invoice.create({ data: { ...defaultInvoice, ...overrides } })
```

---

## Mocking external services

Never make real HTTP calls to Paystack, Resend, or the Claude API in tests.

- Use **MSW (Mock Service Worker)** for service-level mocks shared across integration tests.
- Define handlers in `/src/test/mocks/handlers.ts`.
- Use `vi.mock()` for unit-level mocks of individual modules.

```ts
// handlers.ts
export const handlers = [
  http.post('https://api.paystack.co/transaction/verify/:ref', () =>
    HttpResponse.json({ status: true, data: { status: 'success' } }),
  ),
  http.post('https://api.resend.com/emails', () => HttpResponse.json({ id: 'mock-email-id' })),
]
```

---

## Running tests

```bash
# Unit + integration (watch mode)
pnpm test

# Unit + integration (CI mode, no watch)
pnpm test:ci

# E2E (requires staging URL)
pnpm test:e2e

# Coverage report
pnpm test:coverage
```

---

## Coverage targets

| Area                          | Minimum coverage                                     |
| ----------------------------- | ---------------------------------------------------- |
| Service layer (`/services/`)  | 80%                                                  |
| Route handlers (`/routes/`)   | 70%                                                  |
| Utility functions (`/utils/`) | 90%                                                  |
| React components              | Key flows via E2E; unit tests for complex logic only |

Coverage is checked in CI. A PR that drops service coverage below 80% will not merge.

---

## CI behaviour

- Unit and integration tests run on every PR.
- E2E tests run on merge to `main` (against staging).
- If any test fails, the deploy pipeline stops.
- Test output is uploaded as a CI artifact for debugging flaky tests.
