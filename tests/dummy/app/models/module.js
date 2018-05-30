import BaseModule from 'ember-cli-addon-docs/models/module';
import { get, set } from '@ember/object';
import fixWindowsPath from 'dummy/utils/fix-windows-path';

export default BaseModule.extend({

  init() {
    // On Windows, IDs might be wrong (coming from Yuidoc)
    // Since we can't change the ID, we make a copy of the record with the fixed ID
    let id = get(this, 'id');
    if (id && id.startsWith('C:')) {
      this._copyForId();
    }

    this._super(...arguments);
  },

  _copyForId() {
    // Fix IDs on Windows
    let { id, file, functions, variables, classes, components } = this;

    if (id && id.startsWith('C:')) {
      id = fixWindowsPath(id);
      file = id;
    }

    functions.forEach((funcData) => {
      if (funcData.file.startsWith('C:')) {
        funcData.file = fixWindowsPath(funcData.file);
      }
    });

    this.store.createRecord('module', {
      id,
      file,
      functions,
      variables,
      classes,
      components
    });
  }

})
