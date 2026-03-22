import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'

const server = Fastify({
  logger: {
    level: process.env['LOG_LEVEL'] ?? 'info',
  },
})

// CORS
await server.register(cors, {
  origin: process.env['FRONTEND_URL'] ?? 'http://localhost:3000',
  credentials: true,
})

// JWT
await server.register(jwt, {
  secret: process.env['JWT_SECRET'] ?? 'dev-secret-change-in-production',
})

// Health check — required for ECS target group health checks
server.get('/health', async (_request, reply) => {
  return reply.code(200).send({ status: 'ok' })
})

// Root
server.get('/', async (_request, reply) => {
  return reply.send({ name: 'cashly-api', version: '0.0.1' })
})

const port = Number(process.env['PORT'] ?? 3001)
const host = process.env['HOST'] ?? '0.0.0.0'

try {
  await server.listen({ port, host })
  server.log.info(`API server listening on port ${port}`)
} catch (err) {
  server.log.error(err)
  process.exit(1)
}
