const { find, defaults, defaultsDeep } = require('lodash')
const fs = require('fs')
const mkdirp = require('mkdirp')
const path = require('path')
const rfg = require('rfg-api').init()
const axios = require('axios')
const unzip = require('unzip2')

module.exports.meta = require('./package.json')

const Debug = require('debug')
const debug = Debug('plugin:' + module.exports.meta.name)
debug.enabled = true
debug.color = 5

const error = Debug('plugin:' + module.exports.meta.name)
error.enabled = true
error.color = 1

const fixUrl = url => url.replace(/\/\//g, '/').replace(':/', '://')
const isUrl = url => url.indexOf('http') === 0 || url.indexOf('//') === 0

module.exports = function nuxtRfgIcon (options) {
  if (this.options.dev && process.env.NODE_ENV !== 'production') {
    debug('plugin is disabled in dev mode, set NODE_ENV to \'production\' to override')
    return
  }

  const rfg_defaults = {
    // sent email about apikeys, no response yet
    // taken from https://github.com/RealFaviconGenerator/cli-real-favicon/blob/master/common.js
    apiKey: '402333a17311c9aa68257b9c5fc571276090ee56',
    static: false,
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

  const headersToJson = (headers) => {
    // add link and meta's to head
    if (!this.options.head) {
      this.options.head = {}
    }

    let head = {}

    const re = /(\S+)=["']?((?:.(?!["']?\s+(?:\S+)=|[>"']))+.)["']?/g
    headers.split('\n').forEach(header => {
      const type = /<([^\s>]+)/.exec(header)[1]
      if (type === 'link' || type === 'meta') {
        if (!(head[type] instanceof Array)) {
          head[type] = []
        }
        let attrs = {}
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

  this.nuxt.hook('build:before', builder => {
    const faviconDescription = defaultsDeep(this.options['rfg-icon'] || options || {}, rfg_defaults)

    if (faviconDescription.static) {
      faviconDescription.staticPath = faviconDescription.staticPath.replace(/^\/*/, '')

      let jsonFiles = {
        head: path.resolve(this.options.srcDir, 'static', faviconDescription.staticPath, 'headers.json'),
        manifest: path.resolve(this.options.srcDir, 'static', faviconDescription.staticPath, 'manifest.json')
      }

      // if headers.json already exists, dont retrieve them again unless forced
      if (fs.existsSync(jsonFiles.manifest) && fs.existsSync(jsonFiles.head)) {
        if (faviconDescription.force) {
          debug('Static files exists but force is enabled')
        } else {
          return Promise.all(Object.keys(jsonFiles).map(type => new Promise((resolve, reject) => {
            fs.readFile(jsonFiles[type], 'utf8', (err, data) => {
              if (err) {
                reject(err)
              }
              // apply manifest to current manifest, use defaults so you can still override values
              const json = JSON.parse(data)

              if (!this.options[type]) {
                this.options[type] = {}
              }

              if (type === 'manifest') {
                this.options[type] = defaults(this.options[type], json)
              } else {
                for (var key in json) {
                  if (!Array.isArray(this.options[type][key])) {
                    this.options[type][key] = [];
                  }
                  for (let i = 0; i < json[key].length; i++) {
                    let row = json[key][i]

                    this.options[type][key].push(row)
                  }
                }
              }
              resolve()
            })
          }))).then(() => {
            debug('Static files enabled and exists, wont retrieve new favicons')
          }).catch(err => {
            error('Could not load static json files', err)
          })
        }
      } else {
        const iconPath = path.resolve(this.options.srcDir, 'static', faviconDescription.staticPath)

        if (!fs.existsSync(iconPath)) {
          mkdirp.sync(iconPath)
        }
      }

      let publicPath = faviconDescription.staticPath
      if (publicPath.charAt(0) !== '/') publicPath = '/' + publicPath
      if (publicPath.charAt(publicPath.length - 1) !== '/') publicPath += '/'

      faviconDescription.rfg.iconsPath = fixUrl(publicPath)
    } else {
      // routerBase and publicPath
      const routerBase = this.options.router.base
      let publicPath = fixUrl(`${routerBase}/${this.options.build.publicPath}`)
      if (isUrl(this.options.build.publicPath)) { // CDN
        publicPath = this.options.build.publicPath
        if (publicPath.indexOf('//') === 0) {
          publicPath = '/' + publicPath // escape fixUrl
        }
      }
      faviconDescription.rfg.iconsPath = fixUrl(publicPath + '/icons/')
    }

    debug('Retrieving favicons from realfavicongenerator api')

    faviconDescription.rfg.apiKey = faviconDescription.apiKey
    faviconDescription.rfg.masterPicture = faviconDescription.masterPicture || path.resolve(this.options.srcDir, 'static', 'icon.png')

    var request = rfg.createRequest(faviconDescription.rfg)

    return axios.post('https://realfavicongenerator.net/api/favicon', {
      favicon_generation: request
    }, {
      requestType: 'json'
    }).then(({ data }) => {
      return new Promise((resolve, reject) => {
        var headers = data.favicon_generation_result.favicon.html_code

        axios.get(data.favicon_generation_result.favicon.package_url, {
          responseType: 'stream'
        }).then(({ data }) => {
          resolve({ data, headers })
        }).catch(err => {
          reject(err)
        })
      })
    }).then(({ data, headers }) => {
      return new Promise((resolve, reject) => {
        var faviconFiles = []

        var parserStream = unzip.Parse()
        parserStream.on('close', () => {
          if (faviconFiles.length) {
            resolve({ faviconFiles, headers })
          } else {
            reject(new Error('zip file was empty'))
          }
        })

        data.pipe(parserStream).on('entry', (entry) => {
          var buffers = []

          entry.on('data', (buffer) => { buffers.push(buffer) })
          entry.on('end', () => {
            faviconFiles.push({
              fileName: entry.path === 'site.webmanifest' ? 'manifest.json' : entry.path,
              buff: Buffer.concat(buffers)
            })
          })
        })
      })
    }).then(({ faviconFiles, headers }) => {
      // add link and meta's to head
      if (!this.options.head) {
        this.options.head = {}
      }
      const head = headersToJson(headers)
      this.options.head = defaultsDeep(this.options.head, head)

      // apply manifest to current manifest, use defaults so you can still override values
      const manifest = find(faviconFiles, { fileName: 'manifest.json' })
      const manifestJson = JSON.parse(manifest.buff.toString('UTF-8'))
      if (!this.options.manifest) {
        this.options.manifest = {}
      }
      this.options.manifest = defaultsDeep(this.options.manifest, manifestJson)

      // always save favicon.ico in static root
      const favicon = find(faviconFiles, { fileName: 'favicon.ico' })
      fs.writeFileSync(path.resolve(this.options.srcDir, 'static', 'favicon.ico'), favicon.buff, (err) => {
        if (err) {
          error('Could not save favicon.ico', err)
        }
      })

      if (faviconDescription.static) {
        // add headers
        faviconFiles.push({fileName: 'headers.json', buff: JSON.stringify(head)})

        const iconDir = path.resolve(this.options.srcDir, 'static', faviconDescription.staticPath)

        return Promise.all(faviconFiles.map(file => new Promise((resolve, reject) => {
          fs.writeFile(path.resolve(iconDir, file.fileName), file.buff, (err) => {
            if (err) {
              error('Could not save file:', 'static/' + faviconDescription.staticPath + '/' + file.fileName, ', err:', err)
            }
            resolve()
          })
        }))).then(() => {
          debug('Finished saving favicons to static folder')
        }).catch(err => {
          error(err)
        })
      } else {
        // Register webpack plugin to emit icons
        this.options.build.plugins.push({
          apply (compiler) {
            compiler.plugin('emit', function (compilation, _cb) {
              faviconFiles.forEach(file => {
                if (file.fileName !== 'manifest.json') {
                  compilation.assets['icons/' + file.fileName] = {
                    source: () => file.buff,
                    size: () => file.buff.length
                  }
                }
              })
              _cb()
            })
          }
        })
      }
      debug('Finished adding favicons as assets')
    }).catch(err => {
      error('error while communicating with rfg api', err)
    })
  })
}
