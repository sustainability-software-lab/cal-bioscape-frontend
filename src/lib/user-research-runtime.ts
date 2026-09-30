import 'server-only'
import { createUserResearchHandlers } from './user-research-server'
import { createGcsResearchStore } from './user-research-storage'

export const userResearch = createUserResearchHandlers({
  store: createGcsResearchStore(process.env.USER_RESEARCH_BUCKET),
  config: {
    origin: process.env.USER_RESEARCH_ORIGIN,
    username: process.env.USER_RESEARCH_ADMIN_USERNAME,
    password: process.env.USER_RESEARCH_ADMIN_PASSWORD,
    sessionSecret: process.env.USER_RESEARCH_SESSION_SECRET,
    production: process.env.NODE_ENV === 'production',
  },
})
