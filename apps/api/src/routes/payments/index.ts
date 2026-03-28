import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'
import { verifyPaystackSignature, type PaystackWebhookPayload } from '../../services/paystack.js'
import { prisma } from '../../lib/prisma.js'
import { Decimal } from '@prisma/client/runtime/library'

// ── Route plugin ──────────────────────────────────────────────────────────────

// NOTE: Fastify plugin registration is synchronous; awaits are inside route handlers.
// eslint-disable-next-line @typescript-eslint/require-await
const paymentsRoute: FastifyPluginAsync = fp(async (server) => {
  // Parse the body as a raw Buffer so we can compute the HMAC over the exact
  // bytes Paystack signed. Scoped to this plugin — does not affect other routes.
  server.addContentTypeParser('application/json', { parseAs: 'buffer' }, (_req, body, done) =>
    done(null, body),
  )

  // ── POST /payments/webhook ─────────────────────────────────────────────────
  server.post('/payments/webhook', async (request, reply) => {
    const rawBody = request.body as Buffer
    const signature = request.headers['x-paystack-signature']

    // 1. Verify signature — reject immediately if invalid
    if (typeof signature !== 'string') {
      return reply.code(401).send({ error: 'Missing x-paystack-signature header' })
    }

    let isValid: boolean
    try {
      isValid = verifyPaystackSignature(rawBody, signature)
    } catch (err) {
      request.log.error(err, 'Paystack signature verification error')
      return reply.code(401).send({ error: 'Signature verification failed' })
    }

    if (!isValid) {
      request.log.warn('Invalid Paystack webhook signature')
      return reply.code(401).send({ error: 'Invalid signature' })
    }

    // 2. Parse payload
    let payload: PaystackWebhookPayload
    try {
      payload = JSON.parse(rawBody.toString()) as PaystackWebhookPayload
    } catch {
      return reply.code(400).send({ error: 'Invalid JSON payload' })
    }

    // 3. Only handle charge.success — return 200 for all other events immediately
    if (payload.event !== 'charge.success') {
      return reply.code(200).send({ received: true })
    }

    const { reference, amount, currency, paid_at, metadata } = payload.data

    // 4. Idempotency check — if Payment already exists for this reference, do nothing
    const existing = await prisma.payment.findUnique({ where: { paystackRef: reference } })
    if (existing) {
      request.log.info({ reference }, 'Duplicate Paystack webhook — already processed')
      return reply.code(200).send({ received: true })
    }

    // 5. Look up the invoice via metadata.invoiceId
    //    (reference === invoiceId, but metadata is the explicit contract)
    const invoiceId = typeof metadata?.invoiceId === 'string' ? metadata.invoiceId : reference

    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } })

    if (!invoice) {
      // Unknown invoice — log and acknowledge so Paystack stops retrying
      request.log.error({ invoiceId, reference }, 'Paystack webhook: invoice not found')
      return reply.code(200).send({ received: true })
    }

    if (invoice.status === 'PAID') {
      // Already paid via another path — idempotent
      return reply.code(200).send({ received: true })
    }

    // 6. Create Payment record + flip Invoice to PAID in a transaction
    await prisma.$transaction([
      prisma.payment.create({
        data: {
          invoiceId: invoice.id,
          paystackRef: reference,
          amountPaid: new Decimal(amount / 100), // kobo → NGN
          currency,
          paidAt: new Date(paid_at),
        },
      }),
      prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: 'PAID' },
      }),
    ])

    request.log.info({ invoiceId: invoice.id, reference }, 'Invoice marked as PAID via Paystack')

    // 7. Always return 200 — never make Paystack wait or retry unnecessarily
    return reply.code(200).send({ received: true })
  })
})

export default paymentsRoute
