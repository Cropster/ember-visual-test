# ember-visual-test

Test screens in acceptance tests for visual changes over time.

## Installation

* `ember install ember-visual-test`

## Usage

Use ember-visual-test in your acceptance tests like this:

```js
import { test } from 'qunit';
import moduleForAcceptance from '../../tests/helpers/module-for-acceptance';
import { capture } from 'ember-visual-test/test-support/helpers';

moduleForAcceptance('Acceptance | visual test');

test('visiting /', async function(assert) {
  let testBody = document.querySelector('#ember-testing');

  await visit('/');

  assert.equal(currentURL(), '/');

  await capture(assert, testBody, 'test-file-name');
});
```

### capture
 
The capture function takes three parameters: `capture(assert, element, identifier)`

* `assert`: The assert function. If this is null, no assert will be made, 
and instead an object with data about the success/error of the test will be returned 
(don't forget to `await` on it!).
* `element`: Either a DOM node, or a string which will be used in `document.querSelector()`
* `identifier`: A unique string to identify this capture. This will be the file name of the generated images, and has to be unique across your whole application.
