// BEGIN-SNIPPET usage.js
import { currentURL, visit } from '@ember/test-helpers';
import { module, test } from 'qunit';
import { setupApplicationTest } from 'ember-qunit';
import { capture } from 'dummy/tests/helpers/visual-test';

module('Acceptance | visual test', function(hooks) {
  setupApplicationTest(hooks);

  test('visiting /visual-test-route', async function(assert) {
    await visit('/visual-test-route');

    assert.equal(currentURL(), '/visual-test-route');

    await capture(assert, 'visual-test');
  });
});
// END-SNIPPET

module('Acceptance | visual test - subdirectories', function(hooks) {
  setupApplicationTest(hooks);

  test('subdir path', async function(assert) {
    await visit('/visual-test-route');

    await capture(assert, 'subdir/visual-test');
  });

  test('subdir/subdir path', async function(assert) {
    await visit('/visual-test-route');

    await capture(assert, 'subdir/subdir1/visual-test');
  });
});
