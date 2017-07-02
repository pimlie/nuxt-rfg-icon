# RealFaviconGenerator Favicon's
[![npm](https://img.shields.io/npm/dt/@nuxtjs/rfg-icon.svg?style=flat-square)](https://www.npmjs.com/package/nuxtjs-rfg-icon)
[![npm (scoped with tag)](https://img.shields.io/npm/v/@nuxtjs/rfg-icon/latest.svg?style=flat-square)](https://www.npmjs.com/package/nuxtjs-rfg-icon)

> Automatically generates favicons and app icons with different sizes using [rfg-api](https://github.com/RealFaviconGenerator/rfg-api).

- This module adds link and meta tags for the appropiate favicon's to `head`
- The generated manifest.json is added to `@nuxtjs/manifest`, so should not overwrite existing properties

## Setup
- Install from npm `npm install --save nuxtjs-rfg-icon` or use yarn
- Add `nuxtjs-rfg-icon` to `modules` section of `nuxt.config.js` *before* the line `@nuxtjs/manifest`

```js
  modules: [
    // Simple usage
   'nuxtjs-rfg-icon',
   '@nuxtjs/manifest', 
   
   // With options
   ['nuxtjs-rfg-icon', { masterPicture: '' }],

   // or use global options
   'rfg-icon': {
      masterPicture: 'static/icon.png',
   }
  ]
````
- Create `static/icon.png`. Recommended to be square png and >= `512x512px`

## Options

### masterPicture
- Default: `[srcDir]/static/icon.png`

### other options

See [realfavicongenerator.net](https://realfavicongenerator.net/) for a full list of options. Easiest is uploading your image on the website and choose your settings. Next click on `Generate favicons`, click on the tab `Node CLI` and copy the contents of the `faviconDescription.json` file to your `nuxt.config.js`

