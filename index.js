'use strict';

const commands = require('./lib/commands');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const PNG = require('pngjs').PNG;
const pixelmatch = require('pixelmatch');
const RSVP = require('rsvp');
const HeadlessChrome = require('simple-headless-chrome');

module.exports = {
  name: 'ember-visual-test',

  // The base settings
  // This can be overwritten
  visualTest: {
    imageDirectory: 'visual-test-output',
    imageDiffDirectory: 'visual-test-output/diff',
    imageTmpDirectory: 'visual-test-output/tmp',
    forceBuildVisualTestImages: false,
    imageMatchAllowedFailures: 0,
    imageMatchThreshold: 0.1,
    imageLogging: false,
    debugLogging: false
  },

  included(app) {
    this._super.included(app);
    this._ensureThisImport();

    let options = Object.assign({}, this.visualTest);
    let newOptions = app.options.visualTest || {};

    if (newOptions.imageDirectory) {
      options.imageDirectory = newOptions.imageDirectory;
    }
    if (newOptions.imageDiffDirectory) {
      options.imageDiffDirectory = newOptions.imageDiffDirectory;
    }
    if (newOptions.imageTmpDirectory) {
      options.imageTmpDirectory = newOptions.imageTmpDirectory;
    }
    if (newOptions.imageMatchAllowedFailures) {
      options.imageMatchAllowedFailures = newOptions.imageMatchAllowedFailures;
    }
    if (newOptions.imageMatchThreshold) {
      options.imageMatchThreshold = newOptions.imageMatchThreshold;
    }
    if (newOptions.imageLogging) {
      options.imageLogging = newOptions.imageLogging;
    }
    if (newOptions.debugLogging) {
      options.debugLogging = newOptions.debugLogging;
    }

    options.forceBuildVisualTestImages = !!process.env.FORCE_BUILD_VISUAL_TEST_IMAGES;
    this.visualTest = options;

    this._launchBrowser();

    this.import('vendor/visual-test.css', {
      type: 'test'
    });
  },

  _launchBrowser: async function() {
    let flags = [
      '--window-size=1440,900',
      '--disable-gpu',
    ];

    if (process.env.TRAVIS) {
      flags.push('--no-sandbox');
    }

    const browser = new HeadlessChrome({
      headless: true,
      chrome: {
        flags
      }
    });

    // This is started while the app is building, so we can assume this will be ready
    await browser.init();
    return browser;
  },

  _imageLog(str) {
    if (this.visualTest.imageLogging) {
      console.log(str);
    }
  },

  _debugLog(str) {
    if (this.visualTest.debugLogging) {
      console.log(str);
    }
  },

  _makeScreenshots: async function(url, fileName, { selector, fullPage }) {
    let options = this.visualTest;
    let browser = await this._launchBrowser();

    let tab = await browser.newTab({ privateTab: false });

    await tab.goTo(url);

    tab.onConsole((options) => {
      let logValue = options.map((item) => item.value).join(' ');
      this._debugLog(`Browser log: ${logValue}`);
    });

    // This is inserted into the DOM by the capture helper when everything is ready
    await tab.waitForSelectorToLoad('#visual-test-has-loaded', { interval: 100 });

    let fullPath = path.join(options.imageDirectory, fileName);

    let screenshotOptions = { selector, fullPage };

    // To avoid problems...
    await tab.wait(100);

    // only if the file does not exist, or if we force to save, do we write the actual images themselves
    if (options.forceBuildVisualTestImages || !fs.existsSync(`${fullPath}.png`)) {
      this._imageLog(`Making base screenshot ${fileName}`);
      await tab.saveScreenshot(fullPath, screenshotOptions);
    }

    // Always make the tmp screenshot
    let fullTmpPath = path.join(options.imageTmpDirectory, fileName);
    this._imageLog(`Making comparison screenshot ${fileName}`);
    await tab.saveScreenshot(fullTmpPath, screenshotOptions);

    await tab.close();
    await browser.close();
    return true;
  },

  _compareImages(fileName) {
    let options = this.visualTest;

    if (!fileName.includes('.png')) {
      fileName = `${fileName}.png`;
    }

    let img1Path = path.join(options.imageDirectory, '/', fileName);
    let img2Path = path.join(options.imageTmpDirectory, '/', fileName);

    return new RSVP.Promise(function(resolve, reject) {
      let img1 = fs.createReadStream(img1Path).pipe(new PNG()).on('parsed', doneReading);
      let img2 = fs.createReadStream(img2Path).pipe(new PNG()).on('parsed', doneReading);
      let filesRead = 0;

      function doneReading() {
        if (++filesRead < 2) {
          return;
        }
        let diff = new PNG({ width: img1.width, height: img1.height });

        let errorPixelCount = pixelmatch(img1.data, img2.data, diff.data, img1.width, img1.height, {
          threshold: options.imageMatchThreshold,
          includeAA: true
        });

        if (errorPixelCount <= options.imageMatchAllowedFailures) {
          return resolve();
        }

        let fullOutputPath = path.join(options.imageDiffDirectory, '/', fileName);
        diff.pack().pipe(fs.createWriteStream(fullOutputPath));

        reject({
          errorPixelCount,
          allowedErrorPixelCount: options.imageMatchAllowedFailures,
          diffPath: fullOutputPath
        });
      }
    });
  },

  middleware(app) {
    app.use(bodyParser.urlencoded({
      limit: '50mb',
      extended: true,
      parameterLimit: 50000
    }));
    app.use(bodyParser.json({
      limit: '50mb'
    }));

    app.post('/visual-test/make-screenshot', (req, res) => {
      let url = req.body.url;
      let fileName = req.body.name;
      let selector = req.body.selector;
      let fullPage = req.body.fullPage || false;

      if (fullPage === 'true') {
        fullPage = true;
      }
      if (fullPage === 'false') {
        fullPage = false;
      }

      this._makeScreenshots(url, fileName, { selector, fullPage }).then(() => {
        return this._compareImages(fileName);
      }).then(() => {
        res.send({ status: 'SUCCESS' });
      }).catch((reason) => {
        let diffPath = reason ? reason.diffPath : null;
        let errorPixelCount = reason ? reason.errorPixelCount : null;

        let error = {
          status: 'ERROR',
          diffPath,
          fullDiffPath: path.join(__dirname, diffPath),
          error: `${errorPixelCount} pixels differ - see ${diffPath}`
        };
        res.send(error);
      });
    });
  },

  testemMiddleware: function(app) {
    this.middleware(app);
  },

  serverMiddleware: function(options) {
    this.app = options.app;
    this.middleware(options.app);
  },

  includedCommands: function() {
    return commands;
  },

  _ensureThisImport() {
    if (!this.import) {
      this._findHost = function findHostShim() {
        let current = this;
        let app;
        do {
          app = current.app || app;
        } while (current.parent.parent && (current = current.parent));
        return app;
      };
      this.import = function importShim(asset, options) {
        let app = this._findHost();
        app.import(asset, options);
      };
    }
  },

  isDevelopingAddon() {
    return true;
  }

};
