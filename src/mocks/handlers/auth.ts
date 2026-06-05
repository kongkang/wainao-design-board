import { http } from 'msw'
import { ok, fail, unauth, delay } from './_resp'
import { db, tokenFor, currentUser } from '../db'

export const authHandlers = [
  http.post('/api/auth/login', async ({ request }) => {
    const { accountId } = (await request.json()) as { accountId: string }
    const user = db.users.find((u) => u.userId === accountId)
    if (!user) return fail(404, 'account_not_found', '账号不存在')
    await delay(200)
    return ok({ accessToken: tokenFor(user.userId), user })
  }),

  http.get('/api/me', ({ request }) => {
    const u = currentUser(request)
    if (!u) return unauth()
    return ok(u)
  }),

  http.post('/api/auth/logout', () => ok({ success: true })),
]
