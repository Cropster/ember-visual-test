# ember-visual-test

Test screens in acceptance/integration tests for visual changes over time.

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
  await visit('/');

  assert.equal(currentURL(), '/');

  await capture(assert, 'test-file-name');
});
```

## How does it work?

Whenever `capture` is called in the test, the node server will make a screenshot with 
[simple-headless-chrome](https://github.com/LucianoGanga/simple-headless-chrome), 
and save it in the `/visual-test-output` folder. Please commit this folder into source control!

Now, whenever the test is run, a new snapshot is made and put in the `/visual-test-output/tmp` folder 
(do NOT put that into source control!). It then compares the two images with 
[pixelmatch](https://github.com/mapbox/pixelmatch) and asserts accordingly. 
If a mismatch is found, it will save an image with the diff of the two versions in the `/visual-test-output/diff` folder, to help you identify the issue.

Note that this means that if a screen changes consciously, you'll need to either manually 
delete that image from the `/visual-test-output` folder, 
or run `ember visual-test:reset` to reset ALL images.

### Example

For example, imagine you had an image like this the first time you ran the capture:

![Original Image](docs/images/example-base-image.png)

Now, after some changes, you run the tests again, and this time, it captures this image:

![Changed Image](docs/images/example-comparison-image.png)

This would result in an error, and generate the following diff image:

![Diff Image](docs/images/example-diff-image.png)

## API docs

### capture
 
The capture function takes three parameters: `capture(assert, identifier, options)`

* `assert`: The assert function. This assumes you are using qunit.
* `identifier`: A unique string to identify this capture. This will be the file name of the generated images, and has to be unique across your whole application.
* `options`: An optional object with options. The following options are allowed:
  * `selector`: An optional selector to screenshot. If not specified, the whole page will be captured.
  * `fullPage`: If a full page screenshot should be made, or just the browsers viewport. Defaults to `true`.
  
This works in both acceptance tests as well as in integration tests.

### CLI

There are also two CLI commands to use: 

* `ember visual-test:clean`: Clean the diff/tmp folders
* `ember visual-test:reset`: Manually clean all folders & create new baseline images

### Styling

When running in capture mode (in node), the `capture` helper will automatically add a class 
`visual-test-capture-mode` to the body. Styles are injected when running tests that use that 
class to hide the qunit-specific chrome & make the test view full screen.

If you want to "ignore" some element in the capture (e.g. because it changes in every rendering), 
you can add the attribute `data-test-visual-ignore` to it, which will give it an opacity of 0 
when run in capture mode.

## Technical explanation

This is how this addon actually works:

* When the app is started, we boot an instance of headless Chrome.
* A middleware is registered which captures ajax POSTs to `/visual-test/make-screenshot`
* This middleware takes an URL as parameter, and instructs Chrome to visit that URL and make a screenshot of it.
* Now, on the client/test side of things, the `capture()` helper makes an ajax POST to the middleware, giving it the URL of the current test (via testId). Additionally, it appends a custom `&capture=true` parameter. So basically, we instruct the headless chrome to view the same test/page we are currently at.
* The `capture()` helper checks if the `capture=true` param is set, and if so, it will pause the test and emit an event so that the headless chrome knows it is ready.
* It also adds a class to the body which is used to remove the test-specific wrappers etc. to get a nice full screen capture.
