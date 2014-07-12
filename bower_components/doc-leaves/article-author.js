'use strict';

Polymer('article-author', {
  storage: '',
  value: '',
  openEditor: function() {
    if (this.storage) {
      this.editing = this.value;
      this.async(function() {
        this.shadowRoot.getElementById('given-name').select();
      });
    }
  },
  closeEditor: function(event) {
    event.preventDefault();
    this.value = this.editing;
    this.editing = null;
    this.fire('metadata-changed');
  },
  cancelEditor: function() {
    this.editing = null;
  },
  removeItem: function() {
    this.fire('remove-author');
  },
  addAffiliation: function() {
    // TODO
  }
  // TODO: re-order authors
});