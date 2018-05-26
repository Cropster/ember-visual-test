'use strict';

const commands = require('./lib/commands');
const path = require('path');
const fs = require('fs-extra');
const bodyParser = require('body-parser');
const { PNG } = require('pngjs');
const pixelmatch = require('pixelmatch');
const RSVP = require('rsvp');
const HeadlessChrome = require('simple-headless-chrome');
const request = require('request-promise-native');
const os = require('os');

module.exports = {
  name: 'ember-visual-test',

  // The base settings
  // This can be overwritten
  visualTest: {
    imageDirectory: 'visual-test-output/baseline',
    imageDiffDirectory: 'visual-test-output/diff',
    imageTmpDirectory: 'visual-test-output/tmp',
    forceBuildVisualTestImages: false,
    imageMatchAllowedFailures: 0,
    imageMatchThreshold: 0.3,
    imageLogging: false,
    debugLogging: false,
    imgurClientId: null,
    includeAA: true,
    groupByOs: true,
    chromePort: 0,
    windowWidth: 1024,
    windowHeight: 768,
    noSandbox: false
  },

  included(app) {
    this._super.included(app);
    this._ensureThisImport();

    let options = Object.assign({}, this.visualTest, app.options.visualTest);
    this._debugLog('Setting up ember-visual-test...');

    options.forceBuildVisualTestImages = !!process.env.FORCE_BUILD_VISUAL_TEST_IMAGES;
    this.visualTest = options;

    let osType = os.type().toLowerCase();
    switch (osType) {
      case 'windows_nt':
        osType = 'win';
        break;
      case 'darwin':
        osType = 'mac';
        break;
    }
    options.os = osType;

    this.import('vendor/visual-test.css', {
      type: 'test'
    });
  },

  _launchBrowser: async function() {
    let options = this.visualTest;

    let flags = [
      '--enable-logging'
    ];

    let noSandbox = options.noSandbox;
    if (process.env.TRAVIS || process.env.CIRCLECI) {
      noSandbox = true;
    }

    const browser = new HeadlessChrome({
      headless: true,
      chrome: {
        flags,
        port: options.port,
        userDataDir: null,
        noSandbox
      },
      deviceMetrics: {
        width: options.windowWidth,
        height: options.windowHeight,
      },
      browser: {
        browserLog: options.debugLogging
      }
    });

    // This is started while the app is building, so we can assume this will be ready
    this._debugLog('Starting chrome instance...');
    await browser.init();
    this._debugLog(`Chrome instance initialized with port=${browser.port}`);

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

  _makeScreenshots: async function(url, fileName, { selector, fullPage, delayMs }) {
    let options = this.visualTest;
    let browser;

    try {
      browser = await this._launchBrowser();
    } catch (e) {
      console.error('Error when launching browser!');
      console.error(e);
      return { newBaseline: false, newScreenshotUrl: null, chromeError: true };
    }
    let tab = await browser.newTab({ privateTab: false });

    await tab.goTo(url);

    tab.onConsole((options) => {
      let logValue = options.map((item) => item.value).join(' ');
      this._debugLog(`Browser log: ${logValue}`);
    });

    // This is inserted into the DOM by the capture helper when everything is ready
    await tab.waitForSelectorToLoad('#visual-test-has-loaded', { interval: 100 });

    let fullPath = `${path.join(options.imageDirectory, fileName)}.png`;

    let screenshotOptions = { selector, fullPage };

    // To avoid problems...
    await tab.wait(delayMs);

    // only if the file does not exist, or if we force to save, do we write the actual images themselves
    let newScreenshotUrl = null;
    let newBaseline = options.forceBuildVisualTestImages || !fs.existsSync(fullPath);
    if (newBaseline) {
      this._imageLog(`Making base screenshot ${fileName}`);

      await fs.outputFile(fullPath, await tab.getScreenshot(screenshotOptions, true));

      newScreenshotUrl = await this._tryUploadToImgur(fullPath);
      if (newScreenshotUrl) {
        this._imageLog(`New screenshot can be found under ${newScreenshotUrl}`);
      }
    }

    // Always make the tmp screenshot
    let fullTmpPath = `${path.join(options.imageTmpDirectory, fileName)}.png`;
    this._imageLog(`Making comparison screenshot ${fileName}`);
    await fs.outputFile(fullTmpPath, await tab.getScreenshot(screenshotOptions, true));

    try {
      await browser.close();
    } catch (e) {
      console.error('Error closing the browser...');
      console.error(e);
    }
    return { newBaseline, newScreenshotUrl };
  },

  _compareImages(fileName) {
    let options = this.visualTest;
    let _this = this;

    if (!fileName.includes('.png')) {
      fileName = `${fileName}.png`;
    }

    let baselineImgPath = path.join(options.imageDirectory, fileName);
    let imgPath = path.join(options.imageTmpDirectory, fileName);

    return new RSVP.Promise(async function(resolve, reject) {
      let baseImg = fs.createReadStream(baselineImgPath).pipe(new PNG()).on('parsed', doneReading);
      let tmpImg = fs.createReadStream(imgPath).pipe(new PNG()).on('parsed', doneReading);
      let filesRead = 0;

      async function doneReading() {
        if (++filesRead < 2) {
          return;
        }

        const diff = new PNG({ width: baseImg.width, height: baseImg.height });
        const errorPixelCount = pixelmatch(baseImg.data, tmpImg.data, diff.data, baseImg.width, baseImg.height, {
          threshold: options.imageMatchThreshold,
          includeAA: options.includeAA
        });

        if (errorPixelCount <= options.imageMatchAllowedFailures) {
          return resolve();
        }

        let diffPath = path.join(options.imageDiffDirectory, fileName);

        await fs.outputFile(diffPath, PNG.sync.write(diff));

        RSVP.all([
          _this._tryUploadToImgur(imgPath),
          _this._tryUploadToImgur(diffPath)
        ]).then(([urlTmp, urlDiff]) => {
          reject({
            errorPixelCount,
            allowedErrorPixelCount: options.imageMatchAllowedFailures,
            diffPath: urlDiff || diffPath,
            tmpPath: urlTmp || imgPath
          });
        }).catch(reject);
      }
    });
  },

  _tryUploadToImgur: async function(imagePath) {
    let imgurClientID = this.visualTest.imgurClientId;

    if (!imgurClientID) {
      return RSVP.resolve(null);
    }

    return await request.post(
      'https://api.imgur.com/3/image', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Client-ID ' + imgurClientID
        },
        json: {
          type: 'base64',
          image: await fs.readFile(imagePath, { encoding: 'base64' })
        }
      }).then((body) => {
        return body.data.link;
      }).catch((error) => {
        console.error('Error sending data to imgur...');
        console.error(error);
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
      let fileName = this._getFileName(req.body.name);
      let selector = req.body.selector;
      let fullPage = req.body.fullPage || false;
      let delayMs = req.body.delayMs ? parseInt(req.body.delayMs) : 100;

      if (fullPage === 'true') {
        fullPage = true;
      }
      if (fullPage === 'false') {
        fullPage = false;
      }

      let data = {};
      this._makeScreenshots(url, fileName, { selector, fullPage, delayMs }).then(({ newBaseline, newScreenshotUrl }) => {
        data.newScreenshotUrl = newScreenshotUrl;
        data.newBaseline = newBaseline;

        return this._compareImages(fileName);
      }).then(() => {
        data.status = 'SUCCESS';
        res.send(data);
      }).catch((reason) => {
        let diffPath = reason ? reason.diffPath : null;
        let tmpPath = reason ? reason.tmpPath : null;
        let errorPixelCount = reason ? reason.errorPixelCount : null;

        data.status = 'ERROR';
        data.diffPath = diffPath;
        data.fullDiffPath = path.join(__dirname, diffPath);
        data.error = `${errorPixelCount} pixels differ - diff: ${diffPath}, img: ${tmpPath}`;

        res.send(data);
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

  _getFileName(fileName) {
    let options = this.visualTest;

    if (options.groupByOs) {
      let os = options.os;

      const filePath = path.parse(fileName);

      filePath.name = `${os}-${filePath.name}`;
      delete filePath.base;

      return path.format(filePath);
    }
    return fileName;
  },

  isDevelopingAddon() {
    return false;
  }
};
