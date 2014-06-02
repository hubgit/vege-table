'use strict';

Polymer('doc-leaf', {
  editing: null,
  editable: false,
  complete: 0.0,

  ready: function() {
    this.leaf = this.leaf || {};
    this.items = this.items || [];
    this.previews = [];
  },

  openEditor: function() {
    this.editing = {};

    Object.keys(this.leaf).forEach(function(key) {
      this.editing[key] = this.leaf[key];
    }.bind(this));
  },

  closeEditor: function(event) {
    event.preventDefault(); // prevent form submission

    this.validate();

    Object.keys(this.editing).forEach(function(key) {
      this.leaf[key] = this.editing[key];
    }.bind(this));

    this.editing = null;

    if (this.leaf._id) {
      this.fire('leaf-changed', this.leaf);
    } else {
      this.fire('leaf-added', this.leaf);
    }
  },

  cancelEditor: function() {
    this.editing = null;
  },

  validate: function() {
    this.editing.title = this.editing.title.toString().trim();
    this.editing.name = this.prepareName(this.editing.title);

    if (this.editing.depends && typeof this.editing.depends === 'string') {
      this.editing.depends = [this.editing.depends];
    }
  },

  prepareName: function(title) {
    return title ? title.toLowerCase().replace(/\W/g, '_') : '';
  },

  fetchLeaf: function() {
    this.fire('fetch-leaf', this.leaf);
  },

  removeLeaf: function() {
    this.fire('leaf-removed', this.leaf);
  },

  generatePreviews: function() {
    console.log('generating previews', this.editing);

    this.previews = [];

    this.validate();

    var fetchFunction = new Function('item', this.editing.fetch);

    this.items.filter(function(item) {
      if (!this.editing.depends) {
        return true;
      }

      return this.editing.depends.every(function(dependency) {
        var dependentValue = item[dependency];

        return dependentValue !== undefined && dependentValue !== null && dependentValue !== false;
      });
    }.bind(this)).slice(0, 3).forEach(function(item) {
      try {
        var result = fetchFunction(item);

        if (!(result instanceof Promise)) {
          result = new Promise(function(resolve) {
            resolve(result);
          });
        }

        result.then(function(result) {
          if (this.editing.type === 'json') {
            result = JSON.stringify(result, null, '  ');
          }

          this.previews.push(result);
        }.bind(this));
      } catch (e) {
        this.previews.push('Error: ' + e.message);
      }
    }.bind(this));
  }
});
