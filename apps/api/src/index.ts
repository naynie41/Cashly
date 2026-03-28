// env must be imported first — crashes immediately if required vars are missing
import { env } from './plugins/env.js'

import Fastify from 'fastify'
import cors from '@fastify/cors'

import prismaPlugin from './plugins/prisma.js'
import redisPlugin from './plugins/redis.js'
import authPlugin from './plugins/auth.js'
import meRoute from './routes/me.js'
import clientsRoute from './routes/clients/index.js'
import invoicesRoute from './routes/invoices/index.js'
import paymentsRoute from './routes/payments/index.js'
import dashboardRoute from './routes/dashboard/index.js'
import { startEmailWorker } from './workers/emailWorker.js'
import { startOverdueWorker } from './workers/overdueWorker.js'

const server = Fastify({
  logger: {
    level: process.env['LOG_LEVEL'] ?? 'info',
  },
})

// ── Plugins — order matters ───────────────────────────────────────────────────

// 1. Prisma (other plugins depend on server.prisma)
await server.register(prismaPlugin)

// 2. Redis
await server.register(redisPlugin)

// 3. CORS — must be before auth so preflight requests get the right headers
await server.register(cors, {
  origin: env.FRONTEND_URL,
  credentials: true,
})

// 4. Auth — mounts /api/auth/* and exports requireAuth
await server.register(authPlugin)

// ── Routes ────────────────────────────────────────────────────────────────────

server.get('/health', async (_request, reply) => {
  return reply.code(200).send({ status: 'ok', timestamp: new Date().toISOString() })
})

server.get('/', async (_request, reply) => {
  return reply.send({ name: 'cashly-api', version: '0.0.1' })
})

await server.register(meRoute)
await server.register(clientsRoute)
await server.register(invoicesRoute)
await server.register(paymentsRoute)
await server.register(dashboardRoute)

// ── Background workers ────────────────────────────────────────────────────────

const emailWorker = startEmailWorker(server.log)
const overdueTask = startOverdueWorker(server.log)

// ── Graceful shutdown ─────────────────────────────────────────────────────────

const shutdown = async (signal: string) => {
  server.log.info(`Received ${signal} — shutting down`)
  void overdueTask.stop()
  await emailWorker.close()
  await server.close()
  process.exit(0)
}

process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))

// ── Start ─────────────────────────────────────────────────────────────────────

try {
  await server.listen({ port: env.PORT, host: '0.0.0.0' })
} catch (err) {
  server.log.error(err, 'Server failed to start')
  process.exit(1)
}
