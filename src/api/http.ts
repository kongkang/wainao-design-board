/**
 * 统一 HTTP 封装 —— 前端只认这一套契约：
 *  - baseURL `/api`，鉴权 `Authorization: Bearer <token>`
 *  - 成功响应解包 `{ data }`；分页 `{ data: { items, total, page, pageSize } }`
 *  - 错误响应 `{ error: { code, message } }` → 抛 HttpError
 * 切真：把 BASE 指向真实后端 / BFF，并移除 MSW 即可。
 */
const BASE = '/api'
const TOKEN_KEY = 'bb-token'

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}
export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

type Query = Record<string, unknown>

function qs(query?: Query): string {
  if (!query) return ''
  const parts = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
  return parts.length ? `?${parts.join('&')}` : ''
}

interface RequestOptions {
  body?: unknown
  formData?: FormData
  query?: Query
  headers?: Record<string, string>
}

async function request<T>(method: string, path: string, opts: RequestOptions = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = { ...opts.headers }
  if (token) headers.Authorization = `Bearer ${token}`

  let body: BodyInit | undefined
  if (opts.formData) {
    body = opts.formData // 让浏览器自动带 multipart boundary
  } else if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(opts.body)
  }

  const res = await fetch(BASE + path + qs(opts.query), { method, headers, body })
  const ct = res.headers.get('content-type') || ''
  const payload = ct.includes('application/json') ? await res.json() : null

  if (!res.ok) {
    const err = (payload && payload.error) || {}
    throw new HttpError(res.status, err.code || 'request_failed', err.message || res.statusText)
  }
  return (payload ? payload.data : undefined) as T
}

export const http = {
  get: <T>(path: string, query?: Query) => request<T>('GET', path, { query }),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, { body }),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, { body }),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, { body }),
  del: <T>(path: string, body?: unknown) => request<T>('DELETE', path, { body }),
  upload: <T>(path: string, formData: FormData) => request<T>('POST', path, { formData }),
}
