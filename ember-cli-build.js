'use strict';

const EmberAddon = require('ember-cli/lib/broccoli/ember-addon');

module.exports = function(defaults) {
  let app = new EmberAddon(defaults, {
    'ember-cli-babel': {
      includePolyfill: true
    },
    visualTest: {
      imageLogging: true,
      debugLogging: true,
      imgurClientId: '6331cc0a93af83c'
    },
    fingerprint: {
      exclude: [
        'docs/images/**'
      ]
    },
    snippetSearchPaths: ['app', 'tests/acceptance', 'addon-test-support']
  });

  /*
    This build file specifies the options for the dummy test app of this
    addon, located in `/tests/dummy`
    This build file does *not* influence how the addon or the app using it
    behave. You most likely want to be modifying `./index.js` or app's build file
  */

  return app.toTree();
};
