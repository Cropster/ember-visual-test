import { currentURL, visit } from '@ember/test-helpers';
import { module, test } from 'qunit';
import { setupApplicationTest } from 'ember-qunit';
import { capture } from 'dummy/tests/helpers/visual-test';

module('Acceptance | visual test', function(hooks) {
  setupApplicationTest(hooks);

  test('visiting /', async function(assert) {
    await visit('/');

    assert.equal(currentURL(), '/');

    await capture(assert, 'visual-test');
  });

  test('subdir path', async function(assert) {
    await visit('/');

    await capture(assert, 'subdir/visual-test');
  });

  test('subdir/subdir path', async function(assert) {
    await visit('/');

    await capture(assert, 'subdir/subdir1/visual-test');
  });
});
