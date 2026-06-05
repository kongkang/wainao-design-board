import { http } from 'msw'
import { ok, unauth } from './_resp'
import { db, currentUser } from '../db'

export const modelHandlers = [
  http.get('/api/models', ({ request }) => {
    const u = currentUser(request)
    if (!u) return unauth()
    return ok(db.models)
  }),
]
