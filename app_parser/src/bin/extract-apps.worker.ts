import { copy, mkdirp, move, remove } from 'fs-extra'
import { join } from 'path'
import { worker } from 'workerpool'
import { isCordovaApp, isReactNativeApp } from '../parseApps'
import { APP_TYPE, messages } from './extract-apps'
import shell from 'shelljs'

worker<messages>({
  extractApp: async ({ inputPath, outputPath, section, app }) => {
    const apkIn = join(inputPath, section, app)
    const outDir = join(outputPath, section, app)

    await mkdirp(outDir)

    shell.exec(`apktool d ${JSON.stringify(apkIn)} -qfo ${JSON.stringify(outDir)}`, {
      silent: true,
    })

    return true
  },

  moveDecompApp: async ({ inputPath, outputPath, section, app }) => {
    const appPath = join(inputPath, section, app)

    if (await isCordovaApp({ appPath })) {
      const inAppPath = join(appPath, 'assets', 'www')
      const outAppPath = join(outputPath, 'cordova', section, app, 'js')

      await move(inAppPath, outAppPath, { overwrite: true })
      await remove(appPath)
      return APP_TYPE.cordova
    } else if (await isReactNativeApp({ appPath })) {
      const inAppPath = join(appPath, 'assets', 'index.android.bundle')
      const outAppPath = join(outputPath, 'react-native', section, app, 'bundle.js')

      await move(inAppPath, outAppPath, { overwrite: true })
      await remove(appPath)
      return APP_TYPE.reactNative
    } else {
      await remove(appPath)
      return APP_TYPE.removed
    }
  },

  copyApk: async ({ inputPath, outputPath, type, section, app }) => {
    const apkPath = join(inputPath, section, app)
    const outputApkPath = join(outputPath, type, section, app, 'app.apk')

    await copy(apkPath, outputApkPath)

    return true
  },
})
