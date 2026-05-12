import { PrismaClient, Prisma } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
import type { FastifyBaseLogger } from 'fastify'
import { allocateReceiptNumber } from './receiptNumber.js'
import { generateReceiptPdf } from './receiptPdf.js'
import { uploadReceiptPdf, receiptS3Key } from './storage.js'
import { sendReceiptEmail, emailConfigured } from './email.js'

// ── Inputs ─────────────────────────────────────────────────────────────────────

export interface ProcessReceiptJobInput {
  invoiceId: string
  paymentReference: string
  /** Paystack `data.channel` — "card", "bank", "ussd", "unknown", etc. */
  paymentMethod: string
  /** Set by the resend route to bypass the "already emailed" idempotency skip. */
  forceResend?: boolean
}

export interface ProcessReceiptJobResult {
  receiptId: string
  receiptNumber: string
  emailed: boolean
  /** Set when the worker bailed early because the receipt already existed
   *  AND was already emailed (idempotent webhook retry). */
  skipped: boolean
}

// ── Orchestrator ──────────────────────────────────────────────────────────────
//
// Job lifecycle, executed in this order:
//
//   1. Look up Invoice + Payment + User + Client. If the Payment record for
//      this paymentReference doesn't exist yet (webhook race), throw — BullMQ
//      will retry with backoff and the next run will see the Payment row.
//
//   2. Find or create the Receipt row inside a single transaction that also
//      allocates the per-(user,year) sequence. The unique
//      (invoiceId, paymentReference) index makes a duplicate insert race-safe:
//      one tx wins, the other gets P2002, falls back to findUnique.
//
//   3. If forceResend is false and the receipt already has emailSentAt, exit
//      early — this is what makes webhook retries cheap.
//
//   4. Render the PDF, upload to S3 (or data-URL fallback in dev), persist
//      pdfS3Key on the row.
//
//   5. Send the email (PDF attached, owner BCC'd). Stamp emailSentAt.
//
// Sentry breadcrumb equivalents: every branch logs a structured info/warn/error
// with `{ receiptId, invoiceId, paymentReference, attempt }`. CloudWatch / Pino
// has the full audit trail — no silent paths.

export async function processReceiptJob(
  prisma: PrismaClient,
  log: FastifyBaseLogger,
  input: ProcessReceiptJobInput,
): Promise<ProcessReceiptJobResult> {
  const { invoiceId, paymentReference, paymentMethod, forceResend = false } = input

  // ── 1. Load context ───────────────────────────────────────────────────────
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      client: true,
      payment: true,
      user: {
        select: {
          name: true,
          email: true,
          businessName: true,
          logoUrl: true,
          brandColor: true,
          currency: true,
          businessAddress: true,
          businessPhone: true,
          businessWebsite: true,
        },
      },
    },
  })

  if (!invoice) {
    // Unknown invoice — don't retry forever. Throwing here would cycle BullMQ
    // 3 times then dead-letter; logging at error level is enough for ops.
    log.error({ invoiceId, paymentReference }, 'Receipt job: invoice not found')
    throw new Error(`Receipt job: invoice ${invoiceId} not found`)
  }

  if (!invoice.payment || invoice.payment.paystackRef !== paymentReference) {
    // Webhook → enqueue → worker can race ahead of the Payment write commit
    // by a tick. Throw to trigger BullMQ exponential backoff retry.
    log.warn(
      { invoiceId, paymentReference },
      'Receipt job: Payment not yet visible — will retry with backoff',
    )
    throw new Error(`Receipt job: Payment ${paymentReference} not yet visible`)
  }

  const payment = invoice.payment

  // ── 2. Allocate receipt + insert row (idempotent) ─────────────────────────
  const { receipt, isNew } = await findOrCreateReceipt(prisma, {
    userId: invoice.userId,
    invoiceId: invoice.id,
    paymentReference,
    amountPaid: payment.amountPaid,
    currency: payment.currency,
    paidAt: payment.paidAt,
    paymentMethod,
  })

  log.info(
    { receiptId: receipt.id, receiptNumber: receipt.receiptNumber, invoiceId, isNew },
    isNew ? 'Receipt row created' : 'Receipt row reused (idempotent)',
  )

  // ── 3. Idempotent skip when already emailed ───────────────────────────────
  if (!forceResend && receipt.emailSentAt) {
    log.info(
      { receiptId: receipt.id, emailSentAt: receipt.emailSentAt },
      'Receipt already emailed — skipping (idempotent retry)',
    )
    return {
      receiptId: receipt.id,
      receiptNumber: receipt.receiptNumber,
      emailed: false,
      skipped: true,
    }
  }

  // ── 4. Render PDF + upload ────────────────────────────────────────────────
  const pdfBuffer = await generateReceiptPdf({
    user: {
      name: invoice.user.name,
      email: invoice.user.email,
      businessName: invoice.user.businessName ?? null,
      logoUrl: invoice.user.logoUrl ?? null,
      brandColor: invoice.user.brandColor ?? '#6366f1',
      currency: invoice.user.currency,
      businessAddress: invoice.user.businessAddress ?? null,
      businessPhone: invoice.user.businessPhone ?? null,
      businessWebsite: invoice.user.businessWebsite ?? null,
    },
    client: {
      name: invoice.client.name,
      email: invoice.client.email,
      phone: invoice.client.phone ?? null,
      address: invoice.client.address ?? null,
    },
    receipt: {
      receiptNumber: receipt.receiptNumber,
      invoiceNumber: invoice.invoiceNumber,
      paymentReference: receipt.paymentReference,
      paymentMethod: receipt.paymentMethod,
      amountPaid: Number(receipt.amountPaid),
      paidAt: receipt.paidAt,
      invoiceTotal: Number(invoice.total),
    },
  })

  const { pdfRef } = await uploadReceiptPdf(invoice.userId, receipt.receiptNumber, pdfBuffer)

  if (receipt.pdfS3Key !== pdfRef) {
    await prisma.receipt.update({
      where: { id: receipt.id },
      data: { pdfS3Key: pdfRef },
    })
  }

  log.info(
    { receiptId: receipt.id, pdfRef: pdfRef.startsWith('data:') ? '<data url>' : pdfRef },
    'Receipt PDF uploaded',
  )

  // ── 5. Send email ─────────────────────────────────────────────────────────
  if (!emailConfigured()) {
    // Dev fallback: same pattern as the invoice email worker.
    log.warn(
      { receiptId: receipt.id, invoiceId, paymentReference },
      'Receipt email skipped — RESEND_API_KEY/EMAIL_FROM not configured (dev mode)',
    )
    return {
      receiptId: receipt.id,
      receiptNumber: receipt.receiptNumber,
      emailed: false,
      skipped: false,
    }
  }

  const fmtCurrency = (n: number) =>
    `${invoice.user.currency} ${n.toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`

  const fmtPaidAt = receipt.paidAt.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  await sendReceiptEmail({
    to: invoice.client.email,
    bcc: invoice.user.email,
    clientName: invoice.client.name,
    businessName: invoice.user.businessName ?? invoice.user.name,
    receiptNumber: receipt.receiptNumber,
    invoiceNumber: invoice.invoiceNumber,
    amountPaid: fmtCurrency(Number(receipt.amountPaid)),
    paidAt: fmtPaidAt,
    paymentMethod: receipt.paymentMethod,
    paymentReference: receipt.paymentReference,
    brandColor: invoice.user.brandColor ?? undefined,
    logoUrl: invoice.user.logoUrl ?? undefined,
    pdfBuffer,
  })

  // Stamp emailSentAt only after Resend confirms — otherwise a Resend failure
  // on attempt 1 would prevent attempt 2 from re-sending.
  await prisma.receipt.update({
    where: { id: receipt.id },
    data: { emailSentAt: new Date() },
  })

  log.info(
    { receiptId: receipt.id, to: invoice.client.email, bcc: invoice.user.email },
    'Receipt email sent',
  )

  return {
    receiptId: receipt.id,
    receiptNumber: receipt.receiptNumber,
    emailed: true,
    skipped: false,
  }
}

// ── findOrCreateReceipt ────────────────────────────────────────────────────────

interface CreateInput {
  userId: string
  invoiceId: string
  paymentReference: string
  amountPaid: Decimal
  currency: string
  paidAt: Date
  paymentMethod: string
}

interface FindOrCreateResult {
  receipt: {
    id: string
    receiptNumber: string
    paymentReference: string
    paymentMethod: string
    amountPaid: Decimal
    paidAt: Date
    pdfS3Key: string | null
    emailSentAt: Date | null
  }
  isNew: boolean
}

/**
 * Atomic find-or-create. The first caller for a given (invoiceId,
 * paymentReference) allocates a receipt number and inserts the row. A second
 * concurrent caller hits the unique-violation (P2002) and re-reads the row —
 * which by then is committed.
 */
async function findOrCreateReceipt(
  prisma: PrismaClient,
  input: CreateInput,
): Promise<FindOrCreateResult> {
  const existing = await prisma.receipt.findUnique({
    where: {
      invoiceId_paymentReference: {
        invoiceId: input.invoiceId,
        paymentReference: input.paymentReference,
      },
    },
  })
  if (existing) return { receipt: existing, isNew: false }

  try {
    const created = await prisma.$transaction(async (tx) => {
      const { receiptNumber } = await allocateReceiptNumber(tx, input.userId, input.paidAt)
      return tx.receipt.create({
        data: {
          userId: input.userId,
          invoiceId: input.invoiceId,
          receiptNumber,
          paymentReference: input.paymentReference,
          amountPaid: input.amountPaid,
          currency: input.currency,
          paidAt: input.paidAt,
          paymentMethod: input.paymentMethod,
        },
      })
    })
    return { receipt: created, isNew: true }
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      // Race: another worker won the insert. Re-read.
      const winner = await prisma.receipt.findUnique({
        where: {
          invoiceId_paymentReference: {
            invoiceId: input.invoiceId,
            paymentReference: input.paymentReference,
          },
        },
      })
      if (winner) return { receipt: winner, isNew: false }
    }
    throw err
  }
}

