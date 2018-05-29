# ember-visual-test

Test screens in acceptance/integration tests for visual changes over time.

[![Ember Observer Score](https://emberobserver.com/badges/ember-visual-test.svg)](https://emberobserver.com/addons/ember-visual-test)
[![Build Status](https://travis-ci.org/Cropster/ember-visual-test.svg?branch=master)](https://travis-ci.org/Cropster/ember-visual-test)
[![npm version](https://badge.fury.io/js/ember-visual-test.svg)](https://badge.fury.io/js/ember-visual-test)

## API docs

### capture
 
The capture function takes three parameters: `capture(assert, identifier, options)`

* `assert`: The assert function. This assumes you are using qunit.
* `identifier`: A unique string to identify this capture. This will be the file name of the generated images, and has to be unique across your whole application. If it contains '/', subdirectories will be created so you can group baseline images. 
* `options`: An optional object with options. The following options are allowed:
  * `selector`: An optional selector to screenshot. If not specified, the whole page will be captured.
  * `fullPage`: If a full page screenshot should be made, or just the browsers viewport. Defaults to `true`.
  * `delayMs`: Delay (in milliseconds) before taking the screenshot. Useful when you need to wait for CSS transitions, etc. Defaults to `100`.
  
This works in both acceptance tests as well as in integration tests.


### Build configuration

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
  }
});
```

Also note that for the capture helper to work, you'll need to include the babel polyfill, at least in the test environment:

```js
'ember-cli-babel': {
  includePolyfill: true
}
```


### CLI

There are also two CLI commands to use: 

* `ember visual-test:clean`: Clean the diff/tmp folders
* `ember visual-test:reset`: Manually clean all folders & create new baseline images
