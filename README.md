# RealFaviconGenerator Favicons for NUXT
<a href="https://travis-ci.org/pimlie/nuxt-rfg-icon"><img src="https://api.travis-ci.org/pimlie/nuxt-rfg-icon.svg" alt="Build Status"></a>
[![npm](https://img.shields.io/npm/dt/nuxt-rfg-icon.svg?style=flat-square)](https://www.npmjs.com/package/nuxt-rfg-icon)
[![npm (scoped with tag)](https://img.shields.io/npm/v/nuxt-rfg-icon/latest.svg?style=flat-square)](https://www.npmjs.com/package/nuxt-rfg-icon)

> Automatically generates favicons and app icons with different sizes using [rfg-api](https://github.com/RealFaviconGenerator/rfg-api).

- This module adds link and meta tags for the appropiate favicons to `head`
- The generated manifest.json is added to `@nuxtjs/manifest`, so should not overwrite existing properties

## Setup
> nuxt-rfg-icon will by default not run in dev mode, set NODE_ENV=production to override

- Install from npm `npm install --save nuxt-rfg-icon` or use yarn
- Add `nuxt-rfg-icon` to `modules` section of `nuxt.config.js` *before* the line `@nuxtjs/manifest`

```js
  modules: [
    // Simple usage
   'nuxt-rfg-icon',
   '@nuxtjs/manifest', 
   
   // With options
   ['nuxt-rfg-icon', { masterPicture: '' }],

   // or use global options
   'rfg-icon': {
      static: true,
      staticPath: '/_favicons/',
      masterPicture: 'static/icon.png',
      rfg: <faviconDescription.json from realfavicongenerator.net>
   }
  ]
````
- Create `static/icon.png`. Recommended to be square png and >= `512x512px`

## Options

### `masterPicture`
- Default: `[srcDir]/static/icon.png`

### `static`
- Default: `true`

If false, icon files will be added as webpack assets during each build. There is no intermediate saving. If true, the headers to be added are saved as `headers.json`. If headers.json and manifest.json exists while building, the existing files are used and not retrieved from the RealFaviconGenerator api unless `force` is ticked

### `staticPath`
- Default: `icons`

The static path where the favicons will be saved if `static` is enabled`

### `force`
- Default: `false`

If true and static files is enabled, force to retrieve new favicons from the RealFaviconGenerator api even when `headers.json` and `manifest.json` exist

### `rfg`
The faviconDescription configuration from [realfavicongenerator.net](https://realfavicongenerator.net/). Upload your image on the website and choose your settings. Next click on `Generate favicons`, click on the tab `Node CLI` and copy the contents of the `faviconDescription.json` file to your `nuxt.config.js`

- Default
```js
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
```
