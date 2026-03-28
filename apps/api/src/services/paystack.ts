import crypto from 'node:crypto'
import { env } from '../plugins/env.js'

// ── Types ──────────────────────────────────────────────────────────────────────

interface PaystackInitResponse {
  status: boolean
  message: string
  data: {
    authorization_url: string
    access_code: string
    reference: string
  }
}

interface PaystackWebhookData {
  id: number
  domain: string
  status: string
  reference: string
  amount: number
  currency: string
  paid_at: string
  metadata: Record<string, unknown>
  customer: {
    email: string
    first_name: string | null
    last_name: string | null
  }
}

export interface PaystackWebhookPayload {
  event: string
  data: PaystackWebhookData
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getSecretKey(): string {
  if (!env.PAYSTACK_SECRET_KEY) {
    throw new Error('PAYSTACK_SECRET_KEY is not configured.')
  }
  return env.PAYSTACK_SECRET_KEY
}

// ── Initialize transaction ────────────────────────────────────────────────────

interface InitializeParams {
  invoiceId: string
  invoiceNumber: string
  clientEmail: string
  /** Amount in NGN (will be converted to kobo) */
  amountNgn: number
}

/**
 * Creates a Paystack payment link for an invoice.
 * Returns the authorization_url to redirect the client to.
 * The invoice ID is used as the reference and stored in metadata for webhook lookup.
 */
export async function initializePaystackTransaction(params: InitializeParams): Promise<string> {
  const secretKey = getSecretKey()

  const body = JSON.stringify({
    email: params.clientEmail,
    amount: Math.round(params.amountNgn * 100), // kobo
    reference: params.invoiceId,
    currency: 'NGN',
    metadata: {
      invoiceId: params.invoiceId,
      invoiceNumber: params.invoiceNumber,
    },
  })

  const response = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body,
  })

  const json = (await response.json()) as PaystackInitResponse

  if (!json.status) {
    throw new Error(`Paystack initialization failed: ${json.message}`)
  }

  return json.data.authorization_url
}

// ── Webhook signature verification ───────────────────────────────────────────

/**
 * Verifies the x-paystack-signature header using HMAC-SHA512.
 * Must be called with the raw request body (before JSON parsing).
 */
export function verifyPaystackSignature(rawBody: Buffer, signature: string): boolean {
  if (!env.PAYSTACK_WEBHOOK_SECRET) {
    throw new Error('PAYSTACK_WEBHOOK_SECRET is not configured.')
  }

  const hash = crypto
    .createHmac('sha512', env.PAYSTACK_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex')

  // Use timingSafeEqual to prevent timing attacks
  const hashBuffer = Buffer.from(hash, 'hex')
  const sigBuffer = Buffer.from(signature, 'hex')

  if (hashBuffer.length !== sigBuffer.length) return false

  return crypto.timingSafeEqual(hashBuffer, sigBuffer)
}
