'use strict';

const path = require('path');
const utils = require('../utils');
const { deleteImagesInFolder } = utils;

module.exports = {
  name: 'visual-test:clean',
  aliases: ['vtc'],
  description: 'Clean the tmp/diff folders',
  works: 'insideProject',
  availableOptions: [
    {
      name: 'diff-directory',
      type: String,
      alias: 'diff',
      default: 'visual-test-output/diff',
      description: 'The directory where the diff images are saved'
    },
    {
      name: 'tmp-directory',
      type: String,
      alias: 'temp',
      default: 'visual-test-output/tmp',
      description: 'The directory where the tmp images are saved'
    }
  ],
  run(options) {
    let root = this.project.root;

    if (options.tmpDirectory) {
      this.ui.writeInfoLine(`Cleaning ${options.tmpDirectory} folder...`);
      deleteImagesInFolder(path.join(root, options.tmpDirectory));
    }

    if (options.diffDirectory) {
      this.ui.writeInfoLine(`Cleaning ${options.diffDirectory} folder...`);
      deleteImagesInFolder(path.join(root, options.diffDirectory));
    }
  }
};

