/*globals Polymer:false, PouchDB:false, console:false */

'use strict';

Polymer('tuber-storage', {
  storage: '',
  ready: function() {
    this.domSerializer = new XMLSerializer();
    this.domParser = new DOMParser();
  },
  storageChanged: function() {
    if (this.storage) {
      this.db = new PouchDB(this.storage);
    }
  },
  get: function(id) {
    var request = this.db.get(id);

    request.then(function(result) {
      console.log('loaded', result.id);
    }, function(result) {
      console.error('error loading', id, result);
    });

    return request;
  },
  put: function(doc) {
    var request = this.db.put(doc);

    request.then(function() {
      console.log('saved', doc._id);
    }, function(result) {
      console.error('error saving', doc._id, result);
    });

    return request;
  },
  remove: function(item) {
    var request = this.db.remove({
      _id: item._id,
      _rev: item._rev,
    });

    request.then(function() {
      console.log('removed', item._id);
    }, function(result) {
      console.error('error removed', item._id, result);
    });

    return request;
  },
  loadSeed: function() {
    var request = this.get('seed');

    request.then(function(result) {
      this.seed = result;
      this.progress.seed = 'loaded';
    }.bind(this), function() {
      this.progress.seed = 'empty';
    }.bind(this));

    return request;
  },
  saveSeed: function() {
    this.seed._id = 'seed';

    var request = this.put(this.seed);

    request.then(function(result) {
      this.seed._rev = result.rev;
      this.progress.seed = 'loaded';
    }.bind(this), function() {
      this.progress.seed = 'empty';
    }.bind(this));

    return request;
  },
  loadItems: function() {
    var request = this.db.allDocs({
      startkey: 'item_',
      endkey: 'item_zzz',
      include_docs: true
    });

    request.then(function(result) {
      var items = result.rows;

      /*items.sort(function(a, b) {
        return a.doc.index - b.doc.index;
      });*/

      items.forEach(function(row) {
        var item = this.hydrateItem(row.doc, true);
        this.items.push(item);
        this.fire('item-loaded', item);
      }.bind(this));

      console.log('items loaded', this.items.length);
      this.progress.items = 'loaded';
    }.bind(this), function() {
      this.progress.seed = 'empty';
    }.bind(this));

    return request;
  },
  addItems: function(items) {
    var i = 0;
    var now = window.performance.now().toString();

    items.forEach(function(item) {
      item._id = 'item_' + now + i++; // ensure uniqueness using iterator
    }.bind(this));

    var dryItems = items.map(function(item) {
      return this.dehydrateItem(item, true);
    }.bind(this));

    var request = this.db.bulkDocs(dryItems);

    request.then(function(result) {
      console.log('added items', result.length);

      items.forEach(function(item, index) {
        item._rev = result[index]._rev;
      }.bind(this));
    }.bind(this), function(err) {
      console.error('error adding item', err);
    });

    return request;
  },
  deleteAllItems: function() {
    console.log('deleteAllItems');

    var dryItems = this.items.map(function(item) {
      item._deleted = true;

      return this.dehydrateItem(item, true);
    }.bind(this));

    console.log(dryItems.length, 'items to delete');

    return this.db.bulkDocs(dryItems);
  },
  updateItems: function(items) {
    var dryItems = items.map(function(item) {
      return this.dehydrateItem(item, true);
    });

    var request = this.db.bulkDocs(dryItems);

    request.then(function(result) {
      items.forEach(function(item, index) {
        item._rev = result[index]._rev;
      });

      console.log('saved items', result.length);
    }.bind(this), function(err) {
      console.error('error updating items', err);
    });

    return request;
  },
  updateItem: function(item) {
    if (!this.db) {
      return;
    }

    var dryItem = this.dehydrateItem(item, true);

    var request = this.put(dryItem);

    // TODO: _rev of item gets out of sync with _rev of dryItem by the time they're saved?

    request.then(function(result) {
      item._rev = result.rev;
    }.bind(this), function(err) {
      console.error('error updating item', err, dryItem);
      this.db.get(item._id, { conflicts: true }).then(function(result) {
        console.log('conflict', result);
      });
    }.bind(this));

    return request;
  },
  loadLeaves: function() {
    console.log('loading leaves');

    this.leaves.length = 0;

    var request = this.db.allDocs({
      startkey: 'leaf_',
      endkey: 'leaf_zzz', // ending at leaf__ doesn't find anything
      include_docs: true
    });

    request.then(function(result) {
      console.log('leaves result', result.rows.length);

      result.rows.sort(function(a, b) {
        return a.doc.index - b.doc.index;
      });

      result.rows.forEach(function(row) {
        this.leaves.push(row.doc);
      }.bind(this));

      this.progress.leaves = 'loaded';

      console.log('leaves loaded', this.leaves);
    }.bind(this), function(err) {
      console.error(err);
    });

    return request;
  },
  addLeaf: function(leaf) {
    leaf.doctype = 'leaf';
    leaf._id = 'leaf_' + leaf.name;

    var request = this.put(leaf);

    request.then(function(result) {
      leaf._rev = result.rev;
    }.bind(this)).catch(function(err) {
      console.error('error adding leaf', err);
    });

    return request;
  },
  updateLeaf: function(leaf) {
    var request = this.put(leaf);

    request.then(function(result) {
      leaf._rev = result.rev;
    }.bind(this)).catch(function(err) {
      console.error('error updating leaf', err);
    });

    return request;
  },

  dehydrateItem: function(item, db) {
    var output = {};

    if (db) {
      ['_id', '_rev'].forEach(function(key) {
        output[key] = item[key];
      });
    }

    ['doctype', 'index', 'seed'].forEach(function(key) {
      output[key] = item[key];
    });

    this.leaves.forEach(function(leaf) {
      var key = leaf.name;
      var value = item[key];

      switch (leaf.type) {
      case 'date':
        output[key] = value ? value.toISOString() : null;
        break;

      case 'html':
      case 'xml':
        try {
          output[key] = value ? this.domSerializer.serializeToString(value) : null;
        } catch (e) {
          console.error(e);
        }
        break;

      default:
        output[key] = value;
        break;
      }
    }.bind(this));

    return output;
  },

  hydrateItem: function(input, db) {
    var item = {};

    if (db) {
      ['_id', '_rev'].forEach(function(key) {
        item[key] = input[key];
      });
    }

    ['doctype', 'index', 'seed'].forEach(function(key) {
      item[key] = input[key];
    });

    this.leaves.forEach(function(leaf) {
      var key = leaf.name;
      var value = input[key];

      switch (leaf.type) {
      case 'date':
        item[key] = value ? new Date(value) : null;
        break;

      case 'html':
        item[key] = value ? this.domParser.parseFromString(value, 'text/html') : null;
        break;

      case 'xml':
        item[key] = value ? this.domParser.parseFromString(value, 'application/xml') : null;
        break;

      default:
        item[key] = value;
      }
    }.bind(this));

    return item;
  },
});