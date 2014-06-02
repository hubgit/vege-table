'use strict';

Polymer('data-view', {
  openEditor: function() {
    if (this.storage) {
      this.editing = this.view;
      this.async(function() {
        this.shadowRoot.getElementById('title').select();
      });
    }
  },
  closeEditor: function(event) {
    event.preventDefault();
    this.view = this.editing;
    this.editing = null;
    this.fire('view-changed');
    this.async(this.addItems);
  },
  cancelEditor: function() {
    this.editing = null;
  },
  remove: function() {
    this.fire('remove-view');
  },

  itemsChanged: function() {
    this.addItems();
  },

  removeView: function() {
    this.fire('remove-view');
  },

  addItems: function() {
    if (!this.view.type || this.view.leaf) {
      return;
    }

    console.log('viewing items', this.items.length);

    var content = this.shadowRoot.getElementById('content');
    content.reset();

    var leaf = this.view.leaf;

    this.items.forEach(function(item) {
      content.add(item[leaf]);
    });
  }
});