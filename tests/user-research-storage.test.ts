import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createGcsResearchStore, type StorageRequest } from '../src/lib/user-research-storage'
import type { UserResearchResponse } from '../src/lib/api-types'

const row: UserResearchResponse = { id: '59e3b392-c956-4e7c-9015-d5b9b0926ac3', createdAt: '2026-09-30T02:00:00.000Z', version: 1, role: 'researcher', otherRole: null, affiliation: null, goal: 'Plan a site', email: null, allowUpdates: false, allowFollowUp: false }

test('GCS writes private JSON with an atomic no-overwrite precondition and bounded requests', async () => {
  const requests: StorageRequest[] = []
  const store = createGcsResearchStore('private-bucket', async options => { requests.push(options); return {} })
  assert.deepEqual(await store.create(row), row)
  assert.equal(requests.length, 1)
  assert.equal(requests[0].method, 'POST')
  assert.equal(requests[0].params?.ifGenerationMatch, 0)
  assert.equal(requests[0].params?.name, `responses/${row.id}.json`)
  assert.equal(requests[0].params?.predefinedAcl, undefined)
  assert.deepEqual(JSON.parse(requests[0].data!), row)
})

test('GCS duplicate writes read original data and unrelated failures propagate', async () => {
  const requests: StorageRequest[] = []
  const store = createGcsResearchStore('private-bucket', async options => {
    requests.push(options)
    if (options.method === 'POST') throw { response: { status: 412 } }
    return row
  })
  assert.deepEqual(await store.create({ ...row, goal: 'Different' }), row)
  assert.equal(requests.length, 2)
  assert.match(requests[1].url, /responses%2F.+\.json$/)
  const broken = createGcsResearchStore('private-bucket', async () => { throw { response: { status: 403 } } })
  await assert.rejects(broken.create(row))
})

test('GCS list is page-bounded and passes opaque cursors without exposing bucket metadata', async () => {
  const requests: StorageRequest[] = []
  const store = createGcsResearchStore('private-bucket', async options => {
    requests.push(options)
    return options.params?.alt === 'media' ? row : { items: [{ name: `responses/${row.id}.json` }], nextPageToken: 'next' }
  })
  assert.deepEqual(await store.list('current'), { responses: [row], nextCursor: 'next' })
  assert.equal(requests[0].params?.maxResults, 50)
  assert.equal(requests[0].params?.pageToken, 'current')
  assert.equal(requests[0].params?.prefix, 'responses/')
})

test('creator-only IAM duplicate denial can confirm the existing record without allowing an overwrite', async () => {
  const store = createGcsResearchStore('private-bucket', async options => {
    if (options.method === 'POST') throw { response: { status: 403 } }
    return row
  })
  assert.deepEqual(await store.create({ ...row, goal: 'Changed' }), row)
  const missing = createGcsResearchStore('private-bucket', async options => {
    throw { response: { status: options.method === 'POST' ? 403 : 404 } }
  })
  await assert.rejects(missing.create(row))
})

test('missing bucket fails before any storage request', async () => {
  let calls = 0
  const store = createGcsResearchStore(undefined, async () => { calls++; return {} })
  await assert.rejects(store.create(row))
  await assert.rejects(store.list())
  assert.equal(calls, 0)
})

test('legacy records without updates consent read as false without modifying the stored object', async () => {
  const { allowUpdates: _unused, ...legacy } = row
  const store = createGcsResearchStore('private-bucket', async options => {
    if (options.method === 'POST') throw { response: { status: 412 } }
    return options.params?.alt === 'media' ? legacy : { items: [{ name: `responses/${row.id}.json` }] }
  })
  assert.deepEqual(await store.list(), { responses: [row], nextCursor: null })
  assert.deepEqual(await store.create(row), row)
  assert.equal('allowUpdates' in legacy, false)
})
