import { HttpResponse } from 'msw'

export const ok = <T>(data: T, init?: ResponseInit) => HttpResponse.json({ data }, init)
export const fail = (status: number, code: string, message: string) =>
  HttpResponse.json({ error: { code, message } }, { status })

export const unauth = () => fail(401, 'unauthorized', '未登录或登录已过期')
export const forbidden = (message = '无权访问该资源') => fail(403, 'forbidden', message)
export const notFound = (message = '资源不存在') => fail(404, 'not_found', message)

/** 模拟网络延迟，让加载态可见 */
export const delay = (ms = 260) => new Promise((r) => setTimeout(r, ms))
