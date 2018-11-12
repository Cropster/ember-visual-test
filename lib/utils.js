/* elsint-env node */
'use strict';

const lookupCommand = require('ember-cli/lib/cli/lookup-command');
const path = require('path');
const fs = require('fs');

function deleteImagesInFolder(filePath) {
  if (fs.existsSync(filePath)) {
    fs.readdirSync(filePath).forEach(function(file) {
      let curPath = path.join(filePath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        deleteImagesInFolder(curPath);
      } else if (file.includes('.png')) {
        fs.unlinkSync(curPath)
      }
    });
  }
};

function runCommand(env, command, args) {
  let Command = lookupCommand(env.commands, command, args, {
    project: env.project,
    ui: env.ui
  });

  let cmd = new Command({
    ui: env.ui,
    analytics: env.analytics,
    commands: env.commands,
    tasks: env.tasks,
    project: env.project,
    settings: env.settings,
    testing: env.testing,
    cli: env.cli
  });

  cmd.beforeRun(args);
  return cmd.validateAndRun(args);
}

module.exports = {
  runCommand,
  deleteImagesInFolder
};
