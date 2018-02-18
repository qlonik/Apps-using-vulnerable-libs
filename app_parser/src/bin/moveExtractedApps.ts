import { copy, move, pathExists, readdir, remove } from 'fs-extra'
import { join } from 'path'
import { resolveAllOrInParallel } from '../utils'
import { stdoutLog } from '../utils/logger'


const CORDOVA_FOLDER = '/home/nvolodin/Auvl/data/sample_apps/cordova'
const REACT_NATIVE_FOLDER = '/home/nvolodin/Auvl/data/sample_apps/react-native'
const APKS_FOLDER = '/gi-pool/appdata-ro'
const EXTRACTED_JS = '/home/nvolodin/Auvl/data/done/js'
const FINISHED_APK = '/home/nvolodin/Auvl/data/done/apks'

const log = stdoutLog('move-extracted-apps')

async function main() {
  if (await pathExists(CORDOVA_FOLDER)) {
    const cordovaSectionNames = await readdir(CORDOVA_FOLDER)
    for (let section of cordovaSectionNames) {
      const sectionPath = join(CORDOVA_FOLDER, section)
      const appNames = await readdir(sectionPath)
      const appPromises = appNames.map((app) => {
        return async () => {
          const jsPath = join(CORDOVA_FOLDER, section, app, 'extractedJs')
          const jsDestPath = join(EXTRACTED_JS, 'cordova', section, app, 'js')

          const apkPath = join(APKS_FOLDER, section, app)
          const apkDestPath = join(FINISHED_APK, 'cordova', section, app, 'app.apk')

          await move(jsPath, jsDestPath)
          await copy(apkPath, apkDestPath)
          await remove(join(CORDOVA_FOLDER, section, app))
        }
      })
      await resolveAllOrInParallel(appPromises)
      log('cordova - fin %o', section)

      const sectionFolderContents = await readdir(sectionPath)
      if (!sectionFolderContents.length) {
        await remove(sectionPath)
      }
    }
  }

  if (await pathExists(REACT_NATIVE_FOLDER)) {
    const reactNativeSectionNames = await readdir(REACT_NATIVE_FOLDER)
    for (let section of reactNativeSectionNames) {
      const sectionPath = join(REACT_NATIVE_FOLDER, section)
      const appNames = await readdir(sectionPath)
      const appPromises = appNames.map((app) => {
        return async () => {
          const jsPath = join(REACT_NATIVE_FOLDER, section, app, 'extractedJs',
            'index.android.bundle.js')
          const jsDestPath = join(EXTRACTED_JS, 'react-native', section, app, 'bundle.js')

          const apkPath = join(APKS_FOLDER, section, app)
          const apkDestPath = join(FINISHED_APK, 'react-native', section, app, 'app.apk')

          await move(jsPath, jsDestPath)
          await copy(apkPath, apkDestPath)
          await remove(join(REACT_NATIVE_FOLDER, section, app))
        }
      })
      await resolveAllOrInParallel(appPromises)
      log('react-native - fin %o', section)

      const sectionFolderContents = await readdir(sectionPath)
      if (!sectionFolderContents.length) {
        await remove(sectionPath)
      }
    }
  }
}

if (require.main === module) {
  main()
    .then(() => log('Everything is done!'))
    .catch((err) => log(`Some global error: ${err.stack}`))
}
