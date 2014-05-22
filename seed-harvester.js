/*globals console:false, Parsers:false*/
'use strict';

Polymer('seed-harvester', {
  db: '',
  progress: '',
  delimiter: ',',
  ready: function() {
    this.seed = this.seed || {
      data: '',
      url: '',
      replace: true,
      language: 'javascript'
    };

    this.items = this.items || [];
  },

  openEditor: function() {
    this.editing = {};

    Object.keys(this.seed).forEach(function(key) {
      this.editing[key] = this.seed[key];
    }.bind(this));
  },

  closeEditor: function() {
    Object.keys(this.editing).forEach(function(key) {
      this.seed[key] = this.editing[key];
    }.bind(this));

    this.editing = null;

    this.fire('seed-changed');
  },

  cancelEditor: function() {
    this.editing = null;
  },

  onFetchError: function(e) {
    console.error(e);
    this.error = 'Response code: ' + e.xhr.status + ' from ' + e.request.originalURL;
  },

  clearItems: function() {
    this.fire('clear-items');
  },

  addItems: function(items) {
    console.log('adding items', items ? items.length : items);

    if (!items || !items.length) {
      return;
    }

    var seeds = items.map(function(item) {
      return { seed: item };
    });

    this.fire('add-items', seeds);
  },

  saveSeeds: function(event) {
    event.preventDefault();

    this.closeEditor();
    this.plantSeeds();
  },

  plantSeeds: function() {
    var data;

    this.error = null;

    switch (this.seed.language) {
      case 'javascript':
        var harvester = new Function(this.seed.data); // TODO: wrap in closure?
        var result = harvester();

        result.then(this.addItems.bind(this), this.onFetchError.bind(this));
      break;

      case 'csv':
      // TODO: set enclosure, etc
      var parser = new Parsers.CSV({
        delimiter: this.delimiter
      });

      // TODO: normalise field names

      data = parser.parse(this.seed.data).results.rows;
      // TODO: log errors, preview?

      this.addItems(data);
      break;

      case 'json':
      data = JSON.parse(this.seed.data);

      this.addItems(data);
      break;
    }
  }
});
