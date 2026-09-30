// Server-side GCS adapter. Bucket access uses the Cloud Run service identity, never a browser credential.
import { GoogleAuth } from 'google-auth-library'
import type { UserResearchListResponse, UserResearchResponse } from './api-types'
import type { ResearchStore } from './user-research-server'

export interface StorageRequest {
  url: string
  method: 'GET' | 'POST'
  params?: Record<string, string | number>
  headers?: Record<string, string>
  data?: string
}

type StorageTransport = (options: StorageRequest) => Promise<unknown>
const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/devstorage.read_write'] })
const authenticatedRequest: StorageTransport = async options => {
  const result = await auth.request({ ...options, timeout: 10_000, retry: false, responseType: 'json' })
  return result.data
}

function status(error: unknown) {
  return (error as { response?: { status?: number } })?.response?.status
}

function storedResponse(value: unknown, expectedId?: string): UserResearchResponse {
  const row = value as UserResearchResponse
  if (!row || typeof row !== 'object' || row.version !== 1 || typeof row.id !== 'string' || (expectedId && row.id !== expectedId) || typeof row.createdAt !== 'string' || !Number.isFinite(Date.parse(row.createdAt)) || typeof row.goal !== 'string' || typeof row.role !== 'string' || typeof row.allowFollowUp !== 'boolean') throw new Error('Invalid stored response')
  return row
}

export function createGcsResearchStore(bucket: string | undefined, request: StorageTransport = authenticatedRequest): ResearchStore {
  function base(upload = false) {
    if (!bucket) throw new Error('User research storage is not configured')
    return `https://storage.googleapis.com/${upload ? 'upload/' : ''}storage/v1/b/${encodeURIComponent(bucket)}/o`
  }
  async function read(name: string, expectedId?: string) {
    return storedResponse(await request({ url: `${base()}/${encodeURIComponent(name)}`, method: 'GET', params: { alt: 'media' } }), expectedId)
  }
  return {
    async create(row) {
      const name = `responses/${row.id}.json`
      try {
        await request({ url: base(true), method: 'POST', params: { uploadType: 'media', name, ifGenerationMatch: 0 }, headers: { 'Content-Type': 'application/json' }, data: JSON.stringify(row) })
        return row
      } catch (error) {
        if (status(error) !== 412 && status(error) !== 403) throw error
        // Object Creator IAM can deny replacement before evaluating the precondition.
        // A missing/unreadable object still fails; an existing object must match at the handler.
        // A retry can return success only after the handler verifies that the saved contents match.
        return read(name, row.id)
      }
    },
    async list(cursor): Promise<UserResearchListResponse> {
      const page = await request({ url: base(), method: 'GET', params: { prefix: 'responses/', maxResults: 50, fields: 'items(name),nextPageToken', ...(cursor ? { pageToken: cursor } : {}) } }) as { items?: { name: string }[]; nextPageToken?: string }
      // GCS returns stable object-name order, not chronological order. Reads stay bounded to one page.
      const names = page.items ?? []
      if (!Array.isArray(names) || names.length > 50) throw new Error('Invalid storage page')
      const responses = await Promise.all(names.map(item => {
        if (!/^responses\/[0-9a-f-]{36}\.json$/.test(item.name)) throw new Error('Invalid stored object name')
        return read(item.name, item.name.slice(10, -5))
      }))
      return { responses, nextCursor: page.nextPageToken || null }
    },
  }
}
