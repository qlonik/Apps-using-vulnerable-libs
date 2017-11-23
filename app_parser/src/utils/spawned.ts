import { exec as originalExec } from 'child_process'
import { promisify } from 'util'


const exec = promisify(originalExec)

export async function mv(src: string, dest: string, opts = {}) {
  return await exec(`mv ${src} ${dest}`, opts)
}
