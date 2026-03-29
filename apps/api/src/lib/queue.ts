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

export type EmailJobData = InvoiceEmailJob | ReminderEmailJob

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
