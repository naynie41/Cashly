# Cashly — Security Guide

## Principles

- Cashly handles real money and real financial data. Security is not optional and is never cut for speed.
- Apply the principle of least privilege at every layer: users, IAM roles, database credentials, and API keys.
- Assume breach. Log enough to reconstruct what happened. Never log enough to expose what happened.

---

## Authentication

### Session and token management

- Auth is handled via **JWT access tokens** (short-lived, 15 minutes) and **HTTP-only refresh tokens** (7 days).
- Refresh tokens are stored as `HttpOnly; Secure; SameSite=Strict` cookies — never in `localStorage`.
- Access tokens are stored in memory only (React context / Zustand). Never written to `localStorage` or `sessionStorage`.
- On logout, the refresh token is revoked server-side (stored in a `revoked_tokens` table checked on every refresh).

### OAuth (Google)

- Use the **Authorization Code Flow** with PKCE. Never the Implicit Flow.
- Validate the `state` parameter on every OAuth callback to prevent CSRF.
- On first OAuth login, link the account by email only if the email is verified by the provider.

### Password auth

- Passwords are hashed with **bcrypt**, minimum cost factor 12.
- Enforce a minimum password length of 10 characters. No maximum — long passphrases are valid.
- Implement rate limiting on `POST /auth/login`: max 10 attempts per IP per 15 minutes using Redis.
- Account lockout after 10 failed attempts in a 1-hour window. Send an unlock email.

---

## Authorisation

- Every protected route checks that the authenticated user owns the resource being accessed.
- There is no admin backdoor in the codebase. Privileged DB operations (migrations, seed resets) are handled via separate tooling, not API endpoints.
- Invoice ownership is always validated at the service layer, not just the route handler:

```ts
async function getInvoice(invoiceId: string, requestingUserId: string): Promise<Invoice> {
  const invoice = await db.invoice.findUnique({ where: { id: invoiceId } })
  if (!invoice) throw new NotFoundError('Invoice not found')
  if (invoice.userId !== requestingUserId) throw new UnauthorisedError()
  return invoice
}
```

- Never use the invoice `id` alone as proof of access. Always check ownership.

---

## Webhook security (Paystack / Stripe)

- All incoming webhooks are verified using the provider's HMAC signature before any processing occurs.
- Signature verification happens in middleware **before** the handler runs — not inside the handler.
- Webhook handlers are **idempotent**: processing the same event twice produces the same result. Use the payment `reference` as a unique key and check for existing records before updating.
- Respond with `200 OK` quickly; offload processing to a BullMQ job to avoid timeouts.

```ts
// Paystack webhook middleware
function verifyPaystackSignature(req: Request, res: Response, next: NextFunction) {
  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
    .update(JSON.stringify(req.body))
    .digest('hex')

  if (hash !== req.headers['x-paystack-signature']) {
    return res.status(400).json({ error: 'Invalid signature' })
  }
  next()
}
```

---

## PDF and file storage

- PDFs are stored in a **private S3 bucket**. The bucket has no public access policy.
- Files are served via **CloudFront signed URLs** with a short expiry (15 minutes).
- Signed URLs are generated on-demand when a user requests access — they are never stored in the database.
- S3 object keys use the authenticated user's ID as a prefix: `invoices/{userId}/{invoiceId}.pdf`. This means even a guessed key is useless without a valid signed URL.

---

## Input validation and injection prevention

- All external input (request bodies, query params, route params) is validated with **Zod** before reaching the service layer.
- Prisma's parameterised queries are used exclusively. No string interpolation into queries.
- File uploads are not accepted anywhere in the app. Logo uploads (if added) must go through a strict type allowlist (`image/png`, `image/jpeg` only) and be scanned for malicious content before storage.
- All HTML rendered in emails is escaped. Use Resend's templating — no raw `innerHTML` injection.

---

## API rate limiting

Apply rate limits at the gateway level (or Express middleware) using Redis:

| Endpoint                       | Limit                             |
| ------------------------------ | --------------------------------- |
| `POST /auth/login`             | 10 req / 15 min per IP            |
| `POST /auth/register`          | 5 req / hour per IP               |
| `POST /invoices/:id/send`      | 20 req / hour per user            |
| `POST /webhooks/*`             | 200 req / min (provider IPs only) |
| All other authenticated routes | 300 req / min per user            |

Return `429 Too Many Requests` with a `Retry-After` header when limits are hit.

---

## Secrets management

- **No secrets in the codebase.** Not in `.env` files committed to Git, not in comments, not in test fixtures.
- All secrets are stored in **AWS SSM Parameter Store** (SecureString type, encrypted with KMS).
- The application fetches secrets at startup via the AWS SDK. Local development uses a `.env.local` file that is in `.gitignore`.
- Rotate secrets on a schedule: payment keys every 90 days, DB credentials every 180 days.
- If a secret is accidentally committed: rotate it immediately, then remove it from Git history using `git filter-repo`.

```
# .gitignore — always present, never removed
.env
.env.local
.env*.local
```

---

## Data privacy

- Store only what you need. Cashly stores invoice data and client contact details — nothing more.
- Never log personally identifiable information (PII): no email addresses, client names, or invoice amounts in application logs.
- Log correlation IDs and invoice IDs only — enough to trace a request, not enough to expose the data.
- Payment card data is never handled by Cashly. Paystack / Stripe handle it entirely. Cashly only stores the payment `reference` returned by the provider.

---

## HTTPS and transport security

- All traffic is HTTPS. HTTP requests are redirected to HTTPS at the load balancer level.
- HSTS is enabled with a minimum `max-age` of 1 year.
- Set security headers on all responses:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Content-Security-Policy: default-src 'self'; ...
Referrer-Policy: no-referrer
```

Use the `helmet` middleware in Express — it applies most of these automatically.

---

## Dependency security

- Run `pnpm audit` in CI. Builds fail on high or critical severity vulnerabilities.
- Dependabot is enabled on the GitHub repo for automated dependency PRs.
- Review dependencies before adding them. Prefer packages with active maintenance and a small surface area.

---

## Incident response (brief)

If a security issue is discovered:

1. Rotate any affected secrets immediately.
2. Revoke all active sessions if auth is suspected to be compromised.
3. Disable the affected endpoint or feature flag until a fix is deployed.
4. Write a post-mortem. Document what happened, what data was at risk, and what changed.
