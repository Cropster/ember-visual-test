import { test } from 'qunit';
import moduleForAcceptance from '../../tests/helpers/module-for-acceptance';
import { capture } from 'dummy/tests/helpers/visual-test';

moduleForAcceptance('Acceptance | visual test');

test('visiting /', async function(assert) {
  await visit('/');

  assert.equal(currentURL(), '/');

  await capture(assert, 'visual-test');
});
