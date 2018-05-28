#### Using with Mirage

If you are using [ember-cli-mirage](https://github.com/samselikoff/ember-cli-mirage) for acceptance testing
you'll need to add a passthrough for `/visual-test/make-screenshot` to your project's `mirage/config.js`.

```js
this.passthrough('/visual-test/make-screenshot');
```
