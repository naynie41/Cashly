import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import SidebarNav from './_components/SidebarNav'

// ── Server-side user fetch ────────────────────────────────────────────────────

interface MeResponse {
  data: {
    onboardingDone: boolean
  }
}

async function getOnboardingStatus(): Promise<boolean | null> {
  const cookieStore = cookies()
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ')

  const apiUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'

  try {
    const res = await fetch(`${apiUrl}/api/me`, {
      headers: { cookie: cookieHeader },
      cache: 'no-store',
    })
    if (!res.ok) return null
    const json = (await res.json()) as MeResponse
    return json.data.onboardingDone
  } catch {
    return null
  }
}

// ── Layout ────────────────────────────────────────────────────────────────────

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const onboardingDone = await getOnboardingStatus()

  // No session / API unreachable → let middleware handle the redirect
  // (middleware already catches unauthenticated users)
  if (onboardingDone === false) {
    redirect('/onboarding')
  }

  return (
    <div className="flex min-h-screen">
      <SidebarNav />
      <main className="ml-[220px] flex-1 min-h-screen bg-cashly-cream">{children}</main>
    </div>
  )
}
