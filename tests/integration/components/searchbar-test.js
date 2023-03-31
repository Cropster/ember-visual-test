import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render } from '@ember/test-helpers';
import hbs from 'htmlbars-inline-precompile';
import { capture } from 'dummy/tests/helpers/visual-test';

module('Integration | Component | searchbar', function(hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function(assert){
    await render(hbs`{{searchbar}}`);

    await capture(assert, 'component-searchbar');
  })  
});
