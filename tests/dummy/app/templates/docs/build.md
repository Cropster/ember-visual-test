# Build configuration

There are a few configuration options for you `ember-cli-build.js`, with the default values:

```js
let app = new EmberAddon(defaults, {
  visualTest: {
   imageMatchAllowedFailures: 0, // How many failed pixels result in an error
   imageMatchThreshold: 0.3, //  This is a config option for pixelmatch
   imageLogging: false, // If generated images should be logged to the console
   debugLogging: false, // If console messages from headless chrome should be printed in the console
   imgurClientId: null, // If set to a client ID of imgur, images will be uploaded there as well, to debug images e.g. on CI
   groupByOs: true, // If one set of images should be created/compared by OS
   noSandbox: false // This may need to be set to true depending on your environment e.g. in CI 
   defaultDelayMs: 100 // Default delay between loading the page and taking the screenshot in milliseconds.
  }
});
```

Also note that for the capture helper to work, you'll need to include the babel polyfill, at least in the test environment:

```js
'ember-cli-babel': {
  includePolyfill: true
}
```
