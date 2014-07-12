'use strict';

Polymer('article-title', {
  storage: '',
  value: '',
  openEditor: function() {
    if (this.storage) {
      this.value = this.value || 'Untitled';
      this.editing = this.value;
      this.async(function() {
        this.shadowRoot.getElementById('title').select();
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
  }
});