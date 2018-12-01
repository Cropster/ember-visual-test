module.exports = {
  description: 'Add output folders to gitignoe',

  normalizeEntityName: function() {
    // no-op
  },

  afterInstall: function() {
    return this.insertIntoFile(
      '.gitignore',
      '/visual-test-output/tmp/**/*.png\n/visual-test-output/diff/**/*.png'
    ).then(() => this.insertIntoFile(
      '.npmignore',
      '/visual-test-output'
    )).then(() => this.insertIntoFile(
      'tests/test-helper.js',
      `import setupVisualTests from 'ember-visual-test/test-support/setup';`,
      {
        after: `import { start } from 'ember-qunit';\n`
      }
    )).then(() => this.insertIntoFile(
      'tests/test-helper.js',
      'setupVisualTests();',
      {
        before: 'start()'
      }
    ))
  }
};
