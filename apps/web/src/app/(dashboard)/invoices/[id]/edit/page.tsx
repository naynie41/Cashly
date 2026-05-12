'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { InvoiceForm, type InvoiceFormValues } from '../../_components/InvoiceForm'

// ── Types ──────────────────────────────────────────────────────────────────────

interface InvoiceDetail {
  id: string
  invoiceNumber: string
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE'
  issueDate: string
  dueDate: string
  taxRate: number
  discount: number
  notes: string | null
  client: { id: string }
  lineItems: { description: string; quantity: number; unitPrice: number }[]
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function isoToDate(iso: string): string {
  // The form's <input type="date"> needs YYYY-MM-DD
  return new Date(iso).toISOString().split('T')[0]!
}

function toFormValues(inv: InvoiceDetail): InvoiceFormValues {
  return {
    clientId: inv.client.id,
    issueDate: isoToDate(inv.issueDate),
    dueDate: isoToDate(inv.dueDate),
    taxRate: Number(inv.taxRate) || 0,
    discount: Number(inv.discount) || 0,
    notes: inv.notes ?? '',
    lineItems: inv.lineItems.map((li) => ({
      description: li.description,
      quantity: Number(li.quantity),
      unitPrice: Number(li.unitPrice),
    })),
  }
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function EditInvoicePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState<string | null>(null)

  useEffect(() => {
    api
      .get<{ data: InvoiceDetail }>(`/invoices/${id}`)
      .then(({ data }) => {
        if (data.status === 'PAID') {
          setForbidden('Paid invoices cannot be edited.')
          return
        }
        setInvoice(data)
      })
      .catch(() => router.push('/invoices'))
      .finally(() => setLoading(false))
  }, [id, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-cashly-cream">
        <div className="border-b border-black/[0.08] px-10 py-8">
          <div className="h-12 w-72 animate-pulse bg-black/5" />
        </div>
        <div className="grid grid-cols-3 gap-8 px-10 py-8">
          <div className="col-span-2 h-96 animate-pulse bg-black/5" />
          <div className="h-72 animate-pulse bg-black/5" />
        </div>
      </div>
    )
  }

  if (forbidden || !invoice) {
    return (
      <div className="min-h-screen bg-cashly-cream px-10 py-12">
        <Link
          href={`/invoices/${id}`}
          className="mb-4 inline-block text-xs font-medium text-cashly-gray hover:text-cashly-black"
        >
          ← Back to invoice
        </Link>
        <div className="border border-red-200 bg-red-50 px-5 py-4">
          <p className="text-sm font-medium text-red-700">
            {forbidden ?? 'Invoice not found.'}
          </p>
        </div>
      </div>
    )
  }

  const willTriggerRevision = invoice.status === 'SENT' || invoice.status === 'OVERDUE'

  const banner = willTriggerRevision ? (
    <div className="mb-6 flex items-center gap-3 border border-amber-300 bg-amber-50 px-5 py-3.5 animate-fade-up">
      <span className="inline-block h-2 w-2 bg-amber-500" />
      <p className="font-sans text-[13px] text-amber-900">
        <span className="font-semibold">Editing a sent invoice.</span> Your changes won't reach the
        client until you click <span className="font-semibold">Resend</span> on the invoice page —
        which will email a revised copy.
      </p>
    </div>
  ) : null

  return (
    <div className="min-h-screen bg-cashly-cream">
      {/* Header */}
      <div className="border-b border-black/[0.08] bg-cashly-cream px-10 py-8">
        <div className="animate-fade-up" style={{ animationDelay: '0ms' }}>
          <Link
            href={`/invoices/${invoice.id}`}
            className="mb-3 inline-block text-xs font-medium text-cashly-gray hover:text-cashly-black"
          >
            ← Back to invoice
          </Link>
          <div className="flex items-end gap-3">
            <h1 className="font-barlow text-5xl font-black uppercase leading-none tracking-tight text-cashly-black">
              Edit
            </h1>
            <span className="font-barlow text-2xl font-black uppercase tracking-tight text-cashly-gray/60">
              {invoice.invoiceNumber}
            </span>
          </div>
          <p className="mt-2 font-sans text-xs text-cashly-gray">
            Currently <span className="font-semibold text-cashly-black">{invoice.status}</span>
          </p>
        </div>
      </div>

      <div className="px-10 py-8">
        <InvoiceForm
          mode="edit"
          invoiceId={invoice.id}
          initialValues={toFormValues(invoice)}
          banner={banner}
        />
      </div>
    </div>
  )
}
