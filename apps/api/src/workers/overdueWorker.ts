import cron from 'node-cron'
import { prisma } from '../lib/prisma.js'
import { emailQueue } from '../lib/queue.js'
import type { FastifyBaseLogger } from 'fastify'

// ── Overdue checker ───────────────────────────────────────────────────────────

/**
 * Runs the overdue check logic:
 * 1. Finds all SENT invoices where dueDate is in the past
 * 2. Marks them OVERDUE
 * 3. Enqueues a reminder email for each one
 *
 * Exported so it can be called manually in tests or via a one-off script.
 */
export async function runOverdueCheck(log: FastifyBaseLogger): Promise<void> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const overdueInvoices = await prisma.invoice.findMany({
    where: {
      status: 'SENT',
      dueDate: { lt: today },
    },
    include: {
      client: { select: { name: true, email: true } },
      user: { select: { name: true, businessName: true, currency: true } },
    },
  })

  if (overdueInvoices.length === 0) {
    log.info('Overdue check: no newly overdue invoices found')
    return
  }

  log.info({ count: overdueInvoices.length }, 'Overdue check: marking invoices as OVERDUE')

  for (const invoice of overdueInvoices) {
    // Mark OVERDUE
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: 'OVERDUE' },
    })

    // Calculate days overdue
    const msOverdue = today.getTime() - invoice.dueDate.getTime()
    const daysOverdue = Math.floor(msOverdue / (1000 * 60 * 60 * 24))

    const currency = invoice.user.currency
    const invoiceTotal = `${currency} ${Number(invoice.total).toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`

    const dueDateFormatted = invoice.dueDate.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

    // Enqueue reminder email
    await emailQueue.add(
      'overdue_reminder',
      {
        type: 'overdue_reminder',
        to: invoice.client.email,
        clientName: invoice.client.name,
        businessName: invoice.user.businessName ?? invoice.user.name,
        invoiceNumber: invoice.invoiceNumber,
        invoiceTotal,
        dueDate: dueDateFormatted,
        daysOverdue,
        paymentUrl: invoice.paymentUrl ?? undefined,
      },
      {
        // Deduplicate: one reminder per invoice per day
        jobId: `reminder:${invoice.id}:${today.toISOString().split('T')[0]}`,
      },
    )

    log.info(
      { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, daysOverdue },
      'Queued overdue reminder',
    )
  }
}

// ── Cron job ──────────────────────────────────────────────────────────────────

/**
 * Schedules the overdue check to run at 08:00 every day.
 * Returns the cron task so it can be stopped on shutdown.
 */
export function startOverdueWorker(log: FastifyBaseLogger): cron.ScheduledTask {
  const task = cron.schedule(
    '0 8 * * *',
    () => {
      void runOverdueCheck(log).catch((err: unknown) => {
        log.error({ err }, 'Overdue check failed')
      })
    },
    { timezone: 'Africa/Lagos' },
  )

  log.info('Overdue cron worker scheduled (08:00 Africa/Lagos)')
  return task
}
