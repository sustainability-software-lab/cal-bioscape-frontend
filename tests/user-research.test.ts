import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createUserResearchHandlers, type ResearchStore } from '../src/lib/user-research-server'
import type { UserResearchResponse } from '../src/lib/api-types'

const origin = 'https://calbioscape.org'
const valid = { submissionId: '59e3b392-c956-4e7c-9015-d5b9b0926ac3', role: 'researcher', affiliation: ' LBNL ', goal: 'Compare feedstocks', website: '' }
function fixture(overrides = {}) {
  const rows = new Map<string, UserResearchResponse>()
  let time = 1_800_000_000_000
  const store: ResearchStore = {
    async create(row) {
      const previous = rows.get(row.id)
      if (previous) return previous
      rows.set(row.id, row)
      return row
    },
    async list(cursor) { return { responses: [...rows.values()], nextCursor: cursor ? null : 'next-page' } },
  }
  const config = { origin, username: 'admin', password: 'a-long-test-password-for-admin', sessionSecret: 'a'.repeat(64), production: true, ...overrides }
  const handlers = createUserResearchHandlers({ store, config, now: () => time })
  return { handlers, rows, advance: (ms: number) => { time += ms } }
}
function request(path: string, body?: unknown, cookie?: string, requestOrigin = origin) {
  return new Request(`${origin}${path}`, { method: body === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', Origin: requestOrigin, ...(cookie ? { Cookie: cookie } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
}
async function login(handlers: ReturnType<typeof createUserResearchHandlers>) {
  const response = await handlers.login(request('/api/admin/login', { username: 'admin', password: 'a-long-test-password-for-admin' }))
  assert.equal(response.status, 200)
  return response.headers.get('set-cookie')!
}

test('submission persists only validated fields and retries are idempotent without overwriting', async () => {
  const { handlers, rows, advance } = fixture()
  assert.equal((await handlers.submit(request('/api/user-research', valid))).status, 201)
  advance(5000)
  assert.equal((await handlers.submit(request('/api/user-research', valid))).status, 201)
  assert.equal(rows.size, 1)
  const row = [...rows.values()][0]
  assert.equal(row.affiliation, 'LBNL')
  assert.equal(row.email, null)
  assert.equal(row.allowFollowUp, false)
  assert.equal(row.createdAt, '2027-01-15T08:00:00.000Z')
  assert.equal('website' in row, false)
  assert.equal((await handlers.submit(request('/api/user-research', { ...valid, goal: 'Changed' }))).status, 409)
  assert.equal(row.goal, 'Compare feedstocks')
})

test('invalid fields and follow-up without a valid email never reach storage', async () => {
  for (const patch of [{ role: 'invalid' }, { role: '' }, { goal: 123 }, { goal: 'a'.repeat(2001) }, { affiliation: 'a'.repeat(201) }, { email: 'not-email' }, { allowFollowUp: true }, { allowFollowUp: true, email: '  ' }, { allowFollowUp: true, email: 'not-email' }, { submissionId: '../escape' }]) {
    const { handlers, rows } = fixture()
    assert.equal((await handlers.submit(request('/api/user-research', { ...valid, ...patch }))).status, 400)
    assert.equal(rows.size, 0)
  }
  const { handlers, rows } = fixture()
  assert.equal((await handlers.submit(request('/api/user-research', { ...valid, allowFollowUp: true, email: ' a@example.com ' }))).status, 201)
  assert.equal([...rows.values()][0].email, 'a@example.com')
})

test('role and affiliation feedback normalizes omitted and blank optional text for safe retries', async () => {
  const { handlers, rows } = fixture()
  const minimal = { submissionId: valid.submissionId, role: 'researcher', affiliation: 'LBNL' }
  assert.equal((await handlers.submit(request('/api/user-research', minimal))).status, 201)
  assert.equal((await handlers.submit(request('/api/user-research', { ...minimal, goal: '  ', affiliation: ' LBNL ', email: '' }))).status, 201)
  assert.equal(rows.size, 1)
  const row = [...rows.values()][0]
  assert.equal(row.goal, '')
  assert.equal(row.affiliation, 'LBNL')
  assert.equal(row.email, null)
  assert.equal(row.allowFollowUp, false)
})

test('affiliation is required, nonblank text with a 200-character maximum', async () => {
  for (const affiliation of [undefined, null, '', ' \t\n ', 42, 'a'.repeat(201)]) {
    const { handlers, rows } = fixture()
    assert.equal((await handlers.submit(request('/api/user-research', { ...valid, affiliation }))).status, 400)
    assert.equal(rows.size, 0)
  }
  const { handlers, rows } = fixture()
  assert.equal((await handlers.submit(request('/api/user-research', { ...valid, affiliation: 'a'.repeat(200) }))).status, 201)
  assert.equal([...rows.values()][0].affiliation, 'a'.repeat(200))
})

test('Other role needs no write-in and optional descriptions retain their length bound', async () => {
  const { handlers, rows } = fixture()
  const minimal = { submissionId: valid.submissionId, role: 'other', affiliation: 'LBNL' }
  assert.equal((await handlers.submit(request('/api/user-research', minimal))).status, 201)
  assert.equal((await handlers.submit(request('/api/user-research', { ...minimal, otherRole: '  ' }))).status, 201)
  assert.equal(rows.size, 1)
  assert.equal([...rows.values()][0].otherRole, null)
  for (const length of [120, 121]) {
    const check = fixture()
    assert.equal((await check.handlers.submit(request('/api/user-research', { ...minimal, otherRole: 'a'.repeat(length) }))).status, length === 120 ? 201 : 400)
    assert.equal(check.rows.size, length === 120 ? 1 : 0)
  }
})

test('optional email is stored independently of follow-up consent without implying opt-in', async () => {
  const { handlers, rows } = fixture()
  const submission = { ...valid, goal: '', email: ' a@example.com ', allowFollowUp: false }
  assert.equal((await handlers.submit(request('/api/user-research', submission))).status, 201)
  assert.equal((await handlers.submit(request('/api/user-research', { ...submission, email: 'a@example.com' }))).status, 201)
  assert.equal(rows.size, 1)
  const row = [...rows.values()][0]
  assert.equal(row.email, 'a@example.com')
  assert.equal(row.allowFollowUp, false)
  assert.equal((await handlers.submit(request('/api/user-research', { ...submission, allowFollowUp: true }))).status, 409)
  assert.equal(row.allowFollowUp, false)
})

test('updates consent is optional, independent, immutable on retry, and exported', async () => {
  const { handlers, rows } = fixture()
  const submission = { submissionId: valid.submissionId, role: 'researcher', affiliation: 'LBNL', allowUpdates: true }
  assert.equal((await handlers.submit(request('/api/user-research', submission))).status, 201)
  assert.equal((await handlers.submit(request('/api/user-research', submission))).status, 201)
  const row = [...rows.values()][0]
  assert.equal(row.allowUpdates, true)
  assert.equal(row.allowFollowUp, false)
  assert.equal(row.email, null)
  assert.equal((await handlers.submit(request('/api/user-research', { ...submission, allowUpdates: false }))).status, 409)
  const cookie = await login(handlers)
  const exported = await handlers.exportCsv(request('/api/admin/user-research/export', undefined, cookie))
  const lines = (await exported.text()).trim().split('\r\n')
  assert.match(lines[0], /"allowUpdates","email"$/)
  assert.match(lines[1], /"true",""$/)
  const legacy = fixture()
  assert.equal((await legacy.handlers.submit(request('/api/user-research', valid))).status, 201)
  assert.equal([...legacy.rows.values()][0].allowUpdates, false)
  for (const allowUpdates of ['true', 1, null]) {
    const invalid = fixture()
    assert.equal((await invalid.handlers.submit(request('/api/user-research', { ...valid, allowUpdates }))).status, 400)
    assert.equal(invalid.rows.size, 0)
  }
})

test('CSV omits legacy follow-up flags while preserving stored records and API compatibility', async () => {
  const { handlers, rows } = fixture()
  assert.equal((await handlers.submit(request('/api/user-research', { ...valid, email: 'legacy@example.org', allowFollowUp: true }))).status, 201)
  const original = structuredClone([...rows.values()])
  const cookie = await login(handlers)
  const csvResponse = await handlers.exportCsv(request('/api/admin/user-research/export', undefined, cookie))
  const csv = await csvResponse.text()
  assert.equal(csv.includes('allowFollowUp'), false)
  assert.match(csv, /"allowUpdates","email"\r\n/)
  assert.match(csv, /"false","legacy@example.org"\r\n$/)
  assert.deepEqual([...rows.values()], original)
  const listed = await handlers.list(request('/api/admin/user-research', undefined, cookie))
  assert.equal((await listed.json()).responses[0].allowFollowUp, true)
})

test('same-origin checks, honeypot, bounded body and storage errors fail safely', async () => {
  const { handlers, rows } = fixture()
  assert.equal((await handlers.submit(request('/api/user-research', valid, undefined, 'https://evil.example'))).status, 403)
  assert.equal((await handlers.submit(request('/api/user-research', { ...valid, website: 'bot' }))).status, 201)
  assert.equal(rows.size, 0)
  assert.equal((await handlers.submit(request('/api/user-research', { ...valid, ignored: 'x'.repeat(17_000) }))).status, 413)
  const unavailable = createUserResearchHandlers({ config: { origin }, store: { create: async () => { throw Error('secret backend details') }, list: async () => { throw Error('secret backend details') } } })
  const response = await unavailable.submit(request('/api/user-research', valid))
  assert.equal(response.status, 503)
  assert.equal((await response.text()).includes('secret backend details'), false)
})

test('admin boundaries require a valid expiring signed session; responses cannot be cached', async () => {
  const { handlers, advance } = fixture()
  for (const method of [handlers.list, handlers.exportCsv]) {
    const response = await method(request('/api/admin/user-research'))
    assert.equal(response.status, 401)
    assert.match(response.headers.get('cache-control')!, /no-store/)
  }
  assert.equal((await handlers.login(request('/api/admin/login', { username: 'admin', password: 'wrong' }))).status, 401)
  const cookie = await login(handlers)
  assert.match(cookie, /HttpOnly/)
  assert.match(cookie, /Secure/)
  assert.match(cookie, /SameSite=Strict/)
  assert.equal((await handlers.list(request('/api/admin/user-research', undefined, cookie))).status, 200)
  const tampered = cookie.replace(/research_admin=./, 'research_admin=x')
  assert.equal((await handlers.list(request('/api/admin/user-research', undefined, tampered))).status, 401)
  advance(8 * 60 * 60 * 1000 + 1)
  assert.equal((await handlers.list(request('/api/admin/user-research', undefined, cookie))).status, 401)
  assert.equal((await handlers.logout(request('/api/admin/logout', {}))).headers.get('set-cookie')!.includes('Max-Age=0'), true)
})

test('missing admin secrets fail closed and login attempts are throttled', async () => {
  const missing = fixture({ sessionSecret: '' })
  assert.equal((await missing.handlers.login(request('/api/admin/login', { username: 'admin', password: 'a-long-test-password-for-admin' }))).status, 503)
  const { handlers } = fixture()
  for (let i = 0; i < 10; i++) await handlers.login(request('/api/admin/login', { username: 'admin', password: 'wrong' }))
  assert.equal((await handlers.login(request('/api/admin/login', { username: 'admin', password: 'wrong' }))).status, 429)
  assert.equal((await handlers.login(request('/api/admin/login', {}, undefined, 'https://evil.example'))).status, 403)
})

test('authenticated list forwards cursors and CSV escapes formulas and quotes', async () => {
  const { handlers } = fixture()
  await handlers.submit(request('/api/user-research', { ...valid, affiliation: '=IMPORTDATA("secret")', goal: '\t+command, "quoted"\nnext line' }))
  const cookie = await login(handlers)
  const response = await handlers.list(request('/api/admin/user-research?cursor=next-page', undefined, cookie))
  const page = await response.json()
  assert.equal(page.nextCursor, null)
  assert.equal(page.responses.length, 1)
  const csvResponse = await handlers.exportCsv(request('/api/admin/user-research/export', undefined, cookie))
  assert.match(csvResponse.headers.get('content-type')!, /text\/csv/)
  const csv = await csvResponse.text()
  assert.match(csv, /'=IMPORTDATA\(""secret""\)/)
  assert.match(csv, /'\+command, ""quoted""\nnext line/)
})
