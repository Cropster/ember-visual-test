# ember-visual-test

Test screens in acceptance/integration tests for visual changes over time.

## Installation

```
ember install ember-visual-test
```

## Usage

Use ember-visual-test in your acceptance tests like this:

```js
import { visit } from '@ember/test-helpers';
import { module, test } from 'qunit';
import { setupApplicationTest } from 'ember-qunit';
import { capture } from 'dummy/tests/helpers/visual-test';

module('Acceptance | visual test', function(hooks) {
  setupApplicationTest(hooks);

  test('visiting /', async function(assert) {
    await visit('/');

    await capture(assert, 'visual-test');
  });
});
```
