'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/', label: 'Dashboard', icon: DashboardIcon },
  { href: '/clients', label: 'Clients', icon: ClientsIcon },
  { href: '/invoices', label: 'Invoices', icon: InvoicesIcon },
  { href: '/settings', label: 'Settings', icon: SettingsIcon },
]

export default function SidebarNav() {
  const pathname = usePathname()

  return (
    <aside className="fixed inset-y-0 left-0 w-[220px] bg-cashly-black flex flex-col z-50">
      {/* Logo */}
      <div className="px-6 pt-7 pb-6 border-b border-white/[0.08]">
        <span className="font-barlow font-black text-white text-lg uppercase tracking-tight flex items-center gap-2">
          <HexIcon />
          Cashly
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-5 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active =
            href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/')

          return (
            <Link
              key={href}
              href={href}
              className={[
                'flex items-center gap-3 px-3 py-2.5 text-sm transition-all duration-150',
                active
                  ? 'bg-cashly-lime text-cashly-black font-medium'
                  : 'text-white/40 hover:text-white hover:bg-white/[0.06]',
              ].join(' ')}
            >
              <Icon />
              <span className="font-sans">{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="px-6 py-5 border-t border-white/[0.08]">
        <p className="text-[10px] text-white/20 font-barlow uppercase tracking-widest">
          Portfolio Project
        </p>
      </div>
    </aside>
  )
}

// ── Icons ──────────────────────────────────────────────────────────────────────

function HexIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M8 1.5L13.9 4.75V11.25L8 14.5L2.1 11.25V4.75L8 1.5Z"
        stroke="white"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function DashboardIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <rect x="1" y="1" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="8.5" y="1" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="1" y="8.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect
        x="8.5"
        y="8.5"
        width="5.5"
        height="5.5"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.3"
      />
    </svg>
  )
}

function ClientsIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <circle cx="7.5" cy="4.5" r="2.5" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M2 13c0-3.038 2.462-5.5 5.5-5.5S13 9.962 13 13"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  )
}

function InvoicesIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <rect x="2.5" y="1" width="10" height="13" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M5 5h5M5 7.5h5M5 10h3"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <circle cx="7.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M7.5 1v1.5M7.5 12.5V14M14 7.5h-1.5M2.5 7.5H1M12.04 2.96l-1.06 1.06M4.02 10.98l-1.06 1.06M12.04 12.04l-1.06-1.06M4.02 4.02L2.96 2.96"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  )
}
