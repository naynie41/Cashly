import { Worker } from 'bullmq'
import { EMAIL_QUEUE, makeRedisConnection, type EmailJobData } from '../lib/queue.js'
import { sendInvoiceEmail, sendReminderEmail, emailConfigured } from '../services/email.js'
import { processReceiptJob } from '../services/receipts.js'
import { prisma } from '../lib/prisma.js'
import type { FastifyBaseLogger } from 'fastify'

// ── Worker ────────────────────────────────────────────────────────────────────

/**
 * Starts the BullMQ email worker. Call once at server startup.
 * All email sending goes through this worker — no direct Resend calls from routes.
 */
export function startEmailWorker(log: FastifyBaseLogger): Worker<EmailJobData> {
  const worker = new Worker<EmailJobData>(
    EMAIL_QUEUE,
    async (job) => {
      const { data } = job

      // The receipt job has its own dev fallback inside processReceiptJob, so
      // skip the early exit for that type and let the orchestrator decide
      // (it still needs to render the PDF + persist the row even when email
      // is skipped — useful in dev so the receipts list shows up).
      if (!emailConfigured() && data.type !== 'generate_and_send_receipt') {
        log.warn(
          { jobId: job.id, type: data.type },
          'Email skipped — RESEND_API_KEY/EMAIL_FROM not configured (dev mode)',
        )
        return
      }

      if (data.type === 'invoice_send') {
        await sendInvoiceEmail({
          to: data.to,
          clientName: data.clientName,
          businessName: data.businessName,
          invoiceNumber: data.invoiceNumber,
          invoiceTotal: data.invoiceTotal,
          dueDate: data.dueDate,
          pdfUrl: data.pdfUrl,
          paymentUrl: data.paymentUrl,
          notes: data.notes,
          brandColor: data.brandColor,
          logoUrl: data.logoUrl,
          isRevision: data.isRevision ?? false,
        })
        log.info(
          { jobId: job.id, invoiceNumber: data.invoiceNumber, revision: data.isRevision ?? false },
          'Invoice email sent',
        )
        return
      }

      if (data.type === 'generate_and_send_receipt') {
        const result = await processReceiptJob(prisma, log, {
          invoiceId: data.invoiceId,
          paymentReference: data.paymentReference,
          paymentMethod: data.paymentMethod,
          forceResend: data.forceResend ?? false,
        })
        log.info(
          {
            jobId: job.id,
            attempt: job.attemptsMade + 1,
            receiptId: result.receiptId,
            receiptNumber: result.receiptNumber,
            emailed: result.emailed,
            skipped: result.skipped,
          },
          'Receipt job completed',
        )
        return
      }

      if (data.type === 'overdue_reminder') {
        await sendReminderEmail({
          to: data.to,
          clientName: data.clientName,
          businessName: data.businessName,
          invoiceNumber: data.invoiceNumber,
          invoiceTotal: data.invoiceTotal,
          dueDate: data.dueDate,
          daysOverdue: data.daysOverdue,
          paymentUrl: data.paymentUrl,
        })
        log.info({ jobId: job.id, invoiceNumber: data.invoiceNumber }, 'Reminder email sent')
        return
      }

      // Unreachable — exhaustive check
      log.warn({ jobId: job.id }, 'Unknown email job type — skipping')
    },
    {
      connection: makeRedisConnection(),
      concurrency: 5,
    },
  )

  worker.on('failed', (job, err) => {
    log.error({ jobId: job?.id, jobName: job?.name, err }, 'Email job failed')
  })

  worker.on('error', (err) => {
    log.error({ err }, 'Email worker error')
  })

  log.info('Email worker started')
  return worker
}
