'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'

// ── Types ──────────────────────────────────────────────────────────────────────

interface LineItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  amount: number
}

interface InvoiceDetail {
  id: string
  invoiceNumber: string
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE'
  issueDate: string
  dueDate: string
  subtotal: number
  taxRate: number
  discount: number
  total: number
  notes: string | null
  pdfUrl: string | null
  paymentUrl: string | null
  createdAt: string
  updatedAt: string
  revisedAt: string | null
  lineItems: LineItem[]
  client: {
    id: string
    name: string
    email: string
    phone: string | null
    address: string | null
  }
  user: {
    name: string
    email: string
    businessName: string | null
    currency: string
    brandColor: string | null
    logoUrl: string | null
  }
  payment: { paidAt: string; amountPaid: number } | null
  receipts: ReceiptSummary[]
}

interface ReceiptSummary {
  id: string
  receiptNumber: string
  paymentReference: string
  amountPaid: number
  currency: string
  paidAt: string
  paymentMethod: string
  pdfUrl: string | null
  emailSentAt: string | null
  createdAt: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const fmt = (n: number, currency = 'NGN') =>
  `${currency} ${n.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

const capitalize = (s: string) => (s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1))

const fmtDateTime = (d: string) =>
  new Date(d).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

// Tailwind can't compile arbitrary brand colours, so status accent uses a CSS var.
const statusAccent: Record<InvoiceDetail['status'], string> = {
  PAID: '#0F7A52',
  OVERDUE: '#C92B2B',
  SENT: '#1F6B6B',
  DRAFT: '#6F6F68',
}

// ── Toast ──────────────────────────────────────────────────────────────────────

function Toast({
  message,
  type,
  onDismiss,
}: {
  message: string
  type: 'success' | 'error'
  onDismiss: () => void
}) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000)
    return () => clearTimeout(t)
  }, [onDismiss])

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 shadow-lg animate-fade-up ${
        type === 'success' ? 'bg-cashly-black text-white' : 'bg-red-600 text-white'
      }`}
    >
      <span className="font-sans text-sm font-medium">{message}</span>
      <button onClick={onDismiss} className="text-white/50 hover:text-white">
        ×
      </button>
    </div>
  )
}

// ── Status pill ────────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: InvoiceDetail['status'] }) {
  return (
    <span
      className="inline-flex items-center gap-2 border px-3 py-1 font-sans text-[10px] font-bold uppercase tracking-[0.2em]"
      style={{ color: statusAccent[status], borderColor: statusAccent[status] }}
    >
      <span
        className="inline-block h-1.5 w-1.5"
        style={{ backgroundColor: statusAccent[status] }}
      />
      {status}
    </span>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [resendingReceiptId, setResendingReceiptId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    api
      .get<{ data: InvoiceDetail }>(`/invoices/${id}`)
      .then((res) => setInvoice(res.data))
      .catch(() => router.push('/invoices'))
      .finally(() => setLoading(false))
  }, [id, router])

  const handleResendReceipt = async (receiptId: string) => {
    if (!invoice || resendingReceiptId !== null) return
    setResendingReceiptId(receiptId)
    try {
      await api.post(`/api/invoices/${invoice.id}/receipts/${receiptId}/resend`)
      // The job runs async on the worker; reflect the request optimistically
      // by clearing emailSentAt so the UI shows "Queued" until the worker
      // stamps it again on next page load.
      setInvoice((prev) =>
        prev
          ? {
              ...prev,
              receipts: prev.receipts.map((r) =>
                r.id === receiptId ? { ...r, emailSentAt: null } : r,
              ),
            }
          : prev,
      )
      setToast({ message: 'Receipt queued — refresh in a moment to confirm.', type: 'success' })
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : 'Could not queue receipt.',
        type: 'error',
      })
    } finally {
      setResendingReceiptId(null)
    }
  }

  const handleSend = async () => {
    if (!invoice) return
    setSending(true)
    try {
      const res = await api.post<{
        data: { pdfUrl: string; paymentUrl: string | null; status: string }
      }>(`/invoices/${invoice.id}/send`)
      setInvoice((prev) =>
        prev
          ? { ...prev, status: 'SENT', pdfUrl: res.data.pdfUrl, paymentUrl: res.data.paymentUrl }
          : prev,
      )
      setToast({ message: `Invoice sent to ${invoice.client.email}`, type: 'success' })
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : 'Failed to send invoice',
        type: 'error',
      })
    } finally {
      setSending(false)
    }
  }

  // ── Loading skeleton ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-cashly-cream">
        <div className="h-2 w-full animate-pulse bg-black/10" />
        <div className="px-12 py-12">
          <div className="mb-10 grid grid-cols-2 gap-12">
            <div className="h-24 animate-pulse bg-black/5" />
            <div className="h-24 animate-pulse bg-black/5" />
          </div>
          <div className="h-64 animate-pulse bg-black/5" />
        </div>
      </div>
    )
  }

  if (!invoice) return null

  const brand = invoice.user.brandColor ?? '#6366f1'
  const businessName = invoice.user.businessName ?? invoice.user.name
  const taxAmount = invoice.subtotal * (invoice.taxRate / 100)
  const canSend = invoice.status === 'DRAFT' || invoice.status === 'SENT'
  const canEdit =
    invoice.status === 'DRAFT' || invoice.status === 'SENT' || invoice.status === 'OVERDUE'
  const hasUnsentRevisions = invoice.revisedAt !== null

  return (
    <div
      className="min-h-screen bg-cashly-cream"
      style={{ ['--brand' as string]: brand } as React.CSSProperties}
    >
      {/* ── Brand stripe ──────────────────────────────────────────────────── */}
      <div className="h-2 w-full" style={{ backgroundColor: brand }} />

      {/* ── Toolbar ───────────────────────────────────────────────────────── */}
      <div className="border-b border-black/[0.08] bg-cashly-cream/80 backdrop-blur-sm">
        <div className="flex items-center justify-between px-12 py-4">
          <Link
            href="/invoices"
            className="font-sans text-xs font-medium uppercase tracking-[0.2em] text-cashly-gray transition-colors hover:text-cashly-black"
          >
            ← Invoices
          </Link>
          <div className="flex items-center gap-3">
            {canEdit && (
              <Link
                href={`/invoices/${invoice.id}/edit`}
                className="border border-black/20 bg-transparent px-5 py-2.5 font-sans text-xs font-semibold uppercase tracking-[0.15em] text-cashly-black transition-colors hover:border-cashly-black hover:bg-cashly-black hover:text-white"
              >
                Edit
              </Link>
            )}
            {invoice.pdfUrl && (
              <a
                href={invoice.pdfUrl}
                target="_blank"
                rel="noreferrer"
                download={`${invoice.invoiceNumber}.pdf`}
                className="border border-black/20 bg-transparent px-5 py-2.5 font-sans text-xs font-semibold uppercase tracking-[0.15em] text-cashly-black transition-colors hover:border-cashly-black hover:bg-cashly-black hover:text-white"
              >
                Download PDF
              </a>
            )}
            {invoice.status === 'SENT' && invoice.paymentUrl && (
              <a
                href={invoice.paymentUrl}
                target="_blank"
                rel="noreferrer"
                className="px-5 py-2.5 font-sans text-xs font-bold uppercase tracking-[0.15em] text-white transition-opacity hover:opacity-85"
                style={{ backgroundColor: brand }}
              >
                Open Pay Link
              </a>
            )}
            {canSend && (
              <button
                onClick={() => void handleSend()}
                disabled={sending}
                className="border border-cashly-black bg-cashly-black px-5 py-2.5 font-sans text-xs font-semibold uppercase tracking-[0.15em] text-white transition-all hover:bg-transparent hover:text-cashly-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sending
                  ? 'Sending…'
                  : invoice.status === 'SENT'
                    ? 'Resend'
                    : 'Send Invoice'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Document ──────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-[940px] bg-white">
        {/* ── Revised banner ─────────────────────────────────────────────── */}
        {hasUnsentRevisions && (
          <div
            className="flex items-center justify-between gap-4 border-b border-amber-300 bg-amber-50 px-12 py-3.5 animate-fade-up"
            role="status"
          >
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center justify-center font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-amber-900">
                <span className="mr-2 inline-block h-2 w-2 bg-amber-500" />
                Revised
              </span>
              <span className="font-sans text-[13px] text-amber-900/90">
                Edits made on {fmtDate(invoice.revisedAt!)} haven't been sent to the client yet —
                <span className="font-semibold"> Resend</span> to deliver the updated invoice.
              </span>
            </div>
            {canSend && (
              <button
                onClick={() => void handleSend()}
                disabled={sending}
                className="whitespace-nowrap border border-amber-900 bg-amber-900 px-4 py-2 font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-amber-50 transition-colors hover:bg-amber-800 disabled:opacity-50"
              >
                {sending ? 'Sending…' : 'Resend now'}
              </button>
            )}
          </div>
        )}

        {/* ── Identity row ───────────────────────────────────────────────── */}
        <section
          className="grid grid-cols-[1fr_auto] gap-12 px-12 pb-9 pt-14 animate-fade-up"
          style={{ animationDelay: '0ms' }}
        >
          <div className="flex flex-col gap-3.5">
            {invoice.user.logoUrl && (
              <div className="flex h-16 w-16 items-center justify-center border border-black/[0.08] bg-cashly-cream">
                <img
                  src={invoice.user.logoUrl}
                  alt={businessName}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            )}
            <div>
              <div
                className="font-barlow text-2xl font-black uppercase leading-tight tracking-tight text-cashly-black"
                style={{ letterSpacing: '-0.02em' }}
              >
                {businessName}
              </div>
              <div className="mt-1 flex flex-col font-sans text-xs leading-relaxed text-cashly-gray">
                <span>{invoice.user.email}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2.5 text-right">
            <div
              className="font-barlow font-black uppercase leading-[0.92] text-cashly-black"
              style={{ fontSize: '4rem', letterSpacing: '-0.04em' }}
            >
              Invoice
            </div>
            <div className="font-sans text-[13px] font-semibold tabular-nums tracking-[0.06em] text-cashly-gray">
              <span className="mr-1" style={{ color: brand }}>
                №
              </span>
              {invoice.invoiceNumber}
            </div>
            <StatusPill status={invoice.status} />
          </div>
        </section>

        {/* ── Meta band ──────────────────────────────────────────────────── */}
        <section className="grid grid-cols-4 border-y border-black/[0.18] bg-cashly-cream/60">
          {[
            { lbl: 'Issue Date', val: fmtDate(invoice.issueDate) },
            { lbl: 'Due Date', val: fmtDate(invoice.dueDate) },
            { lbl: 'Currency', val: invoice.user.currency },
            { lbl: 'Amount Due', val: fmt(invoice.total, invoice.user.currency) },
          ].map((cell, i) => (
            <div
              key={cell.lbl}
              className={`flex flex-col gap-1.5 px-6 py-5 ${i > 0 ? 'border-l border-black/[0.08]' : ''}`}
            >
              <span className="font-sans text-[9px] font-bold uppercase tracking-[0.22em] text-cashly-gray">
                {cell.lbl}
              </span>
              <span className="font-sans text-sm font-bold tabular-nums tracking-tight text-cashly-black">
                {cell.val}
              </span>
            </div>
          ))}
        </section>

        {/* ── Parties ────────────────────────────────────────────────────── */}
        <section
          className="grid grid-cols-2 px-12 pb-7 pt-8 animate-fade-up"
          style={{ animationDelay: '60ms' }}
        >
          <div className="flex flex-col gap-1.5 pr-8">
            <span className="mb-1 font-sans text-[9px] font-bold uppercase tracking-[0.22em] text-cashly-gray">
              From
            </span>
            <span className="font-sans text-base font-bold text-cashly-black">{businessName}</span>
            <span className="font-sans text-[11.5px] leading-relaxed text-cashly-gray">
              {invoice.user.email}
            </span>
          </div>
          <div className="flex flex-col gap-1.5 border-l border-black/[0.08] pl-8">
            <span className="mb-1 font-sans text-[9px] font-bold uppercase tracking-[0.22em] text-cashly-gray">
              Bill To
            </span>
            <span className="font-sans text-base font-bold text-cashly-black">
              {invoice.client.name}
            </span>
            {invoice.client.address && (
              <span className="font-sans text-[11.5px] leading-relaxed text-cashly-gray">
                {invoice.client.address}
              </span>
            )}
            <span className="font-sans text-[11.5px] leading-relaxed text-cashly-gray">
              {invoice.client.email}
            </span>
            {invoice.client.phone && (
              <span className="font-sans text-[11.5px] leading-relaxed text-cashly-gray">
                {invoice.client.phone}
              </span>
            )}
            <Link
              href={`/clients/${invoice.client.id}`}
              className="mt-2 font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-cashly-black underline-offset-4 hover:underline"
            >
              View client →
            </Link>
          </div>
        </section>

        {/* ── Line items ─────────────────────────────────────────────────── */}
        <section
          className="px-12 animate-fade-up"
          style={{ animationDelay: '100ms' }}
        >
          <table className="w-full border-y-2 border-cashly-black">
            <thead>
              <tr className="border-b border-cashly-black">
                {[
                  { label: '№', align: 'left' },
                  { label: 'Description', align: 'left' },
                  { label: 'Qty', align: 'right' },
                  { label: 'Unit Price', align: 'right' },
                  { label: 'Amount', align: 'right' },
                ].map((h) => (
                  <th
                    key={h.label}
                    className={`px-3 py-3.5 font-sans text-[9px] font-bold uppercase tracking-[0.22em] text-cashly-black ${
                      h.align === 'right' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoice.lineItems.map((li, i) => (
                <tr
                  key={li.id}
                  className={`border-b border-black/[0.08] last:border-b-0 ${i % 2 === 1 ? 'bg-cashly-cream/50' : ''}`}
                >
                  <td className="px-3 py-4 font-sans text-[10px] font-semibold tabular-nums tracking-wider text-cashly-gray/70">
                    {String(i + 1).padStart(2, '0')}
                  </td>
                  <td className="px-3 py-4 font-sans text-sm font-medium leading-snug text-cashly-black">
                    {li.description}
                  </td>
                  <td className="px-3 py-4 text-right font-sans text-sm tabular-nums text-cashly-gray">
                    {li.quantity}
                  </td>
                  <td className="px-3 py-4 text-right font-sans text-sm tabular-nums text-cashly-gray">
                    {fmt(li.unitPrice, invoice.user.currency)}
                  </td>
                  <td className="px-3 py-4 text-right font-sans text-sm font-semibold tabular-nums text-cashly-black">
                    {fmt(li.amount, invoice.user.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* ── Totals ─────────────────────────────────────────────────────── */}
        <section
          className="grid grid-cols-[1fr_320px] gap-10 px-12 py-9 animate-fade-up"
          style={{ animationDelay: '140ms' }}
        >
          <div className="flex items-end">
            <p className="font-sans text-[9px] font-bold uppercase tracking-[0.22em] leading-relaxed text-cashly-gray/70">
              Thank you for your
              <br />
              business.
            </p>
          </div>

          <div className="flex flex-col">
            <div className="flex items-baseline justify-between border-b border-black/[0.08] py-2 font-sans tabular-nums">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-cashly-gray">
                Subtotal
              </span>
              <span className="text-[13px] font-semibold text-cashly-black/85">
                {fmt(invoice.subtotal, invoice.user.currency)}
              </span>
            </div>
            {invoice.taxRate > 0 && (
              <div className="flex items-baseline justify-between border-b border-black/[0.08] py-2 font-sans tabular-nums">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-cashly-gray">
                  Tax · {invoice.taxRate}%
                </span>
                <span className="text-[13px] font-semibold text-cashly-black/85">
                  {fmt(taxAmount, invoice.user.currency)}
                </span>
              </div>
            )}
            {invoice.discount > 0 && (
              <div className="flex items-baseline justify-between border-b border-black/[0.08] py-2 font-sans tabular-nums">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-cashly-gray">
                  Discount
                </span>
                <span className="text-[13px] font-semibold text-cashly-black/85">
                  −{fmt(invoice.discount, invoice.user.currency)}
                </span>
              </div>
            )}
            <div className="mt-1 flex items-baseline justify-between border-t-2 border-cashly-black pt-4 font-sans tabular-nums">
              <span className="font-barlow text-xs font-bold uppercase tracking-[0.22em] text-cashly-black">
                Total Due
              </span>
              <span
                className="font-barlow text-3xl font-black tracking-tight"
                style={{ color: brand, letterSpacing: '-0.02em' }}
              >
                {fmt(invoice.total, invoice.user.currency)}
              </span>
            </div>
          </div>
        </section>

        {/* ── Pay callout ────────────────────────────────────────────────── */}
        {invoice.paymentUrl && invoice.status !== 'PAID' && (
          <section
            className="mx-12 mb-9 grid grid-cols-[1fr_auto] items-center gap-6 px-7 py-6 animate-fade-up"
            style={{ animationDelay: '180ms', backgroundColor: brand, color: '#fff' }}
          >
            <div className="flex flex-col gap-1">
              <span className="font-sans text-[9px] font-bold uppercase tracking-[0.22em] text-white/70">
                Pay this invoice
              </span>
              <span className="font-sans text-lg font-extrabold tracking-tight">
                Settle {fmt(invoice.total, invoice.user.currency)} securely online
              </span>
              <span className="break-all font-sans text-[11px] text-white/85">
                {invoice.paymentUrl}
              </span>
            </div>
            <a
              href={invoice.paymentUrl}
              target="_blank"
              rel="noreferrer"
              className="whitespace-nowrap border-2 border-white/95 px-5 py-2.5 font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-white/10"
            >
              Pay Now →
            </a>
          </section>
        )}

        {/* ── Notes ──────────────────────────────────────────────────────── */}
        {invoice.notes && (
          <section
            className="grid grid-cols-[100px_1fr] gap-6 border-t border-black/[0.08] px-12 py-7 animate-fade-up"
            style={{ animationDelay: '220ms' }}
          >
            <span className="font-sans text-[9px] font-bold uppercase tracking-[0.22em] text-cashly-gray">
              Notes
            </span>
            <p className="font-sans text-[13px] leading-relaxed text-cashly-black/85 whitespace-pre-line">
              {invoice.notes}
            </p>
          </section>
        )}

        {/* ── Receipts ───────────────────────────────────────────────────── */}
        {invoice.receipts.length > 0 && (
          <section
            className="border-t border-black/[0.08] px-12 py-7 animate-fade-up"
            style={{ animationDelay: '240ms' }}
          >
            <div className="mb-5 flex items-baseline justify-between">
              <p className="font-sans text-[9px] font-bold uppercase tracking-[0.22em] text-cashly-gray">
                Receipts
              </p>
              <p className="font-sans text-[10px] text-cashly-gray/70 tabular-nums">
                {invoice.receipts.length} issued
              </p>
            </div>

            <ul className="flex flex-col gap-3">
              {invoice.receipts.map((r) => (
                <li
                  key={r.id}
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-5 border border-black/[0.08] bg-cashly-cream/40 px-5 py-4"
                >
                  {/* Number + dot */}
                  <div className="flex items-center gap-3 min-w-[180px]">
                    <span
                      className="inline-block h-2 w-2"
                      style={{ backgroundColor: '#0F7A52' }}
                      aria-hidden
                    />
                    <span className="font-sans text-[13px] font-bold tabular-nums tracking-[0.04em] text-cashly-black">
                      {r.receiptNumber}
                    </span>
                  </div>

                  {/* Paid info */}
                  <div className="flex flex-col gap-0.5">
                    <span className="font-sans text-[12px] font-semibold tabular-nums text-cashly-black">
                      {fmt(r.amountPaid, r.currency)}
                      <span className="ml-2 font-medium text-cashly-gray">
                        · {capitalize(r.paymentMethod)}
                      </span>
                    </span>
                    <span className="font-sans text-[11px] tabular-nums text-cashly-gray">
                      Paid {fmtDateTime(r.paidAt)}
                      {' · '}
                      {r.emailSentAt ? (
                        <>
                          <span style={{ color: '#0F7A52' }} className="font-semibold">
                            Emailed
                          </span>{' '}
                          {fmtDateTime(r.emailSentAt)}
                        </>
                      ) : (
                        <span className="font-semibold text-amber-700">Queued — not yet sent</span>
                      )}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {r.pdfUrl && (
                      <a
                        href={r.pdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        download={`${r.receiptNumber}.pdf`}
                        className="border border-black/[0.16] px-3 py-1.5 font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-cashly-black transition-colors hover:border-cashly-black hover:bg-cashly-black hover:text-white"
                      >
                        Download PDF
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => void handleResendReceipt(r.id)}
                      disabled={resendingReceiptId !== null}
                      className="border border-black/[0.16] px-3 py-1.5 font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-cashly-black transition-colors hover:border-cashly-black hover:bg-cashly-black hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {resendingReceiptId === r.id ? 'Queueing…' : 'Resend email'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── Activity log ───────────────────────────────────────────────── */}
        <section
          className="border-t border-black/[0.08] px-12 py-7 animate-fade-up"
          style={{ animationDelay: '260ms' }}
        >
          <p className="mb-5 font-sans text-[9px] font-bold uppercase tracking-[0.22em] text-cashly-gray">
            Activity
          </p>
          <ol className="flex flex-col gap-3">
            <ActivityRow
              dot={brand}
              label="Invoice created"
              when={fmtDateTime(invoice.createdAt)}
            />
            {invoice.status !== 'DRAFT' && (
              <ActivityRow
                dot={brand}
                label="Invoice sent"
                when={fmtDateTime(invoice.updatedAt)}
              />
            )}
            {invoice.payment && (
              <ActivityRow
                dot={statusAccent.PAID}
                label={`Payment received · ${fmt(invoice.payment.amountPaid, invoice.user.currency)}`}
                when={fmtDateTime(invoice.payment.paidAt)}
              />
            )}
            {invoice.status === 'OVERDUE' && (
              <ActivityRow
                dot={statusAccent.OVERDUE}
                label="Marked overdue"
                when={fmtDateTime(invoice.updatedAt)}
              />
            )}
          </ol>
        </section>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <footer className="grid grid-cols-3 border-t border-black/[0.18] px-12 py-5">
          <span className="font-sans text-[9px] font-bold uppercase tracking-[0.18em] text-cashly-gray">
            № {invoice.invoiceNumber}
          </span>
          <span className="text-center font-sans text-[9px] font-semibold uppercase tracking-[0.18em] text-cashly-gray">
            Issued {fmtDate(invoice.issueDate)} · Due {fmtDate(invoice.dueDate)}
          </span>
          <span className="text-right font-sans text-[9px] font-semibold uppercase tracking-[0.18em] text-cashly-gray">
            Powered by{' '}
            <span style={{ color: brand }} className="font-bold">
              Cashly
            </span>
          </span>
        </footer>
      </div>

      {/* Toast */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
      )}
    </div>
  )
}

// ── Activity row ──────────────────────────────────────────────────────────────

function ActivityRow({ dot, label, when }: { dot: string; label: string; when: string }) {
  return (
    <li className="grid grid-cols-[10px_1fr_auto] items-center gap-4">
      <span className="h-2 w-2" style={{ backgroundColor: dot }} />
      <span className="font-sans text-[12px] font-medium text-cashly-black">{label}</span>
      <span className="font-sans text-[11px] tabular-nums text-cashly-gray">{when}</span>
    </li>
  )
}
