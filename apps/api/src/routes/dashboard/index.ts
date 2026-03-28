import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'
import { requireAuth } from '../../plugins/auth.js'
import { generateMonthlySummary } from '../../services/ai.js'

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns the last 6 calendar months (oldest first, current last). */
function last6Months(): Array<{ year: number; month: number; label: string }> {
  const result: Array<{ year: number; month: number; label: string }> = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    result.push({
      year: d.getFullYear(),
      month: d.getMonth(), // 0-indexed
      label: d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }),
    })
  }
  return result
}

// ── Route plugin ──────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/require-await
const dashboardRoute: FastifyPluginAsync = fp(async (server) => {
  // ── GET /dashboard/summary ────────────────────────────────────────────────
  server.get('/dashboard/summary', { preHandler: requireAuth }, async (request, reply) => {
    const userId = request.user!.id

    // Single query: fetch all invoices + client name + payment info
    const invoices = await server.prisma.invoice.findMany({
      where: { userId },
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        issueDate: true,
        dueDate: true,
        total: true,
        clientId: true,
        createdAt: true,
        client: { select: { name: true } },
        payment: { select: { amountPaid: true, paidAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    // ── 1. Summary totals ─────────────────────────────────────────────────

    let totalInvoiced = 0
    let totalReceived = 0
    let totalOutstanding = 0
    let totalOverdue = 0
    let overdueCount = 0

    for (const inv of invoices) {
      const amount = Number(inv.total)
      totalInvoiced += amount

      if (inv.status === 'PAID') {
        totalReceived += inv.payment ? Number(inv.payment.amountPaid) : amount
      } else if (inv.status === 'SENT' || inv.status === 'OVERDUE') {
        totalOutstanding += amount
        if (inv.status === 'OVERDUE') {
          totalOverdue += amount
          overdueCount += 1
        }
      }
    }

    // ── 2. Monthly data — last 6 months ───────────────────────────────────

    const months = last6Months()

    const monthlyData = months.map(({ year, month, label }) => {
      let invoiced = 0
      let received = 0

      for (const inv of invoices) {
        const issueD = inv.issueDate
        if (issueD.getFullYear() === year && issueD.getMonth() === month) {
          invoiced += Number(inv.total)
        }

        if (inv.payment) {
          const paidD = inv.payment.paidAt
          if (paidD.getFullYear() === year && paidD.getMonth() === month) {
            received += Number(inv.payment.amountPaid)
          }
        }
      }

      return { month: label, invoiced, received }
    })

    // ── 3. Client breakdown — top clients by outstanding balance ──────────

    const clientMap = new Map<
      string,
      {
        clientName: string
        totalOwed: number
        invoiceCount: number
        oldestDueDate: Date | null
      }
    >()

    for (const inv of invoices) {
      if (inv.status !== 'SENT' && inv.status !== 'OVERDUE') continue

      const existing = clientMap.get(inv.clientId) ?? {
        clientName: inv.client.name,
        totalOwed: 0,
        invoiceCount: 0,
        oldestDueDate: null,
      }

      existing.totalOwed += Number(inv.total)
      existing.invoiceCount += 1

      if (existing.oldestDueDate === null || inv.dueDate < existing.oldestDueDate) {
        existing.oldestDueDate = inv.dueDate
      }

      clientMap.set(inv.clientId, existing)
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const clientBreakdown = Array.from(clientMap.values())
      .sort((a, b) => b.totalOwed - a.totalOwed)
      .slice(0, 10)
      .map((c) => {
        const msOverdue =
          c.oldestDueDate && c.oldestDueDate < today
            ? today.getTime() - c.oldestDueDate.getTime()
            : 0
        return {
          clientName: c.clientName,
          totalOwed: c.totalOwed,
          invoiceCount: c.invoiceCount,
          oldestDueDate: c.oldestDueDate?.toISOString() ?? null,
          daysOverdue: Math.floor(msOverdue / (1000 * 60 * 60 * 24)),
        }
      })

    // ── 4. Recent invoices — last 5 ───────────────────────────────────────

    const recentInvoices = invoices.slice(0, 5).map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      status: inv.status,
      total: Number(inv.total),
      dueDate: inv.dueDate.toISOString(),
      clientName: inv.client.name,
    }))

    return reply.send({
      data: {
        totalInvoiced,
        totalReceived,
        totalOutstanding,
        totalOverdue,
        overdueCount,
        monthlyData,
        clientBreakdown,
        recentInvoices,
      },
    })
  })

  // ── GET /dashboard/ai-summary ─────────────────────────────────────────────
  server.get('/dashboard/ai-summary', { preHandler: requireAuth }, async (request, reply) => {
    const userId = request.user!.id
    const { refresh } = request.query as { refresh?: string }
    const forceRefresh = refresh === 'true'

    const now = new Date()
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const cacheKey = `ai-summary:${userId}:${monthKey}`

    // ── Cache check (skip if ?refresh=true) ───────────────────────────────
    if (!forceRefresh) {
      const cached = await server.redis.get(cacheKey)
      if (cached) {
        const parsed = JSON.parse(cached) as { summary: string; generatedAt: string }
        return reply.send({
          data: { summary: parsed.summary, generatedAt: parsed.generatedAt, cached: true },
        })
      }
    }

    // ── Gather current-month invoice data ─────────────────────────────────
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

    const [currentMonthInvoices, userData] = await Promise.all([
      server.prisma.invoice.findMany({
        where: {
          userId,
          issueDate: { gte: monthStart, lte: monthEnd },
        },
        select: {
          status: true,
          total: true,
          dueDate: true,
          client: { select: { name: true } },
          payment: { select: { amountPaid: true } },
        },
      }),
      server.prisma.user.findUnique({
        where: { id: userId },
        select: { currency: true },
      }),
    ])

    const currency = userData?.currency ?? 'NGN'
    const monthYear = now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

    // ── Aggregate ─────────────────────────────────────────────────────────
    let totalInvoiced = 0
    let totalReceived = 0
    let totalOutstanding = 0
    let totalOverdue = 0
    let overdueCount = 0
    let invoicesSent = 0
    let invoicesPaid = 0

    for (const inv of currentMonthInvoices) {
      const amount = Number(inv.total)
      totalInvoiced += amount
      invoicesSent += 1

      if (inv.status === 'PAID') {
        totalReceived += inv.payment ? Number(inv.payment.amountPaid) : amount
        invoicesPaid += 1
      } else if (inv.status === 'SENT' || inv.status === 'OVERDUE') {
        totalOutstanding += amount
        if (inv.status === 'OVERDUE') {
          totalOverdue += amount
          overdueCount += 1
        }
      }
    }

    // ── Find biggest overdue client (current month) ────────────────────────
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const overdueClientMap = new Map<
      string,
      { amount: number; daysOverdue: number; oldestDue: Date }
    >()

    for (const inv of currentMonthInvoices) {
      if (inv.status !== 'OVERDUE') continue
      const ms = today.getTime() - inv.dueDate.getTime()
      const days = Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)))
      const name = inv.client.name
      const existing = overdueClientMap.get(name)
      if (!existing || inv.dueDate < existing.oldestDue) {
        overdueClientMap.set(name, {
          amount: (existing?.amount ?? 0) + Number(inv.total),
          daysOverdue: days,
          oldestDue: inv.dueDate,
        })
      } else {
        existing.amount += Number(inv.total)
      }
    }

    const biggestOverdueEntry = Array.from(overdueClientMap.entries()).sort(
      ([, a], [, b]) => b.amount - a.amount,
    )[0]

    const biggestOverdueClient = biggestOverdueEntry
      ? {
          name: biggestOverdueEntry[0],
          amount: biggestOverdueEntry[1].amount,
          daysOverdue: biggestOverdueEntry[1].daysOverdue,
        }
      : null

    // ── Generate AI summary ───────────────────────────────────────────────
    const summary = await generateMonthlySummary({
      monthYear,
      totalInvoiced,
      totalReceived,
      totalOutstanding,
      overdueCount,
      totalOverdue,
      invoicesSent,
      invoicesPaid,
      biggestOverdueClient,
      currency,
    })

    const generatedAt = new Date().toISOString()

    // ── Cache for 24 hours ────────────────────────────────────────────────
    await server.redis.set(cacheKey, JSON.stringify({ summary, generatedAt }), 'EX', 60 * 60 * 24)

    return reply.send({ data: { summary, generatedAt, cached: false } })
  })
})

export default dashboardRoute
