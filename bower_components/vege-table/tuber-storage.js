/*globals Polymer:false, PouchDB:false, console:false, Queue:false */

'use strict';

Polymer('tuber-storage', {
  storage: '',
  ready: function() {
    try {
      this.domSerializer = new XMLSerializer();
      this.domParser = new DOMParser();
    } catch (e) {
      console.warn(e);
    }

    this.queue = new Queue({ name: 'storage' });
    this.queued = {};
  },
  storageChanged: function() {
    if (this.storage) {
      this.db = new PouchDB(this.storage);
    }
  },
  get: function(id) {
    var request = this.db.get(id);

    request.then(function(result) {
      //console.log('loaded', result.id);
    }, function(result) {
      console.error('error loading', id, result);
    });

    return request;
  },
  put: function(doc) {
    var request = this.db.put(doc);

    request.then(function() {
      //console.log('saved');
    }, function(err) {
      console.error('error saving', doc._id, err);
    }.bind(this));

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

    console.log(this.seed);

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
      result.rows.forEach(function(row) {
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
        item._rev = result[index].rev;
      }.bind(this));
    }.bind(this), function(err) {
      console.error('error adding item', err);
    });

    return request;
  },
  deleteAllItems: function() {
    console.log('deleteAllItems');

    var itemsToDelete = this.items.map(function(item) {
      return {
        _deleted: true,
        _id: item._id,
        _rev: item._rev
      };
    });

    console.log('deleting items', itemsToDelete.length);

    var request = this.db.bulkDocs(itemsToDelete);

    request.then(function() {
      console.log('deleted items');
    }, function(err) {
      console.error(err);
    });

    return request;
  },
  updateItem: function(item) {
    if (!this.db) {
      return;
    }

    // don't queue an item for updates if it's already on the queue
    if (this.queued[item._id]) {
      return;
    }

    this.queued[item._id] = true;

    // queue the updates, so that the latest version of the item gets serialized
    return new Promise(function(resolve, reject) {
      this.queue.add(function() {
        this.queued[item._id] = false;
        var dryItem = this.dehydrateItem(item, true);

        var request = this.put(dryItem);

        request.then(function(result) {
         item._rev = result.rev;
          resolve(result);
        }, function(err) {
          this.queued[item._id] = false;
          console.error('error updating item', err, dryItem);
          this.queue.start();
          reject(err);
        }.bind(this));

        return request;
      }.bind(this));
    }.bind(this));
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
      //console.log('saved leaf', leaf.name);
      leaf._rev = result.rev;
    }.bind(this)).catch(function(err) {
      console.error('error updating leaf', err);
    });

    return request;
  },

  loadViews: function() {
    var request = this.db.allDocs({
      startkey: 'view_',
      endkey: 'view_zzz',
      include_docs: true
    });

    request.then(function(result) {
      result.rows.forEach(function(row) {
        this.views.push(row.doc);
        this.fire('view-loaded', row.doc);
      }.bind(this));

      console.log('views loaded', this.views.length);
      this.progress.views = 'loaded';
    }.bind(this), function() {
      this.progress.views = 'empty';
    }.bind(this));

    return request;
  },

  saveView: function(view) {
    if (!view._id) {
      var now = window.performance.now().toString();
      view._id = 'view_' + now;
    }

    var request = this.put(view);

    request.then(function(result) {
      console.log('saved view', view);
      view._rev = result.rev;
    }.bind(this)).catch(function(err) {
      console.error('error updating view', err);
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

    ['index', 'seed'].forEach(function(key) {
      output[key] = item[key];
    });

    this.leaves.forEach(function(leaf) {
      var key = leaf.name;
      var value = item[key];

      switch (leaf.type) {
      case 'date':
        output[key] = value ? value.toISOString() : null;
        break;

      case 'url':
        output[key] = value ? value.href : null;
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

    ['index', 'seed'].forEach(function(key) {
      item[key] = input[key];
    });

    this.leaves.forEach(function(leaf) {
      var key = leaf.name;
      var value = input[key];

      switch (leaf.type) {
      case 'url':
        item[key] = value ? new URL(value) : null;
        break;

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