// Server-side calls (Server Components, route handlers) use the internal
// container hostname; browser calls use the public URL.
export const getApiUrl = (): string =>
  typeof window === 'undefined'
    ? (process.env['INTERNAL_API_URL'] ??
       process.env['NEXT_PUBLIC_API_URL'] ??
       'http://localhost:3001')
    : (process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001')

const API_URL = getApiUrl()

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, ...rest } = options

  // Only attach the JSON content-type when we actually have a body — Fastify
  // rejects empty JSON requests (FST_ERR_CTP_EMPTY_JSON_BODY).
  const baseHeaders: Record<string, string> =
    body !== undefined ? { 'Content-Type': 'application/json' } : {}

  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    credentials: 'include',
    headers: { ...baseHeaders, ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const data: unknown = await res.json()

  if (!res.ok) {
    const message =
      typeof data === 'object' && data !== null && 'error' in data
        ? String((data as { error: unknown }).error)
        : `Request failed with status ${res.status}`
    throw new Error(message)
  }

  return data as T
}

export const api = {
  get: <T>(path: string, options?: Omit<RequestOptions, 'body'>) =>
    request<T>(path, { ...options, method: 'GET' }),

  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'POST', body }),

  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PUT', body }),

  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PATCH', body }),

  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'DELETE' }),
}
