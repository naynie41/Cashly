'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
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

const BRAND_COLORS = [
  '#6366f1', // purple
  '#72EDD4', // teal
  '#FF6B6B', // coral
  '#3B82F6', // blue
  '#F59E0B', // amber
  '#EC4899', // pink
  '#374151', // charcoal
]

// ── Schemas ───────────────────────────────────────────────────────────────────

const step1Schema = z.object({
  businessName: z.string().min(2, 'Business name must be at least 2 characters'),
  industry: z.string().optional(),
  currency: z.string().default('NGN'),
  businessAddress: z.string().optional(),
  businessPhone: z.string().optional(),
  businessWebsite: z.string().optional(),
})

type Step1Data = z.infer<typeof step1Schema>

// ── Shared data state ─────────────────────────────────────────────────────────

interface OnboardingData {
  businessName: string
  industry: string
  currency: string
  businessAddress: string
  businessPhone: string
  businessWebsite: string
  logoUrl: string | null
  brandColor: string
  defaultTaxRate: string
  invoicePrefix: string
}

// ── Input style ───────────────────────────────────────────────────────────────

const inputCls =
  'block w-full border border-black/20 bg-transparent px-4 py-3 font-sans text-sm text-cashly-black outline-none transition placeholder:text-cashly-gray/40 focus:border-cashly-black focus:ring-2 focus:ring-cashly-lime/25'

const labelCls =
  'mb-1.5 block font-sans text-[11px] font-medium uppercase tracking-widest text-cashly-gray'

const selectCls =
  'block w-full border border-black/20 bg-transparent px-4 py-3 font-sans text-sm text-cashly-black outline-none transition focus:border-cashly-black focus:ring-2 focus:ring-cashly-lime/25'

// ── Progress dots ─────────────────────────────────────────────────────────────

function ProgressDots({ step }: { step: number }) {
  return (
    <div className="mb-10 flex items-center gap-2">
      {[1, 2, 3].map((s) => (
        <div
          key={s}
          className={`h-2 rounded-full transition-all duration-300 ${
            s === step
              ? 'w-6 bg-cashly-black'
              : s < step
                ? 'w-2 bg-cashly-black/40'
                : 'w-2 bg-black/15'
          }`}
        />
      ))}
      <span className="ml-2 font-sans text-[11px] uppercase tracking-widest text-cashly-gray">
        Step {step} of 3
      </span>
    </div>
  )
}

// ── Step 1: Business Info ─────────────────────────────────────────────────────

function Step1({
  data,
  onNext,
  onSkip,
}: {
  data: OnboardingData
  onNext: (d: Partial<OnboardingData>) => void
  onSkip: () => void
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      businessName: data.businessName,
      industry: data.industry,
      currency: data.currency || 'NGN',
      businessAddress: data.businessAddress,
      businessPhone: data.businessPhone,
      businessWebsite: data.businessWebsite,
    },
  })

  return (
    <form onSubmit={(e) => void handleSubmit((d) => onNext(d))(e)} className="space-y-5" noValidate>
      <div>
        <label className={labelCls}>
          Business Name <span className="text-red-500">*</span>
        </label>
        <input {...register('businessName')} placeholder="Apex Studio" className={inputCls} />
        {errors.businessName && (
          <p className="mt-1.5 font-sans text-xs text-red-600">{errors.businessName.message}</p>
        )}
      </div>

      <div>
        <label className={labelCls}>Industry</label>
        <select {...register('industry')} className={selectCls}>
          <option value="">Select an industry…</option>
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

      <div>
        <label className={labelCls}>Business Address (optional)</label>
        <input
          {...register('businessAddress')}
          placeholder="123 Lagos Street, Victoria Island"
          className={inputCls}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Phone (optional)</label>
          <input
            {...register('businessPhone')}
            placeholder="+234 800 000 0000"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Website (optional)</label>
          <input
            {...register('businessWebsite')}
            placeholder="https://yoursite.com"
            className={inputCls}
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onSkip}
          className="font-sans text-sm text-cashly-gray underline-offset-2 hover:text-cashly-black hover:underline"
        >
          I'll do this later
        </button>
        <button
          type="submit"
          className="border border-cashly-black bg-cashly-black px-8 py-3 font-sans text-sm font-semibold text-white transition-all hover:bg-transparent hover:text-cashly-black"
        >
          Continue →
        </button>
      </div>
    </form>
  )
}

// ── Step 2: Branding ──────────────────────────────────────────────────────────

function Step2({
  data,
  onNext,
  onBack,
  onSkip,
}: {
  data: OnboardingData
  onNext: (d: Partial<OnboardingData>) => void
  onBack: () => void
  onSkip: () => void
}) {
  const [logoUrl, setLogoUrl] = useState<string | null>(data.logoUrl)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [brandColor, setBrandColor] = useState(data.brandColor || '#6366f1')
  const [taxRate, setTaxRate] = useState(data.defaultTaxRate || '')
  const [prefix, setPrefix] = useState(data.invoicePrefix || 'INV')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError(null)
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('logo', file)
      const res = await fetch(
        `${process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'}/upload/logo`,
        { method: 'POST', body: formData, credentials: 'include' },
      )
      const json = (await res.json()) as { data?: { logoUrl: string }; error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Upload failed')
      setLogoUrl(json.data?.logoUrl ?? null)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }, [])

  const handleRemoveLogo = useCallback(async () => {
    try {
      await api.delete('/upload/logo')
      setLogoUrl(null)
    } catch {
      // best-effort
    }
  }, [])

  const handleNext = () => {
    onNext({
      logoUrl,
      brandColor,
      defaultTaxRate: taxRate,
      invoicePrefix: prefix.toUpperCase() || 'INV',
    })
  }

  return (
    <div className="space-y-7">
      {/* Logo upload */}
      <div>
        <label className={labelCls}>Business Logo</label>
        {logoUrl ? (
          <div className="flex items-center gap-4">
            <img
              src={logoUrl}
              alt="Business logo"
              className="h-16 w-16 border border-black/10 object-contain p-1"
            />
            <div>
              <p className="font-sans text-sm font-medium text-cashly-black">Logo uploaded</p>
              <button
                type="button"
                onClick={() => void handleRemoveLogo()}
                className="font-sans text-xs text-cashly-gray underline-offset-2 hover:text-red-600 hover:underline"
              >
                Remove logo
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex w-full flex-col items-center gap-2 border border-dashed border-black/25 py-8 font-sans text-sm text-cashly-gray transition-colors hover:border-cashly-black hover:text-cashly-black disabled:opacity-50"
          >
            {uploading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-cashly-black border-t-transparent" />
                <span>Uploading…</span>
              </>
            ) : (
              <>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path
                    d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>Click to upload logo</span>
                <span className="text-xs text-cashly-gray/60">PNG, JPG, SVG, WEBP · Max 2 MB</span>
              </>
            )}
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/webp"
          className="hidden"
          onChange={(e) => void handleFileChange(e)}
        />
        {uploadError && <p className="mt-1.5 font-sans text-xs text-red-600">{uploadError}</p>}
      </div>

      {/* Brand colour */}
      <div>
        <label className={labelCls}>Brand Colour</label>
        <div className="flex flex-wrap items-center gap-3">
          {BRAND_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setBrandColor(c)}
              className={`h-8 w-8 transition-transform hover:scale-110 ${brandColor === c ? 'ring-2 ring-offset-2 ring-cashly-black' : ''}`}
              style={{ backgroundColor: c }}
              title={c}
            />
          ))}
          <div className="relative">
            <input
              type="color"
              value={brandColor}
              onChange={(e) => setBrandColor(e.target.value)}
              className="h-8 w-8 cursor-pointer border-0 bg-transparent p-0"
              title="Custom colour"
            />
          </div>
          <span className="font-mono text-xs text-cashly-gray">{brandColor}</span>
        </div>
      </div>

      {/* Default tax rate */}
      <div>
        <label className={labelCls}>Default Tax Rate (optional)</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={taxRate}
            onChange={(e) => setTaxRate(e.target.value)}
            placeholder="0"
            className={`${inputCls} w-32`}
          />
          <span className="font-sans text-sm text-cashly-gray">%</span>
        </div>
        <p className="mt-1 font-sans text-xs text-cashly-gray">Pre-filled on every new invoice</p>
      </div>

      {/* Invoice prefix */}
      <div>
        <label className={labelCls}>Invoice Prefix (optional)</label>
        <input
          type="text"
          maxLength={6}
          value={prefix}
          onChange={(e) => setPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
          placeholder="INV"
          className={`${inputCls} w-40 font-mono`}
        />
        <p className="mt-1 font-sans text-xs text-cashly-gray">
          Preview:{' '}
          <span className="font-mono font-semibold text-cashly-black">{prefix || 'INV'}-0001</span>
        </p>
      </div>

      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="font-sans text-sm text-cashly-gray underline-offset-2 hover:text-cashly-black hover:underline"
          >
            ← Back
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="font-sans text-sm text-cashly-gray underline-offset-2 hover:text-cashly-black hover:underline"
          >
            I'll set this up later
          </button>
        </div>
        <button
          type="button"
          onClick={handleNext}
          className="border border-cashly-black bg-cashly-black px-8 py-3 font-sans text-sm font-semibold text-white transition-all hover:bg-transparent hover:text-cashly-black"
        >
          Continue →
        </button>
      </div>
    </div>
  )
}

// ── Step 3: Review ────────────────────────────────────────────────────────────

function Step3({
  data,
  onBack,
  onFinish,
}: {
  data: OnboardingData
  onBack: () => void
  onFinish: () => Promise<void>
}) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currencyLabel = CURRENCIES.find((c) => c.code === data.currency)?.label ?? data.currency

  const handleFinish = async () => {
    setSaving(true)
    setError(null)
    await onFinish().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setSaving(false)
    })
  }

  return (
    <div className="space-y-6">
      <div className="border border-black/[0.08] bg-cashly-cream/60 p-6">
        <p className="mb-5 font-barlow text-[9px] font-bold uppercase tracking-[0.2em] text-cashly-gray">
          Summary
        </p>
        <div className="space-y-4">
          <Row label="Business Name" value={data.businessName || '—'} />
          <Row label="Industry" value={data.industry || '—'} />
          <Row label="Currency" value={currencyLabel} />
          <div className="flex items-start justify-between py-2 border-t border-black/[0.06]">
            <span className="font-sans text-[11px] uppercase tracking-widest text-cashly-gray">
              Logo
            </span>
            {data.logoUrl ? (
              <img
                src={data.logoUrl}
                alt="Logo"
                className="h-10 w-10 object-contain border border-black/10 p-0.5"
              />
            ) : (
              <span className="font-sans text-sm text-cashly-gray">No logo</span>
            )}
          </div>
          <div className="flex items-center justify-between py-2 border-t border-black/[0.06]">
            <span className="font-sans text-[11px] uppercase tracking-widest text-cashly-gray">
              Brand Colour
            </span>
            <div className="flex items-center gap-2">
              <div className="h-5 w-5" style={{ backgroundColor: data.brandColor }} />
              <span className="font-mono text-xs text-cashly-black">{data.brandColor}</span>
            </div>
          </div>
          <Row
            label="Default Tax Rate"
            value={data.defaultTaxRate ? `${data.defaultTaxRate}%` : 'Not set'}
          />
          <Row
            label="Invoice Prefix"
            value={`${data.invoicePrefix || 'INV'} → ${data.invoicePrefix || 'INV'}-0001`}
          />
          {data.businessAddress && <Row label="Address" value={data.businessAddress} />}
          {data.businessPhone && <Row label="Phone" value={data.businessPhone} />}
          {data.businessWebsite && <Row label="Website" value={data.businessWebsite} />}
        </div>
      </div>

      {error && (
        <div className="border border-red-200 bg-red-50 px-4 py-3 font-sans text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="font-sans text-sm text-cashly-gray underline-offset-2 hover:text-cashly-black hover:underline"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={() => void handleFinish()}
          disabled={saving}
          className="border border-cashly-black bg-cashly-black px-8 py-3 font-sans text-sm font-semibold text-white transition-all hover:bg-transparent hover:text-cashly-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Go to dashboard →'}
        </button>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between border-t border-black/[0.06] py-2">
      <span className="font-sans text-[11px] uppercase tracking-widest text-cashly-gray">
        {label}
      </span>
      <span className="max-w-[60%] text-right font-sans text-sm text-cashly-black">{value}</span>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)

  // If user has already completed onboarding, skip straight to dashboard
  useEffect(() => {
    api
      .get<{ data: { onboardingDone: boolean } }>('/api/me')
      .then((me) => {
        if (me.data.onboardingDone) router.replace('/dashboard')
      })
      .catch(() => {
        // ignore — if /api/me fails the middleware will handle auth
      })
  }, [router])

  const [data, setData] = useState<OnboardingData>({
    businessName: '',
    industry: '',
    currency: 'NGN',
    businessAddress: '',
    businessPhone: '',
    businessWebsite: '',
    logoUrl: null,
    brandColor: '#6366f1',
    defaultTaxRate: '',
    invoicePrefix: 'INV',
  })

  const merge = (partial: Partial<OnboardingData>) => setData((prev) => ({ ...prev, ...partial }))

  const handleFinish = async () => {
    await api.patch('/api/onboarding', {
      businessName: data.businessName || undefined,
      industry: data.industry || undefined,
      currency: data.currency,
      businessAddress: data.businessAddress || undefined,
      businessPhone: data.businessPhone || undefined,
      businessWebsite: data.businessWebsite || undefined,
      brandColor: data.brandColor,
      defaultTaxRate: data.defaultTaxRate ? Number(data.defaultTaxRate) : undefined,
      invoicePrefix: data.invoicePrefix || 'INV',
      onboardingDone: true,
    })
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-cashly-cream">
      <div className="flex min-h-screen items-center justify-center px-4 py-16">
        <div className="w-full max-w-[520px]">
          {/* Header */}
          <div className="mb-8 animate-fade-up" style={{ animationDelay: '0ms' }}>
            <span className="font-barlow text-lg font-black uppercase tracking-tight text-cashly-black">
              Cashly
            </span>
          </div>

          <div className="animate-fade-up" style={{ animationDelay: '60ms' }}>
            <ProgressDots step={step} />

            {step === 1 && (
              <>
                <h1 className="mb-1 font-barlow text-3xl font-black uppercase tracking-tight text-cashly-black">
                  Your Business
                </h1>
                <p className="mb-8 font-sans text-sm text-cashly-gray">
                  Tell us about your business so we can personalise your invoices.
                </p>
                <Step1
                  data={data}
                  onNext={(d) => {
                    merge(d)
                    setStep(2)
                  }}
                  onSkip={() => setStep(3)}
                />
              </>
            )}

            {step === 2 && (
              <>
                <h1 className="mb-1 font-barlow text-3xl font-black uppercase tracking-tight text-cashly-black">
                  Branding
                </h1>
                <p className="mb-8 font-sans text-sm text-cashly-gray">
                  Add your logo and choose your brand colour. This appears on every invoice.
                </p>
                <Step2
                  data={data}
                  onNext={(d) => {
                    merge(d)
                    setStep(3)
                  }}
                  onBack={() => setStep(1)}
                  onSkip={() => setStep(3)}
                />
              </>
            )}

            {step === 3 && (
              <>
                <h1 className="mb-1 font-barlow text-3xl font-black uppercase tracking-tight text-cashly-black">
                  Ready to Go
                </h1>
                <p className="mb-8 font-sans text-sm text-cashly-gray">
                  Here's what we'll set up. You can change everything later in Settings.
                </p>
                <Step3 data={data} onBack={() => setStep(2)} onFinish={handleFinish} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
