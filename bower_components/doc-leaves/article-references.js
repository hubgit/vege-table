/*jshint -W054 */
'use strict';

Polymer('article-references', {
  buildReferences: function() {
    var references = this.references = [];

    var sections = ['#introduction', '#analysis'];

    sections.forEach(function(section) {
      var nodes = document.querySelectorAll(section + ' marked-element a');

      Array.prototype.forEach.call(nodes, function(node) {
        references.push({
          url: node.href,
          title: node.textContent,
        });

        // TODO: fetch metadata
      });
    });
  },

});
