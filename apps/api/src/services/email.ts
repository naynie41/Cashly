import { Resend } from 'resend'
import { render } from '@react-email/render'
import { InvoiceEmail } from '../emails/InvoiceEmail.js'
import { ReminderEmail } from '../emails/ReminderEmail.js'
import { env } from '../plugins/env.js'

// ── Lazy Resend client ────────────────────────────────────────────────────────

let _resend: Resend | null = null

function getResend(): Resend {
  if (_resend) return _resend

  if (!env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured.')
  }
  if (!env.EMAIL_FROM) {
    throw new Error('EMAIL_FROM is not configured.')
  }

  _resend = new Resend(env.RESEND_API_KEY)
  return _resend
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SendInvoiceEmailParams {
  to: string
  clientName: string
  businessName: string
  invoiceNumber: string
  invoiceTotal: string
  dueDate: string
  pdfUrl: string
  paymentUrl?: string | undefined
  notes?: string | null | undefined
}

// ── Email sender ──────────────────────────────────────────────────────────────

/**
 * Sends an invoice email to the client via Resend.
 * Renders the React Email template to HTML before sending.
 */
export async function sendInvoiceEmail(params: SendInvoiceEmailParams): Promise<void> {
  const resend = getResend()

  const html = await render(
    InvoiceEmail({
      businessName: params.businessName,
      clientName: params.clientName,
      invoiceNumber: params.invoiceNumber,
      invoiceTotal: params.invoiceTotal,
      dueDate: params.dueDate,
      pdfUrl: params.pdfUrl,
      paymentUrl: params.paymentUrl,
      notes: params.notes,
    }),
  )

  const { error } = await resend.emails.send({
    from: env.EMAIL_FROM!,
    to: params.to,
    subject: `Invoice ${params.invoiceNumber} from ${params.businessName}`,
    html,
  })

  if (error) {
    throw new Error(`Failed to send invoice email: ${error.message}`)
  }
}

// ── Reminder email ────────────────────────────────────────────────────────────

export interface SendReminderEmailParams {
  to: string
  clientName: string
  businessName: string
  invoiceNumber: string
  invoiceTotal: string
  dueDate: string
  daysOverdue: number
  paymentUrl?: string | undefined
}

/**
 * Sends an overdue reminder email to the client via Resend.
 */
export async function sendReminderEmail(params: SendReminderEmailParams): Promise<void> {
  const resend = getResend()

  const html = await render(
    ReminderEmail({
      businessName: params.businessName,
      clientName: params.clientName,
      invoiceNumber: params.invoiceNumber,
      invoiceTotal: params.invoiceTotal,
      dueDate: params.dueDate,
      daysOverdue: params.daysOverdue,
      paymentUrl: params.paymentUrl,
    }),
  )

  const { error } = await resend.emails.send({
    from: env.EMAIL_FROM!,
    to: params.to,
    subject: `Payment Reminder: Invoice ${params.invoiceNumber} is ${params.daysOverdue} day${params.daysOverdue !== 1 ? 's' : ''} overdue`,
    html,
  })

  if (error) {
    throw new Error(`Failed to send reminder email: ${error.message}`)
  }
}
