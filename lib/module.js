const fs = require('fs')
const path = require('path')
const promisify = require('util').promisify
const { find, defaults, defaultsDeep } = require('lodash')
const mkdirp = require('mkdirp')
const consola = require('consola')
const yauzl = require('yauzl')

const yauzlFromBuffer = promisify(yauzl.fromBuffer)

const {
  isUrl,
  fixUrl,
  rfgDefaults,
  headersToJson,
  rfgApiRequestMeta,
  rfgApiRequestPackage,
  extractZipfile
} = require('./utils')

module.exports = function nuxtRfgIcon(options) {
  /* istanbul ignore next */
  if (this.options.dev && process.env.NODE_ENV !== 'production') {
    consola.warn('plugin is disabled in dev mode, set NODE_ENV to \'production\' to override')
    return
  }

  /* istanbul ignore if */
  if (!this.options.head) {
    this.options.head = {}
  }

  this.nuxt.hook('build:before', (builder) => {
    const faviconConfig = defaultsDeep(this.options['rfg-icon'] || options || {}, rfgDefaults)

    if (faviconConfig.static) {
      faviconConfig.staticPath = faviconConfig.staticPath.replace(/^\/*/, '')

      const jsonFiles = {
        head: path.resolve(this.options.srcDir, 'static', faviconConfig.staticPath, 'headers.json'),
        manifest: path.resolve(this.options.srcDir, 'static', faviconConfig.staticPath, 'manifest.json')
      }

      // if headers.json already exists, dont retrieve them again unless forced
      if (fs.existsSync(jsonFiles.manifest) && fs.existsSync(jsonFiles.head)) {
        if (faviconConfig.force) {
          consola.warn('Static files exists but force is enabled')
        } else {
          return Promise.all(Object.keys(jsonFiles).map(type => new Promise((resolve, reject) => {
            fs.readFile(jsonFiles[type], 'utf8', (err, data) => {
              /* istanbul ignore next */
              if (err) {
                reject(err)
              }
              // apply manifest to current manifest, use defaults so you can still override values
              const json = JSON.parse(data)

              /* istanbul ignore next */
              if (!this.options[type]) {
                this.options[type] = {}
              }

              if (type === 'manifest') {
                this.options[type] = defaults(this.options[type], json)
              } else {
                for (const key in json) {
                  /* istanbul ignore next */
                  if (!Array.isArray(this.options[type][key])) {
                    this.options[type][key] = []
                  }

                  for (let i = 0; i < json[key].length; i++) {
                    const row = json[key][i]

                    this.options[type][key].push(row)
                  }
                }
              }
              resolve()
            })
          }))).then(() => {
            consola.info('Static files enabled and exists, wont retrieve new favicons')
          }).catch((err) => {
            /* istanbul ignore next */
            consola.error('Could not load static json files', err.message)
          })
        }
      } else {
        const iconPath = path.resolve(this.options.srcDir, 'static', faviconConfig.staticPath)

        if (!fs.existsSync(iconPath)) {
          mkdirp.sync(iconPath)
        }
      }

      let publicPath = faviconConfig.staticPath
      if (publicPath.charAt(0) !== '/') publicPath = '/' + publicPath
      if (publicPath.charAt(publicPath.length - 1) !== '/') publicPath += '/'

      faviconConfig.rfg.iconsPath = fixUrl(publicPath)
    } else {
      // routerBase and publicPath
      const routerBase = this.options.router.base
      let publicPath = fixUrl(`${routerBase}/${this.options.build.publicPath}`)
      if (isUrl(this.options.build.publicPath)) { // CDN
        publicPath = this.options.build.publicPath

        /* istanbul ignore next */
        if (publicPath.indexOf('//') === 0) {
          publicPath = '/' + publicPath // escape fixUrl
        }
      }
      faviconConfig.rfg.iconsPath = fixUrl(publicPath + '/icons/')
    }

    consola.info('Retrieving favicons from realfavicongenerator api')

    faviconConfig.rfg.apiKey = faviconConfig.apiKey
    faviconConfig.rfg.masterPicture = faviconConfig.masterPicture || path.resolve(this.options.srcDir, 'static', 'icon.png')

    let headers
    rfgApiRequestMeta(faviconConfig)
      .then(({ data }) => {
        headers = data.favicon_generation_result.favicon.html_code

        return rfgApiRequestPackage(faviconConfig, data.favicon_generation_result.favicon.package_url)
      }).then(({ data }) => {
        return yauzlFromBuffer(data)
      }).then((zipFile) => {
        return extractZipfile(zipFile)
      }).then((zipEntries) => {
        return zipEntries
      }).then((faviconFiles) => {
        // add link and meta's to head
        const options = {}
        options.head = headersToJson(headers)

        // apply manifest to current manifest, use defaults so you can still override values
        const manifest = find(faviconFiles, { fileName: 'manifest.json' })
        options.manifest = JSON.parse(manifest.buff.toString('UTF-8'))

        for (const type in options) {
          const json = options[type]

          /* istanbul ignore if */
          if (!this.options[type]) {
            this.options[type] = {}
          }

          if (type === 'manifest') {
          // apply manifest to current manifest, use defaults so you can still override values
            this.options[type] = defaults(this.options[type], json)
          } else {
            for (const key in json) {
            /* istanbul ignore if */
              if (!Array.isArray(this.options[type][key])) {
                this.options[type][key] = []
              }

              for (let i = 0; i < json[key].length; i++) {
                const row = json[key][i]

                this.options[type][key].push(row)
              }
            }
          }
        }

        // always save favicon.ico in static root
        const favicon = find(faviconFiles, { fileName: 'favicon.ico' })
        fs.writeFileSync(path.resolve(this.options.srcDir, 'static', 'favicon.ico'), favicon.buff, (err) => {
        /* istanbul ignore next */
          if (err) {
            consola.error('Could not save favicon.ico', err)
          }
        })

        if (faviconConfig.static) {
        // add headers
          faviconFiles.push({ fileName: 'headers.json', buff: JSON.stringify(options.head) })

          const iconDir = path.resolve(this.options.srcDir, 'static', faviconConfig.staticPath)

          return Promise.all(faviconFiles.map(file => new Promise((resolve, reject) => {
            fs.writeFile(path.resolve(iconDir, file.fileName), file.buff, (err) => {
            /* istanbul ignore if */
              if (err) {
                consola.error('Could not save file:', 'static/' + faviconConfig.staticPath + '/' + file.fileName, ', err:', err)
              }
              resolve()
            })
          }))).then(() => {
            consola.success('Finished saving favicons to static folder')
          }).catch((err) => {
          /* istanbul ignore next */
            consola.error(err)
          })
        } else {
        // Register webpack plugin to emit icons
          this.options.build.plugins.push({
            apply(compiler) {
              compiler.plugin('emit', function (compilation, _cb) {
                faviconFiles.forEach((file) => {
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
        consola.success('Finished adding favicons as assets')
      }).catch((err) => {
      /* istanbul ignore next */
        consola.error('error while communicating with rfg api', err)
      })
  })
}

module.exports.meta = require('../package.json')
