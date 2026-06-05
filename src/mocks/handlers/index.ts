import { authHandlers } from './auth'
import { projectHandlers } from './projects'
import { assetHandlers } from './assets'
import { modelHandlers } from './models'
import { generationHandlers } from './generation'
import { canvasHandlers } from './canvas'
import { billingHandlers } from './billing'
import { memberHandlers } from './members'
import { dashboardHandlers } from './dashboard'

export const handlers = [
  ...authHandlers,
  ...projectHandlers,
  ...assetHandlers,
  ...modelHandlers,
  ...generationHandlers,
  ...canvasHandlers,
  ...billingHandlers,
  ...memberHandlers,
  ...dashboardHandlers,
]
