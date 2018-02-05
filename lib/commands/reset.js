'use strict';

const utils = require('../utils');
const { runCommand, deleteImagesInFolder } = utils;
const RSVP = require('rsvp');
const path = require('path');

module.exports = {
  name: 'visual-test:reset',
  aliases: ['vtr'],
  description: 'Reset the images and make a new snapshot for each one',
  works: 'insideProject',
  availableOptions: [
    {
      name: 'clear-tmp',
      type: Boolean,
      alias: 'ct',
      default: true,
      description: 'If the tmp/diff folders should be cleared first'
    },
    {
      name: 'clear-all',
      type: Boolean,
      alias: 'ca',
      default: true,
      description: 'If the actual images should also be cleared first.'
    },
    {
      name: 'image-directory',
      type: String,
      alias: 'id',
      default: 'visual-test-output',
      description: 'The directory where the images are saved'
    }
  ],
  run(options) {
    let promise = options.clearTmp ? runCommand(this, 'visual-test:clean') : RSVP.Promise.resolve();

    return new RSVP.Promise((resolve, reject) => {
      promise.then(() => {
        if (options.clearAll) {
          let root = this.project.root;
          this.ui.writeInfoLine(`Cleaning ${options.imageDirectory} folder...`);
          deleteImagesInFolder(path.join(root, options.imageDirectory));
        }

        this.ui.writeInfoLine(`Running tests while forcing re-build of images...`);
        process.env.FORCE_BUILD_VISUAL_TEST_IMAGES = true;
        return runCommand(this, 'test');
      }).then(resolve).catch(reject);
    });
  }
};

