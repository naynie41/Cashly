import Anthropic from '@anthropic-ai/sdk'
import { env } from '../plugins/env.js'

// ── Client ────────────────────────────────────────────────────────────────────

let _client: Anthropic | null = null

function getClient(): Anthropic {
  if (_client) return _client
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured.')
  }
  _client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })
  return _client
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MonthlySummaryInput {
  monthYear: string // e.g. "March 2026"
  totalInvoiced: number
  totalReceived: number
  totalOutstanding: number
  overdueCount: number
  totalOverdue: number
  invoicesSent: number
  invoicesPaid: number
  biggestOverdueClient: { name: string; amount: number; daysOverdue: number } | null
  currency: string
}

// ── Prompt builder ────────────────────────────────────────────────────────────

function formatCurrency(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString('en-NG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`
}

function buildPrompt(data: MonthlySummaryInput): string {
  const fmt = (n: number) => formatCurrency(n, data.currency)

  const biggestOverdueLine = data.biggestOverdueClient
    ? `- Biggest overdue client: ${data.biggestOverdueClient.name} — ${fmt(data.biggestOverdueClient.amount)}, ${data.biggestOverdueClient.daysOverdue} days overdue`
    : '- Biggest overdue client: None'

  return `You are a financial assistant for a small business owner.
Given the following invoice data for ${data.monthYear}, write a 2-3 sentence plain-English summary of their cash flow. Be specific with numbers. Mention the biggest overdue client by name if one exists. Be direct and friendly — no jargon.

Data:
- Total invoiced: ${fmt(data.totalInvoiced)}
- Total received: ${fmt(data.totalReceived)}
- Outstanding: ${fmt(data.totalOutstanding)}
- Overdue invoices: ${data.overdueCount} totalling ${fmt(data.totalOverdue)}
${biggestOverdueLine}
- Number of invoices sent: ${data.invoicesSent}
- Number of invoices paid: ${data.invoicesPaid}`
}

// ── Summary generator ─────────────────────────────────────────────────────────

/**
 * Calls the Claude API to generate a plain-English cash flow summary
 * for the given month's financial data.
 */
export async function generateMonthlySummary(data: MonthlySummaryInput): Promise<string> {
  const client = getClient()
  const prompt = buildPrompt(data)

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 256,
    messages: [{ role: 'user', content: prompt }],
  })

  const block = message.content[0]
  if (!block || block.type !== 'text') {
    throw new Error('Unexpected response format from Claude API')
  }

  return block.text.trim()
}
