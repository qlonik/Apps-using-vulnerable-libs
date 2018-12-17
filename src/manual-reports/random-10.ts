import { appDescMap } from '../bin/one-time/choose-random-apps'
import { APP_TYPES, appDesc } from '../parseApps'

const ids = [
  'cordova/20170726-a_b/apps.yclients88759-10300-2017_04_13.apk',
  'cordova/20170726-a_b/br.com.williarts.radiovox-20008-2017_01_25.apk',
  'cordova/20170726-com.aq_com.az/com.atv.freeanemia-1-2015_04_06.apk',
  'cordova/20170726-com.p/com.paynopain.easyGOband-18-2017_04_04.apk',
  'cordova/20170726-com.t/com.tiny.m91392d54e89b48a6b2ecf1306f88ebbb-300000016-2017_02_17.apk',
  'cordova/20170726-com.t/com.tomatopie.stickermix8-10-2015_03_12.apk',
  'cordova/20170726-com.x/com.zousan.santahelp-78-2016_12_13.apk',
  'cordova/20170726-d-z/io.shirkan.RavKav-1800000-2017_01_29.apk',
  'cordova/20170726-d-z/net.jp.apps.noboruhirohara.yakei-102008-2016_05_02.apk',
  'react-native/20170726-com.e/com.eztravel-144-2017_03_13.apk',
]

// eslint-disable-next-line typescript/no-use-before-define
type mappedApps = { map: appDescMap; picked: appDesc[] }
const { map, picked }: mappedApps = ids.reduce(
  (acc, id) => {
    const [type, section, app] = id.split('/') as [APP_TYPES, string, string]
    const appDescVal = { type, section, app } as appDesc
    return { map: { ...acc.map, [id]: appDescVal }, picked: acc.picked.concat(appDescVal) }
  },
  { map: {}, picked: [] } as mappedApps,
)

export { ids as appIds, map as appMap, picked as appPick }
