import { worker } from 'workerpool'
import { messages } from './analyse-apps'

worker<messages>({
  analyse: async ({ allAppsPath, allLibsPath, app }) => {
    return false
  },
})
