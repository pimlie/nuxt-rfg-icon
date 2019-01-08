const { resolve } = require('path')

module.exports = {
  dev: false,
  rootDir: resolve(__dirname, '../..'),
  srcDir: __dirname,
  modules: [
    '@@',
    '@nuxtjs/manifest'
  ],
  'rfg-icon': {}
}
