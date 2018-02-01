module.exports = {
  description: 'Add output folders to gitignoe',

  normalizeEntityName: function() {
    // no-op
  },

  afterInstall: function(options) {
    return this.insertIntoFile('.gitignore',
      `/visual-test-output/tmp/*.png
/visual/test-output/diff/*.png`).then(function() {
      return this.insertIntoFile('.npmignore', `/visual-test-output`);
    }.bind(this))
  }
};
