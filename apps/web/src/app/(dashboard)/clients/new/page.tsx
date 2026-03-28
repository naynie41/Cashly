'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().optional(),
  address: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export default function NewClientPage() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    setServerError(null)
    try {
      await api.post('/clients', data)
      router.push('/clients')
      router.refresh()
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  return (
    <div className="min-h-screen bg-cashly-cream">
      {/* Header */}
      <div className="border-b border-black/[0.08] bg-cashly-cream px-10 py-8">
        <div className="flex items-center gap-4 mb-1">
          <Link
            href="/clients"
            className="font-sans text-xs text-cashly-gray hover:text-cashly-black transition-colors flex items-center gap-1.5"
          >
            <BackArrow />
            Clients
          </Link>
        </div>
        <div className="animate-fade-up" style={{ animationDelay: '0ms' }}>
          <p className="text-[10px] font-barlow tracking-[0.2em] text-cashly-gray mb-1">NEW</p>
          <h1 className="font-barlow text-5xl font-black uppercase leading-none tracking-tight text-cashly-black">
            Client
          </h1>
        </div>
      </div>

      {/* Form */}
      <div className="px-10 py-10">
        <div className="max-w-lg animate-fade-up" style={{ animationDelay: '80ms' }}>
          <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} noValidate className="space-y-6">
            <FormField label="Name" required error={errors.name?.message}>
              <input
                {...register('name')}
                placeholder="Apex Events Ltd"
                className={inputCls(!!errors.name)}
              />
            </FormField>

            <FormField label="Email" required error={errors.email?.message}>
              <input
                {...register('email')}
                type="email"
                placeholder="hello@apexevents.com"
                className={inputCls(!!errors.email)}
              />
            </FormField>

            <FormField label="Phone" error={errors.phone?.message}>
              <input
                {...register('phone')}
                type="tel"
                placeholder="+234 800 000 0000"
                className={inputCls(false)}
              />
            </FormField>

            <FormField label="Address" error={errors.address?.message}>
              <textarea
                {...register('address')}
                placeholder="5 Admiralty Way, Lekki Phase 1, Lagos"
                rows={3}
                className={inputCls(false) + ' resize-none'}
              />
            </FormField>

            {serverError && (
              <p className="border border-red-200 bg-red-50 px-4 py-3 text-sm font-sans text-red-700">
                {serverError}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <Link
                href="/clients"
                className="flex-1 border border-black/20 py-3 text-center text-sm font-sans font-medium text-cashly-black transition-colors hover:border-cashly-black"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-cashly-black py-3 text-sm font-sans font-medium text-white transition-colors hover:bg-cashly-black/80 disabled:opacity-50"
              >
                {isSubmitting ? 'Creating…' : 'Create Client'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

function FormField({
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
      <label className="mb-2 block text-[11px] font-barlow font-black uppercase tracking-[0.14em] text-cashly-black">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="mt-1.5 text-xs font-sans text-red-600">{error}</p>}
    </div>
  )
}

const inputCls = (hasError: boolean) =>
  [
    'w-full border px-4 py-3 text-sm font-sans bg-white text-cashly-black outline-none transition-colors placeholder:text-black/25',
    hasError
      ? 'border-red-400 focus:border-red-500'
      : 'border-black/[0.15] focus:border-cashly-black',
  ].join(' ')

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
