const path = require('path');
const fs = require('fs-extra');
const pixelmatch = require('pixelmatch');
const HeadlessChrome = require('simple-headless-chrome');
const request = require('request-promise-native');
const os = require('os');

/* eslint-disable node/no-extraneous-require */
const bodyParser = require('body-parser');
const { PNG } = require('pngjs');
const commands = require('./lib/commands');
/* eslint-enable node/no-extraneous-require */

const IMAGE_SIZE_ERROR = 'Image sizes do not match.';

module.exports = {
  name: require('./package').name,

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
    noSandbox: false,
    chromeFlags: [],
  },

  included(app) {
    this._super.included.apply(this, ...arguments);
    this._ensureThisImport();

    let options = { ...this.visualTest, ...app.options.visualTest };
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
      type: 'test',
    });
  },

  async _getBrowser() {
    if (this.browser) {
      return this.browser;
    }

    let options = this.visualTest;

    // ensure only strings are used as flags
    let flags = options.chromeFlags.filter(flag => typeof flag === 'string' && flag);
    if (!flags.includes('--enable-logging')) {
      flags.push('--enable-logging');
    }

    let { noSandbox } = options;
    if (process.env.TRAVIS || process.env.CIRCLECI) {
      noSandbox = true;
    }

    this.browser = new HeadlessChrome({
      headless: true,
      chrome: {
        flags,
        port: options.port,
        userDataDir: null,
        noSandbox,
      },
      deviceMetrics: {
        width: options.windowWidth,
        height: options.windowHeight,
      },
      browser: {
        browserLog: options.debugLogging,
      },
    });

    // This is started while the app is building, so we can assume this will be ready
    this._debugLog('Starting chrome instance...');
    await this.browser.init();
    this._debugLog(`Chrome instance initialized with port=${this.browser.port}`);

    return this.browser;
  },

  async _getBrowserTab() {
    const browser = await this._getBrowser();
    const tab = await browser.newTab({ privateTab: false });

    tab.onConsole(options => {
      let logValue = options.map(item => item.value).join(' ');
      this._debugLog(`Browser log: ${logValue}`);
    });

    return tab;
  },

  _imageLog(str) {
    if (this.visualTest.imageLogging) {
      log(str);
    }
  },

  _debugLog(str) {
    if (this.visualTest.debugLogging) {
      log(str);
    }
  },

  async _makeScreenshots(url, fileName, { selector, fullPage, delayMs }) {
    let options = this.visualTest;
    let tab;

    try {
      tab = await this._getBrowserTab();
    } catch (e) {
      logError('Error when launching browser!');
      logError(e);
      return { newBaseline: false, newScreenshotUrl: null, chromeError: true };
    }

    await tab.goTo(url);

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
      await tab.close();
    } catch (e) {
      logError('Error closing a tab...');
      logError(e);
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

    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async function (resolve, reject) {
      let baseImg = fs.createReadStream(baselineImgPath).pipe(new PNG()).on('parsed', doneReading);
      let tmpImg = fs.createReadStream(imgPath).pipe(new PNG()).on('parsed', doneReading);
      let filesRead = 0;

      async function doneReading() {
        if (++filesRead < 2) {
          return;
        }

        const diff = new PNG({ width: baseImg.width, height: baseImg.height });
        try {
          const errorPixelCount = pixelmatch(baseImg.data, tmpImg.data, diff.data, baseImg.width, baseImg.height, {
            threshold: options.imageMatchThreshold,
            includeAA: options.includeAA,
          });

          if (errorPixelCount <= options.imageMatchAllowedFailures) {
            return resolve();
          }

          let diffPath = path.join(options.imageDiffDirectory, fileName);

          await fs.outputFile(diffPath, PNG.sync.write(diff));

          Promise.all([_this._tryUploadToImgur(imgPath), _this._tryUploadToImgur(diffPath)])
            .then(([urlTmp, urlDiff]) => {
              reject({
                errorPixelCount,
                allowedErrorPixelCount: options.imageMatchAllowedFailures,
                diffPath: urlDiff || diffPath,
                tmpPath: urlTmp || imgPath,
              });
            })
            .catch(reject);
        } catch (e) {
          if (e.message !== IMAGE_SIZE_ERROR) console.error(e);
          reject({
            errorPixelCount: Math.abs((baseImg.data.length - tmpImg.data.length) / 4),
            allowedErrorPixelCount: options.imageMatchAllowedFailures,
            diffPath: null,
            tmpPath: imgPath,
          });
        }
      }
    });
  },

  async _tryUploadToImgur(imagePath) {
    let imgurClientID = this.visualTest.imgurClientId;

    if (!imgurClientID) {
      return Promise.resolve(null);
    }

    return await request
      .post('https://api.imgur.com/3/image', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Client-ID ${imgurClientID}`,
        },
        json: {
          type: 'base64',
          image: await fs.readFile(imagePath, { encoding: 'base64' }),
        },
      })
      .then(body => {
        return body.data.link;
      })
      .catch(error => {
        logError('Error sending data to imgur...');
        logError(error);
      });
  },

  middleware(app) {
    app.use(
      bodyParser.urlencoded({
        limit: '50mb',
        extended: true,
        parameterLimit: 50000,
      }),
    );
    app.use(
      bodyParser.json({
        limit: '50mb',
      }),
    );

    app.post('/visual-test/make-screenshot', (req, res) => {
      let { url } = req.body;
      let fileName = this._getFileName(req.body.name);
      let { selector } = req.body;
      let fullPage = req.body.fullPage || false;
      let delayMs = req.body.delayMs ? parseInt(req.body.delayMs) : 100;

      if (fullPage === 'true') {
        fullPage = true;
      }
      if (fullPage === 'false') {
        fullPage = false;
      }

      let data = {};
      this._makeScreenshots(url, fileName, { selector, fullPage, delayMs })
        .then(({ newBaseline, newScreenshotUrl }) => {
          data.newScreenshotUrl = newScreenshotUrl;
          data.newBaseline = newBaseline;

          return this._compareImages(fileName);
        })
        .then(() => {
          data.status = 'SUCCESS';
          res.send(data);
        })
        .catch(reason => {
          let diffPath = reason ? reason.diffPath : null;
          let tmpPath = reason ? reason.tmpPath : null;
          let errorPixelCount = reason ? reason.errorPixelCount : null;

          data.status = 'ERROR';
          data.diffPath = diffPath;
          data.fullDiffPath = diffPath ? path.join(__dirname, diffPath) : null;

          if (reason.diffPath === null) {
            data.error = `Image sizes do not match ${errorPixelCount} pixels differ - img: ${tmpPath}`;
          } else {
            data.error = `${errorPixelCount} pixels differ - diff: ${diffPath}, img: ${tmpPath}`;
          }
          res.send(data);
        });
    });
  },

  testemMiddleware(app) {
    this.middleware(app);
  },

  serverMiddleware(options) {
    this.app = options.app;
    this.middleware(options.app);
  },

  includedCommands() {
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
      let { os } = options;

      const filePath = path.parse(fileName);

      filePath.name = `${os}-${filePath.name}`;
      delete filePath.base;

      return path.format(filePath);
    }
    return fileName;
  },

  isDevelopingAddon() {
    return false;
  },
};

function log() {
  // eslint-disable-next-line no-console
  console.log(...arguments);
}

function logError() {
  // eslint-disable-next-line no-console
  console.error(...arguments);
}
