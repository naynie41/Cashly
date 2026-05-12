'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { InvoiceForm } from '../_components/InvoiceForm'

interface UserProfile {
  invoicePrefix: string
}

export default function NewInvoicePage() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)

  useEffect(() => {
    api
      .get<{ data: UserProfile }>('/api/me')
      .then(({ data }) => setUserProfile(data))
      .catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-cashly-cream">
      {/* Header */}
      <div className="border-b border-black/[0.08] bg-cashly-cream px-10 py-8">
        <div className="animate-fade-up" style={{ animationDelay: '0ms' }}>
          <Link
            href="/invoices"
            className="mb-3 inline-block text-xs font-medium text-cashly-gray hover:text-cashly-black"
          >
            ← Back to Invoices
          </Link>
          <h1 className="font-barlow text-5xl font-black uppercase leading-none tracking-tight text-cashly-black">
            New Invoice
          </h1>
          {userProfile && (
            <p className="mt-2 font-sans text-xs text-cashly-gray">
              Will be numbered{' '}
              <span className="font-mono font-semibold text-cashly-black">
                {userProfile.invoicePrefix}-####
              </span>
            </p>
          )}
        </div>
      </div>

      <div className="px-10 py-8">
        <InvoiceForm mode="create" />
      </div>
    </div>
  )
}
