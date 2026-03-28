'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'

// ── Types ──────────────────────────────────────────────────────────────────────

interface InvoiceRow {
  id: string
  invoiceNumber: string
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE'
  issueDate: string
  dueDate: string
  total: number
  pdfUrl: string | null
  client: { id: string; name: string; email: string }
  createdAt: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

const statusConfig: Record<
  InvoiceRow['status'],
  { label: string; bg: string; text: string; dot: string }
> = {
  DRAFT: { label: 'Draft', bg: 'bg-black/5', text: 'text-cashly-gray', dot: 'bg-cashly-gray' },
  SENT: {
    label: 'Sent',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    dot: 'bg-blue-500',
  },
  PAID: {
    label: 'Paid',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
  },
  OVERDUE: {
    label: 'Overdue',
    bg: 'bg-red-50',
    text: 'text-red-700',
    dot: 'bg-red-500',
  },
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: InvoiceRow['status'] }) {
  const cfg = statusConfig[status]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${cfg.bg} ${cfg.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

function SkeletonTable() {
  return (
    <div className="overflow-hidden border border-black/[0.08]">
      <table className="w-full">
        <thead>
          <tr className="bg-cashly-black">
            {['Invoice', 'Client', 'Status', 'Issue Date', 'Due Date', 'Total', ''].map((h) => (
              <th
                key={h}
                className="px-5 py-3.5 text-left text-[9px] font-bold uppercase tracking-[0.2em] text-white/40"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from<undefined>({ length: 5 }).map((_, i) => (
            <tr key={i} className="border-b border-black/[0.06] bg-white">
              {Array.from<undefined>({ length: 7 }).map((__, j) => (
                <td key={j} className="px-5 py-4">
                  <div className="h-3 animate-pulse rounded bg-black/5" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-28 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center border border-black/10 bg-white">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-cashly-gray"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      </div>
      <p className="font-barlow text-sm font-bold uppercase tracking-[0.2em] text-cashly-gray">
        No invoices yet
      </p>
      <p className="mt-2 text-sm text-cashly-gray">Create your first invoice to get started.</p>
      <Link
        href="/invoices/new"
        className="mt-6 border border-cashly-black bg-cashly-black px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-transparent hover:text-cashly-black"
      >
        + New Invoice
      </Link>
    </div>
  )
}

function InvoiceTable({ invoices }: { invoices: InvoiceRow[] }) {
  return (
    <div className="overflow-hidden border border-black/[0.08]">
      <table className="w-full">
        <thead>
          <tr className="bg-cashly-black">
            {['Invoice', 'Client', 'Status', 'Issue Date', 'Due Date', 'Total', ''].map((h) => (
              <th
                key={h}
                className={`px-5 py-3.5 text-[9px] font-bold uppercase tracking-[0.2em] text-white/40 ${h === 'Total' || h === '' ? 'text-right' : 'text-left'}`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv, index) => (
            <tr
              key={inv.id}
              className="animate-fade-up border-b border-black/[0.06] bg-white transition-colors hover:bg-cashly-cream/50"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <td className="px-5 py-4">
                <span className="font-mono text-sm font-semibold text-cashly-black">
                  {inv.invoiceNumber}
                </span>
              </td>
              <td className="px-5 py-4">
                <div>
                  <p className="text-sm font-medium text-cashly-black">{inv.client.name}</p>
                  <p className="text-xs text-cashly-gray">{inv.client.email}</p>
                </div>
              </td>
              <td className="px-5 py-4">
                <StatusBadge status={inv.status} />
              </td>
              <td className="px-5 py-4 text-sm text-cashly-gray">{fmtDate(inv.issueDate)}</td>
              <td className="px-5 py-4 text-sm text-cashly-gray">{fmtDate(inv.dueDate)}</td>
              <td className="px-5 py-4 text-right text-sm font-semibold text-cashly-black">
                {fmt(inv.total)}
              </td>
              <td className="px-5 py-4 text-right">
                <Link
                  href={`/invoices/${inv.id}`}
                  className="text-xs font-medium text-cashly-gray underline-offset-2 hover:text-cashly-black hover:underline"
                >
                  View →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get<{ data: InvoiceRow[] }>('/invoices')
      .then((res) => setInvoices(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-cashly-cream">
      {/* Header */}
      <div className="border-b border-black/[0.08] bg-cashly-cream px-10 py-8">
        <div className="flex items-end justify-between">
          <div className="animate-fade-up" style={{ animationDelay: '0ms' }}>
            <p className="mb-1 font-barlow text-[10px] tracking-[0.2em] text-cashly-gray">MANAGE</p>
            <h1 className="font-barlow text-5xl font-black uppercase leading-none tracking-tight text-cashly-black">
              Invoices
            </h1>
          </div>
          <div className="animate-fade-up" style={{ animationDelay: '80ms' }}>
            <Link
              href="/invoices/new"
              className="border border-cashly-black bg-cashly-black px-5 py-2.5 text-sm font-sans font-medium text-white transition-all hover:bg-transparent hover:text-cashly-black"
            >
              + New Invoice
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-10 py-8">
        {loading ? (
          <SkeletonTable />
        ) : invoices.length === 0 ? (
          <EmptyState />
        ) : (
          <InvoiceTable invoices={invoices} />
        )}
      </div>
    </div>
  )
}
