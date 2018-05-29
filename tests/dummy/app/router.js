import AddonDocsRouter, { docsRoute } from 'ember-cli-addon-docs/router';
import config from './config/environment';

const Router = AddonDocsRouter.extend({
  location: config.locationType,
  rootURL: config.rootURL,
});

Router.map(function() {
  this.route('interactive');
  this.route('visual-test-route');

  docsRoute(this, function () {
    this.route('how');
    this.route('mirage');
    this.route('platforms');
    this.route('styles');
    this.route('tech');
    this.route('example');
    this.route('not-found', { path: '/*path' });
  });
});

export default Router;
