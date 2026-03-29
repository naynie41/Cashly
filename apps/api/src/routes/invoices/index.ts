import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { Decimal } from '@prisma/client/runtime/library'
import { requireAuth } from '../../plugins/auth.js'
import { notFound, forbidden, badRequest, internalError } from '../../lib/errors.js'
import { generateInvoiceNumber } from '../../lib/invoiceNumber.js'
import { generateInvoicePdf } from '../../services/pdf.js'
import { uploadInvoicePdf } from '../../services/storage.js'
import { initializePaystackTransaction } from '../../services/paystack.js'
import { emailQueue } from '../../lib/queue.js'

// ── Schemas ───────────────────────────────────────────────────────────────────

const lineItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().int().positive('Quantity must be positive'),
  unitPrice: z.number().nonnegative('Unit price must be non-negative'),
})

const createSchema = z.object({
  clientId: z.string().uuid('Invalid client ID'),
  issueDate: z.string().datetime({ offset: true }).or(z.string().date()),
  dueDate: z.string().datetime({ offset: true }).or(z.string().date()),
  taxRate: z.number().min(0).max(100).default(0),
  discount: z.number().nonnegative().default(0),
  notes: z.string().optional(),
  lineItems: z.array(lineItemSchema).min(1, 'At least one line item is required'),
})

const updateSchema = z.object({
  clientId: z.string().uuid().optional(),
  issueDate: z.string().datetime({ offset: true }).or(z.string().date()).optional(),
  dueDate: z.string().datetime({ offset: true }).or(z.string().date()).optional(),
  taxRate: z.number().min(0).max(100).optional(),
  discount: z.number().nonnegative().optional(),
  notes: z.string().nullable().optional(),
  lineItems: z.array(lineItemSchema).min(1).optional(),
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function calculateTotals(
  lineItems: { quantity: number; unitPrice: number }[],
  taxRate: number,
  discount: number,
) {
  const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  const taxAmount = subtotal * (taxRate / 100)
  const total = subtotal + taxAmount - discount
  return { subtotal, total }
}

// ── Route plugin ──────────────────────────────────────────────────────────────

// NOTE: Fastify plugin registration is synchronous at the top level; all awaits
// are inside route handlers.
// eslint-disable-next-line @typescript-eslint/require-await
const invoicesRoute: FastifyPluginAsync = fp(async (server) => {
  // ── GET /invoices ───────────────────────────────────────────────────────────
  server.get('/invoices', { preHandler: requireAuth }, async (request, reply) => {
    const invoices = await server.prisma.invoice.findMany({
      where: { userId: request.user!.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        issueDate: true,
        dueDate: true,
        total: true,
        pdfUrl: true,
        createdAt: true,
        client: { select: { id: true, name: true, email: true } },
      },
    })

    const data = invoices.map((inv) => ({
      ...inv,
      total: Number(inv.total),
    }))

    return reply.send({ data })
  })

  // ── POST /invoices ──────────────────────────────────────────────────────────
  server.post('/invoices', { preHandler: requireAuth }, async (request, reply) => {
    const parsed = createSchema.safeParse(request.body)
    if (!parsed.success) {
      return badRequest(reply, parsed.error.issues[0]?.message ?? 'Invalid request')
    }

    const userId = request.user!.id
    const { clientId, issueDate, dueDate, taxRate, discount, notes, lineItems } = parsed.data

    // Verify client belongs to user
    const client = await server.prisma.client.findUnique({ where: { id: clientId } })
    if (!client) return notFound(reply, 'Client not found')
    if (client.userId !== userId) return forbidden(reply)

    // Server-side total calculation — never trust client-sent total
    const { subtotal, total } = calculateTotals(lineItems, taxRate, discount)

    const invoiceNumber = await generateInvoiceNumber(server.prisma, userId)

    // Create invoice + line items in a single transaction
    const invoice = await server.prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.create({
        data: {
          userId,
          clientId,
          invoiceNumber,
          issueDate: new Date(issueDate),
          dueDate: new Date(dueDate),
          subtotal: new Decimal(subtotal),
          taxRate: new Decimal(taxRate),
          discount: new Decimal(discount),
          total: new Decimal(total),
          notes: notes ?? null,
          lineItems: {
            create: lineItems.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: new Decimal(item.unitPrice),
              amount: new Decimal(item.quantity * item.unitPrice),
            })),
          },
        },
        include: {
          lineItems: true,
          client: { select: { id: true, name: true, email: true } },
        },
      })
      return inv
    })

    return reply.code(201).send({
      data: {
        ...invoice,
        subtotal: Number(invoice.subtotal),
        taxRate: Number(invoice.taxRate),
        discount: Number(invoice.discount),
        total: Number(invoice.total),
        lineItems: invoice.lineItems.map((li) => ({
          ...li,
          unitPrice: Number(li.unitPrice),
          amount: Number(li.amount),
        })),
      },
    })
  })

  // ── GET /invoices/:id ───────────────────────────────────────────────────────
  server.get('/invoices/:id', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const invoice = await server.prisma.invoice.findUnique({
      where: { id },
      include: {
        lineItems: true,
        client: true,
        payment: true,
        user: {
          select: {
            name: true,
            email: true,
            businessName: true,
            currency: true,
            brandColor: true,
            logoUrl: true,
            invoicePrefix: true,
          },
        },
      },
    })

    if (!invoice) return notFound(reply, 'Invoice not found')
    if (invoice.userId !== request.user!.id) return forbidden(reply)

    return reply.send({
      data: {
        ...invoice,
        subtotal: Number(invoice.subtotal),
        taxRate: Number(invoice.taxRate),
        discount: Number(invoice.discount),
        total: Number(invoice.total),
        lineItems: invoice.lineItems.map((li) => ({
          ...li,
          unitPrice: Number(li.unitPrice),
          amount: Number(li.amount),
        })),
        payment: invoice.payment
          ? { ...invoice.payment, amountPaid: Number(invoice.payment.amountPaid) }
          : null,
      },
    })
  })

  // ── PATCH /invoices/:id ─────────────────────────────────────────────────────
  server.patch('/invoices/:id', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const existing = await server.prisma.invoice.findUnique({
      where: { id },
      include: { lineItems: true },
    })

    if (!existing) return notFound(reply, 'Invoice not found')
    if (existing.userId !== request.user!.id) return forbidden(reply)
    if (existing.status !== 'DRAFT') {
      return badRequest(reply, 'Only DRAFT invoices can be edited')
    }

    const parsed = updateSchema.safeParse(request.body)
    if (!parsed.success) {
      return badRequest(reply, parsed.error.issues[0]?.message ?? 'Invalid request')
    }

    const { clientId, issueDate, dueDate, taxRate, discount, notes, lineItems } = parsed.data

    // If clientId is changing, verify the new client belongs to this user
    if (clientId) {
      const client = await server.prisma.client.findUnique({ where: { id: clientId } })
      if (!client) return notFound(reply, 'Client not found')
      if (client.userId !== request.user!.id) return forbidden(reply)
    }

    // Recalculate totals if line items or rates changed
    const newLineItems =
      lineItems ??
      existing.lineItems.map((li) => ({
        description: li.description,
        quantity: li.quantity,
        unitPrice: Number(li.unitPrice),
      }))
    const newTaxRate = taxRate ?? Number(existing.taxRate)
    const newDiscount = discount ?? Number(existing.discount)
    const { subtotal, total } = calculateTotals(newLineItems, newTaxRate, newDiscount)

    const updated = await server.prisma.$transaction(async (tx) => {
      // Replace line items if provided
      if (lineItems) {
        await tx.lineItem.deleteMany({ where: { invoiceId: id } })
      }

      return tx.invoice.update({
        where: { id },
        data: {
          ...(clientId !== undefined && { clientId }),
          ...(issueDate !== undefined && { issueDate: new Date(issueDate) }),
          ...(dueDate !== undefined && { dueDate: new Date(dueDate) }),
          subtotal: new Decimal(subtotal),
          taxRate: new Decimal(newTaxRate),
          discount: new Decimal(newDiscount),
          total: new Decimal(total),
          ...(notes !== undefined && { notes: notes ?? null }),
          ...(lineItems && {
            lineItems: {
              create: lineItems.map((item) => ({
                description: item.description,
                quantity: item.quantity,
                unitPrice: new Decimal(item.unitPrice),
                amount: new Decimal(item.quantity * item.unitPrice),
              })),
            },
          }),
        },
        include: {
          lineItems: true,
          client: { select: { id: true, name: true, email: true } },
        },
      })
    })

    return reply.send({
      data: {
        ...updated,
        subtotal: Number(updated.subtotal),
        taxRate: Number(updated.taxRate),
        discount: Number(updated.discount),
        total: Number(updated.total),
        lineItems: updated.lineItems.map((li) => ({
          ...li,
          unitPrice: Number(li.unitPrice),
          amount: Number(li.amount),
        })),
      },
    })
  })

  // ── DELETE /invoices/:id ────────────────────────────────────────────────────
  server.delete('/invoices/:id', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const invoice = await server.prisma.invoice.findUnique({ where: { id } })
    if (!invoice) return notFound(reply, 'Invoice not found')
    if (invoice.userId !== request.user!.id) return forbidden(reply)
    if (invoice.status !== 'DRAFT') {
      return badRequest(reply, 'Only DRAFT invoices can be deleted')
    }

    await server.prisma.invoice.delete({ where: { id } })
    return reply.code(204).send()
  })

  // ── POST /invoices/:id/send ─────────────────────────────────────────────────
  server.post('/invoices/:id/send', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const invoice = await server.prisma.invoice.findUnique({
      where: { id },
      include: {
        lineItems: true,
        client: true,
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

    if (!invoice) return notFound(reply, 'Invoice not found')
    if (invoice.userId !== request.user!.id) return forbidden(reply)
    if (invoice.status === 'PAID') {
      return badRequest(reply, 'Cannot resend a paid invoice')
    }

    try {
      // 1. Generate PDF
      const pdfBuffer = await generateInvoicePdf({
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
        invoice: {
          invoiceNumber: invoice.invoiceNumber,
          issueDate: invoice.issueDate,
          dueDate: invoice.dueDate,
          subtotal: Number(invoice.subtotal),
          taxRate: Number(invoice.taxRate),
          discount: Number(invoice.discount),
          total: Number(invoice.total),
          notes: invoice.notes ?? null,
        },
        lineItems: invoice.lineItems.map((li) => ({
          description: li.description,
          quantity: li.quantity,
          unitPrice: Number(li.unitPrice),
          amount: Number(li.amount),
        })),
      })

      // 2. Upload to S3
      const pdfUrl = await uploadInvoicePdf(invoice.userId, invoice.id, pdfBuffer)

      // 3. Generate Paystack payment link (best-effort — don't fail the send if Paystack is down)
      // NOTE: We already returned early if status === 'PAID', so no need to check again here.
      let paymentUrl: string | null = invoice.paymentUrl
      if (!paymentUrl) {
        try {
          paymentUrl = await initializePaystackTransaction({
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            clientEmail: invoice.client.email,
            amountNgn: Number(invoice.total),
          })
        } catch (err) {
          request.log.warn(err, 'Paystack payment link generation failed — proceeding without it')
        }
      }

      // 4. Update invoice: status SENT, pdfUrl, paymentUrl
      await server.prisma.invoice.update({
        where: { id },
        data: {
          status: 'SENT',
          pdfUrl,
          paymentUrl,
        },
      })

      // 5. Enqueue email job — never call Resend directly from route handlers
      const currency = invoice.user.currency
      const totalFormatted = `${currency} ${Number(invoice.total).toLocaleString('en-NG', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`

      const dueDateFormatted = invoice.dueDate.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })

      await emailQueue.add('invoice_send', {
        type: 'invoice_send',
        to: invoice.client.email,
        clientName: invoice.client.name,
        businessName: invoice.user.businessName ?? invoice.user.name,
        invoiceNumber: invoice.invoiceNumber,
        invoiceTotal: totalFormatted,
        dueDate: dueDateFormatted,
        pdfUrl,
        paymentUrl: paymentUrl ?? undefined,
        notes: invoice.notes,
        brandColor: invoice.user.brandColor ?? undefined,
        logoUrl: invoice.user.logoUrl ?? undefined,
      })

      return reply.send({ data: { pdfUrl, paymentUrl, status: 'SENT' } })
    } catch (err) {
      request.log.error(err, 'Failed to send invoice')
      return internalError(reply, 'Failed to send invoice. Please try again.')
    }
  })
})

export default invoicesRoute
