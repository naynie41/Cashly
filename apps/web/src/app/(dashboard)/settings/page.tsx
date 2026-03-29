'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '@/lib/api'

// ── Constants ─────────────────────────────────────────────────────────────────

const INDUSTRIES = [
  'Freelance / Creative',
  'Photography',
  'Consulting',
  'Design',
  'Technology',
  'Construction',
  'Events',
  'Other',
]

const CURRENCIES = [
  { code: 'NGN', label: '₦ Nigerian Naira' },
  { code: 'USD', label: '$ US Dollar' },
  { code: 'GBP', label: '£ British Pound' },
  { code: 'EUR', label: '€ Euro' },
  { code: 'GHS', label: '₵ Ghanaian Cedi' },
  { code: 'KES', label: 'KSh Kenyan Shilling' },
  { code: 'ZAR', label: 'R South African Rand' },
]

const BRAND_COLORS = ['#6366f1', '#72EDD4', '#FF6B6B', '#3B82F6', '#F59E0B', '#EC4899', '#374151']

// ── Schema ────────────────────────────────────────────────────────────────────

const settingsSchema = z.object({
  businessName: z
    .string()
    .min(2, 'Business name must be at least 2 characters')
    .optional()
    .or(z.literal('')),
  industry: z.string().optional(),
  currency: z.string().default('NGN'),
  businessAddress: z.string().optional(),
  businessPhone: z.string().optional(),
  businessWebsite: z.string().optional(),
  defaultTaxRate: z.string().optional(),
  invoicePrefix: z
    .string()
    .max(6, 'Prefix must be 6 characters or less')
    .regex(/^[A-Z0-9]*$/i, 'Only letters and numbers allowed')
    .optional()
    .or(z.literal('')),
})

type SettingsForm = z.infer<typeof settingsSchema>

// ── Me response type ──────────────────────────────────────────────────────────

interface UserProfile {
  businessName: string | null
  industry: string | null
  currency: string
  businessAddress: string | null
  businessPhone: string | null
  businessWebsite: string | null
  brandColor: string | null
  defaultTaxRate: number | null
  invoicePrefix: string
  logoUrl: string | null
}

// ── Input styles ──────────────────────────────────────────────────────────────

const inputCls =
  'block w-full border border-black/20 bg-transparent px-4 py-3 font-sans text-sm text-cashly-black outline-none transition placeholder:text-cashly-gray/40 focus:border-cashly-black focus:ring-2 focus:ring-cashly-lime/25'

const labelCls =
  'mb-1.5 block font-sans text-[11px] font-medium uppercase tracking-widest text-cashly-gray'

const selectCls =
  'block w-full border border-black/20 bg-cashly-cream px-4 py-3 font-sans text-sm text-cashly-black outline-none transition focus:border-cashly-black focus:ring-2 focus:ring-cashly-lime/25'

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ message, type }: { message: string; type: 'success' | 'error' }) {
  return (
    <div
      className={[
        'fixed bottom-6 right-6 z-50 flex items-center gap-3 border px-5 py-3.5 font-sans text-sm shadow-lg',
        type === 'success'
          ? 'border-cashly-lime bg-cashly-black text-white'
          : 'border-red-300 bg-red-50 text-red-700',
      ].join(' ')}
    >
      {type === 'success' ? (
        <span className="text-cashly-lime">✓</span>
      ) : (
        <span className="text-red-500">✕</span>
      )}
      {message}
    </div>
  )
}

// ── Section heading ───────────────────────────────────────────────────────────

function SectionHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-6">
      <h2 className="font-barlow text-xl font-black uppercase tracking-tight text-cashly-black">
        {title}
      </h2>
      {description && <p className="mt-1 font-sans text-sm text-cashly-gray">{description}</p>}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [brandColor, setBrandColor] = useState('#6366f1')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }, [])

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SettingsForm>({ resolver: zodResolver(settingsSchema) })

  const invoicePrefix = watch('invoicePrefix')

  // Load current profile
  useEffect(() => {
    api
      .get<{ data: UserProfile }>('/api/me')
      .then(({ data }) => {
        setProfile(data)
        setBrandColor(data.brandColor ?? '#6366f1')
        setLogoUrl(data.logoUrl)
        reset({
          businessName: data.businessName ?? '',
          industry: data.industry ?? '',
          currency: data.currency ?? 'NGN',
          businessAddress: data.businessAddress ?? '',
          businessPhone: data.businessPhone ?? '',
          businessWebsite: data.businessWebsite ?? '',
          defaultTaxRate: data.defaultTaxRate !== null ? String(data.defaultTaxRate) : '',
          invoicePrefix: data.invoicePrefix ?? 'INV',
        })
      })
      .catch(() => {
        showToast('Could not load profile', 'error')
      })
  }, [reset, showToast])

  const onSubmit = async (formData: SettingsForm) => {
    try {
      await api.patch('/api/onboarding', {
        businessName: formData.businessName || undefined,
        industry: formData.industry || undefined,
        currency: formData.currency,
        businessAddress: formData.businessAddress || undefined,
        businessPhone: formData.businessPhone || undefined,
        businessWebsite: formData.businessWebsite || undefined,
        brandColor,
        defaultTaxRate: formData.defaultTaxRate ? Number(formData.defaultTaxRate) : undefined,
        invoicePrefix: formData.invoicePrefix || 'INV',
      })
      showToast('Settings saved', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save settings', 'error')
    }
  }

  // Logo upload
  const handleLogoFile = useCallback(
    async (file: File) => {
      setLogoUploading(true)
      try {
        const apiUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'
        const formData = new FormData()
        formData.append('file', file)
        const res = await fetch(`${apiUrl}/upload/logo`, {
          method: 'POST',
          credentials: 'include',
          body: formData,
        })
        if (!res.ok) {
          const j = (await res.json()) as { error?: string }
          throw new Error(j.error ?? 'Upload failed')
        }
        const json = (await res.json()) as { data: { logoUrl: string } }
        setLogoUrl(json.data.logoUrl)
        showToast('Logo uploaded', 'success')
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Upload failed', 'error')
      } finally {
        setLogoUploading(false)
      }
    },
    [showToast],
  )

  const handleRemoveLogo = useCallback(async () => {
    try {
      await api.delete('/upload/logo')
      setLogoUrl(null)
      showToast('Logo removed', 'success')
    } catch {
      showToast('Could not remove logo', 'error')
    }
  }, [showToast])

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-5 w-5 animate-spin border-2 border-cashly-black border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cashly-cream px-8 py-10">
      <div className="mx-auto max-w-2xl">
        {/* Page header */}
        <div className="mb-10">
          <h1 className="font-barlow text-3xl font-black uppercase tracking-tight text-cashly-black">
            Settings
          </h1>
          <p className="mt-1 font-sans text-sm text-cashly-gray">
            Manage your business profile and invoice defaults.
          </p>
        </div>

        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-10" noValidate>
          {/* ── Section: Business Info ─────────────────────────────────────── */}
          <div className="border border-black/[0.08] bg-white p-8">
            <SectionHeading
              title="Business Info"
              description="This information appears on your invoices and emails."
            />
            <div className="space-y-5">
              <div>
                <label className={labelCls}>Business Name</label>
                <input
                  {...register('businessName')}
                  placeholder="Apex Studio"
                  className={inputCls}
                />
                {errors.businessName && (
                  <p className="mt-1.5 font-sans text-xs text-red-600">
                    {errors.businessName.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Industry</label>
                  <select {...register('industry')} className={selectCls}>
                    <option value="">Select…</option>
                    {INDUSTRIES.map((i) => (
                      <option key={i} value={i}>
                        {i}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Currency</label>
                  <select {...register('currency')} className={selectCls}>
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelCls}>Business Address</label>
                <input
                  {...register('businessAddress')}
                  placeholder="123 Lagos Street, Victoria Island"
                  className={inputCls}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Phone</label>
                  <input
                    {...register('businessPhone')}
                    placeholder="+234 800 000 0000"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Website</label>
                  <input
                    {...register('businessWebsite')}
                    placeholder="https://yoursite.com"
                    className={inputCls}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Section: Branding ──────────────────────────────────────────── */}
          <div className="border border-black/[0.08] bg-white p-8">
            <SectionHeading
              title="Branding"
              description="Your logo and brand colour appear on every invoice PDF."
            />
            <div className="space-y-6">
              {/* Logo upload */}
              <div>
                <label className={labelCls}>Business Logo</label>
                <div className="flex items-start gap-5">
                  <div
                    className="flex h-20 w-20 cursor-pointer items-center justify-center border-2 border-dashed border-black/20 bg-cashly-cream/60 transition hover:border-cashly-black"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo" className="h-full w-full object-contain p-1" />
                    ) : logoUploading ? (
                      <div className="h-4 w-4 animate-spin border-2 border-cashly-black border-t-transparent" />
                    ) : (
                      <span className="font-sans text-[10px] text-cashly-gray/60">Upload</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={logoUploading}
                      className="border border-cashly-black bg-transparent px-4 py-2 font-sans text-xs font-medium text-cashly-black transition hover:bg-cashly-black hover:text-white disabled:opacity-50"
                    >
                      {logoUploading ? 'Uploading…' : logoUrl ? 'Change logo' : 'Upload logo'}
                    </button>
                    {logoUrl && (
                      <button
                        type="button"
                        onClick={() => void handleRemoveLogo()}
                        className="font-sans text-xs text-red-500 underline-offset-2 hover:underline"
                      >
                        Remove
                      </button>
                    )}
                    <p className="font-sans text-[11px] text-cashly-gray/60">
                      PNG, JPG, SVG or WEBP · max 2 MB
                    </p>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) void handleLogoFile(file)
                    e.target.value = ''
                  }}
                />
              </div>

              {/* Brand colour */}
              <div>
                <label className={labelCls}>Brand Colour</label>
                <div className="flex flex-wrap items-center gap-2">
                  {BRAND_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setBrandColor(c)}
                      className={`h-8 w-8 transition-transform hover:scale-110 ${
                        brandColor === c ? 'ring-2 ring-cashly-black ring-offset-2' : ''
                      }`}
                      style={{ backgroundColor: c }}
                      aria-label={`Select colour ${c}`}
                    />
                  ))}
                  <label className="relative ml-1 cursor-pointer">
                    <span
                      className="flex h-8 w-8 items-center justify-center border border-dashed border-black/30 text-[11px] text-cashly-gray"
                      title="Custom colour"
                    >
                      +
                    </span>
                    <input
                      type="color"
                      value={brandColor}
                      onChange={(e) => setBrandColor(e.target.value)}
                      className="absolute inset-0 h-0 w-0 cursor-pointer opacity-0"
                    />
                  </label>
                  <span className="ml-2 font-mono text-xs text-cashly-black">{brandColor}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Section: Invoice Defaults ───────────────────────────────────── */}
          <div className="border border-black/[0.08] bg-white p-8">
            <SectionHeading
              title="Invoice Defaults"
              description="These values pre-fill every new invoice you create."
            />
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Default Tax Rate (%)</label>
                  <input
                    {...register('defaultTaxRate')}
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    placeholder="7.5"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Invoice Prefix</label>
                  <input
                    {...register('invoicePrefix')}
                    maxLength={6}
                    placeholder="INV"
                    className={`${inputCls} font-mono uppercase`}
                  />
                  {errors.invoicePrefix && (
                    <p className="mt-1.5 font-sans text-xs text-red-600">
                      {errors.invoicePrefix.message}
                    </p>
                  )}
                  <p className="mt-1 font-sans text-[11px] text-cashly-gray">
                    Preview:{' '}
                    <span className="font-mono font-semibold text-cashly-black">
                      {(invoicePrefix || 'INV').toUpperCase()}-0001
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Save button ─────────────────────────────────────────────────── */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="border border-cashly-black bg-cashly-black px-10 py-3.5 font-sans text-sm font-semibold text-white transition-all hover:bg-transparent hover:text-cashly-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  )
}
