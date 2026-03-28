'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { api } from '@/lib/api'

// ── Types ──────────────────────────────────────────────────────────────────────

interface ClientOption {
  id: string
  name: string
  email: string
}

// ── Schema ─────────────────────────────────────────────────────────────────────

const lineItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.coerce.number().int().positive('Must be ≥ 1'),
  unitPrice: z.coerce.number().nonnegative('Must be ≥ 0'),
})

const formSchema = z.object({
  clientId: z.string().min(1, 'Select a client'),
  issueDate: z.string().min(1, 'Issue date is required'),
  dueDate: z.string().min(1, 'Due date is required'),
  taxRate: z.coerce.number().min(0).max(100).default(0),
  discount: z.coerce.number().nonnegative().default(0),
  notes: z.string().optional(),
  lineItems: z.array(lineItemSchema).min(1, 'Add at least one item'),
})

type FormValues = z.infer<typeof formSchema>

// ── Helpers ────────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
  }).format(n)

function today() {
  return new Date().toISOString().split('T')[0]!
}

function thirtyDaysFromNow() {
  const d = new Date()
  d.setDate(d.getDate() + 30)
  return d.toISOString().split('T')[0]!
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function NewInvoicePage() {
  const router = useRouter()
  const [clients, setClients] = useState<ClientOption[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      issueDate: today(),
      dueDate: thirtyDaysFromNow(),
      taxRate: 0,
      discount: 0,
      lineItems: [{ description: '', quantity: 1, unitPrice: 0 }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'lineItems' })

  // ── Load clients ───────────────────────────────────────────────────────────

  useEffect(() => {
    api
      .get<{ data: ClientOption[] }>('/clients')
      .then((res) => setClients(res.data))
      .catch(() => {})
  }, [])

  // ── Live total calculation ─────────────────────────────────────────────────

  const watchedLineItems = watch('lineItems')
  const watchedTaxRate = watch('taxRate') ?? 0
  const watchedDiscount = watch('discount') ?? 0

  const subtotal = (watchedLineItems ?? []).reduce(
    (sum, li) => sum + (Number(li.quantity) || 0) * (Number(li.unitPrice) || 0),
    0,
  )
  const taxAmount = subtotal * ((Number(watchedTaxRate) || 0) / 100)
  const total = subtotal + taxAmount - (Number(watchedDiscount) || 0)

  // ── Submit ─────────────────────────────────────────────────────────────────

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true)
    setError(null)
    try {
      const res = await api.post<{ data: { id: string } }>('/invoices', values)
      router.push(`/invoices/${res.data.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

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
          <h1 className="font-barlow text-5xl font-black uppercase leading-none tracking-tight text-cashly-black">
            New Invoice
          </h1>
        </div>
      </div>

      {/* Form */}
      <div className="px-10 py-8">
        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)}>
          <div className="grid grid-cols-3 gap-8">
            {/* ── Left col: main form ── */}
            <div className="col-span-2 space-y-6">
              {/* Client + Dates */}
              <div
                className="animate-fade-up bg-white p-6 border border-black/[0.08]"
                style={{ animationDelay: '60ms' }}
              >
                <p className="mb-4 font-barlow text-[10px] font-bold uppercase tracking-[0.2em] text-cashly-gray">
                  Invoice Details
                </p>

                {/* Client */}
                <div className="mb-4">
                  <label className="mb-1.5 block text-xs font-semibold text-cashly-black">
                    Client <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...register('clientId')}
                    className="w-full border border-black/[0.12] bg-cashly-cream px-3 py-2.5 text-sm text-cashly-black focus:border-cashly-black focus:outline-none"
                  >
                    <option value="">Select a client…</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.email})
                      </option>
                    ))}
                  </select>
                  {errors.clientId && (
                    <p className="mt-1 text-xs text-red-500">{errors.clientId.message}</p>
                  )}
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-cashly-black">
                      Issue Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      {...register('issueDate')}
                      className="w-full border border-black/[0.12] bg-cashly-cream px-3 py-2.5 text-sm text-cashly-black focus:border-cashly-black focus:outline-none"
                    />
                    {errors.issueDate && (
                      <p className="mt-1 text-xs text-red-500">{errors.issueDate.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-cashly-black">
                      Due Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      {...register('dueDate')}
                      className="w-full border border-black/[0.12] bg-cashly-cream px-3 py-2.5 text-sm text-cashly-black focus:border-cashly-black focus:outline-none"
                    />
                    {errors.dueDate && (
                      <p className="mt-1 text-xs text-red-500">{errors.dueDate.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Line Items */}
              <div
                className="animate-fade-up bg-white border border-black/[0.08]"
                style={{ animationDelay: '120ms' }}
              >
                <div className="border-b border-black/[0.06] px-6 py-4">
                  <p className="font-barlow text-[10px] font-bold uppercase tracking-[0.2em] text-cashly-gray">
                    Line Items
                  </p>
                </div>

                {/* Table header */}
                <div className="grid grid-cols-[1fr_80px_120px_24px] gap-3 bg-cashly-black px-6 py-3">
                  {['Description', 'Qty', 'Unit Price', ''].map((h) => (
                    <span
                      key={h}
                      className={`text-[9px] font-bold uppercase tracking-[0.2em] text-white/40 ${h === 'Qty' || h === 'Unit Price' ? 'text-right' : ''}`}
                    >
                      {h}
                    </span>
                  ))}
                </div>

                {/* Rows */}
                <div className="divide-y divide-black/[0.06]">
                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="grid grid-cols-[1fr_80px_120px_24px] items-center gap-3 px-6 py-3"
                    >
                      <input
                        {...register(`lineItems.${index}.description`)}
                        placeholder="Description"
                        className="border-0 bg-transparent text-sm text-cashly-black placeholder:text-black/25 focus:outline-none focus:ring-0"
                      />
                      <input
                        {...register(`lineItems.${index}.quantity`)}
                        type="number"
                        min={1}
                        placeholder="1"
                        className="border-0 bg-transparent text-right text-sm text-cashly-black placeholder:text-black/25 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <input
                        {...register(`lineItems.${index}.unitPrice`)}
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="0.00"
                        className="border-0 bg-transparent text-right text-sm text-cashly-black placeholder:text-black/25 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        disabled={fields.length === 1}
                        className="flex h-6 w-6 items-center justify-center text-black/20 transition-colors hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>

                {/* Error */}
                {errors.lineItems?.root && (
                  <p className="px-6 pb-2 text-xs text-red-500">{errors.lineItems.root.message}</p>
                )}

                {/* Add row */}
                <div className="border-t border-black/[0.06] px-6 py-3">
                  <button
                    type="button"
                    onClick={() => append({ description: '', quantity: 1, unitPrice: 0 })}
                    className="text-xs font-medium text-cashly-gray hover:text-cashly-black"
                  >
                    + Add line item
                  </button>
                </div>
              </div>

              {/* Notes */}
              <div
                className="animate-fade-up bg-white p-6 border border-black/[0.08]"
                style={{ animationDelay: '180ms' }}
              >
                <label className="mb-1.5 block font-barlow text-[10px] font-bold uppercase tracking-[0.2em] text-cashly-gray">
                  Notes (optional)
                </label>
                <textarea
                  {...register('notes')}
                  rows={3}
                  placeholder="Payment instructions, thank you message…"
                  className="w-full resize-none border border-black/[0.12] bg-cashly-cream px-3 py-2.5 text-sm text-cashly-black placeholder:text-black/30 focus:border-cashly-black focus:outline-none"
                />
              </div>
            </div>

            {/* ── Right col: totals + submit ── */}
            <div className="space-y-4">
              {/* Tax + Discount */}
              <div
                className="animate-fade-up bg-white p-6 border border-black/[0.08]"
                style={{ animationDelay: '80ms' }}
              >
                <p className="mb-4 font-barlow text-[10px] font-bold uppercase tracking-[0.2em] text-cashly-gray">
                  Adjustments
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-cashly-black">
                      Tax Rate (%)
                    </label>
                    <input
                      {...register('taxRate')}
                      type="number"
                      min={0}
                      max={100}
                      step="0.01"
                      placeholder="0"
                      className="w-full border border-black/[0.12] bg-cashly-cream px-3 py-2.5 text-sm text-cashly-black focus:border-cashly-black focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-cashly-black">
                      Discount (₦)
                    </label>
                    <input
                      {...register('discount')}
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="0"
                      className="w-full border border-black/[0.12] bg-cashly-cream px-3 py-2.5 text-sm text-cashly-black focus:border-cashly-black focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                </div>
              </div>

              {/* Live Totals */}
              <div
                className="animate-fade-up bg-white p-6 border border-black/[0.08]"
                style={{ animationDelay: '140ms' }}
              >
                <p className="mb-4 font-barlow text-[10px] font-bold uppercase tracking-[0.2em] text-cashly-gray">
                  Summary
                </p>
                <div className="space-y-2.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-cashly-gray">Subtotal</span>
                    <span className="font-medium text-cashly-black">{fmt(subtotal)}</span>
                  </div>
                  {(Number(watchedTaxRate) || 0) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-cashly-gray">Tax ({watchedTaxRate}%)</span>
                      <span className="font-medium text-cashly-black">{fmt(taxAmount)}</span>
                    </div>
                  )}
                  {(Number(watchedDiscount) || 0) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-cashly-gray">Discount</span>
                      <span className="font-medium text-cashly-black">
                        −{fmt(Number(watchedDiscount))}
                      </span>
                    </div>
                  )}
                  <div className="border-t border-black/[0.08] pt-2.5">
                    <div className="flex justify-between">
                      <span className="font-barlow text-sm font-bold uppercase tracking-wide text-cashly-black">
                        Total Due
                      </span>
                      <span className="font-barlow text-lg font-black text-cashly-black">
                        {fmt(Math.max(0, total))}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="border border-red-200 bg-red-50 px-4 py-3">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Actions */}
              <div
                className="animate-fade-up flex flex-col gap-2"
                style={{ animationDelay: '200ms' }}
              >
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full border border-cashly-black bg-cashly-black py-3 text-sm font-semibold text-white transition-all hover:bg-transparent hover:text-cashly-black disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? 'Creating…' : 'Create Invoice'}
                </button>
                <Link
                  href="/invoices"
                  className="block w-full border border-black/[0.12] py-3 text-center text-sm font-medium text-cashly-gray transition-colors hover:border-cashly-black hover:text-cashly-black"
                >
                  Cancel
                </Link>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
