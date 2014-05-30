/*jshint -W054 */
/*globals console:false */

'use strict';

Polymer('vege-table', {
  db: '',
  page: 1,
  pages: 1,
  indexLimit: 5,
  startIndex: 0,
  endIndex: 0,
  itemCount: 0,
  descriptionFile: '',
  dataFile: '',
  summarised: false,

  ready: function() {
    this.filter = this.filter || null;

    this.seed = {
      fetch: '',
      language: 'javascript',
      data: ''
    };

    this.progress = {
      seed: 'loading',
      leaves: 'loading',
      items: 'loading'
    };

    this.items = [];
    this.leaves = [];
    this.fields = [];
    this.displayItems = [];

    var matches = window.location.search.match(/db=([\w-]+)/);

    if (matches) {
      this.db = matches[1];
    }

    if (!this.db) {
      this.loadDescriptionFile();
    }
  },

  dbChanged: function() {
    console.log('db', this.db);

    if (this.db) {
      this.async(function() {
        this.$.storage.loadSeed();
        this.$.storage.loadLeaves().then(this.loadItems.bind(this));
      });
    }
  },

  paginate: function() {
    this.indexLimit = parseInt(this.indexLimit);
    this.pages = Math.ceil(this.itemCount / this.indexLimit);
    this.page = Math.min(Math.max(this.page, 1), this.pages);
    this.startIndex = Math.max(0, (this.page - 1) * this.indexLimit);
    this.endIndex = this.startIndex + this.indexLimit - 1;
  },

  pageChanged: function() {
    this.paginate();
  },

  indexLimitChanged: function() {
    // TODO: store the selected index limit
    this.paginate();
  },

  pageMessage: function() {
    return this.pages === 1 ? 'page' : 'pages';
  },

  calculateComplete: function() {
    this.leaves.forEach(function(leaf) {
      leaf.complete = 0;

      this.displayItems.forEach(function(item) {
        if (typeof item[leaf.name] !== 'undefined') {
          leaf.complete++;
        }
      }.bind(this));
    }.bind(this));
  },

  sortLeavesByIndex: function() {
    this.leaves.sort(function(a, b) {
      return a.index - b.index;
    });

    this.leaves.forEach(function(leaf, index) {
      leaf.index = index;
    });
  },

  leavesChanged: function() {
    this.sortLeavesByIndex();
    this.nullSummaryValues();
    this.calculateComplete();
  },

  itemsChanged: function() {
    if (this.displayItems && this.displayItems.length) {
      this.itemCount = this.displayItems.length;
      this.paginate();
      this.calculateComplete();
    }
  },

  // null each summary cell
  nullSummaryValues: function() {
    this.summarisers.forEach(function(summariser) {
      // first row is the header
      summariser.summaries = [];
    });
  },

  summariseLeaves: function() {
    this.leaves.forEach(this.summarise.bind(this));
  },

  summarise: function(leaf) {
    var leafName = leaf.name;
    var leafType = leaf.type;

    var cell = leaf.index;

    this.summarisers.forEach(function(summariser) {
      if (summariser.types.indexOf(leafType) !== -1) {
        console.log('summarising', leafName, cell, this.displayItems.length);

        var values = this.displayItems.map(function(item) {
          return item[leafName];
        });

        var summary = summariser.reduce(values, leafType);

        if (summariser.type == 'list') {
          summary = summary.slice(0, 25);
        }

        if (typeof summary === 'object') {
          summary.leafName = leafName;
        }

        summariser.summaries[cell] = summary;
      }
    }.bind(this));

    this.summarised = true;
  },

  exportSummary: function(event, details, sender) {
    var summariserIndex = sender.getAttribute('data-summariser-index');
    var leafIndex = sender.getAttribute('data-leaf-index');
    var summariser = this.summarisers[summariserIndex];
    var leaf = this.leaves[leafIndex];

    var values = this.displayItems.map(function(item) {
      return item[leaf.name];
    });

    var rows = summariser.reduce(values, leaf.type).map(function(row) {
      return [row.key, row.count];
    });

    rows.unshift([leaf.name, 'count']);

    this.exportData(rows, 'csv', this.db + '-' + leaf.name + '.csv');
  },

  exportValues: function(event, details, sender) {
      var leafIndex = sender.getAttribute('data-leaf-index');
      var leaf = this.leaves[leafIndex];

      var values = this.displayItems.map(function(item) {
        return [item[leaf.name]];
      });

      this.exportData(values, 'csv', this.db + '-' + leaf.name + '.csv');
    },

  getLeafByName: function(leafName) {
    for (var i = 0; i < this.leaves.length; i++) {
      var leaf = this.leaves[i];

      if (leaf.name === leafName) {
        return leaf;
      }
    }
  },

  fetchLeaves: function() {
    this.leaves.forEach(function(leaf) {
      this.$.miner.updateItems(leaf);
    }.bind(this));
  },

  clearLeaf: function(event) {
    var leafName = event.target.getAttribute('data-leaf-name');

    this.items.forEach(function(item) {
      delete item[leafName];
    });
  },

  fetchLeaf: function(event) {
    var leafName = event.target.getAttribute('data-leaf-name');
    var leaf = this.getLeafByName(leafName);

    this.$.miner.updateItems(leaf);
  },

  fetchLeafBlanks: function(event) {
    var leafName = event.target.getAttribute('data-leaf-name');
    var leaf = this.getLeafByName(leafName);

    this.$.miner.updateBlankItems(leaf);
  },

  summariseLeaf: function(event) {
    var leafName = event.target.getAttribute('data-leaf-name');
    var leaf = this.getLeafByName(leafName);

    this.summarise(leaf);
  },

  sortLeaf: function(event) {
    var descending = event.target.getAttribute('data-leaf-sort') === 'desc';
    var leafName = event.target.getAttribute('data-leaf-name');
    var leaf = this.getLeafByName(leafName);

    var sortFunction;

    switch (leaf.type) {
      case 'list':
        throw new Error('No list sorting');

      case 'number':
      case 'float':
      case 'date':
        sortFunction = function(a, b) {
          return descending ? b - a : a - b;
        };
        break;

      default:
        sortFunction = function(a, b) {
          if (a === b) {
            return 0;
          }

          if (a > b) {
            return descending ? -1 : 1;
          }

          if (a < b) {
            return descending ? 1 : -1;
          }
        };
        break;
    }

    // sort null items to the bottom
    var sortNull = function(a, b) {
      var aNull = (a === null || a === undefined || isNaN(a));
      var bNull = (b === null || b === undefined || isNaN(b));

      if (aNull && bNull) {
        return 0;
      }

      if (aNull) {
        return 1;
      }

      if (bNull) {
        return -1;
      }

      return 0;
    };


    this.items.sort(function(a, b) {
      var av = a[leafName];
      var bv = b[leafName];

      return sortNull(av, bv) || sortFunction(av, bv);
    });

    if (this.filter) {
      this.filterItems();
    }
  },

  moveLeaf: function(event) {
    var right = event.target.getAttribute('data-leaf-move') === 'right';

    var leafName = event.target.getAttribute('data-leaf-name');
    var leaf = this.getLeafByName(leafName);
    leaf.index += right ? 1.5 : -1.5;
    this.sortLeavesByIndex();

    if (this.db) {
      this.saveLeaves();
    }
  },

  loadItems: function() {
    console.log('loading items');

    this.$.storage.loadItems().then(function() {
      this.displayItems = this.items;
      this.updateFields();

      if (this.items.length) {
        this.summariseLeaves();
      }
    }.bind(this));
  },

  titleCase: function(key) {
    return key.replace(/[\W_]/g, ' ').replace(/([A-Z]+)/, ' $1').replace(/\w\S*/g, function(text) {
      return text.charAt(0).toUpperCase() + text.substr(1).toLowerCase();
    }).trim().replace(/\b(html|pdf|url|doi|issn|id)\b/ig, function(matches, text) {
      return text.toUpperCase();
    });
  },

  buildFetch: function(type, key, value) {
    switch (type) {
      case 'date':
        if (!(value instanceof Date)) {
          key = 'new Date(' + key + ')';
        }
        break;

      case 'number':
        if (!(value instanceof Number)) {
          key = 'parseInt(' + key + ')';
        }
        break;

      case 'float':
        if (!(value instanceof Number)) {
          key = 'parseFloat(' + key + ')';
        }
        break;
    }

    return 'return ' + key;
  },

  updateFields: function() {
    if (!this.items.length) {
      return;
    }

    this.fields = [];

    var item = this.items[0];

    var leafKeys = this.leaves.map(function(leaf) {
      return leaf.name;
    });

    // add each seed property that isn't already a leaf
    Object.keys(item.seed).sort().forEach(function(key) {
      if (leafKeys.indexOf(key) !== -1) {
        return;
      }

      // "private" properties
      if (key[0] === '@' || key[0] === '_') {
        return null;
      }

      var value = item.seed[key];
      var type = this.guessType(key, value);

      this.fields.push({
        name: 'item.seed.' + key,
        fetch: this.buildFetch(type, 'item.seed.' + key, value),
        title: this.titleCase(key),
        depends: ['seed'],
        type: type
      });
    }.bind(this));
  },

  guessType: function(key, value) {
    var stringType = Object.prototype.toString.call(value);

    switch (stringType) {
      case '[object Date]':
        return 'date';

      case '[object Array]':
        return 'list';

      case '[object Number]':
        return 'number';

      case '[object Object]':
        return 'json';

      default:
        switch (key.toLowerCase()) {
          case 'id':
            return 'identifier';

          case 'url':
            return 'url';

          case 'title':
            return 'longtext';
        }

        if (stringType === '[object String]' && value.length > 50) {
          return 'longtext';
        }

        return null;
    }

  },

  clearItems: function() {
    console.log('deleting items');

    this.$.storage.deleteAllItems().then(function(result) {
      console.log('deleted items', result.length);
      this.items.length = 0;
      this.displayItems.length = 0;
    }.bind(this), function(err) {
      console.error('error deleting items', err);
    });
  },

  postAddItems: function() {
    this.displayItems = this.items.map(function(item) {
      return item;
    });

    this.updateFields();

    //if (this.db) {
      this.fetchLeaves(); // TODO: only update added items
    //}

    this.summariseLeaves();
  },

  addItems: function(event, items) {
    console.log('adding items', items.length);

    items.forEach(function(item) {
      //item.index = this.nextIndex();
      this.items.push(item);
    }.bind(this));

    if (this.db) {
      this.$.storage.addItems(items).then(this.postAddItems.bind(this));
    } else {
      this.postAddItems();
    }
  },

  updateItem: function(event, details) {
    // TODO: gather and run updateItems on a timeout?
    return this.$.storage.updateItem(details);
  },

  saveLeaves: function() {
    console.log('saving leaves');
    this.leaves.forEach(function(leaf) {
      this.updateLeaf(null, leaf);
    }.bind(this));
  },

  addLeaf: function(event, leaf) {
    this.$.storage.addLeaf(leaf).then(function() {
      this.updateFields();
      this.$.miner.updateItems(leaf);
    }.bind(this));
  },

  removeLeaf: function(event, leaf) {
    this.$.storage.remove(leaf).then(function() {
      this.sortLeavesByIndex();

      this.items.forEach(function(item) {
        delete item[leaf.name];
        this.updateItem(null, item);
      }.bind(this));

      this.updateFields();
    }.bind(this));
  },

  updateLeaf: function(event, leaf) {
    // TODO: remove old leaf if renamed (or not allow renaming?)

    this.$.storage.updateLeaf(leaf).then(function() {
      console.log('saved leaf', leaf.name);

      if (event) {
        this.$.miner.updateItems(leaf);
      }
    }.bind(this), function(err) {
      console.error('error saving leaf', leaf.name, err);
    });
  },

  nextIndex: function() {
    if (!this.items.length) {
      return 0;
    }

    // TODO: store this somewhere?

    return this.items.reduce(function(max, item) {
      return Math.max(max, item.index);
    }, 0) + 1;
  },

  saveSeed: function() {
    console.log('saving seed');
    this.$.storage.saveSeed();
  },

  export: function() {
    this.saveDescriptionFile();
    this.saveDataFile();
  },

  publicItem: function(item) {
    var output = {};

    Object.keys(item).forEach(function(key) {
      if (key[0] !== '_') {
        output[key] = item[key];
      }
    });

    return output;
  },

  saveDescriptionFile: function() {
    var data = {
      seed: this.publicItem(this.seed),
      leaves: this.leaves.map(this.publicItem)
    };

    this.exportData(data, 'json', this.db + '-description.json');
  },

  saveDataFile: function() {
    var items = this.items.sort(function(a, b) {
      return a.index - b.index;
    }).map(function(item, index) {
      item.index = index;

      return this.$.storage.dehydrateItem(item, false);
    }.bind(this));

    this.exportData(items, 'json', this.db + '-data.json');
  },

  exportData: function(data, type, filename) {
    var output;

    switch (type) {
    case 'json':
      output = JSON.stringify(data, null, '  ');
      this.downloadDataAsFile(output, 'application/json', filename);
      break;

    case 'csv':
      // generate CSV from data rows
      output = data.map(function(row) {
        return row.map(function(cell) {
          if (cell && typeof cell === 'string' && cell.indexOf('"') !== -1) {
            return '"' + cell.toString().replace(/"/g, '""') + '"';
          } else {
            return cell;
          }
        }).join(',');
      }).join('\n');

      this.downloadDataAsFile(output, 'text/csv', filename);
      break;
    }
  },

  downloadDataAsFile: function(output, type, filename) {
    var blob = new Blob([output], { type: type });

    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  },

  loadJSON: function(url) {
    return new Promise(function(resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url);
      xhr.responseType = 'json';
      xhr.onload = function() {
        resolve(xhr.response);
      };
      xhr.onerror = function() {
        reject(new Error({
          status: xhr.status,
          message: xhr.statusText
        }));
      };
      xhr.send();
    });
  },

  loadDescriptionFile: function() {
    var url = this.descriptionFile || 'description.json';

    this.loadJSON(url).then(function(response) {
      this.importDescription(response);
    }.bind(this));
  },

  importDescriptionFile: function(event, details, sender) {
    var reader = new FileReader();

    // Closure to capture the file information.
    reader.onload = function (event) {
      var data = JSON.parse(event.target.result);
      this.importDescription(data);
    }.bind(this);

    // Read in JSON as a data URL.
    reader.readAsText(sender.files[0], 'utf-8');
  },

  importDescription: function(data) {
    console.log('importing description', data);

    this.seed = data.seed;
    this.seed.replace = false; // avoid clearing items
    this.progress.seed = 'loaded';

    if (this.db) {
      this.saveSeed();
    }

    data.leaves.forEach(function(leaf) {
      delete leaf._id;
      delete leaf._rev;

      this.leaves.push(leaf);

      if (this.db) {
        this.addLeaf(null, leaf);
      }
    }.bind(this));

    this.updateFields();

    this.progress.leaves = 'loaded';

    if (!this.db) {
      var dataFile = this.dataFile || 'data.json';

      this.loadDataFile(dataFile).then(function() {
        console.log('data file loaded');
      }, function() {
        console.log('no data file found');
        //this.$.harvester.plantSeeds();
      }.bind(this));
    }
  },

  loadDataFile: function(dataFile) {
    return this.loadJSON(dataFile).then(function(response) {
      this.importData(response);
    }.bind(this));
  },

  importDataFile: function(event, details, sender) {
    var reader = new FileReader();

    // Closure to capture the file information.
    reader.onload = function (event) {
      var data = JSON.parse(event.target.result);
      this.importData(data);
    }.bind(this);

    // Read in JSON as a data URL.
    reader.readAsText(sender.files[0], 'utf-8');
  },

  importData: function(items) {
    items.forEach(function(item) {
      this.items.push(this.$.storage.hydrateItem(item, true));
      this.fire('item-loaded', item);
    }.bind(this));

    this.displayItems = this.items;

    this.progress.items = 'loaded';

    this.leaves.forEach(function(leaf) {
      this.leafComplete(null, leaf);
    }.bind(this));
  },

  leafComplete: function(event, details) {
    this.summarise(details);
  },

  filterChanged: function() {
    this.paginate();
  },

  filterItems: function() {
    console.log('filter', this.filter);

    var filter = this.filter;

    if (filter) {
      var filterName = filter.key;
      var filterType = filter.type;
      var filterValue = filter.value;

      // TODO: more types
      switch (filterType) {
        case 'date':
          filterValue = new Date(filterValue); // TODO: granularity?
        break;
      }

      this.displayItems = this.items.filter(function(item) {
        switch (filterType) {
          case 'list':
            return item[filterName] && item[filterName].indexOf(filterValue) !== -1;

          case 'counts':
            return item[filterName] && item[filterName].some(function(item) {
              return item.name === filterValue;
            });

          default:
            // loose equality, so it works for numbers
            return item[filterName] == filterValue;
        }
      });
    } else {
      this.displayItems = this.items;
    }

    this.itemCount = this.displayItems.length;
    this.page = 0;

    this.summariseLeaves();
  },

  filterTable: function(event, details, sender) {
    event.preventDefault();

    if (sender.className.match(/\bactive\b/)) {
      console.log('resetting filter');

      this.displayItems = this.items.map(function(item) {
        return item;
      });

      this.itemCount = this.displayItems.length;
      this.filter = null; // triggers repagination
      this.summariseLeaves();
    } else {
      var index = sender.getAttribute('data-leaf-index');
      var value = sender.getAttribute('data-filter-value');
      var leaf = this.leaves[index];

      this.filter = {
        key: leaf.name,
        type: leaf.type,
        value: value
      };

      this.filterItems();
    }
  },

  // TODO: move these to a separate file
  summarisers: [
    {
      name: 'facets',
      label: 'Facets',
      type: 'list',
      types: ['number', 'date', 'list', 'counts', 'text', 'url'],
      reduce: function(values, leafType) {
        var counts = {};

        var countValues = function(values) {
          values.forEach(function(value) {
            var increment = 1;

            // null or undefined
            if (value === null || value === undefined || value === '') {
              return;
            }

            // array
            if (Array.isArray(value)) {
              countValues(value);
              return;
            }

            if (leafType == 'counts') {
              increment = value.count;
              value = value.name;
            }

            switch (leafType) {
              // date
            case 'date':
              //value = value.toISOString().substring(0, 19).replace('T', ' ');
              value = value.toISOString().substring(0, 10);
              break;

              // everything else
            default:
              value = value.toString();
              break;
            }

            if (typeof counts[value] === 'undefined') {
              counts[value] = 0;
            }

            counts[value] += increment;
          });
        };

        countValues(values);

        var keys = Object.keys(counts);

        //if (Object.keys(counts).length > 1) {
        keys = keys.filter(function(key) {
          return key && counts[key] > 0;
        });
        //}

        keys.sort(function(a, b) {
          return counts[b] - counts[a];
        });

        return keys.map(function(key) {
          return {
            key: key,
            count: counts[key]
          };
        });
      }
    },
    /*
    {
      name: 'sum',
      label: 'Sum',
      type: 'float',
      types: ['number', 'float'],
      reduce: function(values) {
        return values.reduce(function(total, value) {
          return total + (value ? value : 0);
        }, 0);
      }
    },
    {
      name: 'mean',
      label: 'Mean',
      type: 'float',
      types: ['number', 'float'],
      reduce: function(values) {
        var sum = 0;

        values.forEach(function(value) {
          if (value) {
            sum += value;
          }
        });

        return Math.round(sum / values.length, 2);
      }
    },
    {
      name: 'median',
      label: 'Median',
      type: 'float',
      types: ['number', 'float'],
      reduce: function(values, leafType) {
        if (!values) {
          return;
        }

        var counts = {};

        values.forEach(function(value) {
          if (typeof counts[value] === 'undefined') {
            counts[value] = 0;
          }

          counts[value]++;
        });

        var sorted = Object.keys(counts).sort();

        // TODO: filter out null values?

        var midpoint = Math.ceil(sorted.length / 2);

        if (sorted.length % 2 === 1) {
          return sorted[midpoint];
        }

        if (leafType !== 'number') {
          return sorted[midpoint];
        }

        // return mean of two middle points
        return (sorted[midpoint] + sorted[midpoint + 1]) / 2;
      }
    }
    */
  ]
});
