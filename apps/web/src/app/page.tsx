import Link from 'next/link'

// ── Hero visual: stacked invoice cards ───────────────────────────────────────

function HeroVisual() {
  return (
    <div className="relative h-[440px] w-[360px]">
      {/* Back ghost card */}
      <div
        className="absolute inset-0 border border-white/[0.08] bg-white/[0.04]"
        style={{ transform: 'rotate(-5deg) translate(-18px, 28px)' }}
      />
      {/* Mid ghost card */}
      <div
        className="absolute inset-0 border border-white/[0.12] bg-white/[0.06]"
        style={{ transform: 'rotate(3deg) translate(14px, 12px)' }}
      />
      {/* Front card — cream invoice mockup */}
      <div className="absolute inset-0 flex flex-col border border-black/[0.06] bg-cashly-cream p-8">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <p className="mb-1 font-barlow text-[8px] font-bold uppercase tracking-[0.22em] text-cashly-gray">
              Invoice
            </p>
            <p className="font-barlow text-2xl font-black uppercase tracking-tight text-cashly-black">
              INV-0042
            </p>
          </div>
          <div className="h-8 w-8 bg-cashly-lime" />
        </div>
        <div className="mb-5 h-px bg-black/[0.08]" />
        <div className="mb-5">
          <p className="mb-2 font-barlow text-[8px] font-bold uppercase tracking-[0.22em] text-cashly-gray">
            Bill To
          </p>
          <div className="mb-1.5 h-3 w-36 bg-cashly-black/10" />
          <div className="h-2.5 w-28 bg-cashly-black/[0.06]" />
        </div>
        <div className="mb-5 flex-1 space-y-2.5">
          {[88, 72, 60].map((w, i) => (
            <div key={i} className="flex items-center justify-between gap-3">
              <div className="h-2.5 bg-cashly-black/[0.08]" style={{ width: `${w}%` }} />
              <div className="h-2.5 w-12 shrink-0 bg-cashly-black/[0.08]" />
            </div>
          ))}
        </div>
        <div className="border-t border-black/[0.08] pt-4">
          <div className="flex items-end justify-between">
            <p className="font-barlow text-[8px] font-bold uppercase tracking-[0.22em] text-cashly-gray">
              Total Due
            </p>
            <p className="font-barlow text-2xl font-black tracking-tight text-cashly-black">
              ₦420,000
            </p>
          </div>
          <div className="mt-3 h-2 w-full bg-cashly-lime" />
        </div>
      </div>
    </div>
  )
}

// ── Feature card visuals ──────────────────────────────────────────────────────

/** Card 1: invoice builder mockup */
function InvoiceBuilderAsset() {
  return (
    <div className="relative h-[200px] w-full overflow-hidden border border-black/[0.07] bg-cashly-cream">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-black/[0.07] bg-cashly-black px-5 py-3">
        <span className="font-barlow text-[9px] font-bold uppercase tracking-[0.2em] text-white/50">
          New Invoice
        </span>
        <div className="flex items-center gap-2">
          <div className="h-5 w-14 border border-white/20" />
          <div className="h-5 w-16 bg-cashly-lime" />
        </div>
      </div>
      {/* Client row */}
      <div className="flex items-center gap-3 border-b border-black/[0.05] px-5 py-3">
        <span className="font-sans text-[10px] text-cashly-gray">Bill To</span>
        <div className="flex h-6 flex-1 items-center border border-black/10 px-2">
          <span className="font-sans text-[10px] font-medium text-cashly-black">
            Apex Events Ltd
          </span>
        </div>
      </div>
      {/* Line items */}
      {[
        { d: 'Photography Session', q: '1', p: '₦250,000' },
        { d: 'Photo Editing', q: '3', p: '₦45,000' },
        { d: 'Travel & Logistics', q: '1', p: '₦30,000' },
      ].map((row, i) => (
        <div key={i} className="flex items-center gap-2 border-b border-black/[0.04] px-5 py-2">
          <div className="flex-1 font-sans text-[10px] text-cashly-black">{row.d}</div>
          <div className="w-6 text-right font-sans text-[10px] text-cashly-gray">{row.q}</div>
          <div className="w-16 text-right font-sans text-[10px] font-medium text-cashly-black">
            {row.p}
          </div>
        </div>
      ))}
      {/* Total strip */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between bg-cashly-black px-5 py-2.5">
        <span className="font-barlow text-[9px] font-bold uppercase tracking-widest text-white/50">
          Total
        </span>
        <span className="font-barlow text-sm font-black text-cashly-lime">₦370,000</span>
      </div>
    </div>
  )
}

/** Card 2: payment tracker with status badges + mini bar chart */
function PaymentTrackerAsset() {
  const bars = [45, 70, 55, 80, 60, 90]
  const statuses: { label: string; cls: string }[] = [
    { label: 'Paid', cls: 'bg-cashly-lime/15 text-cashly-lime border-cashly-lime/30' },
    { label: 'Overdue', cls: 'bg-red-500/10 text-red-400 border-red-400/30' },
    { label: 'Sent', cls: 'bg-cashly-teal/10 text-cashly-teal border-cashly-teal/30' },
  ]
  return (
    <div className="h-[200px] w-full overflow-hidden bg-cashly-black">
      {/* Mini bar chart */}
      <div className="flex h-[120px] items-end gap-2 border-b border-white/[0.08] px-5 pb-3 pt-5">
        {bars.map((h, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <div
              className={`w-full ${i === bars.length - 1 ? 'bg-cashly-lime' : 'bg-cashly-teal/40'}`}
              style={{ height: `${h}%` }}
            />
          </div>
        ))}
      </div>
      {/* Status row */}
      <div className="flex items-center gap-2 px-5 py-4">
        {statuses.map((s) => (
          <span
            key={s.label}
            className={`inline-flex items-center border px-2.5 py-1 font-sans text-[9px] uppercase tracking-widest ${s.cls}`}
          >
            {s.label}
          </span>
        ))}
        <span className="ml-auto font-sans text-[9px] text-white/30">6 invoices this month</span>
      </div>
    </div>
  )
}

/** Card 3: AI summary chat bubble mockup */
function AiSummaryAsset() {
  return (
    <div className="h-[200px] w-full overflow-hidden bg-cashly-black p-5">
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-5 w-5 items-center justify-center bg-cashly-lime">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z"
              fill="#0A0A09"
            />
          </svg>
        </div>
        <span className="font-barlow text-[9px] font-bold uppercase tracking-widest text-cashly-lime">
          AI Cash Flow Summary
        </span>
        <span className="ml-auto font-sans text-[9px] text-white/20">March 2026</span>
      </div>
      {/* AI bubble */}
      <div className="mb-3 border border-white/[0.08] bg-white/[0.05] p-3.5">
        <p className="font-sans text-[11px] leading-relaxed text-white/65">
          You invoiced <span className="font-semibold text-cashly-lime">₦1.2M</span> this month and
          collected <span className="font-semibold text-cashly-teal">₦840k</span> — a 70% collection
          rate. Apex Events owes <span className="font-semibold text-red-400">₦180k</span> overdue
          by 12 days.
        </p>
      </div>
      {/* Cached badge */}
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-white/[0.06]" />
        <span className="font-sans text-[9px] uppercase tracking-widest text-white/20">
          Generated by Claude AI
        </span>
        <div className="h-px flex-1 bg-white/[0.06]" />
      </div>
    </div>
  )
}

// ── Marquee items ─────────────────────────────────────────────────────────────

const MARQUEE = [
  'AI Cash Flow Summary',
  'Automated Reminders',
  'PDF Invoices',
  'Paystack Payments',
  'Client Management',
  'Real-Time Dashboard',
  'Overdue Tracking',
  'Google OAuth',
]

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const year = new Date().getFullYear()

  return (
    <>
      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        html { scroll-behavior: smooth; }
      `}</style>

      {/* ── NAV ──────────────────────────────────────────────────────────── */}
      <nav className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between border-b border-white/[0.06] bg-cashly-black px-10 py-4">
        <Link
          href="/"
          className="font-barlow text-lg font-black uppercase tracking-tight text-white"
        >
          Cashly
        </Link>
        <div className="flex items-center gap-6">
          <a
            href="#features"
            className="font-sans text-sm text-white/45 transition-colors hover:text-white"
          >
            Features
          </a>
          <a
            href="#how-it-works"
            className="font-sans text-sm text-white/45 transition-colors hover:text-white"
          >
            How it works
          </a>
          <Link
            href="/login"
            className="font-sans text-sm text-white/55 transition-colors hover:text-white"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="border border-cashly-lime bg-cashly-lime px-5 py-2 font-sans text-sm font-semibold text-cashly-black transition-all hover:bg-transparent hover:text-cashly-lime"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="min-h-screen bg-cashly-black pt-[65px]">
        <div className="grid min-h-[calc(100vh-65px)] grid-cols-2 items-center gap-16 px-10 py-20">
          <div>
            <span
              className="animate-fade-up mb-6 inline-block border border-cashly-teal/30 px-3 py-1 font-sans text-[10px] uppercase tracking-widest text-cashly-teal"
              style={{ animationDelay: '0ms' }}
            >
              Invoice &amp; Cash Flow Tool
            </span>
            <h1
              className="animate-fade-up mb-8 font-barlow font-black uppercase leading-[0.88] tracking-tight text-white"
              style={{ fontSize: 'clamp(3.4rem, 6.5vw, 6.5rem)', animationDelay: '80ms' }}
            >
              Invoice
              <br />
              Smarter.
              <br />
              <span className="text-cashly-lime">Get Paid</span>
              <br />
              Faster.
            </h1>
            <p
              className="animate-fade-up mb-10 max-w-[440px] font-sans text-base leading-relaxed text-white/50"
              style={{ animationDelay: '160ms' }}
            >
              Create branded invoices, automate overdue reminders, accept Paystack payments, and get
              a plain-English AI summary of your monthly cash flow.
            </p>
            <div
              className="animate-fade-up flex items-center gap-6"
              style={{ animationDelay: '240ms' }}
            >
              <Link
                href="/signup"
                className="border border-cashly-lime bg-cashly-lime px-8 py-3.5 font-sans text-sm font-semibold text-cashly-black transition-all hover:bg-transparent hover:text-cashly-lime"
              >
                Get Started Free
              </Link>
              <a
                href="#how-it-works"
                className="border-b border-white/20 pb-0.5 font-sans text-sm text-white/50 transition-colors hover:border-white hover:text-white"
              >
                See how it works ↓
              </a>
            </div>
          </div>
          <div
            className="animate-fade-up flex items-center justify-center"
            style={{ animationDelay: '300ms' }}
          >
            <HeroVisual />
          </div>
        </div>
      </section>

      {/* ── MARQUEE STRIP ────────────────────────────────────────────────── */}
      <div className="overflow-hidden border-y border-white/[0.06] bg-cashly-black py-5">
        <div className="flex w-max gap-14" style={{ animation: 'marquee 30s linear infinite' }}>
          {[...MARQUEE, ...MARQUEE].map((item, i) => (
            <span
              key={i}
              className="shrink-0 font-barlow text-sm font-bold uppercase tracking-widest text-white/20"
            >
              {item}
              <span className="ml-14 text-cashly-lime/35">·</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── FEATURES ─────────────────────────────────────────────────────── */}
      <section id="features" className="bg-cashly-cream px-10 py-28">
        <div className="mb-16">
          <p className="mb-3 font-sans text-[11px] uppercase tracking-widest text-cashly-gray">
            Everything You Need
          </p>
          <h2
            className="font-barlow font-black uppercase leading-[0.9] tracking-tight text-cashly-black"
            style={{ fontSize: 'clamp(2.4rem, 5vw, 4.4rem)' }}
          >
            Built For The Way
            <br />
            You Work.
          </h2>
        </div>

        <div className="grid grid-cols-3 gap-px bg-black/[0.07]">
          {/* Card 1 — Invoice Builder */}
          <div
            className="animate-fade-up flex flex-col bg-cashly-cream"
            style={{ animationDelay: '0ms' }}
          >
            <InvoiceBuilderAsset />
            <div className="p-8">
              <div className="mb-3 h-0.5 w-8 bg-cashly-black" />
              <p className="mb-2 font-barlow text-[9px] font-bold uppercase tracking-widest text-cashly-gray">
                01
              </p>
              <h3 className="mb-3 font-barlow text-xl font-black uppercase leading-tight tracking-tight text-cashly-black">
                Create &amp; Send Invoices
              </h3>
              <p className="font-sans text-sm leading-relaxed text-cashly-gray">
                Build professional invoices in seconds. Add line items, apply tax and discounts.
                Send with a branded PDF and Paystack Pay Now link directly to your client.
              </p>
            </div>
          </div>

          {/* Card 2 — Payment Tracker */}
          <div
            className="animate-fade-up flex flex-col bg-cashly-cream"
            style={{ animationDelay: '80ms' }}
          >
            <PaymentTrackerAsset />
            <div className="p-8">
              <div className="mb-3 h-0.5 w-8 bg-cashly-teal" />
              <p className="mb-2 font-barlow text-[9px] font-bold uppercase tracking-widest text-cashly-gray">
                02
              </p>
              <h3 className="mb-3 font-barlow text-xl font-black uppercase leading-tight tracking-tight text-cashly-black">
                Track Every Payment
              </h3>
              <p className="font-sans text-sm leading-relaxed text-cashly-gray">
                Know exactly who owes you and how long. Automated overdue detection every morning at
                08:00. Reminder emails sent so you never chase manually again.
              </p>
            </div>
          </div>

          {/* Card 3 — AI Summary */}
          <div
            className="animate-fade-up flex flex-col bg-cashly-cream"
            style={{ animationDelay: '160ms' }}
          >
            <AiSummaryAsset />
            <div className="p-8">
              <div className="mb-3 h-0.5 w-8 bg-cashly-lime" />
              <p className="mb-2 font-barlow text-[9px] font-bold uppercase tracking-widest text-cashly-gray">
                03
              </p>
              <h3 className="mb-3 font-barlow text-xl font-black uppercase leading-tight tracking-tight text-cashly-black">
                AI Monthly Summary
              </h3>
              <p className="font-sans text-sm leading-relaxed text-cashly-gray">
                Claude AI reads your invoice data and writes a plain-English cash flow paragraph —
                specific numbers, overdue clients named, zero jargon.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section id="how-it-works" className="bg-cashly-black px-10 py-28">
        <div className="mb-16">
          <p className="mb-3 font-sans text-[11px] uppercase tracking-widest text-cashly-gray">
            Get Started In Minutes
          </p>
          <h2
            className="font-barlow font-black uppercase leading-[0.9] tracking-tight text-white"
            style={{ fontSize: 'clamp(2.4rem, 5vw, 4.4rem)' }}
          >
            Three Steps To
            <br />
            <span className="text-cashly-teal">Getting Paid.</span>
          </h2>
        </div>

        <div className="grid grid-cols-3 gap-8">
          {[
            {
              n: '01',
              title: 'Add Your Client',
              desc: "Enter a client name and email. That's it. Cashly stores their details for every future invoice — no repetitive data entry.",
            },
            {
              n: '02',
              title: 'Build & Send',
              desc: 'Add line items, set a due date, hit send. Cashly generates a PDF, uploads it to the cloud, and emails it with a Paystack payment link.',
            },
            {
              n: '03',
              title: 'Get Paid',
              desc: 'Paystack handles the transaction. Cashly listens for the webhook and marks your invoice paid automatically. No manual updates.',
            },
          ].map((step, i) => (
            <div
              key={step.n}
              className="animate-fade-up border-t-2 border-cashly-gray/20 pt-8"
              style={{ animationDelay: `${i * 110}ms` }}
            >
              <span
                className="mb-6 block font-barlow font-black uppercase leading-none tracking-tight text-white/10"
                style={{ fontSize: 'clamp(3rem, 5vw, 4rem)' }}
              >
                {step.n}
              </span>
              <h3 className="mb-3 font-barlow text-xl font-black uppercase tracking-tight text-white">
                {step.title}
              </h3>
              <p className="font-sans text-sm leading-relaxed text-white/45">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────────────── */}
      <section className="border-t border-white/[0.06] bg-cashly-black px-10 py-36 text-center">
        <p className="mb-5 font-sans text-[11px] uppercase tracking-widest text-cashly-gray">
          Ready?
        </p>
        <h2
          className="mb-12 font-barlow font-black uppercase leading-[0.88] tracking-tight text-white"
          style={{ fontSize: 'clamp(3rem, 7vw, 7rem)' }}
        >
          Start Invoicing
          <br />
          <span className="text-cashly-lime">In Minutes.</span>
        </h2>
        <Link
          href="/signup"
          className="inline-block border border-cashly-lime bg-cashly-lime px-12 py-4 font-sans font-semibold text-cashly-black transition-all hover:bg-transparent hover:text-cashly-lime"
        >
          Create Free Account
        </Link>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.06] bg-cashly-black">
        {/* Main footer grid */}
        <div className="grid grid-cols-[1.6fr_1fr_1fr_1fr] gap-12 px-10 py-16">
          {/* Brand col */}
          <div>
            <p className="mb-4 font-barlow text-xl font-black uppercase tracking-tight text-white">
              Cashly
            </p>
            <p className="mb-6 max-w-[220px] font-sans text-sm leading-relaxed text-white/35">
              Invoice and cash flow management for small business owners and freelancers. Built with
              AI from the ground up.
            </p>
            <div className="flex items-center gap-3">
              <div className="h-px w-6 bg-cashly-lime/40" />
              <span className="font-sans text-[10px] uppercase tracking-widest text-white/25">
                Nigeria &amp; beyond
              </span>
            </div>
          </div>

          {/* Product col */}
          <div>
            <p className="mb-5 font-barlow text-[10px] font-bold uppercase tracking-widest text-white/30">
              Product
            </p>
            <ul className="space-y-3">
              {[
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'Invoices', href: '/invoices' },
                { label: 'Clients', href: '/clients' },
                { label: 'AI Summary', href: '/dashboard' },
              ].map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="font-sans text-sm text-white/40 transition-colors hover:text-white"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account col */}
          <div>
            <p className="mb-5 font-barlow text-[10px] font-bold uppercase tracking-widest text-white/30">
              Account
            </p>
            <ul className="space-y-3">
              {[
                { label: 'Sign Up Free', href: '/signup' },
                { label: 'Sign In', href: '/login' },
              ].map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="font-sans text-sm text-white/40 transition-colors hover:text-white"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Features col */}
          <div>
            <p className="mb-5 font-barlow text-[10px] font-bold uppercase tracking-widest text-white/30">
              Features
            </p>
            <ul className="space-y-3">
              {[
                'PDF Invoices',
                'Paystack Payments',
                'Overdue Reminders',
                'AI Cash Flow',
                'Client Portal',
              ].map((f) => (
                <li key={f}>
                  <span className="font-sans text-sm text-white/40">{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex items-center justify-between border-t border-white/[0.06] px-10 py-5">
          <span className="font-sans text-xs text-white/20">
            © {year} Cashly. All rights reserved.
          </span>
          <div className="flex items-center gap-6">
            <a
              href="#"
              className="font-sans text-xs text-white/20 transition-colors hover:text-white/50"
            >
              Privacy Policy
            </a>
            <a
              href="#"
              className="font-sans text-xs text-white/20 transition-colors hover:text-white/50"
            >
              Terms of Service
            </a>
          </div>
        </div>
      </footer>
    </>
  )
}
