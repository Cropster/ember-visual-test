import BaseRoute from 'ember-cli-addon-docs/routes/docs/api/item';

export default BaseRoute.extend({

  beforeModel() {
    // Ensure all modules are initialised, so the Windows fix can work
    let allModules = this.store.peekAll('module');
    allModules.mapBy('id');
  }

})
