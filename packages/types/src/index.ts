// Shared types between apps/api and apps/web

export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE'

export interface User {
  id: string
  name: string
  email: string
  businessName: string | null
  logoUrl: string | null
  brandColor: string
  currency: string
  createdAt: string
}

export interface Client {
  id: string
  userId: string
  name: string
  email: string
  phone: string | null
  address: string | null
  createdAt: string
}

export interface LineItem {
  id: string
  invoiceId: string
  description: string
  quantity: number
  unitPrice: string
  amount: string
}

export interface Invoice {
  id: string
  userId: string
  clientId: string
  invoiceNumber: string
  status: InvoiceStatus
  issueDate: string
  dueDate: string
  subtotal: string
  taxRate: string
  discount: string
  total: string
  pdfUrl: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  client?: Client
  lineItems?: LineItem[]
}

export interface Payment {
  id: string
  invoiceId: string
  paystackRef: string
  amountPaid: string
  currency: string
  paidAt: string
}

// API response wrappers
export interface ApiSuccess<T> {
  data: T
}

export interface ApiError {
  error: string
}
