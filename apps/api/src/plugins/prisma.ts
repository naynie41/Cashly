import { PrismaClient } from '@prisma/client'
import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient
  }
}

const prismaPlugin: FastifyPluginAsync = fp(async (server) => {
  const prisma = new PrismaClient({
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'warn' },
    ],
  })

  await prisma.$connect()

  server.decorate('prisma', prisma)

  server.addHook('onClose', async (instance) => {
    await instance.prisma.$disconnect()
  })
})

export default prismaPlugin
