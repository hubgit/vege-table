/* globals PouchDB:false, console:false */

'use strict';

Polymer('database-list', {
  error: '',

  ready: function() {
    this.config = {
      dbs: []
    };

    this.db = new PouchDB('database-list');
    this.loadConfig();
  },

  loadConfig: function() {
    return this.db.get('config').then(function(result) {
      console.log(result);
      result.dbs.reverse();
      this.config = result;
    }.bind(this), function(err) {
      console.error(err);
    });
  },

  createDatabase: function(event) {
    event.preventDefault();

    var dbName = this.newDbName;

    var existing = this.config.dbs.some(function(item) {
      return item.name === dbName;
    });

    if (existing) {
      this.error = 'A database with that name already exists';
      return;
    }

    this.config.dbs.push({
      name: dbName,
      created: new Date()
    });

    return this.saveConfig();
  },

  deleteDatabase: function(event, details, sender) {
    event.preventDefault();

    var index = sender.getAttribute('data-db-index');
    var db = this.config.dbs[index];

    return PouchDB.destroy(db.name).then(function() {
      this.config.dbs.splice(index, 1);

      return this.saveConfig();
    }.bind(this));
  },

  saveConfig: function() {
    console.log(this.config);
    var request = this.db.put(this.config, 'config');

    request.then(function(result) {
      this.config._rev = result.rev;
      console.log('saved', result);
    }, function(err) {
      console.error('not saved', err);
    });

    return request;
  }
});