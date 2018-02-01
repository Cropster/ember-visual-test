/* eslint-env node */
'use strict';

const commands = require('./lib/commands');
const path = require('path');
const Funnel = require('broccoli-funnel');
const MergeTrees = require('broccoli-merge-trees');
const fs = require('fs');
const bodyParser = require('body-parser');
const PNG = require('pngjs').PNG;
const pixelmatch = require('pixelmatch');
const RSVP = require('rsvp');

function saveImage(imgDataUrl, fileName, options) {
  imgDataUrl = imgDataUrl.replace(/^data:image\/\w+;base64,/, '');
  let buff = new Buffer(imgDataUrl, 'base64');

  if (!fileName.includes('.png')) {
    fileName = `${fileName}.png`;
  }

  let fullPath = path.join(options.imageDirectory, '/', fileName);

  // only if the file does not exist, or if we force to save, do we write the actual images themselves
  if (options.forceBuildVisualTestImages || !fs.existsSync(fullPath)) {
    fs.writeFileSync(fullPath, buff);
  }

  // Always write the tmp ones
  let tmpPath = path.join(options.imageTmpDirectory, '/', fileName);
  fs.writeFileSync(tmpPath, buff);

  return fullPath;
}

function compareImages(fileName, options) {
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

}

module.exports = {
  name: 'ember-visual-test',

  imageDirectory: 'visual-test-output',
  imageDiffDirectory: 'visual-test-output/diff',
  imageTmpDirectory: 'visual-test-output/tmp',
  forceBuildVisualTestImages: false,
  imageMatchAllowedFailures: 0,
  imageMatchThreshold: 0.75,

  included(app) {
    this._super.included(app);
    this._ensureThisImport();

    let options = app.options.visualTest || {};

    if (options.imageDirectory) {
      this.imageDirectory = options.imageDirectory;
    }
    if (options.imageDiffDirectory) {
      this.imageDiffDirectory = options.imageDiffDirectory;
    }
    if (options.imageTmpDirectory) {
      this.imageTmpDirectory = options.imageTmpDirectory;
    }
    if (options.imageMatchAllowedFailures) {
      this.imageMatchAllowedFailures = options.imageMatchAllowedFailures;
    }
    if (options.imageMatchThreshold) {
      this.imageMatchThreshold = options.imageMatchThreshold;
    }

    this.forceBuildVisualTestImages = !!process.env.FORCE_BUILD_VISUAL_TEST_IMAGES;

    this.import('vendor/html2canvas/html2canvas.js', {
      type: 'test'
    });
  },

  treeForVendor(vendorTree) {
    let trees = [];
    if (vendorTree) {
      trees.push(vendorTree);
    }

    let html2canvasPath = path.join(path.dirname(require.resolve('html2canvas')), '..');

    let html2CanvasTree = new Funnel(html2canvasPath, {
      include: ['html2canvas.js'],
      destDir: 'html2canvas'
    });

    trees.push(html2CanvasTree);

    return new MergeTrees(trees, { overwrite: true });
  },

  middleware(app, options) {
    app.use(bodyParser.urlencoded({
      limit: '50mb',
      extended: true,
      parameterLimit: 50000
    }));
    app.use(bodyParser.json({
      limit: '50mb'
    }));

    app.post('/visual-test/image', function(req, res) {
      let imageDataUrl = req.body.image;
      let fileName = req.body.name;

      saveImage(imageDataUrl, fileName, options);

      compareImages(fileName, options).then(() => {
        res.send({ status: 'SUCCESS' });
      }).catch(({ diffPath, errorPixelCount, }) => {
        res.send({
          status: 'ERROR',
          diffPath,
          fullDiffPath: path.join(__dirname, diffPath),
          error: `${errorPixelCount} pixels differ - see ${diffPath}`
        });
      });
    });

  },

  testemMiddleware: function(app) {
    this.middleware(app, {
      root: this.project.root,
      imageDirectory: this.imageDirectory,
      imageDiffDirectory: this.imageDiffDirectory,
      imageTmpDirectory: this.imageTmpDirectory,
      forceBuildVisualTestImages: this.forceBuildVisualTestImages,
      targetBrowsers: this.targetBrowsers,
      imageMatchAllowedFailures: this.imageMatchAllowedFailures,
      imageMatchThreshold: this.imageMatchThreshold
    });
  },

  serverMiddleware: function(options) {
    this.app = options.app;
    this.middleware(options.app, {
      root: this.project.root,
      imageDirectory: this.imageDirectory.replace(/\/$/, ''),
      imageDiffDirectory: this.imageDiffDirectory.replace(/\/$/, ''),
      imageTmpDirectory: this.imageTmpDirectory.replace(/\/$/, ''),
      forceBuildVisualTestImages: this.forceBuildVisualTestImages,
      targetBrowsers: this.targetBrowsers,
      imageMatchAllowedFailures: this.imageMatchAllowedFailures,
      imageMatchThreshold: this.imageMatchThreshold
    });
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
