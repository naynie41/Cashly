import { Redis } from 'ioredis'
import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'
import { env } from './env.js'

declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis
  }
}

const redisPlugin: FastifyPluginAsync = fp(async (server) => {
  const redis = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null, // required for BullMQ
    enableReadyCheck: false,
    lazyConnect: true,
  })

  redis.on('error', (err: Error) => {
    server.log.error({ err }, 'Redis error')
  })

  redis.on('connect', () => {
    server.log.info('Redis connected')
  })

  redis.on('reconnecting', () => {
    server.log.warn('Redis reconnecting')
  })

  // lazyConnect: true — the connection opens on the first command.
  // This lets the server start and serve /health even when Redis is
  // temporarily unavailable (e.g. dev machine without Docker running).
  server.decorate('redis', redis)

  server.addHook('onClose', async (instance) => {
    await instance.redis.quit()
    instance.log.info('Redis disconnected')
  })
})

export default redisPlugin
