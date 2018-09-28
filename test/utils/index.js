import { unlinkSync, rmdirSync, lstatSync } from 'fs'
import { promisify } from 'util'

import globCb from 'glob'
const glob = promisify(globCb)

export const cleanup = async (paths) => {
  if (typeof paths === 'string') {
    paths = [ paths ]
  }
  await Promise.all(paths.map(async (path) => {
    const files = await glob(path, {})
    files.forEach((file) => {
      if (lstatSync(file).isDirectory()) {
        rmdirSync(file)
      } else {
        unlinkSync(file)
      }
    })
  }))
}
