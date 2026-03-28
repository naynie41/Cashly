import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  // baseURL is the API server origin — Better Auth appends /api/auth internally
  baseURL: process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001',
})

export const { signIn, signUp, signOut, useSession } = authClient
