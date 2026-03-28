'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { api } from '@/lib/api'

// ── Types ──────────────────────────────────────────────────────────────────────

interface MonthlyPoint {
  month: string
  invoiced: number
  received: number
}

interface ClientBreakdownRow {
  clientName: string
  totalOwed: number
  invoiceCount: number
  oldestDueDate: string | null
  daysOverdue: number
}

interface RecentInvoice {
  id: string
  invoiceNumber: string
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE'
  total: number
  dueDate: string
  clientName: string
}

interface DashboardSummary {
  totalInvoiced: number
  totalReceived: number
  totalOutstanding: number
  totalOverdue: number
  overdueCount: number
  monthlyData: MonthlyPoint[]
  clientBreakdown: ClientBreakdownRow[]
  recentInvoices: RecentInvoice[]
}

// ── Formatters ────────────────────────────────────────────────────────────────

const fmtFull = (n: number) =>
  '₦' + n.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

const fmtShort = (n: number) => {
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `₦${(n / 1_000).toFixed(0)}k`
  return `₦${n.toLocaleString('en-NG')}`
}

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })

const currentMonthYear = () =>
  new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

// ── Status badge ──────────────────────────────────────────────────────────────

const statusCfg: Record<RecentInvoice['status'], { label: string; cls: string }> = {
  DRAFT: { label: 'Draft', cls: 'bg-cashly-gray/15 text-cashly-gray border-cashly-gray/30' },
  SENT: { label: 'Sent', cls: 'bg-cashly-teal/10 text-cashly-teal border-cashly-teal/30' },
  PAID: { label: 'Paid', cls: 'bg-cashly-lime/10 text-cashly-lime border-cashly-lime/30' },
  OVERDUE: {
    label: 'Overdue',
    cls: 'bg-cashly-lime/15 text-cashly-lime border-cashly-lime/50 ring-1 ring-cashly-lime/40',
  },
}

function StatusBadge({ status }: { status: RecentInvoice['status'] }) {
  const { label, cls } = statusCfg[status]
  return (
    <span
      className={`inline-flex items-center border px-2.5 py-0.5 font-sans text-[10px] uppercase tracking-widest ${cls}`}
    >
      {label}
    </span>
  )
}

// ── Custom Recharts tooltip ───────────────────────────────────────────────────

interface TooltipEntry {
  name?: string
  value?: number
}

interface ChartTooltipProps {
  active?: boolean
  payload?: TooltipEntry[]
  label?: string
}

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="border border-cashly-gray/40 bg-cashly-black px-3 py-2.5 font-sans text-xs">
      <p className="mb-1.5 font-bold uppercase tracking-widest text-cashly-gray">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="text-cashly-cream">
          <span className="mr-2 capitalize text-cashly-gray">{entry.name}:</span>
          {fmtFull(entry.value ?? 0)}
        </p>
      ))}
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-white/[0.06] ${className ?? ''}`} />
}

// ── Summary cards ─────────────────────────────────────────────────────────────

interface CardProps {
  label: string
  value: number
  sub: string
  accentCls: string
  valueCls?: string
  delay: number
  extra?: React.ReactNode
}

function SummaryCard({
  label,
  value,
  sub,
  accentCls,
  valueCls = 'text-cashly-cream',
  delay,
  extra,
}: CardProps) {
  return (
    <div
      className={`animate-fade-up flex min-h-[156px] flex-col justify-between bg-cashly-black p-6 ${accentCls}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between">
        <span className="font-sans text-[10px] uppercase tracking-widest text-cashly-gray">
          {label}
        </span>
        {extra}
      </div>
      <div>
        <p
          className={`mt-3 font-barlow text-3xl font-black uppercase tracking-tight lg:text-4xl ${valueCls}`}
        >
          {fmtShort(value)}
        </p>
        <p className="mt-1.5 font-sans text-xs text-cashly-gray">{sub}</p>
      </div>
    </div>
  )
}

// ── AI summary card ───────────────────────────────────────────────────────────

interface AiSummary {
  summary: string
  generatedAt: string
  cached: boolean
}

interface AiCardProps {
  aiData: AiSummary | null
  aiLoading: boolean
  aiError: boolean
  onRefresh: () => void
  refreshing: boolean
}

function AiSummaryCard({ aiData, aiLoading, aiError, onRefresh, refreshing }: AiCardProps) {
  const fmtGenerated = (iso: string) =>
    new Date(iso).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })

  return (
    <div
      className="animate-fade-up border border-cashly-gray/20 bg-cashly-black p-6"
      style={{ animationDelay: '280ms' }}
    >
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-2">
          {/* Sparkle icon */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-cashly-lime">
            <path
              d="M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z"
              fill="currentColor"
            />
          </svg>
          <h2 className="font-barlow text-xl font-black uppercase tracking-tight text-cashly-cream">
            AI Cash Flow Summary
          </h2>
        </div>
        <button
          onClick={onRefresh}
          disabled={refreshing || aiLoading}
          title="Regenerate summary"
          className="flex items-center gap-1.5 font-sans text-[10px] uppercase tracking-widest text-cashly-gray transition-colors hover:text-cashly-lime disabled:cursor-not-allowed disabled:opacity-40"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={refreshing ? 'animate-spin' : ''}
          >
            <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" />
          </svg>
          {refreshing ? 'Regenerating…' : 'Refresh'}
        </button>
      </div>

      {/* Content */}
      {aiLoading || refreshing ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
          <p className="mt-3 font-sans text-xs text-cashly-gray">Generating your summary…</p>
        </div>
      ) : aiError ? (
        <p className="font-sans text-sm text-cashly-gray">
          Could not generate summary. Check that{' '}
          <code className="font-mono text-xs text-cashly-cream">ANTHROPIC_API_KEY</code> is set.
        </p>
      ) : aiData ? (
        <div>
          <p className="font-sans text-sm leading-relaxed text-cashly-cream">{aiData.summary}</p>
          <div className="mt-4 flex items-center gap-3">
            <span className="font-sans text-[10px] uppercase tracking-widest text-cashly-gray">
              Generated by AI
            </span>
            <span className="h-px w-4 bg-cashly-gray/30" />
            <span className="font-sans text-[10px] text-cashly-gray">
              {fmtGenerated(aiData.generatedAt)}
            </span>
            {aiData.cached && (
              <>
                <span className="h-px w-4 bg-cashly-gray/30" />
                <span className="font-sans text-[10px] text-cashly-gray">Cached</span>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)

  const [aiData, setAiData] = useState<AiSummary | null>(null)
  const [aiLoading, setAiLoading] = useState(true)
  const [aiError, setAiError] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    api
      .get<{ data: DashboardSummary }>('/dashboard/summary')
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    api
      .get<{ data: AiSummary }>('/dashboard/ai-summary')
      .then((res) => setAiData(res.data))
      .catch(() => setAiError(true))
      .finally(() => setAiLoading(false))
  }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    setAiError(false)
    try {
      const res = await api.get<{ data: AiSummary }>('/dashboard/ai-summary?refresh=true')
      setAiData(res.data)
    } catch {
      setAiError(true)
    } finally {
      setRefreshing(false)
    }
  }

  const collectionRate =
    data && data.totalInvoiced > 0 ? data.totalReceived / data.totalInvoiced : 0

  return (
    <div className="min-h-screen bg-cashly-black px-10 py-8">
      {/* ── Page header ────────────────────────────────────────────────────── */}
      <div
        className="animate-fade-up mb-10 flex items-end justify-between border-b border-cashly-gray/30 pb-6"
        style={{ animationDelay: '0ms' }}
      >
        <h1 className="font-barlow text-5xl font-black uppercase leading-none tracking-tight text-cashly-cream">
          Overview
        </h1>
        <span className="font-sans text-sm text-cashly-gray">{currentMonthYear()}</span>
      </div>

      <div className="space-y-8">
        {/* ── Summary cards ──────────────────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-2 gap-px bg-cashly-gray/20">
            {Array.from<undefined>({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="min-h-[156px]" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-px bg-cashly-gray/20">
            <SummaryCard
              label="Total Invoiced"
              value={data?.totalInvoiced ?? 0}
              sub="All time"
              accentCls="border-t-2 border-cashly-teal"
              valueCls="text-cashly-cream"
              delay={0}
            />
            <SummaryCard
              label="Total Received"
              value={data?.totalReceived ?? 0}
              sub="Confirmed payments"
              accentCls="border-t-2 border-cashly-lime"
              valueCls="text-cashly-lime"
              delay={75}
              extra={
                collectionRate >= 0.8 ? (
                  <span className="font-sans text-xs text-cashly-lime" title="≥80% collection rate">
                    ✦
                  </span>
                ) : undefined
              }
            />
            <SummaryCard
              label="Outstanding"
              value={data?.totalOutstanding ?? 0}
              sub="Awaiting payment"
              accentCls="border-t-2 border-cashly-cream/40"
              valueCls="text-cashly-cream"
              delay={150}
            />
            <SummaryCard
              label="Overdue"
              value={data?.totalOverdue ?? 0}
              sub={data ? `${data.overdueCount} invoice${data.overdueCount !== 1 ? 's' : ''}` : '—'}
              accentCls={`border-t-2 border-cashly-lime/60 ${(data?.overdueCount ?? 0) > 0 ? 'ring-1 ring-inset ring-cashly-lime/20' : ''}`}
              valueCls="text-cashly-lime"
              delay={225}
              extra={
                (data?.overdueCount ?? 0) > 0 ? (
                  <span className="h-2 w-2 animate-pulse rounded-full bg-cashly-lime" />
                ) : undefined
              }
            />
          </div>
        )}

        {/* ── AI summary ─────────────────────────────────────────────────── */}
        <AiSummaryCard
          aiData={aiData}
          aiLoading={aiLoading}
          aiError={aiError}
          onRefresh={() => void handleRefresh()}
          refreshing={refreshing}
        />

        {/* ── Monthly cash flow chart ─────────────────────────────────────── */}
        <div
          className="animate-fade-up border border-cashly-gray/20 bg-cashly-black p-6"
          style={{ animationDelay: '300ms' }}
        >
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-barlow text-xl font-black uppercase tracking-tight text-cashly-cream">
              Monthly Cash Flow
            </h2>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 font-sans text-xs text-cashly-gray">
                <span className="inline-block h-2.5 w-2.5 bg-cashly-teal" />
                Invoiced
              </span>
              <span className="flex items-center gap-1.5 font-sans text-xs text-cashly-gray">
                <span className="inline-block h-2.5 w-2.5 bg-cashly-lime" />
                Received
              </span>
            </div>
          </div>

          {loading ? (
            <Skeleton className="h-[260px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={data?.monthlyData ?? []}
                margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
                barSize={18}
                barGap={4}
                barCategoryGap="32%"
              >
                <CartesianGrid
                  vertical={false}
                  stroke="#888880"
                  strokeOpacity={0.12}
                  strokeDasharray="0"
                />
                <XAxis
                  dataKey="month"
                  tick={{ fill: '#888880', fontSize: 11, fontFamily: 'DM Sans' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v: number) => fmtShort(v)}
                  tick={{ fill: '#888880', fontSize: 11, fontFamily: 'DM Sans' }}
                  axisLine={false}
                  tickLine={false}
                  width={60}
                />
                <Tooltip
                  content={<ChartTooltip />}
                  cursor={{ fill: '#ECEAE3', fillOpacity: 0.04 }}
                />
                <Bar dataKey="invoiced" fill="#72EDD4" radius={[2, 2, 0, 0]} />
                <Bar dataKey="received" fill="#CCFF00" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ── Bottom row: client breakdown + recent invoices ──────────────── */}
        <div className="grid grid-cols-[1fr_380px] gap-6">
          {/* Client breakdown */}
          <div
            className="animate-fade-up border border-cashly-gray/20 bg-cashly-black"
            style={{ animationDelay: '360ms' }}
          >
            <div className="border-b border-cashly-gray/20 px-6 py-4">
              <h2 className="font-barlow text-xl font-black uppercase tracking-tight text-cashly-cream">
                Top Outstanding Clients
              </h2>
            </div>

            {loading ? (
              <div className="space-y-px p-6">
                {Array.from<undefined>({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : !data?.clientBreakdown.length ? (
              <div className="px-6 py-16 text-center">
                <p className="font-sans text-sm text-cashly-gray">
                  No outstanding balances — all clients are current.
                </p>
              </div>
            ) : (
              <table className="w-full table-fixed">
                <thead>
                  <tr className="border-b border-cashly-gray/20">
                    {['Client', 'Amount Owed', 'Invoices', 'Overdue'].map((h) => (
                      <th
                        key={h}
                        className="px-6 py-3 text-left font-sans text-[10px] uppercase tracking-widest text-cashly-gray"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.clientBreakdown.map((row, i) => (
                    <tr
                      key={row.clientName}
                      className="animate-fade-up border-b border-cashly-gray/10 transition-colors duration-150 last:border-b-0 hover:bg-cashly-cream/[0.03]"
                      style={{ animationDelay: `${400 + i * 50}ms` }}
                    >
                      <td className="px-6 py-4 font-sans text-sm font-medium text-cashly-cream">
                        {row.clientName}
                      </td>
                      <td className="px-6 py-4 font-barlow text-base font-black tracking-tight text-cashly-lime">
                        {fmtFull(row.totalOwed)}
                      </td>
                      <td className="px-6 py-4 font-sans text-sm text-cashly-gray">
                        {row.invoiceCount} inv.
                      </td>
                      <td className="px-6 py-4">
                        {row.daysOverdue === 0 ? (
                          <span className="font-sans text-sm text-cashly-gray">—</span>
                        ) : (
                          <span
                            className={`inline-flex items-center border px-2 py-0.5 font-sans text-xs ${
                              row.daysOverdue <= 14
                                ? 'border-cashly-teal/30 bg-cashly-teal/10 text-cashly-teal'
                                : 'border-cashly-lime/30 bg-cashly-lime/10 text-cashly-lime'
                            }`}
                          >
                            {row.daysOverdue}d overdue
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Recent invoices */}
          <div
            className="animate-fade-up border border-cashly-gray/20 bg-cashly-black"
            style={{ animationDelay: '400ms' }}
          >
            <div className="flex items-center justify-between border-b border-cashly-gray/20 px-6 py-4">
              <h2 className="font-barlow text-xl font-black uppercase tracking-tight text-cashly-cream">
                Recent
              </h2>
              <Link
                href="/invoices"
                className="font-sans text-[10px] uppercase tracking-widest text-cashly-gray transition-colors hover:text-cashly-lime"
              >
                View all →
              </Link>
            </div>

            {loading ? (
              <div className="divide-y divide-cashly-gray/10">
                {Array.from<undefined>({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between px-6 py-4">
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                ))}
              </div>
            ) : !data?.recentInvoices.length ? (
              <div className="px-6 py-16 text-center">
                <p className="font-sans text-sm text-cashly-gray">No invoices yet.</p>
                <Link
                  href="/invoices/new"
                  className="mt-4 inline-block font-sans text-xs uppercase tracking-widest text-cashly-lime hover:underline"
                >
                  Create one →
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-cashly-gray/10">
                {data.recentInvoices.map((inv, i) => (
                  <Link
                    key={inv.id}
                    href={`/invoices/${inv.id}`}
                    className="animate-fade-up flex items-center justify-between px-6 py-4 transition-colors duration-150 hover:bg-cashly-cream/[0.03]"
                    style={{ animationDelay: `${440 + i * 60}ms` }}
                  >
                    <div className="min-w-0">
                      <p className="font-barlow text-sm font-black uppercase tracking-tight text-cashly-cream">
                        {inv.invoiceNumber}
                      </p>
                      <p className="truncate font-sans text-xs text-cashly-gray">
                        {inv.clientName} · {fmtDate(inv.dueDate)}
                      </p>
                    </div>
                    <div className="ml-4 flex shrink-0 flex-col items-end gap-1.5">
                      <span className="font-barlow text-sm font-black tracking-tight text-cashly-cream">
                        {fmtShort(inv.total)}
                      </span>
                      <StatusBadge status={inv.status} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
