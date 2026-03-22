import { PrismaClient } from '@prisma/client'

// Singleton — shared between the Fastify plugin and the Better Auth instance.
export const prisma = new PrismaClient()
