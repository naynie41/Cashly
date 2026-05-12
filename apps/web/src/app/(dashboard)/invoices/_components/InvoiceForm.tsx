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

export const invoiceFormSchema = z.object({
  clientId: z.string().min(1, 'Select a client'),
  issueDate: z.string().min(1, 'Issue date is required'),
  dueDate: z.string().min(1, 'Due date is required'),
  taxRate: z.coerce.number().min(0).max(100).default(0),
  discount: z.coerce.number().nonnegative().default(0),
  notes: z.string().optional(),
  lineItems: z.array(lineItemSchema).min(1, 'Add at least one item'),
})

export type InvoiceFormValues = z.infer<typeof invoiceFormSchema>

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeFmt(currency: string) {
  return (n: number) =>
    new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(n)
}

const fmtFallback = makeFmt('NGN')

function today() {
  return new Date().toISOString().split('T')[0]!
}

function thirtyDaysFromNow() {
  const d = new Date()
  d.setDate(d.getDate() + 30)
  return d.toISOString().split('T')[0]!
}

interface UserProfile {
  currency: string
  defaultTaxRate: number | null
  invoicePrefix: string
}

// ── Form ───────────────────────────────────────────────────────────────────────

export interface InvoiceFormProps {
  mode: 'create' | 'edit'
  /** When mode === 'edit', the invoice id to PATCH and to redirect back to. */
  invoiceId?: string
  /** Pre-populated values for edit mode. Ignored on create. */
  initialValues?: InvoiceFormValues
  /** Optional banner shown above the form (e.g. "Editing a sent invoice…"). */
  banner?: React.ReactNode
}

export function InvoiceForm({ mode, invoiceId, initialValues, banner }: InvoiceFormProps) {
  const router = useRouter()
  const [clients, setClients] = useState<ClientOption[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: initialValues ?? {
      issueDate: today(),
      dueDate: thirtyDaysFromNow(),
      taxRate: 0,
      discount: 0,
      lineItems: [{ description: '', quantity: 1, unitPrice: 0 }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'lineItems' })

  useEffect(() => {
    api
      .get<{ data: ClientOption[] }>('/clients')
      .then((res) => setClients(res.data))
      .catch(() => {})

    api
      .get<{ data: UserProfile }>('/api/me')
      .then(({ data }) => {
        setUserProfile(data)
        // Only pre-fill tax rate from defaults on create — don't clobber edit values.
        if (mode === 'create' && data.defaultTaxRate !== null) {
          setValue('taxRate', data.defaultTaxRate)
        }
      })
      .catch(() => {})
  }, [setValue, mode])

  // ── Live totals ────────────────────────────────────────────────────────────

  const watchedLineItems = watch('lineItems')
  const watchedTaxRate = watch('taxRate') ?? 0
  const watchedDiscount = watch('discount') ?? 0

  const subtotal = (watchedLineItems ?? []).reduce(
    (sum, li) => sum + (Number(li.quantity) || 0) * (Number(li.unitPrice) || 0),
    0,
  )
  const taxAmount = subtotal * ((Number(watchedTaxRate) || 0) / 100)
  const total = subtotal + taxAmount - (Number(watchedDiscount) || 0)

  const fmtCurrency = userProfile ? makeFmt(userProfile.currency) : fmtFallback

  // ── Submit ─────────────────────────────────────────────────────────────────

  const onSubmit = async (values: InvoiceFormValues) => {
    setSubmitting(true)
    setError(null)
    try {
      if (mode === 'create') {
        const res = await api.post<{ data: { id: string } }>('/invoices', values)
        router.push(`/invoices/${res.data.id}`)
      } else {
        if (!invoiceId) throw new Error('Edit mode requires invoiceId')
        await api.patch(`/invoices/${invoiceId}`, values)
        router.push(`/invoices/${invoiceId}`)
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const submitLabel =
    mode === 'create' ? (submitting ? 'Creating…' : 'Create Invoice') : submitting ? 'Saving…' : 'Save Changes'

  const cancelHref = mode === 'edit' && invoiceId ? `/invoices/${invoiceId}` : '/invoices'

  return (
    <form onSubmit={(e) => void handleSubmit(onSubmit)(e)}>
      {banner}

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

            <div className="grid grid-cols-[1fr_80px_120px_24px] gap-3 bg-cashly-black px-6 py-3">
              {['Description', 'Qty', 'Unit Price', ''].map((h) => (
                <span
                  key={h}
                  className={`text-[9px] font-bold uppercase tracking-[0.2em] text-white/40 ${
                    h === 'Qty' || h === 'Unit Price' ? 'text-right' : ''
                  }`}
                >
                  {h}
                </span>
              ))}
            </div>

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

            {errors.lineItems?.root && (
              <p className="px-6 pb-2 text-xs text-red-500">{errors.lineItems.root.message}</p>
            )}

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
                  Discount ({userProfile?.currency ?? 'NGN'})
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
                <span className="font-medium text-cashly-black">{fmtCurrency(subtotal)}</span>
              </div>
              {(Number(watchedTaxRate) || 0) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-cashly-gray">Tax ({watchedTaxRate}%)</span>
                  <span className="font-medium text-cashly-black">{fmtCurrency(taxAmount)}</span>
                </div>
              )}
              {(Number(watchedDiscount) || 0) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-cashly-gray">Discount</span>
                  <span className="font-medium text-cashly-black">
                    −{fmtCurrency(Number(watchedDiscount))}
                  </span>
                </div>
              )}
              <div className="border-t border-black/[0.08] pt-2.5">
                <div className="flex justify-between">
                  <span className="font-barlow text-sm font-bold uppercase tracking-wide text-cashly-black">
                    Total Due
                  </span>
                  <span className="font-barlow text-lg font-black text-cashly-black">
                    {fmtCurrency(Math.max(0, total))}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="animate-fade-up flex flex-col gap-2" style={{ animationDelay: '200ms' }}>
            <button
              type="submit"
              disabled={submitting}
              className="w-full border border-cashly-black bg-cashly-black py-3 text-sm font-semibold text-white transition-all hover:bg-transparent hover:text-cashly-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitLabel}
            </button>
            <Link
              href={cancelHref}
              className="block w-full border border-black/[0.12] py-3 text-center text-sm font-medium text-cashly-gray transition-colors hover:border-cashly-black hover:text-cashly-black"
            >
              Cancel
            </Link>
          </div>
        </div>
      </div>
    </form>
  )
}

export { makeFmt, today, thirtyDaysFromNow }
export type { UserProfile }
