'use strict';

const commands = require('./lib/commands');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const PNG = require('pngjs').PNG;
const pixelmatch = require('pixelmatch');
const RSVP = require('rsvp');
const HeadlessChrome = require('simple-headless-chrome');
const request = require('request');
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
    groupByOs: true
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
    if (newOptions.imgurClientId) {
      options.imgurClientId = newOptions.imgurClientId;
    }
    if (newOptions.groupByOs) {
      options.groupByOs = newOptions.groupByOs;
    }

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
    let browser;
    try {
      browser = await this._launchBrowser();
    } catch(e) {
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

    let fullPath = path.join(options.imageDirectory, fileName);

    let screenshotOptions = { selector, fullPage };

    // To avoid problems...
    await tab.wait(100);

    // only if the file does not exist, or if we force to save, do we write the actual images themselves
    let newScreenshotUrl = null;
    let newBaseline = options.forceBuildVisualTestImages || !fs.existsSync(`${fullPath}.png`);
    if (newBaseline) {
      this._imageLog(`Making base screenshot ${fileName}`);
      await tab.saveScreenshot(fullPath, screenshotOptions);

      newScreenshotUrl = await this._tryUploadToImgur(`${fullPath}.png`);
      if (newScreenshotUrl) {
        this._imageLog(`New screenshot can be found under ${newScreenshotUrl}`);
      }
    }

    // Always make the tmp screenshot
    let fullTmpPath = path.join(options.imageTmpDirectory, fileName);
    this._imageLog(`Making comparison screenshot ${fileName}`);
    await tab.saveScreenshot(fullTmpPath, screenshotOptions);

    try {
      await tab.close();
      await browser.close();
    } catch(e) {
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

    let baselineImgPath = path.join(options.imageDirectory, '/', fileName);
    let imgPath = path.join(options.imageTmpDirectory, '/', fileName);

    return new RSVP.Promise(function(resolve, reject) {
      let img1 = fs.createReadStream(baselineImgPath).pipe(new PNG()).on('parsed', doneReading);
      let img2 = fs.createReadStream(imgPath).pipe(new PNG()).on('parsed', doneReading);
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

        let diffPath = path.join(options.imageDiffDirectory, '/', fileName);
        diff.pack().pipe(fs.createWriteStream(diffPath)).on('close', () => {
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

        });
      }
    });
  },

  _tryUploadToImgur: async function(imagePath) {
    let imgurClientID = this.visualTest.imgurClientId;

    if (!imgurClientID) {
      return RSVP.resolve(null);
    }

    let fileBase64 = await new RSVP.Promise((resolve, reject) => {
      fs.readFile(imagePath, { encoding: 'base64' }, function(err, data) {
        if (err) {
          return reject(err);
        }
        resolve(data);
      });
    });

    return await new RSVP.Promise((resolve, reject) => {
      let data = {
        type: 'base64',
        image: fileBase64
      };

      request.post(
        'https://api.imgur.com/3/image',
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Client-ID ' + imgurClientID
          },
          json: data
        },
        (error, response, body) => {
          if (!error && response.statusCode === 200) {
            resolve(body.data.link);
          } else {
            console.error('Error sending data to imgur...');
            console.error(body);
            resolve(null); // We still want to resolve, as that is no reason to let the test error out
          }
        }
      );
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

      if (fullPage === 'true') {
        fullPage = true;
      }
      if (fullPage === 'false') {
        fullPage = false;
      }

      let data = {};
      this._makeScreenshots(url, fileName, { selector, fullPage }).then(({ newBaseline, newScreenshotUrl }) => {
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
      return `${os}-${fileName}`;
    }
    return fileName;
  },

  isDevelopingAddon() {
    return false;
  }

};
