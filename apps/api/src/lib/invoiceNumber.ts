import type { PrismaClient } from '@prisma/client'

/**
 * Generates the next invoice number for a user using their configured prefix.
 * Format: {PREFIX}-0001, {PREFIX}-0002, etc. — scoped per user.
 * Falls back to 'INV' if no prefix is set.
 */
export async function generateInvoiceNumber(prisma: PrismaClient, userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { invoicePrefix: true },
  })

  const prefix = user?.invoicePrefix ?? 'INV'

  const latest = await prisma.invoice.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { invoiceNumber: true },
  })

  if (!latest) {
    return `${prefix}-0001`
  }

  // Extract the numeric part from e.g. "INV-0042" or "CLI-0042" → 42
  const match = /^[A-Z0-9]+-(\d+)$/i.exec(latest.invoiceNumber)
  const current = match ? parseInt(match[1]!, 10) : 0
  const next = current + 1

  return `${prefix}-${String(next).padStart(4, '0')}`
}
