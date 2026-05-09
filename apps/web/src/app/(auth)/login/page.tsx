'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signIn } from '@/lib/auth'
import { api } from '@/lib/api'

// ── Schema ────────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

type LoginForm = z.infer<typeof loginSchema>

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

export default function LoginPage() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })

  const onSubmit = async (data: LoginForm) => {
    setServerError(null)
    const { error } = await signIn.email({ email: data.email, password: data.password })
    if (error) {
      setServerError(error.message ?? 'Invalid email or password')
      return
    }
    // Check onboarding status and route accordingly
    try {
      const me = await api.get<{ data: { onboardingDone: boolean } }>('/api/me')
      router.push(me.data.onboardingDone ? '/dashboard' : '/onboarding')
    } catch {
      router.push('/dashboard')
    }
    router.refresh()
  }

  const handleGoogleSignIn = async () => {
    setServerError(null)
    const apiUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'
    const appUrl = process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000'
    try {
      const res = await fetch(`${apiUrl}/api/auth/sign-in/social`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'google', callbackURL: `${appUrl}/dashboard` }),
      })
      const json = (await res.json()) as { url?: string; message?: string }
      if (!res.ok || !json.url) {
        setServerError(json.message ?? 'Google sign-in failed')
        return
      }
      window.location.href = json.url
    } catch {
      setServerError('Could not reach the server')
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-2">
      {/* ── Left — dark branding panel ─────────────────────────────────── */}
      <div className="flex flex-col justify-between bg-cashly-black p-14">
        <Link
          href="/"
          className="font-barlow text-lg font-black uppercase tracking-tight text-white transition-opacity hover:opacity-70"
        >
          ← Cashly
        </Link>

        <div>
          <h1
            className="mb-8 font-barlow font-black uppercase leading-[0.88] tracking-tight text-white"
            style={{ fontSize: 'clamp(2.6rem, 4vw, 4.2rem)' }}
          >
            Your Invoices.
            <br />
            <span className="text-cashly-lime">Under Control.</span>
          </h1>
          <ul className="space-y-4">
            {[
              'Create & send branded PDF invoices',
              'Accept Paystack payments automatically',
              'AI cash flow summaries every month',
              'Automatic overdue reminders',
            ].map((item) => (
              <li key={item} className="flex items-center gap-3 font-sans text-sm text-white/50">
                <span className="h-px w-5 shrink-0 bg-cashly-teal" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="font-sans text-xs text-white/20">© {new Date().getFullYear()} Cashly</p>
      </div>

      {/* ── Right — form panel ─────────────────────────────────────────── */}
      <div className="flex flex-col items-center justify-center bg-cashly-cream px-14">
        <div className="w-full max-w-[400px]">
          {/* Heading */}
          <div className="mb-10 animate-fade-up" style={{ animationDelay: '0ms' }}>
            <h2 className="mb-2 font-barlow text-3xl font-black uppercase tracking-tight text-cashly-black">
              Welcome Back
            </h2>
            <p className="font-sans text-sm text-cashly-gray">Sign in to your account</p>
          </div>

          {/* Form */}
          <form
            onSubmit={(e) => void handleSubmit(onSubmit)(e)}
            className="animate-fade-up space-y-5"
            style={{ animationDelay: '60ms' }}
            noValidate
          >
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
              <div className="mb-1.5 flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="font-sans text-[11px] font-medium uppercase tracking-widest text-cashly-gray"
                >
                  Password
                </label>
                <a
                  href="#"
                  className="font-sans text-[11px] text-cashly-gray transition-colors hover:text-cashly-black"
                >
                  Forgot password?
                </a>
              </div>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
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
              {isSubmitting ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          {/* Divider */}
          <div
            className="animate-fade-up my-7 flex items-center gap-4"
            style={{ animationDelay: '120ms' }}
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
            style={{ animationDelay: '150ms' }}
          >
            <GoogleIcon />
            Continue with Google
          </button>

          {/* Sign up link */}
          <p
            className="animate-fade-up mt-8 text-center font-sans text-sm text-cashly-gray"
            style={{ animationDelay: '180ms' }}
          >
            No account?{' '}
            <Link
              href="/signup"
              className="font-medium text-cashly-black underline-offset-2 hover:underline"
            >
              Sign up free
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
