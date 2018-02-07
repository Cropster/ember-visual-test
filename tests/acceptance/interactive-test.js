import { test } from 'qunit';
import moduleForAcceptance from '../../tests/helpers/module-for-acceptance';
import { capture } from 'dummy/tests/helpers/visual-test';

moduleForAcceptance('Acceptance | interactive');

test('visiting /interactive', async function(assert) {
  await visit('/interactive');

  assert.equal(currentURL(), '/interactive');

  await capture(assert, 'interactive-before');

  await click(find('button'));

  await capture(assert, 'interactive-after');
});
