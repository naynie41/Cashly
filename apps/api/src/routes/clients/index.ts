import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { requireAuth } from '../../plugins/auth.js'
import { notFound, forbidden, badRequest } from '../../lib/errors.js'

const createSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  address: z.string().optional(),
})

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
})

// NOTE: Fastify plugin type requires async, but all await calls are inside individual
// route handlers — the registration itself is synchronous.
// eslint-disable-next-line @typescript-eslint/require-await
const clientsRoute: FastifyPluginAsync = fp(async (server) => {
  // ── POST /clients ─────────────────────────────────────────────────────────
  server.post('/clients', { preHandler: requireAuth }, async (request, reply) => {
    const parsed = createSchema.safeParse(request.body)
    if (!parsed.success) {
      return badRequest(reply, parsed.error.issues[0]?.message ?? 'Invalid request')
    }

    const client = await server.prisma.client.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone ?? null,
        address: parsed.data.address ?? null,
        userId: request.user!.id,
      },
      include: { _count: { select: { invoices: true } } },
    })

    return reply.code(201).send({ data: { ...client, totalBilled: 0 } })
  })

  // ── GET /clients ──────────────────────────────────────────────────────────
  server.get('/clients', { preHandler: requireAuth }, async (request, reply) => {
    const clients = await server.prisma.client.findMany({
      where: { userId: request.user!.id },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { invoices: true } },
        invoices: { select: { total: true } },
      },
    })

    const data = clients.map(({ invoices, ...c }) => ({
      ...c,
      totalBilled: invoices.reduce((sum, inv) => sum + Number(inv.total), 0),
    }))

    return reply.send({ data })
  })

  // ── GET /clients/:id ──────────────────────────────────────────────────────
  server.get('/clients/:id', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const client = await server.prisma.client.findUnique({
      where: { id },
      include: {
        _count: { select: { invoices: true } },
        invoices: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            total: true,
            dueDate: true,
            createdAt: true,
          },
        },
      },
    })

    if (!client) return notFound(reply, 'Client not found')
    if (client.userId !== request.user!.id) return forbidden(reply)

    const totalBilled = client.invoices.reduce((sum, inv) => sum + Number(inv.total), 0)

    return reply.send({ data: { ...client, totalBilled } })
  })

  // ── PATCH /clients/:id ────────────────────────────────────────────────────
  server.patch('/clients/:id', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const existing = await server.prisma.client.findUnique({ where: { id } })
    if (!existing) return notFound(reply, 'Client not found')
    if (existing.userId !== request.user!.id) return forbidden(reply)

    const parsed = updateSchema.safeParse(request.body)
    if (!parsed.success) {
      return badRequest(reply, parsed.error.issues[0]?.message ?? 'Invalid request')
    }

    const { name, email, phone, address } = parsed.data
    const updated = await server.prisma.client.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone: phone ?? null }),
        ...(address !== undefined && { address: address ?? null }),
      },
      include: {
        _count: { select: { invoices: true } },
        invoices: { select: { total: true } },
      },
    })

    const { invoices, ...rest } = updated
    return reply.send({
      data: {
        ...rest,
        totalBilled: invoices.reduce((sum, inv) => sum + Number(inv.total), 0),
      },
    })
  })

  // ── DELETE /clients/:id ───────────────────────────────────────────────────
  server.delete('/clients/:id', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const client = await server.prisma.client.findUnique({
      where: { id },
      include: { _count: { select: { invoices: true } } },
    })

    if (!client) return notFound(reply, 'Client not found')
    if (client.userId !== request.user!.id) return forbidden(reply)

    if (client._count.invoices > 0) {
      return badRequest(reply, 'Cannot delete a client that has invoices')
    }

    await server.prisma.client.delete({ where: { id } })

    return reply.code(204).send()
  })
})

export default clientsRoute
