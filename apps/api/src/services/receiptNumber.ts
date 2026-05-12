import type { PrismaClient, Prisma } from '@prisma/client'

// ── Format ────────────────────────────────────────────────────────────────────

const PAD = 4

/**
 * Formats a sequence integer into the canonical receipt number string.
 * Exposed for tests and for callers that already hold the raw counter.
 */
export function formatReceiptNumber(year: number, seq: number): string {
  if (!Number.isInteger(seq) || seq < 1) {
    throw new Error(`formatReceiptNumber: seq must be a positive integer, got ${seq}`)
  }
  return `RCP-${year}-${String(seq).padStart(PAD, '0')}`
}

/**
 * Extracts the (year, seq) pair from a receipt number. Throws on malformed input.
 * Used in tests and any future migration tooling.
 */
export function parseReceiptNumber(s: string): { year: number; seq: number } {
  const match = /^RCP-(\d{4})-(\d{4,})$/.exec(s)
  if (!match) throw new Error(`parseReceiptNumber: malformed input "${s}"`)
  return { year: Number(match[1]), seq: Number(match[2]) }
}

// ── Allocation ────────────────────────────────────────────────────────────────

/**
 * Atomically allocates the next receipt-number for a user/year inside the
 * given Prisma transaction. The caller is responsible for the surrounding
 * transaction so the counter increment and the receipt insert are committed
 * together — calling this outside a transaction would re-introduce the race
 * we're protecting against.
 *
 * Implementation: upsert the (userId, year) row, then increment lastValue.
 * Both the upsert (when create-fires) and the increment serialize on the row's
 * primary key, so concurrent calls produce strictly increasing values.
 *
 * NOTE: requires a `Prisma.TransactionClient` — pass it via `prisma.$transaction(async (tx) => allocateReceiptNumber(tx, ...))`.
 */
export async function allocateReceiptNumber(
  tx: Prisma.TransactionClient,
  userId: string,
  paidAt: Date,
): Promise<{ receiptNumber: string; year: number; seq: number }> {
  const year = paidAt.getUTCFullYear()

  // Ensure the row exists. Concurrent first-time creates race on the PK; one
  // wins, the other gets a unique-violation we tolerate with a noop update.
  await tx.receiptSequence.upsert({
    where: { userId_year: { userId, year } },
    update: {},
    create: { userId, year, lastValue: 0 },
  })

  // Atomic increment + read of the new value.
  const updated = await tx.receiptSequence.update({
    where: { userId_year: { userId, year } },
    data: { lastValue: { increment: 1 } },
    select: { lastValue: true },
  })

  return {
    receiptNumber: formatReceiptNumber(year, updated.lastValue),
    year,
    seq: updated.lastValue,
  }
}

/**
 * Convenience wrapper that opens its own transaction. Prefer
 * `allocateReceiptNumber` when you need to bundle the allocation with other
 * writes (which is the normal case — see receipts service).
 */
export async function allocateReceiptNumberStandalone(
  prisma: PrismaClient,
  userId: string,
  paidAt: Date,
): Promise<{ receiptNumber: string; year: number; seq: number }> {
  return prisma.$transaction((tx) => allocateReceiptNumber(tx, userId, paidAt))
}
