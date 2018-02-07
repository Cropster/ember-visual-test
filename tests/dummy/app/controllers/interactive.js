import Controller from '@ember/controller';

export default Controller.extend({

  showAlternate: false,

  actions: {
    change() {
      this.toggleProperty('showAlternate');
    }
  }

});
