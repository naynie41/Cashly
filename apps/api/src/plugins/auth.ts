import fp from 'fastify-plugin'
import type { FastifyPluginAsync, preHandlerHookHandler } from 'fastify'
import { auth, type AuthUser } from '../lib/auth.js'
import { unauthorized } from '../lib/errors.js'

// Extend FastifyRequest so request.user is available in all route handlers.
declare module 'fastify' {
  interface FastifyRequest {
    user: AuthUser | null
  }
}

// eslint-disable-next-line @typescript-eslint/require-await -- Fastify plugin registration is synchronous; the scoped register call is awaited
const authPlugin: FastifyPluginAsync = fp(async (server) => {
  // Decorate every request with user = null; requireAuth overwrites this.
  server.decorateRequest('user', null)

  // Register auth routes in a scoped context so the JSON body parser here
  // does NOT affect the rest of the application.
  //
  // We parse the body as a Buffer (Fastify reads the stream into memory first),
  // then reconstruct a Web API Request to hand off to auth.handler.
  // This avoids the "stream already consumed" problem with toNodeHandler.
  // eslint-disable-next-line @typescript-eslint/require-await -- inner plugin; awaits are inside the route handler
  await server.register(async (scope) => {
    scope.addContentTypeParser('application/json', { parseAs: 'buffer' }, (_req, body, done) =>
      done(null, body),
    )

    scope.all('/api/auth/*', async (request, reply) => {
      // Build the full URL Better Auth expects
      const url = new URL(request.url, `${request.protocol}://${request.hostname}`)

      // Convert Node headers → Web Headers
      const headers = new Headers()
      for (const [key, value] of Object.entries(request.headers)) {
        if (value !== undefined) {
          headers.set(key, Array.isArray(value) ? value.join(', ') : value)
        }
      }

      // request.body is the Buffer produced by our content-type parser above
      const body =
        request.method !== 'GET' && request.method !== 'HEAD'
          ? (request.body as Buffer | null)
          : null

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

      reply.raw.writeHead(webResponse.status, nodeHeaders)
      reply.raw.end(Buffer.from(await webResponse.arrayBuffer()))
    })
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
