import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { Decimal } from '@prisma/client/runtime/library'
import { requireAuth } from '../../plugins/auth.js'
import { badRequest } from '../../lib/errors.js'

// ── Supported currencies ──────────────────────────────────────────────────────

const SUPPORTED_CURRENCIES = ['NGN', 'USD', 'GBP', 'EUR', 'GHS', 'KES', 'ZAR'] as const

// ── Validation schema ─────────────────────────────────────────────────────────

const onboardingSchema = z.object({
  businessName: z.string().min(2).optional(),
  industry: z.string().optional(),
  businessAddress: z.string().optional(),
  businessPhone: z.string().optional(),
  businessWebsite: z.string().url().optional().or(z.literal('')),
  brandColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex colour e.g. #6366f1')
    .optional(),
  defaultTaxRate: z.number().min(0).max(100).optional(),
  invoicePrefix: z
    .string()
    .max(6, 'Prefix must be 6 characters or less')
    .regex(/^[A-Z0-9]+$/i, 'Only letters and numbers allowed')
    .transform((v) => v.toUpperCase())
    .optional(),
  currency: z.enum(SUPPORTED_CURRENCIES).optional(),
  onboardingDone: z.boolean().optional(),
})

// ── Plugin ────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/require-await
const onboardingRoute: FastifyPluginAsync = fp(async (server) => {
  // ── PATCH /api/onboarding ────────────────────────────────────────────────
  server.patch('/api/onboarding', { preHandler: requireAuth }, async (request, reply) => {
    const parsed = onboardingSchema.safeParse(request.body)
    if (!parsed.success) {
      return badRequest(reply, parsed.error.issues[0]?.message ?? 'Invalid request')
    }

    const {
      businessName,
      industry,
      businessAddress,
      businessPhone,
      businessWebsite,
      brandColor,
      defaultTaxRate,
      invoicePrefix,
      currency,
      onboardingDone,
    } = parsed.data

    const updated = await server.prisma.user.update({
      where: { id: request.user!.id },
      data: {
        ...(businessName !== undefined && { businessName }),
        ...(industry !== undefined && { industry }),
        ...(businessAddress !== undefined && { businessAddress }),
        ...(businessPhone !== undefined && { businessPhone }),
        ...(businessWebsite !== undefined && { businessWebsite: businessWebsite || null }),
        ...(brandColor !== undefined && { brandColor }),
        ...(defaultTaxRate !== undefined && { defaultTaxRate: new Decimal(defaultTaxRate) }),
        ...(invoicePrefix !== undefined && { invoicePrefix }),
        ...(currency !== undefined && { currency }),
        ...(onboardingDone !== undefined && { onboardingDone }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        businessName: true,
        industry: true,
        businessAddress: true,
        businessPhone: true,
        businessWebsite: true,
        brandColor: true,
        currency: true,
        logoUrl: true,
        defaultTaxRate: true,
        invoicePrefix: true,
        onboardingDone: true,
      },
    })

    return reply.send({
      data: {
        ...updated,
        defaultTaxRate: updated.defaultTaxRate !== null ? Number(updated.defaultTaxRate) : null,
      },
    })
  })
})

export default onboardingRoute
