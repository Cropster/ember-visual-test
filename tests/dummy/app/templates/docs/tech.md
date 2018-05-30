# Technical explanation

This is how this addon actually works:

* When the app is started, we boot an instance of headless Chrome.
* A middleware is registered which captures ajax POSTs to `/visual-test/make-screenshot`
* This middleware takes an URL as parameter, and instructs Chrome to visit that URL and make a screenshot of it.
* Now, on the client/test side of things, the `capture()` helper makes an ajax POST to the middleware, giving it the URL of the current test (via testId). Additionally, it appends a custom `&capture=true` parameter. So basically, we instruct the headless chrome to view the same test/page we are currently at.
* The `capture()` helper checks if the `capture=true` param is set, and if so, it will pause the test and emit an event so that the headless chrome knows it is ready.
* It also adds a class to the body which is used to remove the test-specific wrappers etc. to get a nice full screen capture.

Please note that since this relies quite heavily on node, it requires node >= 8 to take advantage of newer JavaScript features.
