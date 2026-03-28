'use client'

import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { api } from '@/lib/api'

// ── Types ──────────────────────────────────────────────────────────────────────

interface ClientRow {
  id: string
  name: string
  email: string
  phone: string | null
  address: string | null
  createdAt: string
  _count: { invoices: number }
  totalBilled: number
  _optimistic?: boolean
}

// ── Form schema ────────────────────────────────────────────────────────────────

const createSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().optional(),
  address: z.string().optional(),
})

type CreateForm = z.infer<typeof createSchema>

// ── Helpers ────────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)

const initials = (name: string) =>
  name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()

// ── Page ───────────────────────────────────────────────────────────────────────

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientRow[]>([])
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const drawerRef = useRef<HTMLDivElement>(null)

  // ── Fetch ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    api
      .get<{ data: ClientRow[] }>('/clients')
      .then((res) => setClients(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Close drawer on outside click
  useEffect(() => {
    if (!drawerOpen) return
    const handler = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setDrawerOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [drawerOpen])

  // ── Optimistic create ──────────────────────────────────────────────────────

  const handleCreate = async (data: CreateForm, resetForm: () => void) => {
    const tempId = `_temp_${Date.now()}`
    const optimistic: ClientRow = {
      id: tempId,
      name: data.name,
      email: data.email,
      phone: data.phone ?? null,
      address: data.address ?? null,
      createdAt: new Date().toISOString(),
      _count: { invoices: 0 },
      totalBilled: 0,
      _optimistic: true,
    }

    setClients((prev) => [optimistic, ...prev])
    setDrawerOpen(false)
    resetForm()

    try {
      const res = await api.post<{ data: ClientRow }>('/clients', data)
      setClients((prev) => prev.map((c) => (c.id === tempId ? res.data : c)))
    } catch {
      // Revert on error
      setClients((prev) => prev.filter((c) => c.id !== tempId))
      setDrawerOpen(true)
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    const snapshot = clients
    setClients((prev) => prev.filter((c) => c.id !== id))
    try {
      await api.delete(`/clients/${id}`)
    } catch {
      setClients(snapshot)
    } finally {
      setDeletingId(null)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-cashly-cream">
      {/* Header */}
      <div className="border-b border-black/[0.08] bg-cashly-cream px-10 py-8">
        <div className="flex items-end justify-between">
          <div className="animate-fade-up" style={{ animationDelay: '0ms' }}>
            <p className="text-[10px] font-barlow tracking-[0.2em] text-cashly-gray mb-1">MANAGE</p>
            <h1 className="font-barlow text-5xl font-black uppercase leading-none tracking-tight text-cashly-black">
              Clients
            </h1>
          </div>
          <div className="animate-fade-up" style={{ animationDelay: '80ms' }}>
            <button
              onClick={() => setDrawerOpen(true)}
              className="border border-cashly-black bg-cashly-black px-5 py-2.5 text-sm font-sans font-medium text-white transition-all hover:bg-transparent hover:text-cashly-black"
            >
              + New Client
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-10 py-8">
        {loading ? (
          <SkeletonTable />
        ) : clients.length === 0 ? (
          <EmptyState onNew={() => setDrawerOpen(true)} />
        ) : (
          <ClientTable
            clients={clients}
            deletingId={deletingId}
            onDelete={(id) => void handleDelete(id)}
          />
        )}
      </div>

      {/* New Client Drawer */}
      {drawerOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 bg-cashly-black/30 z-40 animate-fade-in" />
          {/* Panel */}
          <div
            ref={drawerRef}
            className="fixed inset-y-0 right-0 w-[420px] bg-white z-50 flex flex-col shadow-2xl animate-slide-in"
          >
            <NewClientForm
              onClose={() => setDrawerOpen(false)}
              onCreate={(data, reset) => void handleCreate(data, reset)}
            />
          </div>
        </>
      )}
    </div>
  )
}

// ── Client Table ───────────────────────────────────────────────────────────────

function ClientTable({
  clients,
  deletingId,
  onDelete,
}: {
  clients: ClientRow[]
  deletingId: string | null
  onDelete: (id: string) => void
}) {
  return (
    <div className="border border-black/[0.08]">
      {/* Table head */}
      <div className="grid grid-cols-[2fr_2fr_1fr_1.5fr_80px] border-b border-black/[0.08] bg-cashly-black px-5 py-3">
        {['Client', 'Email', 'Invoices', 'Total Billed', ''].map((h) => (
          <span
            key={h}
            className="font-barlow text-[10px] font-black uppercase tracking-[0.15em] text-white/50"
          >
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      {clients.map((client, i) => (
        <ClientRow
          key={client.id}
          client={client}
          index={i}
          isDeleting={deletingId === client.id}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}

function ClientRow({
  client,
  index,
  isDeleting,
  onDelete,
}: {
  client: ClientRow
  index: number
  isDeleting: boolean
  onDelete: (id: string) => void
}) {
  const [showConfirm, setShowConfirm] = useState(false)

  return (
    <div
      className={[
        'group grid grid-cols-[2fr_2fr_1fr_1.5fr_80px] items-center px-5 py-4 border-b border-black/[0.06] bg-white transition-all duration-200',
        'hover:bg-cashly-cream hover:-translate-y-px hover:shadow-sm',
        client._optimistic ? 'opacity-60' : '',
        isDeleting ? 'opacity-40 pointer-events-none' : '',
      ].join(' ')}
      style={{
        animation: 'fadeUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
        animationDelay: `${index * 60}ms`,
      }}
    >
      {/* Name */}
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center bg-cashly-black text-white text-[10px] font-barlow font-black">
          {initials(client.name)}
        </div>
        <div>
          <Link
            href={`/clients/${client.id}`}
            className="font-sans text-sm font-medium text-cashly-black hover:underline underline-offset-2"
          >
            {client.name}
          </Link>
          {client._optimistic && <span className="ml-2 text-[10px] text-cashly-gray">Saving…</span>}
        </div>
      </div>

      {/* Email */}
      <span className="font-sans text-sm text-cashly-gray truncate pr-4">{client.email}</span>

      {/* Invoice count */}
      <span className="font-barlow text-sm font-black text-cashly-black">
        {client._count.invoices}
      </span>

      {/* Total billed */}
      <span className="font-sans text-sm font-medium text-cashly-black">
        {fmt(client.totalBilled)}
      </span>

      {/* Actions */}
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Link
          href={`/clients/${client.id}`}
          className="p-1.5 text-cashly-gray hover:text-cashly-black transition-colors"
          title="View"
        >
          <EyeIcon />
        </Link>
        {client._count.invoices === 0 && !client._optimistic && (
          <>
            {showConfirm ? (
              <button
                onClick={() => onDelete(client.id)}
                className="text-[11px] font-sans font-medium text-red-600 hover:text-red-700 px-1"
              >
                Confirm
              </button>
            ) : (
              <button
                onClick={() => setShowConfirm(true)}
                className="p-1.5 text-cashly-gray hover:text-red-500 transition-colors"
                title="Delete"
              >
                <TrashIcon />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── New Client Drawer Form ─────────────────────────────────────────────────────

function NewClientForm({
  onClose,
  onCreate,
}: {
  onClose: () => void
  onCreate: (data: CreateForm, reset: () => void) => void
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateForm>({ resolver: zodResolver(createSchema) })

  const onSubmit = (data: CreateForm) => {
    onCreate(data, reset)
  }

  return (
    <>
      {/* Drawer header */}
      <div className="flex items-center justify-between border-b border-black/[0.08] px-7 py-6">
        <div>
          <p className="text-[10px] font-barlow tracking-[0.18em] text-cashly-gray mb-0.5">NEW</p>
          <h2 className="font-barlow text-2xl font-black uppercase leading-none tracking-tight text-cashly-black">
            Client
          </h2>
        </div>
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center text-cashly-gray hover:text-cashly-black transition-colors"
        >
          <CloseIcon />
        </button>
      </div>

      {/* Form */}
      <form
        onSubmit={(e) => void handleSubmit(onSubmit)(e)}
        className="flex-1 overflow-y-auto px-7 py-6 space-y-5"
        noValidate
      >
        <Field label="Name" required error={errors.name?.message}>
          <input
            {...register('name')}
            placeholder="Apex Events"
            className={inputCls(!!errors.name)}
          />
        </Field>

        <Field label="Email" required error={errors.email?.message}>
          <input
            {...register('email')}
            type="email"
            placeholder="hello@apexevents.com"
            className={inputCls(!!errors.email)}
          />
        </Field>

        <Field label="Phone" error={errors.phone?.message}>
          <input
            {...register('phone')}
            type="tel"
            placeholder="+234 800 000 0000"
            className={inputCls(false)}
          />
        </Field>

        <Field label="Address" error={errors.address?.message}>
          <textarea
            {...register('address')}
            placeholder="5 Admiralty Way, Lekki Phase 1, Lagos"
            rows={3}
            className={inputCls(false) + ' resize-none'}
          />
        </Field>
      </form>

      {/* Footer */}
      <div className="border-t border-black/[0.08] px-7 py-5 flex gap-3">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 border border-black/20 py-2.5 text-sm font-sans font-medium text-cashly-black transition-colors hover:border-cashly-black"
        >
          Cancel
        </button>
        <button
          type="submit"
          form=""
          disabled={isSubmitting}
          onClick={() => void handleSubmit(onSubmit)()}
          className="flex-1 bg-cashly-black py-2.5 text-sm font-sans font-medium text-white transition-colors hover:bg-cashly-black/80 disabled:opacity-50"
        >
          {isSubmitting ? 'Creating…' : 'Create Client'}
        </button>
      </div>
    </>
  )
}

// ── Empty State ────────────────────────────────────────────────────────────────

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div
      className="flex flex-col items-center justify-center py-24 animate-fade-up"
      style={{ animationDelay: '100ms' }}
    >
      <div className="mb-6 flex h-16 w-16 items-center justify-center border border-black/10 text-cashly-gray">
        <ClientEmptyIcon />
      </div>
      <h2 className="font-barlow text-2xl font-black uppercase tracking-tight text-cashly-black mb-2">
        No Clients Yet
      </h2>
      <p className="font-sans text-sm text-cashly-gray mb-7 text-center max-w-xs">
        Add your first client to start creating invoices and tracking payments.
      </p>
      <button
        onClick={onNew}
        className="border border-cashly-black bg-cashly-black px-6 py-2.5 text-sm font-sans font-medium text-white transition-all hover:bg-transparent hover:text-cashly-black"
      >
        + New Client
      </button>
    </div>
  )
}

// ── Skeleton ───────────────────────────────────────────────────────────────────

function SkeletonTable() {
  return (
    <div className="border border-black/[0.08] animate-pulse">
      <div className="h-10 bg-cashly-black/90" />
      {Array.from<undefined>({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 bg-white border-b border-black/[0.06] px-5 py-4"
        >
          <div className="h-8 w-8 bg-black/[0.06]" />
          <div className="h-3 w-36 bg-black/[0.06]" />
          <div className="ml-auto h-3 w-48 bg-black/[0.06]" />
        </div>
      ))}
    </div>
  )
}

// ── Field wrapper ──────────────────────────────────────────────────────────────

function Field({
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

// ── Inline Icons ───────────────────────────────────────────────────────────────

function EyeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M1 7C2.5 4 4.5 2.5 7 2.5S11.5 4 13 7c-1.5 3-3.5 4.5-6 4.5S2.5 10 1 7z"
        stroke="currentColor"
        strokeWidth="1.2"
      />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M2 3.5h10M5.5 3.5V2h3v1.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path
        d="M3.5 3.5l.5 8h6l.5-8"
        stroke="currentColor"
        strokeWidth="1.2"
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

function ClientEmptyIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <circle cx="14" cy="8" r="5" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M4 25c0-5.523 4.477-10 10-10s10 4.477 10 10"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  )
}
