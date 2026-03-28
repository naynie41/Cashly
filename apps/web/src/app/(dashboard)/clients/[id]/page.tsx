'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { api } from '@/lib/api'

// ── Types ──────────────────────────────────────────────────────────────────────

type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE'

interface InvoiceSummary {
  id: string
  invoiceNumber: string
  status: InvoiceStatus
  total: number
  dueDate: string
  createdAt: string
}

interface ClientDetail {
  id: string
  name: string
  email: string
  phone: string | null
  address: string | null
  createdAt: string
  totalBilled: number
  _count: { invoices: number }
  invoices: InvoiceSummary[]
}

// ── Edit schema ────────────────────────────────────────────────────────────────

const editSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().optional(),
  address: z.string().optional(),
})

type EditForm = z.infer<typeof editSchema>

// ── Helpers ────────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

const initials = (name: string) =>
  name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()

const statusConfig: Record<InvoiceStatus, { label: string; bg: string; text: string }> = {
  DRAFT: { label: 'Draft', bg: 'bg-black/[0.06]', text: 'text-cashly-gray' },
  SENT: { label: 'Sent', bg: 'bg-blue-50', text: 'text-blue-700' },
  PAID: { label: 'Paid', bg: 'bg-cashly-lime', text: 'text-cashly-black' },
  OVERDUE: { label: 'Overdue', bg: 'bg-red-50', text: 'text-red-600' },
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function ClientDetailPage({ params }: { params: { id: string } }) {
  const [client, setClient] = useState<ClientDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    api
      .get<{ data: ClientDetail }>(`/clients/${params.id}`)
      .then((res) => setClient(res.data))
      .catch((err) => {
        if (err instanceof Error && err.message.includes('Not found')) {
          setNotFound(true)
        }
      })
      .finally(() => setLoading(false))
  }, [params.id])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditForm>({ resolver: zodResolver(editSchema) })

  const startEdit = () => {
    if (!client) return
    reset({
      name: client.name,
      email: client.email,
      phone: client.phone ?? '',
      address: client.address ?? '',
    })
    setEditing(true)
  }

  const onSave = async (data: EditForm) => {
    setSaveError(null)
    try {
      const res = await api.patch<{ data: ClientDetail }>(`/clients/${params.id}`, data)
      setClient((prev) => (prev ? { ...prev, ...res.data } : prev))
      setEditing(false)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save')
    }
  }

  if (loading) return <DetailSkeleton />

  if (notFound || !client) {
    return (
      <div className="min-h-screen bg-cashly-cream flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-barlow text-4xl font-black uppercase tracking-tight text-cashly-black mb-3">
            Not Found
          </h1>
          <p className="font-sans text-sm text-cashly-gray mb-6">
            This client doesn&apos;t exist or you don&apos;t have access.
          </p>
          <Link
            href="/clients"
            className="font-sans text-sm border border-cashly-black px-5 py-2.5 hover:bg-cashly-black hover:text-white transition-colors"
          >
            Back to Clients
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cashly-cream">
      {/* Header */}
      <div className="border-b border-black/[0.08] bg-cashly-cream px-10 py-8">
        <div className="flex items-center gap-4 mb-3">
          <Link
            href="/clients"
            className="font-sans text-xs text-cashly-gray hover:text-cashly-black transition-colors flex items-center gap-1.5"
          >
            <BackArrow />
            Clients
          </Link>
        </div>

        <div className="flex items-end justify-between">
          <div
            className="flex items-center gap-5 animate-fade-up"
            style={{ animationDelay: '0ms' }}
          >
            {/* Avatar */}
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center bg-cashly-black text-white text-lg font-barlow font-black">
              {initials(client.name)}
            </div>
            <div>
              <p className="text-[10px] font-barlow tracking-[0.2em] text-cashly-gray mb-0.5">
                CLIENT
              </p>
              <h1 className="font-barlow text-4xl font-black uppercase leading-none tracking-tight text-cashly-black">
                {client.name}
              </h1>
            </div>
          </div>

          <div className="flex gap-3 animate-fade-up" style={{ animationDelay: '80ms' }}>
            <button
              onClick={startEdit}
              className="border border-black/20 px-4 py-2.5 text-sm font-sans font-medium text-cashly-black transition-colors hover:border-cashly-black"
            >
              Edit
            </button>
            <Link
              href={`/invoices/new?clientId=${client.id}`}
              className="bg-cashly-black px-4 py-2.5 text-sm font-sans font-medium text-white transition-colors hover:bg-cashly-black/80"
            >
              + New Invoice
            </Link>
          </div>
        </div>
      </div>

      <div className="px-10 py-8 space-y-8">
        {/* Info cards */}
        <div className="grid grid-cols-4 gap-4 animate-fade-up" style={{ animationDelay: '120ms' }}>
          <InfoCard label="Email" value={client.email} />
          <InfoCard label="Phone" value={client.phone ?? '—'} />
          <InfoCard label="Invoices" value={String(client._count.invoices)} />
          <InfoCard label="Total Billed" value={fmt(client.totalBilled)} highlight />
        </div>

        {/* Address */}
        {client.address && (
          <div className="animate-fade-up" style={{ animationDelay: '160ms' }}>
            <InfoCard label="Address" value={client.address} wide />
          </div>
        )}

        {/* Invoice history */}
        <div className="animate-fade-up" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-barlow text-lg font-black uppercase tracking-tight text-cashly-black">
              Invoice History
            </h2>
            <span className="font-sans text-xs text-cashly-gray">
              {client.invoices.length} invoice{client.invoices.length !== 1 ? 's' : ''}
            </span>
          </div>

          {client.invoices.length === 0 ? (
            <div className="border border-black/[0.08] bg-white py-12 text-center">
              <p className="font-sans text-sm text-cashly-gray">No invoices yet.</p>
            </div>
          ) : (
            <div className="border border-black/[0.08]">
              <div className="grid grid-cols-[1.5fr_1fr_1fr_1.5fr] border-b border-black/[0.08] bg-cashly-black px-5 py-3">
                {['Invoice #', 'Status', 'Due Date', 'Amount'].map((h) => (
                  <span
                    key={h}
                    className="font-barlow text-[10px] font-black uppercase tracking-[0.15em] text-white/50"
                  >
                    {h}
                  </span>
                ))}
              </div>

              {client.invoices.map((inv, i) => {
                const st = statusConfig[inv.status]
                return (
                  <Link
                    key={inv.id}
                    href={`/invoices/${inv.id}`}
                    className="grid grid-cols-[1.5fr_1fr_1fr_1.5fr] items-center px-5 py-4 border-b border-black/[0.06] bg-white hover:bg-cashly-cream transition-colors group"
                    style={{
                      animation: 'fadeUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
                      animationDelay: `${i * 50}ms`,
                    }}
                  >
                    <span className="font-sans text-sm font-medium text-cashly-black group-hover:underline underline-offset-2">
                      {inv.invoiceNumber}
                    </span>
                    <span>
                      <span
                        className={`inline-block px-2.5 py-0.5 text-[10px] font-barlow font-black uppercase tracking-wider ${st.bg} ${st.text}`}
                      >
                        {st.label}
                      </span>
                    </span>
                    <span className="font-sans text-sm text-cashly-gray">
                      {fmtDate(inv.dueDate)}
                    </span>
                    <span className="font-sans text-sm font-medium text-cashly-black">
                      {fmt(Number(inv.total))}
                    </span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Member since */}
        <p
          className="font-sans text-xs text-cashly-gray animate-fade-up"
          style={{ animationDelay: '240ms' }}
        >
          Client since {fmtDate(client.createdAt)}
        </p>
      </div>

      {/* Edit drawer */}
      {editing && (
        <>
          <div
            className="fixed inset-0 bg-cashly-black/30 z-40 animate-fade-in"
            onClick={() => setEditing(false)}
          />
          <div className="fixed inset-y-0 right-0 w-[420px] bg-white z-50 flex flex-col shadow-2xl animate-slide-in">
            <div className="flex items-center justify-between border-b border-black/[0.08] px-7 py-6">
              <div>
                <p className="text-[10px] font-barlow tracking-[0.18em] text-cashly-gray mb-0.5">
                  EDIT
                </p>
                <h2 className="font-barlow text-2xl font-black uppercase leading-none tracking-tight text-cashly-black">
                  Client
                </h2>
              </div>
              <button
                onClick={() => setEditing(false)}
                className="flex h-8 w-8 items-center justify-center text-cashly-gray hover:text-cashly-black transition-colors"
              >
                <CloseIcon />
              </button>
            </div>

            <form
              onSubmit={(e) => void handleSubmit(onSave)(e)}
              className="flex-1 overflow-y-auto px-7 py-6 space-y-5"
              noValidate
            >
              <EditField label="Name" required error={errors.name?.message}>
                <input {...register('name')} className={inputCls(!!errors.name)} />
              </EditField>
              <EditField label="Email" required error={errors.email?.message}>
                <input {...register('email')} type="email" className={inputCls(!!errors.email)} />
              </EditField>
              <EditField label="Phone" error={errors.phone?.message}>
                <input {...register('phone')} type="tel" className={inputCls(false)} />
              </EditField>
              <EditField label="Address" error={errors.address?.message}>
                <textarea
                  {...register('address')}
                  rows={3}
                  className={inputCls(false) + ' resize-none'}
                />
              </EditField>

              {saveError && (
                <p className="border border-red-200 bg-red-50 px-4 py-3 text-sm font-sans text-red-700">
                  {saveError}
                </p>
              )}
            </form>

            <div className="border-t border-black/[0.08] px-7 py-5 flex gap-3">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="flex-1 border border-black/20 py-2.5 text-sm font-sans font-medium text-cashly-black hover:border-cashly-black transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleSubmit(onSave)()}
                disabled={isSubmitting}
                className="flex-1 bg-cashly-black py-2.5 text-sm font-sans font-medium text-white hover:bg-cashly-black/80 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function InfoCard({
  label,
  value,
  highlight,
  wide,
}: {
  label: string
  value: string
  highlight?: boolean
  wide?: boolean
}) {
  return (
    <div className={`border border-black/[0.08] bg-white p-4 ${wide ? 'col-span-2' : ''}`}>
      <p className="text-[10px] font-barlow font-black uppercase tracking-[0.14em] text-cashly-gray mb-1.5">
        {label}
      </p>
      <p
        className={`font-sans text-sm font-medium break-words ${
          highlight ? 'font-barlow text-xl font-black text-cashly-black' : 'text-cashly-black'
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function EditField({
  label,
  required,
  error,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-barlow font-black uppercase tracking-[0.14em] text-cashly-black">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs font-sans text-red-600">{error}</p>}
    </div>
  )
}

const inputCls = (hasError: boolean) =>
  [
    'w-full border px-3 py-2.5 text-sm font-sans bg-white text-cashly-black outline-none transition-colors placeholder:text-black/25',
    hasError
      ? 'border-red-400 focus:border-red-500'
      : 'border-black/[0.15] focus:border-cashly-black',
  ].join(' ')

function DetailSkeleton() {
  return (
    <div className="min-h-screen bg-cashly-cream animate-pulse">
      <div className="border-b border-black/[0.08] px-10 py-8">
        <div className="flex items-center gap-5">
          <div className="h-14 w-14 bg-black/[0.08]" />
          <div className="space-y-2">
            <div className="h-3 w-16 bg-black/[0.08]" />
            <div className="h-8 w-48 bg-black/[0.08]" />
          </div>
        </div>
      </div>
      <div className="px-10 py-8 grid grid-cols-4 gap-4">
        {Array.from<undefined>({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 bg-white border border-black/[0.08]" />
        ))}
      </div>
    </div>
  )
}

function BackArrow() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path
        d="M7.5 2.5L4 6l3.5 3.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
