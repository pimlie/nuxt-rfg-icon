import { existsSync } from 'fs'
import { resolve } from 'path'
import { Nuxt, Builder } from 'nuxt'
import consola from 'consola'

import { getPort, cleanup } from './utils'

jest.mock('consola')
global.consola = consola
consola.withScope.mockImplementation(() => consola)

let port
const url = path => `http://localhost:${port}${path}`

describe('rfg-icon module, static', () => {
  let nuxt
  let builder
  let buildDone
  const staticPath = resolve(__dirname, './fixture/static/')

  const iconDir = 'icons'
  const iconPath = resolve(staticPath, iconDir)
  const iconPathsToCleanup = [
    iconPath + '/*',
    resolve(staticPath, 'favicon.ico')
  ]

  beforeAll(async () => {
    await cleanup(iconPathsToCleanup)
    port = await getPort()

    const config = require('./fixture/nuxt.config')
    config['rfg-icon'] = {
      apiUrl: url('/rfg-api.response.json'),
      rfgApiMetaResponse: require(resolve(config.srcDir, 'rfg-api.response.json')),
      rfgApiPackageResponse: require(resolve(config.srcDir, 'rfg-api.package.json')),
      staticPath: iconDir
    }

    nuxt = new Nuxt(config)

    buildDone = jest.fn()
    nuxt.hook('build:done', buildDone)

    builder = await new Builder(nuxt).build()
    await nuxt.server.listen(port, 'localhost')
  })

  afterAll(async () => {
    await nuxt.close()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  test('check build sucessfull', () => {
    expect(builder._buildStatus).toBe(2)
    expect(buildDone).toHaveBeenCalledTimes(1)
    expect(consola.error).not.toHaveBeenCalled()
    expect(consola.warn).not.toHaveBeenCalled()
    expect(consola.info).toHaveBeenCalledWith(expect.stringMatching(/Retrieving favicons from realfavicongenerator api/))
    expect(consola.success).toHaveBeenCalledWith(expect.stringMatching(/Finished saving favicons to static folder/))
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

    expect(consola.info).toHaveBeenCalledWith(expect.stringMatching(/Static files enabled and exists, wont retrieve new favicons/))
  })

  test('icons are included in head', async () => {
    const window = await nuxt.renderAndGetWindow(url('/'))

    const head = window.document.head.innerHTML
    expect(head).toMatch('<meta data-n-head="ssr" name="msapplication-TileColor" content="')
    expect(head).toMatch('<link data-n-head="ssr" rel="shortcut icon" href="/_favicons/favicon.ico">')

    const body = window.document.body.innerHTML
    expect(body).toContain('RFG Icon Test')
  })

  test('if forced the static files will be retrieved anyway', async () => {
    nuxt.options['rfg-icon'].force = true

    await new Builder(nuxt).build()

    expect(consola.warn).toHaveBeenCalledWith(expect.stringMatching(/Static files exists but force is enabled/))
    expect(consola.info).toHaveBeenCalledWith(expect.stringMatching(/Retrieving favicons from realfavicongenerator api/))
    expect(consola.success).toHaveBeenCalledWith(expect.stringMatching(/Finished saving favicons to static folder/))
  })
})
