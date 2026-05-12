import { Queue } from 'bullmq'
import { env } from '../plugins/env.js'

// ── Queue name ────────────────────────────────────────────────────────────────

export const EMAIL_QUEUE = 'cashly_emails'

// ── Job data types ────────────────────────────────────────────────────────────

export interface InvoiceEmailJob {
  type: 'invoice_send'
  to: string
  clientName: string
  businessName: string
  invoiceNumber: string
  invoiceTotal: string
  dueDate: string
  pdfUrl: string
  paymentUrl?: string | undefined
  notes?: string | null | undefined
  brandColor?: string | undefined
  logoUrl?: string | null | undefined
  // True when this resend follows an edit to a previously-sent invoice. Drives
  // a "Revised" subject and intro paragraph in the email template.
  isRevision?: boolean | undefined
}

export interface ReminderEmailJob {
  type: 'overdue_reminder'
  to: string
  clientName: string
  businessName: string
  invoiceNumber: string
  invoiceTotal: string
  dueDate: string
  daysOverdue: number
  paymentUrl?: string | undefined
}

/**
 * Triggered after the Paystack webhook flips an invoice to PAID. The worker
 * does the slow part — counter allocation, PDF render, S3 upload, Resend send.
 *
 * Idempotency: keyed on (invoiceId, paymentReference). The first job that
 * runs to completion creates the Receipt row; any retry — including a
 * deliberate resend via the API — finds the existing row and skips the insert.
 */
export interface GenerateAndSendReceiptJob {
  type: 'generate_and_send_receipt'
  invoiceId: string
  paymentReference: string
  /** Paystack `data.channel`; "unknown" when called from a resend with no payload. */
  paymentMethod: string
  /** Optional — set by the resend route to bypass the "already emailed" idempotency skip. */
  forceResend?: boolean | undefined
}

export type EmailJobData = InvoiceEmailJob | ReminderEmailJob | GenerateAndSendReceiptJob

// ── Shared connection factory ─────────────────────────────────────────────────
// NOTE: BullMQ requires a separate ioredis connection per Queue / Worker
// instance. We call this factory wherever a new connection is needed.

export function makeRedisConnection() {
  return { url: env.REDIS_URL, maxRetriesPerRequest: null as unknown as undefined }
}

// ── Email queue singleton ─────────────────────────────────────────────────────

export const emailQueue = new Queue<EmailJobData>(EMAIL_QUEUE, {
  connection: makeRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5_000 },
    removeOnComplete: true,
    removeOnFail: 50,
  },
})
