import axios from 'axios'
import rfgInit from 'rfg-api'

// remove require's except fs, we dont need them and the unzip2 dependency is bugged
const init = rfgInit.init.toString().replace(/require\(['"]([^)]+)['"]\)/g, (string, module) => {
  return ['fs'].includes(module) ? string : '{}'
})

const fnLines = init.split('\n')
fnLines.shift()
fnLines.pop()

// EVIL IS HERE (but not really though)
const rfg = new Function('require', `${fnLines.join('\n')}`)(require) // eslint-disable-line no-new-func

export const fixUrl = url => url.replace(/\/\//g, '/').replace(':/', '://')
export const isUrl = url => url.indexOf('http') === 0 || url.indexOf('//') === 0

export const rfgDefaults = {
  // taken from https://github.com/RealFaviconGenerator/cli-real-favicon/blob/master/common.js
  apiKey: '402333a17311c9aa68257b9c5fc571276090ee56',
  apiUrl: 'https://realfavicongenerator.net/api/favicon',
  static: true,
  staticPath: 'icons',
  force: false,
  rfg: {
    design: {
      ios: {
        pictureAspect: 'backgroundAndMargin',
        backgroundColor: '#ffffff',
        margin: '14%',
        assets: {
          ios6AndPriorIcons: false,
          ios7AndLaterIcons: false,
          precomposedIcons: false,
          declareOnlyDefaultIcon: true
        }
      },
      desktopBrowser: {},
      windows: {
        pictureAspect: 'whiteSilhouette',
        backgroundColor: '#ffffff',
        onConflict: 'override',
        assets: {
          windows80Ie10Tile: false,
          windows10Ie11EdgeTiles: {
            small: false,
            medium: true,
            big: false,
            rectangle: false
          }
        }
      },
      androidChrome: {
        pictureAspect: 'noChange',
        themeColor: '#ffffff',
        manifest: {
          display: 'standalone',
          orientation: 'notSet',
          onConflict: 'override',
          declared: true
        },
        assets: {
          legacyIcon: false,
          lowResolutionIcons: false
        }
      },
      safariPinnedTab: {
        pictureAspect: 'silhouette',
        themeColor: '#5bbad5'
      }
    },
    settings: {
      scalingAlgorithm: 'Mitchell',
      errorOnImageTooSmall: false
    }
  }
}

export const headersToJson = (headers, options) => {
  // add link and meta's to head
  const head = {}

  const re = /(\S+)=["']?((?:.(?!["']?\s+(?:\S+)=|[>"']))+.)["']?/g
  headers.split('\n').forEach((header) => {
    const type = /<([^\s>]+)/.exec(header)[1]
    if (type === 'link' || type === 'meta') {
      if (!(head[type] instanceof Array)) {
        head[type] = []
      }
      const attrs = {}
      let match
      while ((match = re.exec(header))) {
        if (match[1] === 'rel' && match[2] === 'manifest') {
          return
        }
        if (match[1] === 'href' || match[1] === 'content') {
          match[2] = fixUrl(match[2])
        }
        attrs[match[1]] = match[2]
      }
      head[type].push(attrs)
    }
  })
  return head
}

const convertToBuffer = (data) => {
  if (!(data instanceof Buffer)) {
    data = Buffer.from(data)
  }
  return data
}

export const rfgApiRequestMeta = (faviconConfig) => {
  if (faviconConfig.rfgApiMetaResponse) {
    return Promise.resolve({ data: faviconConfig.rfgApiMetaResponse })
  }
  const request = rfg.createRequest(faviconConfig.rfg)

  return axios.post(faviconConfig.apiUrl, {
    favicon_generation: request
  }, {
    requestType: 'json'
  })
}

export const rfgApiRequestPackage = (faviconConfig, packageUrl) => {
  if (faviconConfig.rfgApiPackageResponse) {
    return Promise.resolve({ data: convertToBuffer(faviconConfig.rfgApiPackageResponse) })
  }
  return axios.get(packageUrl, {
    responseType: 'arraybuffer'
  })
}

export const extractZipfile = (zipfile) => {
  return new Promise((resolve, reject) => {
    const entries = []
    const faviconFiles = []

    /* istanbul ignore next */
    zipfile.on('error', (error) => {
      reject(error)
    })

    zipfile.on('end', () => {
      if (entries.length) {
        let p
        const wait = (data) => {
          return new Promise((resolve) => {
            setTimeout(() => {
              if (entries.length !== faviconFiles.length || entries.length < zipfile.entryCount) {
                p = p.then(() => {
                  wait(data)
                })
              } else {
                resolve(data)
              }
            }, 100)
          })
        }

        p = wait(faviconFiles)
        resolve(p)
      } else {
        /* istanbul ignore next */
        reject(new Error('zip file was empty'))
      }
    })

    zipfile.on('entry', (entry) => {
      entries.push(entry.fileName)

      zipfile.openReadStream(entry, (err, readStream) => {
        if (err) {
          reject(err)
        }

        const buffers = []
        readStream.on('data', (buffer) => {
          buffers.push(buffer)
        })
        readStream.on('end', () => {
          faviconFiles.push({
            fileName: entry.fileName === 'site.webmanifest' ? 'manifest.json' : entry.fileName,
            buff: Buffer.concat(buffers)
          })
        })
      })
    })
  })
}
