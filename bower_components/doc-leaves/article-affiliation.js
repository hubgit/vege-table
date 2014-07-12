'use strict';

Polymer('article-affiliation', {
  storage: '',
  value: '',
  openEditor: function() {
    if (this.storage) {
      this.editing = this.value;

      this.async(function() {
        this.shadowRoot.getElementById('department').select();
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
    this.fire('remove-affiliation');
  },
});