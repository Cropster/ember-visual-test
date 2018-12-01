import QUnit from 'qunit';

/**
 * Setup QUnit for visual tests
 * It adds skip visual tests option to QUnit interface
 * This should be called in test-helper.js before QUnit start() method
 *
 * ```
 * import { start } from 'ember-qunit';
 * import setupVisualTests from 'ember-visual-test/test-support/setup';
 *
 * setupVisualTests();
 * start();
 * ```
 */
export default function() {
  QUnit.config.urlConfig.push({
    id: 'skipvisual',
    label: 'Skip visual tests',
    tooltip: 'Pass all capture calls without performing them'
  });
}
