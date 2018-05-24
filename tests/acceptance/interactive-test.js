import { click, currentURL, visit } from '@ember/test-helpers';
import { module, test } from 'qunit';
import { setupApplicationTest } from 'ember-qunit';
import { capture } from 'dummy/tests/helpers/visual-test';

module('Acceptance | interactive', function(hooks) {
  setupApplicationTest(hooks);

  test('visiting /interactive', async function(assert) {
    await visit('/interactive');

    assert.equal(currentURL(), '/interactive');

    await capture(assert, 'interactive-before');

    await click('button');

    await capture(assert, 'interactive-after');
  });
});
