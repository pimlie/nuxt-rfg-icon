import { existsSync } from 'fs'
import { resolve } from 'path'
import { Nuxt, Builder } from 'nuxt'
// const consola = require('consola')
// import module from '../lib/module'

import { cleanup } from './utils'
import config from './fixture/nuxt.config'

const port = process.env.PORT || 3000
const url = path => `http://localhost:${port}${path}`

// mocking consola doesnt work
const logSpy = jest.fn()
process.stdout.write = logSpy

describe('rfg-icon module, static', () => {
  let nuxt
  const staticPath = resolve(__dirname, './fixture/static/')

  const iconDir = 'icons'
  const iconPath = resolve(staticPath, iconDir)
  const iconPathsToCleanup = [
    iconPath + '/*',
    resolve(staticPath, 'favicon.ico')
  ]

  beforeAll(async () => {
    await cleanup(iconPathsToCleanup)

    config['rfg-icon'] = {
      apiUrl: url('/rfg-api.response.json'),
      rfgApiMetaResponse: require(resolve(config.srcDir, 'rfg-api.response.json')),
      rfgApiPackageResponse: require(resolve(config.srcDir, 'rfg-api.package.json')),
      staticPath: iconDir
    }

    nuxt = new Nuxt(config)
    await new Builder(nuxt).build()
    await nuxt.listen(port)
  }, 60000)

  afterAll(async () => {
    await nuxt.close()
  })

  test('check build output', () => {
    expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/Retrieving favicons from realfavicongenerator api/))
    expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/Finished saving favicons to static folder/))
  })

  test('icons exists on filesystem', () => {
    expect(existsSync(resolve(staticPath, 'favicon.ico'))).toBe(true)

    const expectedFiles = [
      'browserconfig.xml',
      'headers.json',
      'manifest.json',
      'favicon.ico'
    ]

    expectedFiles.forEach((file) => {
      expect(existsSync(resolve(iconPath, file))).toBe(true)
    })
  })

  test('static files are persistent after 1st build', async () => {
    await new Builder(nuxt).build()

    expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/Static files enabled and exists, wont retrieve new favicons/))
  })

  test('icons are included in head', async () => {
    const window = await nuxt.renderAndGetWindow(url('/'))

    const head = window.document.head.innerHTML
    expect(head).toMatch('<meta data-n-head="true" name="msapplication-TileColor" content="')
    expect(head).toMatch('<link data-n-head="true" rel="shortcut icon" href="/_favicons/favicon.ico">')

    const body = window.document.body.innerHTML
    expect(body).toContain('RFG Icon Test')
  })

  test('if forced the static files will be retrieved anyway', async () => {
    nuxt.options['rfg-icon'].force = true

    await new Builder(nuxt).build()

    expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/Static files exists but force is enabled/))
    expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/Retrieving favicons from realfavicongenerator api/))
    expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/Finished saving favicons to static folder/))
  })
})
