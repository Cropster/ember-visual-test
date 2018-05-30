import BaseProject from 'ember-cli-addon-docs/models/project';
import { get, set, observer } from '@ember/object';
import fixWindowsPath from 'dummy/utils/fix-windows-path';

export default BaseProject.extend({

  _tryFixNavigationIndex: observer('navigationIndex', function() {
    let navigationIndex = get(this, 'navigationIndex');
    if (navigationIndex && navigationIndex.modules.find((moduleData) => moduleData.name.startsWith('C:'))) {
      this._fixNavigationIndex();
    }
  }),

  _fixNavigationIndex() {
    // Fix IDs on Windows
    let navigationIndex = get(this, 'navigationIndex');

    if (navigationIndex) {
      let { modules } = navigationIndex;
      modules.forEach((moduleData) => {
        if (moduleData.name.startsWith('C:')) {
          moduleData.name = fixWindowsPath(moduleData.name);
        }

        if (moduleData.path.includes('C:')) {
          moduleData.path = `modules/${fixWindowsPath(moduleData.path)}`;
        }

      });
    }
  }

})
