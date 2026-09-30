// Server-side implementation. Imported by the server-only runtime, never by client components.
import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import type { UserResearchListResponse, UserResearchResponse, UserResearchRole } from './api-types'

export interface ResearchStore {
  /** Atomically creates a record, or returns the existing record for this id. */
  create(response: UserResearchResponse): Promise<UserResearchResponse>
  list(cursor?: string): Promise<UserResearchListResponse>
}

interface ResearchConfig {
  origin?: string
  username?: string
  password?: string
  sessionSecret?: string
  production?: boolean
}

const SESSION_SECONDS = 8 * 60 * 60
const MAX_BODY_BYTES = 16_384
const ROLES = new Set<UserResearchRole>(['researcher', 'consultant', 'grower', 'processor', 'developer', 'software', 'policy', 'other'])
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const NO_CACHE = { 'Cache-Control': 'private, no-store, max-age=0', 'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex, nofollow', 'Vary': 'Cookie' }

class HttpError extends Error {
  constructor(readonly status: number, message: string) { super(message) }
}

function json(body: unknown, status = 200, headers?: HeadersInit) {
  return Response.json(body, { status, headers: { ...NO_CACHE, ...headers } })
}

function equal(a: string, b: string) {
  return timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest())
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') throw new HttpError(415, 'Please send JSON.')
  if (Number(request.headers.get('content-length')) > MAX_BODY_BYTES) throw new HttpError(413, 'Request is too large.')
  const reader = request.body?.getReader()
  if (!reader) throw new HttpError(400, 'Please complete the form.')
  const chunks: Uint8Array[] = []
  let length = 0
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      length += value.byteLength
      if (length > MAX_BODY_BYTES) { await reader.cancel(); throw new HttpError(413, 'Request is too large.') }
      chunks.push(value)
    }
    const value = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid object')
    return value
  } catch (error) {
    if (error instanceof HttpError) throw error
    throw new HttpError(400, 'Please send a valid form.')
  } finally { reader.releaseLock() }
}

function field(body: Record<string, unknown>, name: string, max: number, required = false): string | null {
  const value = body[name]
  if (value === undefined || value === null) {
    if (required) throw new HttpError(400, `Please provide ${name}.`)
    return null
  }
  if (typeof value !== 'string' || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) throw new HttpError(400, `Please check ${name}.`)
  const trimmed = value.trim()
  if (required && !trimmed) throw new HttpError(400, `Please provide ${name}.`)
  return trimmed || null
}

function parseSubmission(body: Record<string, unknown>, now: number): UserResearchResponse {
  const id = field(body, 'submissionId', 36, true)!
  if (!UUID.test(id)) throw new HttpError(400, 'Please reload the form and try again.')
  const role = field(body, 'role', 32, true) as UserResearchRole
  if (!ROLES.has(role)) throw new HttpError(400, 'Please select a role.')
  const otherRole = field(body, 'otherRole', 200, role === 'other')
  const affiliation = field(body, 'affiliation', 200)
  const goal = field(body, 'goal', 2000, true)!
  if (body.allowFollowUp !== undefined && typeof body.allowFollowUp !== 'boolean') throw new HttpError(400, 'Please check your follow-up preference.')
  const allowFollowUp = body.allowFollowUp === true
  const email = field(body, 'email', 254, allowFollowUp)
  if (email && (!allowFollowUp || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) throw new HttpError(400, 'Please provide a valid email and opt in to follow-up.')
  return { id: id.toLowerCase(), createdAt: new Date(now).toISOString(), version: 1, role, otherRole: role === 'other' ? otherRole : null, affiliation, goal, email, allowFollowUp }
}

function sameSubmission(a: UserResearchResponse, b: UserResearchResponse) {
  return (['id', 'version', 'role', 'otherRole', 'affiliation', 'goal', 'email', 'allowFollowUp'] as const).every(key => a[key] === b[key])
}

function csvCell(value: unknown) {
  let text = String(value ?? '')
  // Quoting alone does not prevent spreadsheet formulas. Prefix risky cells with an apostrophe.
  if (/^[\s]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`
  return `"${text.replaceAll('"', '""')}"`
}

export function createUserResearchHandlers({ store, config, now = Date.now }: { store: ResearchStore; config: ResearchConfig; now?: () => number }) {
  const cookieName = config.production ? '__Host-research_admin' : 'research_admin'
  // Best-effort instance-local abuse limits. No IP address is stored with a response.
  const attempts = new Map<string, { count: number; until: number }>()
  function limit(key: string, max: number, windowMs: number) {
    const time = now()
    if (attempts.size >= 10_000) {
      for (const [entry, state] of attempts) if (state.until <= time) attempts.delete(entry)
      if (attempts.size >= 10_000 && !attempts.has(key)) throw new HttpError(429, 'Please wait a few minutes and try again.')
    }
    const current = attempts.get(key)
    const state = current && current.until > time ? current : { count: 0, until: time + windowMs }
    state.count++
    attempts.set(key, state)
    if (state.count > max) throw new HttpError(429, 'Please wait a few minutes and try again.')
  }
  function peer(request: Request) {
    // Cloud Run appends the connecting address; never trust a client-prepended value.
    const address = request.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim() || 'unknown'
    return createHash('sha256').update(address).digest('hex')
  }
  function sameOrigin(request: Request) {
    const expected = config.origin || (!config.production ? new URL(request.url).origin : null)
    if (!expected) throw new HttpError(503, 'This form is temporarily unavailable.')
    if (request.headers.get('origin') !== expected || request.headers.get('sec-fetch-site') === 'cross-site') throw new HttpError(403, 'Please submit from Cal BioScape.')
  }
  function authConfigured() {
    if (!config.username || !config.password || config.password.length < 20 || !config.sessionSecret || config.sessionSecret.length < 32) throw new HttpError(503, 'Admin access is temporarily unavailable.')
  }
  function sign(payload: string) {
    return createHmac('sha256', config.sessionSecret!).update(`${config.username}\0${config.password}\0${payload}`).digest('base64url')
  }
  function cookie(value: string, age: number) {
    return `${cookieName}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${config.production ? '; Secure' : ''}`
  }
  function authenticated(request: Request) {
    authConfigured()
    const raw = request.headers.get('cookie')?.split(';').map(part => part.trim()).find(part => part.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1)
    if (!raw || raw.length > 1024) throw new HttpError(401, 'Please sign in.')
    const [payload, signature, extra] = raw.split('.')
    if (!payload || !signature || extra || !equal(signature, sign(payload))) throw new HttpError(401, 'Please sign in.')
    try {
      const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
      if (!Number.isSafeInteger(decoded.expires) || decoded.expires <= now() || decoded.expires > now() + SESSION_SECONDS * 1000) throw new Error('Expired')
    } catch { throw new HttpError(401, 'Your session has expired. Please sign in again.') }
  }
  function cursor(request: Request) {
    const value = new URL(request.url).searchParams.get('cursor') || undefined
    if (value && (value.length > 2048 || /[\u0000-\u001f]/.test(value))) throw new HttpError(400, 'Invalid page cursor.')
    return value
  }
  function handled(operation: (request: Request) => Promise<Response>) {
    return async (request: Request) => {
      try { return await operation(request) }
      catch (error) {
        if (error instanceof HttpError) return json({ error: error.message }, error.status, error.status === 429 ? { 'Retry-After': '900' } : undefined)
        // Never log credentials, submitted text, email addresses or storage response bodies.
        return json({ error: 'Unable to complete this request right now. Please try again shortly.' }, 503)
      }
    }
  }

  return {
    submit: handled(async request => {
      sameOrigin(request)
      limit('submit:all', 300, 15 * 60_000)
      limit(`submit:${peer(request)}`, 20, 15 * 60_000)
      const body = await readJson(request)
      if (field(body, 'website', 200)) return json({ success: true }, 201)
      const record = parseSubmission(body, now())
      const saved = await store.create(record)
      if (!sameSubmission(record, saved)) throw new HttpError(409, 'This response was already submitted. Please reopen the form to send another response.')
      return json({ success: true }, 201)
    }),
    login: handled(async request => {
      sameOrigin(request)
      authConfigured()
      limit('login:all', 120, 15 * 60_000)
      limit(`login:${peer(request)}`, 10, 15 * 60_000)
      const body = await readJson(request)
      const username = field(body, 'username', 200, true)!
      // Passwords are exact, including whitespace.
      if (typeof body.password !== 'string' || body.password.length > 1024) throw new HttpError(401, 'Username or password is incorrect.')
      const validUsername = equal(username, config.username!)
      const validPassword = equal(body.password, config.password!)
      if (!validUsername || !validPassword) throw new HttpError(401, 'Username or password is incorrect.')
      const payload = Buffer.from(JSON.stringify({ expires: now() + SESSION_SECONDS * 1000 })).toString('base64url')
      return json({ success: true }, 200, { 'Set-Cookie': cookie(`${payload}.${sign(payload)}`, SESSION_SECONDS) })
    }),
    logout: handled(async request => {
      sameOrigin(request)
      return json({ success: true }, 200, { 'Set-Cookie': cookie('', 0) })
    }),
    list: handled(async request => {
      authenticated(request)
      const result = await store.list(cursor(request))
      return json(result)
    }),
    exportCsv: handled(async request => {
      authenticated(request)
      const result = await store.list(cursor(request))
      const keys = ['id', 'createdAt', 'role', 'otherRole', 'affiliation', 'goal', 'allowFollowUp', 'email'] as const
      const csv = [keys.map(csvCell).join(','), ...result.responses.map(row => keys.map(key => csvCell(row[key])).join(','))].join('\r\n')
      return new Response(`\uFEFF${csv}\r\n`, { headers: { ...NO_CACHE, 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="cal-bioscape-responses-page.csv"' } })
    }),
  }
}
