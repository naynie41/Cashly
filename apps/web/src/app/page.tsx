import Link from 'next/link'

// ── Invoice card visual (CSS-only, hero right side) ───────────────────────────

function InvoiceCardVisual() {
  return (
    <div className="relative h-[420px] w-[340px]">
      {/* Ghost cards behind */}
      <div
        className="absolute inset-0 border border-white/[0.07] bg-white/[0.03]"
        style={{ transform: 'rotate(-6deg) translate(-20px, 22px)' }}
      />
      <div
        className="absolute inset-0 border border-white/[0.10] bg-white/[0.05]"
        style={{ transform: 'rotate(3deg) translate(14px, 10px)' }}
      />
      {/* Front card */}
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
      {/* Marquee keyframe — scoped to landing page */}
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
          {/* Left copy */}
          <div>
            <span
              className="animate-fade-up mb-6 inline-block border border-cashly-teal/30 px-3 py-1 font-sans text-[10px] uppercase tracking-widest text-cashly-teal"
              style={{ animationDelay: '0ms' }}
            >
              Invoice &amp; Cash Flow Tool
            </span>
            <h1
              className="animate-fade-up mb-8 font-barlow font-black uppercase leading-[0.88] tracking-tight text-white"
              style={{
                fontSize: 'clamp(3.4rem, 6.5vw, 6.5rem)',
                animationDelay: '80ms',
              }}
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

          {/* Right — invoice visual */}
          <div
            className="animate-fade-up flex items-center justify-center"
            style={{ animationDelay: '300ms' }}
          >
            <InvoiceCardVisual />
          </div>
        </div>
      </section>

      {/* ── MARQUEE STRIP ────────────────────────────────────────────────── */}
      <div className="overflow-hidden border-y border-white/[0.06] bg-cashly-black py-5">
        <div className="flex w-max gap-14" style={{ animation: 'marquee 30s linear infinite' }}>
          {[...MARQUEE, ...MARQUEE].map((item, i) => (
            <span
              key={i}
              className="shrink-0 font-barlow text-sm font-bold uppercase tracking-widest text-white/22"
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
          {[
            {
              num: '01',
              title: 'Create & Send Invoices',
              desc: 'Build professional invoices in seconds. Add line items, set tax rates, apply discounts. Send directly to clients with a branded PDF and Paystack Pay Now link.',
              bar: 'bg-cashly-teal',
            },
            {
              num: '02',
              title: 'Track Every Payment',
              desc: 'Know exactly who owes you, how much, and how long. Automatic overdue detection at 08:00 every morning. Reminder emails sent so you never have to chase manually.',
              bar: 'bg-cashly-lime',
            },
            {
              num: '03',
              title: 'AI Monthly Summary',
              desc: 'Claude AI reads your invoice data and writes a plain-English cash flow paragraph. Not charts — words that tell you what happened and what to watch out for.',
              bar: 'bg-cashly-black',
            },
          ].map((feat, i) => (
            <div
              key={feat.num}
              className="animate-fade-up flex flex-col bg-cashly-cream p-10"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className={`mb-8 h-1 w-10 ${feat.bar}`} />
              <p className="mb-3 font-barlow text-[10px] font-bold uppercase tracking-widest text-cashly-gray">
                {feat.num}
              </p>
              <h3 className="mb-4 font-barlow text-2xl font-black uppercase leading-tight tracking-tight text-cashly-black">
                {feat.title}
              </h3>
              <p className="font-sans text-sm leading-relaxed text-cashly-gray">{feat.desc}</p>
            </div>
          ))}
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
              desc: 'Paystack handles the transaction. Cashly listens for the webhook and marks your invoice paid automatically. No manual updates required.',
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
      <footer className="border-t border-white/[0.06] bg-cashly-black px-10 py-10">
        <div className="flex items-center justify-between">
          <span className="font-barlow text-base font-black uppercase tracking-tight text-white/25">
            Cashly
          </span>
          <div className="flex items-center gap-8">
            <Link
              href="/login"
              className="font-sans text-xs text-white/30 transition-colors hover:text-white/60"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="font-sans text-xs text-white/30 transition-colors hover:text-white/60"
            >
              Get Started
            </Link>
          </div>
          <p className="font-sans text-xs text-white/20">© {year} Cashly.</p>
        </div>
      </footer>
    </>
  )
}
