'use strict';

Polymer('article-date', {
  storage: '',
  value: '',
  openEditor: function() {
    if (this.storage) {
      this.value = this.value || new Date();
      this.editing = this.value;

      this.async(function() {
        this.shadowRoot.getElementById('date').select();
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
  formatDate: function(value) {
    if (!value) {
      return '';
    }

    // TODO: use Moment.js, and or a date picker?
    var date = new Date(value);

    try {
      return date.toISOString().substring(0, 10);
    } catch (e) {
      return '';
    }
  }
});