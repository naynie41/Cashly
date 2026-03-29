import { type NextRequest, NextResponse } from 'next/server'

// Pages that authenticated users should not see (redirect to dashboard)
const AUTH_PATHS = ['/login', '/signup']

// Pages that anyone can see without a session
const PUBLIC_PATHS = ['/', '/login', '/signup']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Better Auth sets this cookie after a successful sign-in
  const sessionToken =
    request.cookies.get('better-auth.session_token') ??
    request.cookies.get('__Secure-better-auth.session_token')

  const isPublicPath = PUBLIC_PATHS.some((p) =>
    p === '/' ? pathname === '/' : pathname.startsWith(p),
  )
  const isAuthPath = AUTH_PATHS.some((p) => pathname.startsWith(p))

  // Unauthenticated user trying to reach a protected page → redirect to login
  if (!sessionToken && !isPublicPath) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Authenticated user hitting a login/signup page → send to dashboard
  // (dashboard layout will redirect to /onboarding if onboardingDone is false)
  if (sessionToken && isAuthPath) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  // Run on all paths except Next.js internals and static assets
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
}
