/*jshint -W054 */
'use strict';

Polymer('leaf-builder', {
  adding: null,
  db: null,
  progress: '',

  ready: function() {
    this.items = this.items || [];
    this.leaves = this.leaves || [];
  },

  newLeaf: function() {
    this.adding = {
      name: '',
      title: '',
      type: 'string',
      fetch: '',
      depends: []
    };
  },

  removeLeaf: function(event, detail) {
    this.leaves.splice(detail.index, 1);
  },

  addLeaf: function(event, leaf) {
    leaf.index = this.nextIndex();
    this.leaves.push(leaf);
    this.adding = null;
    //this.fire('leaf-added', leaf);
  },

  addSuggestedLeaf: function(adding) {
    this.adding = adding;
  },

  nextIndex: function() {
    if (!this.leaves.length) {
      return 0;
    }

    return this.leaves.reduce(function(max, leaf) {
      return Math.max(max, leaf.index);
    }, 0) + 1;
  }
});
