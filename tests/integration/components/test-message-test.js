import { moduleForComponent, test } from 'ember-qunit';
import hbs from 'htmlbars-inline-precompile';
import { capture } from 'dummy/tests/helpers/visual-test';

moduleForComponent('test-message', 'Integration | Component | test message', {
  integration: true
});

test('it renders', async function(assert) {
  this.render(hbs`{{test-message}}`);

  await capture(assert, 'component-test-message');
});
