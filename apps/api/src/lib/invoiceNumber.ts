import type { PrismaClient } from '@prisma/client'

/**
 * Generates the next invoice number for a user in INV-0001 format.
 * Finds the highest existing number for the user and increments by 1.
 * Scoped per user — two users can both have INV-0001.
 */
export async function generateInvoiceNumber(prisma: PrismaClient, userId: string): Promise<string> {
  const latest = await prisma.invoice.findFirst({
    where: { userId },
    orderBy: { invoiceNumber: 'desc' },
    select: { invoiceNumber: true },
  })

  if (!latest) {
    return 'INV-0001'
  }

  // Extract the numeric part from e.g. "INV-0042" → 42
  const match = /^INV-(\d+)$/.exec(latest.invoiceNumber)
  const current = match ? parseInt(match[1]!, 10) : 0
  const next = current + 1

  return `INV-${String(next).padStart(4, '0')}`
}
