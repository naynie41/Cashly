import { describe, it, expect, vi } from 'vitest'
import {
  allocateReceiptNumber,
  formatReceiptNumber,
  parseReceiptNumber,
} from './receiptNumber.js'
import type { Prisma } from '@prisma/client'

// ── formatReceiptNumber ────────────────────────────────────────────────────────

describe('formatReceiptNumber', () => {
  it('zero-pads the sequence to 4 digits', () => {
    expect(formatReceiptNumber(2026, 1)).toBe('RCP-2026-0001')
    expect(formatReceiptNumber(2026, 42)).toBe('RCP-2026-0042')
  })

  it('does not truncate sequences that exceed 4 digits', () => {
    expect(formatReceiptNumber(2026, 9_999)).toBe('RCP-2026-9999')
    expect(formatReceiptNumber(2026, 10_000)).toBe('RCP-2026-10000')
  })

  it('uses the year as given (no shifting)', () => {
    expect(formatReceiptNumber(2099, 7)).toBe('RCP-2099-0007')
  })

  it('rejects non-positive or non-integer sequences', () => {
    expect(() => formatReceiptNumber(2026, 0)).toThrow(/positive integer/)
    expect(() => formatReceiptNumber(2026, -1)).toThrow(/positive integer/)
    expect(() => formatReceiptNumber(2026, 1.5)).toThrow(/positive integer/)
  })
})

// ── parseReceiptNumber ─────────────────────────────────────────────────────────

describe('parseReceiptNumber', () => {
  it('round-trips with formatReceiptNumber', () => {
    for (const [year, seq] of [
      [2026, 1],
      [2099, 9_999],
      [2026, 10_000],
    ] as const) {
      expect(parseReceiptNumber(formatReceiptNumber(year, seq))).toEqual({ year, seq })
    }
  })

  it('throws on malformed input', () => {
    for (const bad of ['INV-2026-0001', 'RCP-26-0001', 'RCP-2026-01', 'RCP-2026-', 'something']) {
      expect(() => parseReceiptNumber(bad)).toThrow(/malformed/)
    }
  })
})

// ── allocateReceiptNumber ──────────────────────────────────────────────────────
//
// The race-safety property comes from Postgres row locking and can only be
// proven with a real DB; that lives in the integration suite. These tests pin
// down the contract this service has with Prisma so a refactor can't silently
// break it: upsert by (userId, year), then increment, return the formatted
// value tied to that exact counter.

interface SeqRow {
  userId: string
  year: number
  lastValue: number
}

function makeFakeTx(rows: SeqRow[]): Prisma.TransactionClient {
  const find = (userId: string, year: number) =>
    rows.find((r) => r.userId === userId && r.year === year)

  // Only the methods this service touches are stubbed. Anything else throws so
  // tests fail loudly if the service starts depending on something new.
  const tx = {
    receiptSequence: {
      upsert: vi.fn(
        async ({
          where,
          create,
        }: {
          where: { userId_year: { userId: string; year: number } }
          create: SeqRow
        }) => {
          const existing = find(where.userId_year.userId, where.userId_year.year)
          if (!existing) rows.push({ ...create })
          return existing ?? rows[rows.length - 1]!
        },
      ),
      update: vi.fn(
        async ({
          where,
          data,
        }: {
          where: { userId_year: { userId: string; year: number } }
          data: { lastValue: { increment: number } }
        }) => {
          const row = find(where.userId_year.userId, where.userId_year.year)
          if (!row) throw new Error('update on missing row — should never happen post-upsert')
          row.lastValue += data.lastValue.increment
          return { lastValue: row.lastValue }
        },
      ),
    },
  }
  return tx as unknown as Prisma.TransactionClient
}

describe('allocateReceiptNumber', () => {
  it('returns the first sequence value for a fresh (user, year) row', async () => {
    const tx = makeFakeTx([])
    const result = await allocateReceiptNumber(tx, 'user-a', new Date('2026-03-15T10:00:00Z'))
    expect(result).toEqual({ receiptNumber: 'RCP-2026-0001', year: 2026, seq: 1 })
  })

  it('increments monotonically for the same (user, year)', async () => {
    const rows: SeqRow[] = []
    const tx = makeFakeTx(rows)
    const r1 = await allocateReceiptNumber(tx, 'user-a', new Date('2026-01-02T00:00:00Z'))
    const r2 = await allocateReceiptNumber(tx, 'user-a', new Date('2026-12-31T23:00:00Z'))
    const r3 = await allocateReceiptNumber(tx, 'user-a', new Date('2026-06-15T12:00:00Z'))
    expect([r1.receiptNumber, r2.receiptNumber, r3.receiptNumber]).toEqual([
      'RCP-2026-0001',
      'RCP-2026-0002',
      'RCP-2026-0003',
    ])
  })

  it('uses independent counters per user', async () => {
    const tx = makeFakeTx([])
    const a1 = await allocateReceiptNumber(tx, 'user-a', new Date('2026-04-01'))
    const b1 = await allocateReceiptNumber(tx, 'user-b', new Date('2026-04-01'))
    const a2 = await allocateReceiptNumber(tx, 'user-a', new Date('2026-04-02'))
    expect(a1.receiptNumber).toBe('RCP-2026-0001')
    expect(b1.receiptNumber).toBe('RCP-2026-0001')
    expect(a2.receiptNumber).toBe('RCP-2026-0002')
  })

  it('starts a new counter when the year changes', async () => {
    const tx = makeFakeTx([])
    const a2026 = await allocateReceiptNumber(tx, 'user-a', new Date('2026-12-31T23:59:59Z'))
    const a2027 = await allocateReceiptNumber(tx, 'user-a', new Date('2027-01-01T00:00:01Z'))
    expect(a2026.receiptNumber).toBe('RCP-2026-0001')
    expect(a2027.receiptNumber).toBe('RCP-2027-0001')
  })

  it('uses UTC year — 23:30 on Dec 31 in a +01:00 timezone is still 2026', async () => {
    // 2026-12-31T23:30 UTC == 2027-01-01 00:30 +01:00
    const tx = makeFakeTx([])
    const r = await allocateReceiptNumber(tx, 'user-a', new Date('2026-12-31T23:30:00Z'))
    expect(r.year).toBe(2026)
    expect(r.receiptNumber).toBe('RCP-2026-0001')
  })
})
