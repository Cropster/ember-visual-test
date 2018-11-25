# Modes

If you need to test your app in multiple setups (let's say different screen sizes),
`modes` come in handy.

## Defining modes

Define your modes in the `ember-cli-build.js`:

```js
let app = new EmberAddon(defaults, {
  visualTest: {
   // some configuration params ommited for brevity
   windowWidth: 1024,
   modes: {
     tablet: {
       windowWidth: 768
     },
     mobile: {
       windowWidth: 412
     }
   }
  }
});
```
You can name your modes as you like - as long as they are a valid JavaScript object keys.

Modes support same options as the main configuration. Learn more about configuration
in the [build section](build).

Each mode configuration will be merged with the main configuration. You can skip
options in mode config if they stay the same as in the main config.


## Using modes

To use a mode just pass its name to the `capture()` helper like this:

```js
// this will use default config
// and will create visual-test.png file:
await capture(assert, 'visual-test');

// this will use mobile mode config
// and will create visual-test-mobile.png file:
await capture(assert, 'visual-test', { mode: 'mobile' });
```
