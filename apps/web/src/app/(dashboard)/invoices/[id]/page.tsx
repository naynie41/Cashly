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
  lineItems: LineItem[]
  client: {
    id: string
    name: string
    email: string
    phone: string | null
    address: string | null
  }
  user: { name: string; email: string; businessName: string | null; currency: string }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const fmt = (n: number, currency = 'NGN') =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(n)

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

const statusConfig: Record<
  InvoiceDetail['status'],
  { label: string; bg: string; text: string; dot: string }
> = {
  DRAFT: { label: 'Draft', bg: 'bg-black/5', text: 'text-cashly-gray', dot: 'bg-cashly-gray' },
  SENT: { label: 'Sent', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  PAID: { label: 'Paid', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  OVERDUE: { label: 'Overdue', bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
}

// ── Toast ──────────────────────────────────────────────────────────────────────

interface ToastProps {
  message: string
  type: 'success' | 'error'
  onDismiss: () => void
}

function Toast({ message, type, onDismiss }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000)
    return () => clearTimeout(t)
  }, [onDismiss])

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 animate-fade-up rounded px-5 py-3.5 shadow-lg ${
        type === 'success' ? 'bg-cashly-black text-white' : 'bg-red-600 text-white'
      }`}
    >
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onDismiss} className="text-white/50 hover:text-white">
        ×
      </button>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    api
      .get<{ data: InvoiceDetail }>(`/invoices/${id}`)
      .then((res) => setInvoice(res.data))
      .catch(() => router.push('/invoices'))
      .finally(() => setLoading(false))
  }, [id, router])

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

  // ── Loading skeleton ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-cashly-cream px-10 py-8">
        <div className="mb-8 h-14 w-64 animate-pulse rounded bg-black/5" />
        <div className="grid grid-cols-3 gap-8">
          <div className="col-span-2 space-y-4">
            <div className="h-48 animate-pulse rounded bg-black/5" />
            <div className="h-64 animate-pulse rounded bg-black/5" />
          </div>
          <div className="space-y-4">
            <div className="h-40 animate-pulse rounded bg-black/5" />
            <div className="h-24 animate-pulse rounded bg-black/5" />
          </div>
        </div>
      </div>
    )
  }

  if (!invoice) return null

  const cfg = statusConfig[invoice.status]
  const canSend = invoice.status === 'DRAFT' || invoice.status === 'SENT'
  const taxAmount = invoice.subtotal * (invoice.taxRate / 100)

  return (
    <div className="min-h-screen bg-cashly-cream">
      {/* Header */}
      <div className="border-b border-black/[0.08] bg-cashly-cream px-10 py-8">
        <div className="animate-fade-up" style={{ animationDelay: '0ms' }}>
          <Link
            href="/invoices"
            className="mb-3 inline-block text-xs font-medium text-cashly-gray hover:text-cashly-black"
          >
            ← Back to Invoices
          </Link>
          <div className="flex items-end justify-between">
            <div>
              <div className="mb-2 flex items-center gap-3">
                <h1 className="font-barlow text-5xl font-black uppercase leading-none tracking-tight text-cashly-black">
                  {invoice.invoiceNumber}
                </h1>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${cfg.bg} ${cfg.text}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                  {cfg.label}
                </span>
              </div>
              <p className="text-sm text-cashly-gray">
                {invoice.client.name} · Due {fmtDate(invoice.dueDate)}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              {invoice.pdfUrl && (
                <a
                  href={invoice.pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="border border-black/[0.12] px-4 py-2.5 text-sm font-medium text-cashly-gray transition-colors hover:border-cashly-black hover:text-cashly-black"
                >
                  Download PDF
                </a>
              )}
              {/* Pay Now — shown when invoice is SENT and a Paystack link exists */}
              {invoice.status === 'SENT' && invoice.paymentUrl && (
                <a
                  href={invoice.paymentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="border border-cashly-lime bg-cashly-lime px-5 py-2.5 text-sm font-bold text-cashly-black transition-all hover:opacity-80"
                >
                  Pay Now
                </a>
              )}
              {canSend && (
                <button
                  onClick={() => void handleSend()}
                  disabled={sending}
                  className="border border-cashly-black bg-cashly-black px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-transparent hover:text-cashly-black disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {sending
                    ? 'Sending…'
                    : invoice.status === 'SENT'
                      ? 'Resend Invoice'
                      : 'Send Invoice'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-10 py-8">
        <div className="grid grid-cols-3 gap-8">
          {/* ── Main content ── */}
          <div className="col-span-2 space-y-6">
            {/* From / Bill To */}
            <div
              className="animate-fade-up grid grid-cols-2 gap-6 bg-white p-6 border border-black/[0.08]"
              style={{ animationDelay: '60ms' }}
            >
              <div>
                <p className="mb-2 font-barlow text-[9px] font-bold uppercase tracking-[0.2em] text-cashly-gray">
                  From
                </p>
                <p className="text-sm font-semibold text-cashly-black">
                  {invoice.user.businessName ?? invoice.user.name}
                </p>
                <p className="text-xs text-cashly-gray">{invoice.user.email}</p>
              </div>
              <div>
                <p className="mb-2 font-barlow text-[9px] font-bold uppercase tracking-[0.2em] text-cashly-gray">
                  Bill To
                </p>
                <p className="text-sm font-semibold text-cashly-black">{invoice.client.name}</p>
                <p className="text-xs text-cashly-gray">{invoice.client.email}</p>
                {invoice.client.phone && (
                  <p className="text-xs text-cashly-gray">{invoice.client.phone}</p>
                )}
                {invoice.client.address && (
                  <p className="text-xs text-cashly-gray">{invoice.client.address}</p>
                )}
              </div>
            </div>

            {/* Dates */}
            <div
              className="animate-fade-up flex gap-8 bg-[#f7f6f2] px-6 py-4 border border-black/[0.06]"
              style={{ animationDelay: '100ms' }}
            >
              <div>
                <p className="mb-1 font-barlow text-[9px] font-bold uppercase tracking-[0.2em] text-cashly-gray">
                  Issue Date
                </p>
                <p className="text-sm font-semibold text-cashly-black">
                  {fmtDate(invoice.issueDate)}
                </p>
              </div>
              <div>
                <p className="mb-1 font-barlow text-[9px] font-bold uppercase tracking-[0.2em] text-cashly-gray">
                  Due Date
                </p>
                <p className="text-sm font-semibold text-cashly-black">
                  {fmtDate(invoice.dueDate)}
                </p>
              </div>
            </div>

            {/* Line items */}
            <div
              className="animate-fade-up overflow-hidden border border-black/[0.08]"
              style={{ animationDelay: '140ms' }}
            >
              <table className="w-full">
                <thead>
                  <tr className="bg-cashly-black">
                    {['Description', 'Qty', 'Unit Price', 'Amount'].map((h) => (
                      <th
                        key={h}
                        className={`px-5 py-3.5 text-[9px] font-bold uppercase tracking-[0.2em] text-white/40 ${h === 'Description' ? 'text-left' : 'text-right'}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoice.lineItems.map((li, i) => (
                    <tr
                      key={li.id}
                      className="animate-fade-up border-b border-black/[0.06] bg-white"
                      style={{ animationDelay: `${(i + 3) * 50}ms` }}
                    >
                      <td className="px-5 py-4 text-sm text-cashly-black">{li.description}</td>
                      <td className="px-5 py-4 text-right text-sm text-cashly-gray">
                        {li.quantity}
                      </td>
                      <td className="px-5 py-4 text-right text-sm text-cashly-gray">
                        {fmt(li.unitPrice)}
                      </td>
                      <td className="px-5 py-4 text-right text-sm font-semibold text-cashly-black">
                        {fmt(li.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Notes */}
            {invoice.notes && (
              <div
                className="animate-fade-up bg-white p-6 border border-black/[0.08]"
                style={{ animationDelay: '200ms' }}
              >
                <p className="mb-2 font-barlow text-[9px] font-bold uppercase tracking-[0.2em] text-cashly-gray">
                  Notes
                </p>
                <p className="text-sm leading-relaxed text-cashly-gray">{invoice.notes}</p>
              </div>
            )}
          </div>

          {/* ── Right col: totals ── */}
          <div>
            <div
              className="animate-fade-up bg-white p-6 border border-black/[0.08]"
              style={{ animationDelay: '80ms' }}
            >
              <p className="mb-4 font-barlow text-[10px] font-bold uppercase tracking-[0.2em] text-cashly-gray">
                Summary
              </p>
              <div className="space-y-2.5">
                <div className="flex justify-between text-sm">
                  <span className="text-cashly-gray">Subtotal</span>
                  <span className="font-medium text-cashly-black">{fmt(invoice.subtotal)}</span>
                </div>
                {invoice.taxRate > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-cashly-gray">Tax ({invoice.taxRate}%)</span>
                    <span className="font-medium text-cashly-black">{fmt(taxAmount)}</span>
                  </div>
                )}
                {invoice.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-cashly-gray">Discount</span>
                    <span className="font-medium text-cashly-black">−{fmt(invoice.discount)}</span>
                  </div>
                )}
                <div className="border-t border-black/[0.08] pt-3">
                  <div className="flex items-end justify-between">
                    <span className="font-barlow text-sm font-bold uppercase tracking-wide text-cashly-black">
                      Total Due
                    </span>
                    <span className="font-barlow text-xl font-black text-cashly-black">
                      {fmt(invoice.total)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Client quick link */}
            <div
              className="animate-fade-up mt-4 bg-white p-5 border border-black/[0.08]"
              style={{ animationDelay: '120ms' }}
            >
              <p className="mb-3 font-barlow text-[9px] font-bold uppercase tracking-[0.2em] text-cashly-gray">
                Client
              </p>
              <p className="text-sm font-semibold text-cashly-black">{invoice.client.name}</p>
              <p className="text-xs text-cashly-gray">{invoice.client.email}</p>
              <Link
                href={`/clients/${invoice.client.id}`}
                className="mt-3 inline-block text-xs font-medium text-cashly-gray underline-offset-2 hover:text-cashly-black hover:underline"
              >
                View client →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
      )}
    </div>
  )
}
