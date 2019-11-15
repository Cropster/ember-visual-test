/* globals QUnit */

(function() {
  QUnit.config.urlConfig.push({
    id: 'skipvisual',
    label: 'Skip visual tests',
    tooltip: 'Pass all capture calls without performing them'
  });
})();
