/*globals console:false */
/*jshint -W054 */
'use strict';

Polymer('leaf-miner', {
  updateItems: function(leaf) {
    console.log('updating items', this.items.length);

    leaf.complete = 0;

    var resetDependents = function(leafName) {
      this.leaves.forEach(function(leaf) {
        if (leaf.complete > 0 && leaf.depends && leaf.depends.indexOf(leafName) !== -1) {
          leaf.complete = 0;
          resetDependents(leaf.name);
        }
      });
    }.bind(this);

    resetDependents(leaf.name);

    this.items.forEach(function(item) {
      this.updateLeaf(item, leaf);
    }.bind(this));
  },

  updateBlankItems: function(leaf) {
    console.log('updating blank items', this.items.length);

    this.items.forEach(function(item) {
      if (typeof item[leaf.name] == 'undefined') {
        this.updateLeaf(item, leaf);
      }
    }.bind(this));
  },

  updateLeaves: function() {
    console.log('updating items for all leaves', this.items.length, this.leaves.length);

    this.leaves.filter(function(leaf) {
      return !leaf.depends;
    }).forEach(function(leaf) {
      leaf.complete = 0;
      this.items.forEach(function(item) {
        this.updateLeaf(item, leaf);
      }.bind(this));
    }.bind(this));
  },

  // in lieu of being able to watch individual items for changes, use a generic setter
  setLeaf: function(item, leaf, value) {
      var leafName = leaf.name;

      if (value !== undefined && value !== null) {
        switch (leaf.type) {
          case 'date':
            if (!(value instanceof Date)) {
              value = new Date(value);
            }
            break;

          case 'number':
            if (!(value instanceof Number)) {
              value = parseInt(value);
            }
            break;

          case 'float':
            if (!(value instanceof Number)) {
              value = parseFloat(value);
            }
            break;
        }
      }

      item[leafName] = value;

      this.fire('item-changed', item);

      if (value !== undefined && value !== null) {
        leaf.complete++;
      }

      if (leaf.complete === this.items.length) {
          this.fire('leaf-complete', leaf);
      }

      // update leaves that depend on this one
      this.leaves.forEach(function(leaf) {
        if (leaf.depends.indexOf(leafName) !== -1) {
          this.updateLeaf(item, leaf);
        }
      }.bind(this));
  },

  updateLeafIndex: function(item, i) {
    var leaf = this.leaves[i];

    if (leaf) {
      this.updateLeaf(item, leaf);
    }
  },

  updateLeaf: function(item, leaf) {
    if (leaf) {
      this.setLeaf(item, leaf, undefined);
    }

    if (leaf && this.isReady(leaf, item)) {
      // TODO: loop through items here instead, and move on when all loaded + summarised?
      var fetchFunction = new Function('item', leaf.fetch); // TODO: store this;
      var result = fetchFunction(item);

      if (result instanceof Promise) {
          result.then(function(result) {
            this.setLeaf(item, leaf, result);
          }.bind(this), function(err) {
            console.error(err);
          });
      } else {
          this.setLeaf(item, leaf, result);
      }
    }
  },

  isReady: function(leaf, item) {
      if (!leaf.depends) {
          return true;
      }

      return leaf.depends.every(function(dependency) {
          var dependentValue = item[dependency];

          return dependentValue !== undefined && dependentValue !== null && dependentValue !== false;
      });
  }
});
