'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signUp, signIn } from '@/lib/auth'

// ── Schema ────────────────────────────────────────────────────────────────────

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type SignupForm = z.infer<typeof signupSchema>

// ── Google icon ───────────────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </svg>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SignupPage() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupForm>({ resolver: zodResolver(signupSchema) })

  const onSubmit = async (data: SignupForm) => {
    setServerError(null)
    const { error } = await signUp.email({
      name: data.name,
      email: data.email,
      password: data.password,
    })
    if (error) {
      setServerError(error.message ?? 'Could not create account')
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  const handleGoogleSignIn = async () => {
    await signIn.social({ provider: 'google', callbackURL: '/dashboard' })
  }

  return (
    <div className="grid min-h-screen grid-cols-2">
      {/* ── Left — form panel (cream) ───────────────────────────────────── */}
      <div className="flex flex-col items-center justify-center bg-cashly-cream px-14">
        <div className="w-full max-w-[400px]">
          {/* Logo */}
          <Link
            href="/"
            className="animate-fade-up mb-10 block font-barlow text-base font-black uppercase tracking-tight text-cashly-black transition-opacity hover:opacity-60"
            style={{ animationDelay: '0ms' }}
          >
            ← Cashly
          </Link>

          {/* Heading */}
          <div className="animate-fade-up mb-10" style={{ animationDelay: '40ms' }}>
            <h2 className="mb-2 font-barlow text-3xl font-black uppercase tracking-tight text-cashly-black">
              Create Account
            </h2>
            <p className="font-sans text-sm text-cashly-gray">
              Start managing your cash flow today
            </p>
          </div>

          {/* Form */}
          <form
            onSubmit={(e) => void handleSubmit(onSubmit)(e)}
            className="animate-fade-up space-y-5"
            style={{ animationDelay: '80ms' }}
            noValidate
          >
            <div>
              <label
                htmlFor="name"
                className="mb-1.5 block font-sans text-[11px] font-medium uppercase tracking-widest text-cashly-gray"
              >
                Full Name
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                {...register('name')}
                className="block w-full border border-black/20 bg-transparent px-4 py-3 font-sans text-sm text-cashly-black outline-none transition placeholder:text-cashly-gray/40 focus:border-cashly-black focus:ring-2 focus:ring-cashly-lime/25"
              />
              {errors.name && (
                <p className="mt-1.5 font-sans text-xs text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block font-sans text-[11px] font-medium uppercase tracking-widest text-cashly-gray"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                {...register('email')}
                className="block w-full border border-black/20 bg-transparent px-4 py-3 font-sans text-sm text-cashly-black outline-none transition placeholder:text-cashly-gray/40 focus:border-cashly-black focus:ring-2 focus:ring-cashly-lime/25"
              />
              {errors.email && (
                <p className="mt-1.5 font-sans text-xs text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block font-sans text-[11px] font-medium uppercase tracking-widest text-cashly-gray"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                {...register('password')}
                className="block w-full border border-black/20 bg-transparent px-4 py-3 font-sans text-sm text-cashly-black outline-none transition placeholder:text-cashly-gray/40 focus:border-cashly-black focus:ring-2 focus:ring-cashly-lime/25"
              />
              {errors.password && (
                <p className="mt-1.5 font-sans text-xs text-red-600">{errors.password.message}</p>
              )}
            </div>

            {serverError && (
              <div className="border border-red-200 bg-red-50 px-4 py-3 font-sans text-sm text-red-700">
                {serverError}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full border border-cashly-black bg-cashly-black py-3.5 font-sans text-sm font-semibold text-white transition-all hover:bg-transparent hover:text-cashly-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          {/* Divider */}
          <div
            className="animate-fade-up my-7 flex items-center gap-4"
            style={{ animationDelay: '140ms' }}
          >
            <div className="h-px flex-1 bg-black/[0.10]" />
            <span className="font-sans text-[11px] uppercase tracking-widest text-cashly-gray">
              or
            </span>
            <div className="h-px flex-1 bg-black/[0.10]" />
          </div>

          {/* Google */}
          <button
            type="button"
            onClick={() => void handleGoogleSignIn()}
            className="animate-fade-up flex w-full items-center justify-center gap-3 border border-black/20 bg-transparent py-3.5 font-sans text-sm font-medium text-cashly-black transition-colors hover:border-cashly-black hover:bg-cashly-black/[0.04]"
            style={{ animationDelay: '170ms' }}
          >
            <GoogleIcon />
            Continue with Google
          </button>

          {/* Sign in link */}
          <p
            className="animate-fade-up mt-8 text-center font-sans text-sm text-cashly-gray"
            style={{ animationDelay: '200ms' }}
          >
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-medium text-cashly-black underline-offset-2 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* ── Right — dark branding panel ─────────────────────────────────── */}
      <div className="flex flex-col justify-between bg-cashly-black p-14">
        {/* Top tag */}
        <div className="flex justify-end">
          <span className="border border-cashly-lime/20 px-3 py-1 font-sans text-[10px] uppercase tracking-widest text-cashly-lime/50">
            Invoice &amp; Cash Flow
          </span>
        </div>

        {/* Main copy */}
        <div>
          <h2
            className="mb-6 font-barlow font-black uppercase leading-[0.88] tracking-tight text-white"
            style={{ fontSize: 'clamp(2.6rem, 4vw, 4.2rem)' }}
          >
            Finally,
            <br />
            <span className="text-cashly-teal">Invoicing That</span>
            <br />
            Makes Sense.
          </h2>
          <p className="max-w-sm font-sans text-sm leading-relaxed text-white/40">
            Cashly is built for small business owners and freelancers who want to spend less time on
            admin and more time doing great work.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-6">
          {[
            { n: '100%', label: 'Automated reminders' },
            { n: '0', label: 'Manual invoice chasing' },
          ].map((stat) => (
            <div key={stat.n} className="border-t border-white/[0.10] pt-5">
              <p className="font-barlow text-4xl font-black tracking-tight text-white">{stat.n}</p>
              <p className="mt-1 font-sans text-xs text-white/30">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
