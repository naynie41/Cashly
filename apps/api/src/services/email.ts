import { Resend } from 'resend'
import { render } from '@react-email/render'
import { InvoiceEmail } from '../emails/InvoiceEmail.js'
import { ReminderEmail } from '../emails/ReminderEmail.js'
import { ReceiptEmail } from '../emails/ReceiptEmail.js'
import { env } from '../plugins/env.js'

// ── Lazy Resend client ────────────────────────────────────────────────────────

let _resend: Resend | null = null

export function emailConfigured(): boolean {
  return Boolean(env.RESEND_API_KEY && env.EMAIL_FROM)
}

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
  brandColor?: string | undefined
  logoUrl?: string | null | undefined
  isRevision?: boolean | undefined
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
      brandColor: params.brandColor,
      logoUrl: params.logoUrl,
      isRevision: params.isRevision ?? false,
    }),
  )

  const subject = params.isRevision
    ? `Revised invoice ${params.invoiceNumber} from ${params.businessName}`
    : `Invoice ${params.invoiceNumber} from ${params.businessName}`

  const { error } = await resend.emails.send({
    from: env.EMAIL_FROM!,
    to: params.to,
    subject,
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

// ── Receipt email ─────────────────────────────────────────────────────────────

export interface SendReceiptEmailParams {
  to: string
  bcc: string                  // owner's email — always BCC'd
  clientName: string
  businessName: string
  receiptNumber: string
  invoiceNumber: string
  amountPaid: string
  paidAt: string
  paymentMethod: string
  paymentReference: string
  brandColor?: string | undefined
  logoUrl?: string | null | undefined
  /** PDF attached as `<receiptNumber>.pdf` */
  pdfBuffer: Buffer
}

/**
 * Sends the receipt email to the client with the owner BCC'd and the PDF
 * receipt attached. Throws on Resend error so the BullMQ retry kicks in.
 */
export async function sendReceiptEmail(params: SendReceiptEmailParams): Promise<void> {
  const resend = getResend()

  const html = await render(
    ReceiptEmail({
      businessName: params.businessName,
      clientName: params.clientName,
      receiptNumber: params.receiptNumber,
      invoiceNumber: params.invoiceNumber,
      amountPaid: params.amountPaid,
      paidAt: params.paidAt,
      paymentMethod: params.paymentMethod,
      paymentReference: params.paymentReference,
      brandColor: params.brandColor,
      logoUrl: params.logoUrl,
    }),
  )

  const { error } = await resend.emails.send({
    from: env.EMAIL_FROM!,
    to: params.to,
    bcc: params.bcc,
    subject: `Receipt ${params.receiptNumber} from ${params.businessName}`,
    html,
    attachments: [
      {
        filename: `${params.receiptNumber}.pdf`,
        content: params.pdfBuffer,
      },
    ],
  })

  if (error) {
    throw new Error(`Failed to send receipt email: ${error.message}`)
  }
}
