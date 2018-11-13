'use strict';

const utils = require('../utils');
const { runCommand, deleteImagesInFolder } = utils;
const { resolve } = require('rsvp');
const path = require('path');
const fs = require('fs');

module.exports = {
  name: 'visual-test:approve',
  aliases: ['vtr'],
  description: 'Approve all changes - move changed images from tmp to baseline',
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
      name: 'image-directory',
      type: String,
      alias: 'id',
      default: 'visual-test-output/baseline',
      description: 'The directory where the images are saved'
    },
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
    this.ui.writeInfoLine(`Moving changed images to ${options.imageDirectory}...`);

    approveRecursively(options.diffDirectory, options.tmpDirectory, options.imageDirectory);

    return options.clearTmp ? runCommand(this, 'visual-test:clean') : resolve();
  }
};

function approveRecursively(directory, tmpDirectory, imageDirectory) {
  fs.readdirSync(directory).forEach(function(file) {
    let filePath = path.join(directory, file);
    let oldPath = path.join(tmpDirectory, file);
    let newPath = path.join(imageDirectory, file);

    if (fs.lstatSync(filePath).isDirectory()) {
      approveRecursively(filePath, oldPath, newPath);
    } else if (file.includes('.png')) {
      fs.renameSync(oldPath, newPath);
    }
  });
}
