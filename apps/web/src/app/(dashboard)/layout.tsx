import SidebarNav from './_components/SidebarNav'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <SidebarNav />
      <main className="ml-[220px] flex-1 min-h-screen bg-cashly-cream">{children}</main>
    </div>
  )
}
