import fp from 'fastify-plugin'
import type { FastifyPluginAsync, preHandlerHookHandler } from 'fastify'
import { auth, type AuthUser } from '../lib/auth.js'
import { env } from './env.js'
import { unauthorized } from '../lib/errors.js'

// Extend FastifyRequest so request.user is available in all route handlers.
declare module 'fastify' {
  interface FastifyRequest {
    user: AuthUser | null
  }
}

// eslint-disable-next-line @typescript-eslint/require-await -- Fastify plugin registration is synchronous; awaits are inside route handlers
const authPlugin: FastifyPluginAsync = fp(async (server) => {
  // Decorate every request with user = null; requireAuth overwrites this.
  server.decorateRequest('user', null)

  // Mount the auth routes. We let Fastify use its default JSON parser (so the
  // rest of the app sees parsed objects on request.body), then re-serialise the
  // parsed body when handing it to Better Auth's Web-style handler.
  server.all('/api/auth/*', async (request, reply) => {
    // Build the full URL Better Auth expects
    const url = new URL(request.url, `${request.protocol}://${request.hostname}`)

    // Convert Node headers → Web Headers
    const headers = new Headers()
    for (const [key, value] of Object.entries(request.headers)) {
      if (value !== undefined) {
        headers.set(key, Array.isArray(value) ? value.join(', ') : value)
      }
    }

    // Re-serialise the body. Fastify parsed it into an object/Buffer/string
    // depending on Content-Type; Better Auth wants the raw bytes/string.
    let body: string | Buffer | null = null
    if (request.method !== 'GET' && request.method !== 'HEAD' && request.body !== undefined) {
      if (Buffer.isBuffer(request.body)) {
        body = request.body
      } else if (typeof request.body === 'string') {
        body = request.body
      } else if (request.body !== null) {
        body = JSON.stringify(request.body)
      }
    }

    const webRequest = new Request(url, {
      method: request.method,
      headers,
      body,
    })

    // Hand off to Better Auth and get a Web API Response back
    const webResponse = await auth.handler(webRequest)

    // Copy headers. Set-Cookie must be handled separately because the Web
    // Headers API folds duplicate keys with ", " — which corrupts cookies.
    // Node's writeHead accepts an array for Set-Cookie to preserve all values.
    const nodeHeaders: Record<string, string | string[]> = {}
    webResponse.headers.forEach((value, key) => {
      if (key.toLowerCase() !== 'set-cookie') nodeHeaders[key] = value
    })
    const setCookies = webResponse.headers.getSetCookie()
    if (setCookies.length > 0) nodeHeaders['set-cookie'] = setCookies

    // CORS headers must be set here — this handler writes via reply.raw and
    // bypasses Fastify's normal hooks, so @fastify/cors doesn't run on the
    // POST/GET response (only on the OPTIONS preflight).
    const requestOrigin = request.headers.origin
    if (requestOrigin && requestOrigin === env.FRONTEND_URL) {
      nodeHeaders['access-control-allow-origin'] = requestOrigin
      nodeHeaders['access-control-allow-credentials'] = 'true'
      nodeHeaders['vary'] = 'Origin'
    }

    reply.raw.writeHead(webResponse.status, nodeHeaders)
    reply.raw.end(Buffer.from(await webResponse.arrayBuffer()))
  })

  server.log.info('Auth routes registered at /api/auth/*')
})

// ── requireAuth ───────────────────────────────────────────────────────────────
// Use as a preHandler on any protected route.
// Reads the session cookie, validates it against the DB, and sets request.user.

// eslint-disable-next-line @typescript-eslint/no-misused-promises -- Fastify preHandler accepts async functions; the type declaration is overly strict
export const requireAuth: preHandlerHookHandler = async (request, reply) => {
  const webHeaders = new Headers()
  for (const [key, value] of Object.entries(request.headers)) {
    if (value !== undefined) {
      webHeaders.set(key, Array.isArray(value) ? value.join(', ') : value)
    }
  }

  const session = await auth.api.getSession({ headers: webHeaders })

  if (!session?.user) {
    return unauthorized(reply)
  }

  request.user = session.user
}

export default authPlugin
