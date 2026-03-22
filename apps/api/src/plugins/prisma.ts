import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { prisma } from '../lib/prisma.js'

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient
  }
}

const prismaPlugin: FastifyPluginAsync = fp(async (server) => {
  server.decorate('prisma', prisma)

  server.addHook('onClose', async (instance) => {
    await instance.prisma.$disconnect()
    instance.log.info('Prisma disconnected')
  })
})

export default prismaPlugin
