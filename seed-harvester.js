/* globals console:false, CSVParser:false, Collection: false */
'use strict';

Polymer('seed-harvester', {
  db: '',
  progress: '',
  delimiter: '"',
  ready: function() {
    this.seed = this.seed || {
      data: '',
      url: '',
      replace: true,
      language: 'resource',
      format: 'html'
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

    // TODO: don't save seed.data?

    this.closeEditor();
    this.plantSeeds();
  },

  harvestSeeds: function(seed, preview) {
    this.validate(seed);

    switch (seed.language) {
      case 'resource':
        var parts = [];

        var collection = new Collection(seed.url);
        parts.push('var collection = new Collection(\'' + seed.url + '\');');

        if (seed.itemsSelector) {
          collection.items = new Function('document', seed.itemsSelector);

          var text = seed.itemsSelector.split(/\n/).map(function(line) {
            return '\t' + line.replace(/\s+$/, '');
          }).join('\n');

          parts.push('collection.items = function(document) {\n' + text + '\n}');
        }

        if (preview) {
          collection.next = function() {
            return null;
          };
        } else if (seed.nextSelector) {
          collection.next = new Function('document', seed.nextSelector);

          var text = seed.nextSelector.split(/\n/).map(function(line) {
            return '\t' + line.trim();
          }).join('\n');

          parts.push('collection.next = function(document) {\n' + text + '\n}');
        }

        parts.push('return collection.get(\'' + seed.format + '\');');

        seed.code = parts.join('\n\n');

        console.log(seed.format);

        var request = collection.get(seed.format);

        switch (seed.format) {
          case 'csv':
            return request.then(function(response) {
              // TODO: set enclosure, etc
              var parser = new CSVParser({
                delimiter: this.delimiter
              });

              // TODO: normalise field names

              return parser.parse(response).results.rows;
            }.bind(this));

          default:
            return request;
        }

      case 'javascript':
        var harvester = new Function(seed.code); // TODO: wrap in closure?

        return harvester();

      case 'csv':
        return new Promise(function(resolve, reject) {
            // TODO: set enclosure, etc
            var parser = new CSVParser({
              delimiter: this.delimiter
            });

            // TODO: normalise field names

            var data = parser.parse(seed.data);

            seed.data = null; // TODO: save this?

            resolve(data.results.rows);
          // TODO: reject on errors
        }.bind(this));


      case 'json':
        return new Promise(function(resolve, reject) {
          var data = JSON.parse(seed.data);

          seed.data = null; // TODO: save this?

          resolve(data);

          // TODO: reject
        });
    }
  },

  validate: function(seed) {
    switch (seed.language) {
      case 'resource':
        ['url', 'format', 'itemsSelector', 'nextSelector'].forEach(function(key) {
          seed[key] = seed[key];// ? seed[key].trim() : null;
        });
      break;
    }
  },

  plantSeeds: function() {
    this.error = null;

    this.harvestSeeds(this.seed).then(this.addItems.bind(this), this.onFetchError.bind(this));
  },

  generatePreview: function() {
    console.log('generating preview', this.editing);

    this.preview = null;

    this.harvestSeeds(this.editing, true).then(function(items) {
      this.preview = items ? JSON.stringify(items.slice(0, 5), null, '  ') : '';
    }.bind(this));
  }
});
