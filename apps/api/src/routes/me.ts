import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'
import { requireAuth } from '../plugins/auth.js'

const meRoute: FastifyPluginAsync = fp(async (server) => {
  server.get(
    '/api/me',
    { preHandler: requireAuth },
    async (request, reply) => {
      // request.user is guaranteed non-null after requireAuth
      const user = await server.prisma.user.findUnique({
        where: { id: request.user!.id },
        select: {
          id: true,
          name: true,
          email: true,
          emailVerified: true,
          image: true,
          businessName: true,
          brandColor: true,
          currency: true,
          createdAt: true,
          updatedAt: true,
        },
      })

      if (!user) {
        return reply.code(404).send({ error: 'User not found' })
      }

      return reply.send({ data: user })
    },
  )
})

export default meRoute
