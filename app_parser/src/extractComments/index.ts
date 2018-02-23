import parse from 'extract-comments'
import { join } from 'path'
import { myWriteJSON } from '../utils/files'


export const extractComments = async function (
  { scriptFolder, content }: { scriptFolder: string, content: string }) {
  const commentsFileLocation = join(scriptFolder, 'comments.json')
  const versionFileLocation = join(scriptFolder, 'version.json')
  const extractedComments: any[] = parse(content, {
    first: true,
    stripProtected: true,
  })
  await myWriteJSON({ file: commentsFileLocation, content: extractedComments })
  if (extractedComments.length) {
    const commentValue = extractedComments[0].value.trim()
    const versionRegex1 = /(\w+)\s(v?\d+\.\d+\.\d+).*/
    const versionRegex2 = /.*@version\s(v?\d+\.\d+\.\d+).*/
    const versionMatch1 = versionRegex1.exec(commentValue)
    const versionMatch2 = versionRegex2.exec(commentValue)
    let maybeTitle = ''
    let maybeVersion = ''
    if (versionMatch1) {
      maybeTitle = versionMatch1[1]
      maybeVersion = versionMatch1[2]
    }
    else if (versionMatch2) {
      maybeVersion = versionMatch2[1]
    }
    await myWriteJSON({ file: versionFileLocation, content: { maybeTitle, maybeVersion } })
  }
}
