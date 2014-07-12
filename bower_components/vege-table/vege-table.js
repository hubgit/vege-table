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
    this.nullSummaryValues();

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
    this.tableItems = [];
    this.views = [];

    var params = this.readParameters();

    if (params.db) {
      this.db = params.db.replace(/\/$/, '');
    }

    if (!this.db) {
      if (params.url) {
        this.loadDescriptionURL(params.url);
      } else if (params.gist) {
        var url = 'https://api.github.com/gists/' + params.gist + '/description.json';

        this.loadJSON(url).then(function(gist) {
          var description = gist.files['description.json'];
          var data = gist.files['data.json'];

          if (description && description.content) {
            this.importDescription(JSON.parse(description.content));

            if (data && data.content) {
              this.importData(JSON.parse(data.content));
            }
          }
        }.bind(this));
      } else {
        window.location.href = 'about.html';
      }
    }
  },

  readParameters: function() {
    var params = {};

    window.location.search.substring(1).split(/&/).forEach(function(part) {
      var parts = part.split('=');
      var key = decodeURIComponent(parts[0]);
      var value = decodeURIComponent(parts[1]);

      params[key] = value;
    });

    return params;
  },

  dbChanged: function() {
    console.log('db', this.db);

    if (this.db) {
      this.async(function() {
        this.$.storage.loadSeed();
        this.$.storage.loadViews();
        this.$.storage.loadLeaves().then(this.loadItems.bind(this));
      });
    }
  },

  displayItemsChanged: function() {
    this.paginate();
  },

  generateTableItems: function() {
    //console.log('generating table items', this.displayItems.length, this.startIndex, this.endIndex);
    this.tableItems = this.displayItems.slice(this.startIndex, this.endIndex + 1);
    //console.log(this.tableItems);
  },

  paginate: function() {
    this.indexLimit = parseInt(this.indexLimit);
    this.pages = Math.ceil(this.itemCount / this.indexLimit);
    this.page = Math.min(Math.max(this.page, 1), this.pages);
    this.startIndex = Math.max(0, (this.page - 1) * this.indexLimit);
    this.endIndex = this.startIndex + this.indexLimit - 1;
    this.generateTableItems();
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
    return;

    var leafName = leaf.name;
    var leafType = leaf.type;

    var cell = leaf.index;

    this.summarisers.forEach(function(summariser) {
      if (summariser.types.indexOf(leafType) !== -1) {
        console.log('summarising', leafName, cell, this.displayItems.length);

        var values = this.displayItems.map(function(item) {
          return item[leafName];
        }).filter(function(value) {
          return value !== undefined && value !== null;
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

  exportItems: function(event, details) {
    this.exportData(details.rows, 'csv', this.db + '-' + details.leaf + '.csv');
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

  clearLeaf: function(event, details, sender) {
    var leafName = sender.getAttribute('data-leaf-name');

    this.items.forEach(function(item) {
      delete item[leafName];
    });
  },

  fetchLeaf: function(event, details) {
    this.$.miner.updateItems(details);
  },

  fetchLeafBlanks: function(event, details) {
    this.$.miner.updateBlankItems(details);
  },

  summariseLeaf: function(event, details, sender) {
    var leafName = sender.getAttribute('data-leaf-name');
    var leaf = this.getLeafByName(leafName);

    this.summarise(leaf);
  },

  sortLeaf: function(event, details, sender) {
    var descending = sender.getAttribute('data-leaf-sort') === 'desc';
    var leafName = sender.getAttribute('data-leaf-name');
    var leaf = this.getLeafByName(leafName);
    console.log('leaf', leafName, leaf);

    var sortFunction;

    switch (leaf.type) {
      case 'list':
        throw new Error('No list sorting');

      case 'number':
      case 'float':
        sortFunction = function(a, b) {
          if (!a && !b) {
            return 0;
          }

          return descending ? b - a : a - b;
        };
        break;

      case 'date':
        sortFunction = function(a, b) {
          if (!a && !b) {
            return 0;
          }

          if (!a) {
            return -descending;
          }

          if (!b) {
            return -descending;
          }

          return descending ? b.getTime() - a.getTime() : a.getTime() - b.getTime();
        };
        break;

      /*
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
      */

      default:
        // https://github.com/javve/natural-sort/blob/master/index.js
        // Natural Sort algorithm for Javascript - Version 0.7 - Released under MIT license
        // Author: Jim Palmer (based on chunking idea from Dave Koelle)
        sortFunction = function(a, b, options) {
          var re = /(^-?[0-9]+(\.?[0-9]*)[df]?e?[0-9]?$|^0x[0-9a-f]+$|[0-9]+)/gi,
            sre = /(^[ ]*|[ ]*$)/g,
            dre = /(^([\w ]+,?[\w ]+)?[\w ]+,?[\w ]+\d+:\d+(:\d+)?[\w ]?|^\d{1,4}[\/\-]\d{1,4}[\/\-]\d{1,4}|^\w+, \w+ \d+, \d{4})/,
            hre = /^0x[0-9a-f]+$/i,
            ore = /^0/,
            options = options || { desc: descending, insensitive: false },
            i = function(s) { return options.insensitive && (''+s).toLowerCase() || ''+s; },
            // convert all to strings strip whitespace
            x = i(a).replace(sre, '') || '',
            y = i(b).replace(sre, '') || '',
            // chunk/tokenize
            xN = x.replace(re, '\0$1\0').replace(/\0$/,'').replace(/^\0/,'').split('\0'),
            yN = y.replace(re, '\0$1\0').replace(/\0$/,'').replace(/^\0/,'').split('\0'),
            // numeric, hex or date detection
            xD = parseInt(x.match(hre)) || (xN.length != 1 && x.match(dre) && Date.parse(x)),
            yD = parseInt(y.match(hre)) || xD && y.match(dre) && Date.parse(y) || null,
            oFxNcL, oFyNcL,
            mult = options.desc ? -1 : 1;
          // first try and sort Hex codes or Dates
          if (yD)
            if ( xD < yD ) return -1 * mult;
            else if ( xD > yD ) return 1 * mult;
          // natural sorting through split numeric strings and default strings
          for(var cLoc=0, numS=Math.max(xN.length, yN.length); cLoc < numS; cLoc++) {
            // find floats not starting with '0', string or 0 if not defined (Clint Priest)
            oFxNcL = !(xN[cLoc] || '').match(ore) && parseFloat(xN[cLoc]) || xN[cLoc] || 0;
            oFyNcL = !(yN[cLoc] || '').match(ore) && parseFloat(yN[cLoc]) || yN[cLoc] || 0;
            // handle numeric vs string comparison - number < string - (Kyle Adams)
            if (isNaN(oFxNcL) !== isNaN(oFyNcL)) { return (isNaN(oFxNcL)) ? 1 : -1; }
            // rely on string comparison if different types - i.e. '02' < 2 != '02' < '2'
            else if (typeof oFxNcL !== typeof oFyNcL) {
              oFxNcL += '';
              oFyNcL += '';
            }
            if (oFxNcL < oFyNcL) return -1 * mult;
            if (oFxNcL > oFyNcL) return 1 * mult;
          }
          return 0;
        };
        break;
    }

    // sort null items to the bottom
    var sortNull = function(a, b) {
      var aNull = (a === null || a === undefined || Number.isNaN(a));
      var bNull = (b === null || b === undefined || Number.isNaN(b));

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

    this.filterItems();
  },

  moveLeaf: function(event, details, sender) {
    var right = sender.getAttribute('data-leaf-move') === 'right';

    var leafName = sender.getAttribute('data-leaf-name');
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

  buildFetch: function(type, key, path) {
    switch (type) {
      case 'url':
        return 'var resource = new Resource(' + key + ');\n\nreturn resource.get(\'json\');';

      default:
        return 'return item.' + path + '[\'' + key + '\'];';
    }
  },

  addSuggestedLeaf: function(event, details, sender) {
    var path = sender.getAttribute('data-path');
    var key = sender.getAttribute('data-key');

    // use just the last part of the URL as the property name
    var matches = key.match(/\/([^\/]+)$/);

    var shortKey = matches ? matches[1] : key;

    var value = this.items[0][path][key];
    var type = this.guessType(shortKey, value);

    var field = {
      name: path,
      fetch: this.buildFetch(type, key, path),
      title: this.titleCase(shortKey),
      depends: [path],
      type: type,
    };

    this.$.overlay.opened = false;

    var builder = this.shadowRoot.getElementById('builder');
    builder.addSuggestedLeaf(field);

    builder.shadowRoot.querySelector('doc-leaf:last-of-type').scrollIntoView();
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
          case 'name':
            return 'text';
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

  saveViews: function() {
    console.log('saving views');
    var storage = this.$.storage;

    this.views.forEach(function(view) {
      storage.saveView(view);
    });
  },

  export: function() {
    this.saveDescriptionFile();
    this.saveDataFile();
  },

  publicItem: function(item) {
    var output = {};

    Object.keys(item).forEach(function(key) {
      if (key[0] !== '_') {
        switch (key) {
          case 'complete':
          break;

          default:
          output[key] = item[key];
          break;
        }
      }
    });

    return output;
  },

  saveDescriptionFile: function() {
    var data = {
      seed: this.publicItem(this.seed),
      leaves: this.leaves.map(this.publicItem),
      views: this.views.map(this.publicItem)
    };

    this.exportData(data, 'json', this.db + '-description.json');
  },

  saveDataFile: function() {
    var items = this.items.map(function(item, index) {
      item.index = index;

      return this.$.storage.dehydrateItem(item, false);
    }.bind(this));

    this.exportData(items, 'json', this.db + '-data.json');

    this.saveDataCSVFile();
  },

  saveDataCSVFile: function() {
    var csvLeaves = this.leaves.filter(function(leaf) {
      return leaf.name !== 'seed';
    });

    var rows = this.displayItems.map(function(item) {
      return csvLeaves.map(function(leaf) {
        var value = item[leaf.name];

        switch (leaf.type) {
          case 'identifier':
          case 'number':
          case 'float':
          case 'text':
          case 'longtext':
          case 'boolean':
          break;

          case 'url':
          if (value instanceof URL) {
            value = value.href;
          }
          break;

          case 'date':
          if (value instanceof Date) {
            value = value.toISOString().substring(0, 10);
          }
          break;

          case 'list':
          if (Array.isArray(value)) {
            value = value.join(',');
          }
          break;

          case 'json':
          value = JSON.stringify(value);
          break;
        }

        return value;
      });
    }.bind(this));

    // header
    rows.unshift(csvLeaves.map(function(leaf) {
      return leaf.name;
    }));

    this.exportData(rows, 'csv', this.db + '.csv');
  },

  exportData: function(data, type, filename) {
    var output;

    switch (type) {
    case 'json':
      output = JSON.stringify(data, null, '  ');
      this.downloadDataAsFile(output, 'application/json', filename);
      break;

    case 'csv':
      var prepareCell = function(cell) {
        if (!cell) {
          return cell;
        }

        if (typeof cell !== 'string') {
          return cell;
        }

        if (cell.indexOf('"') !== -1) {
          // warning - problematic if the cell contains structure
          return '"' + cell.replace(/"/g, '""') + '"';
        }

        if (cell.indexOf('\n') !== -1) {
          return '"' + cell + '"';
        }

        return cell;
      };

      // generate CSV from data rows
      output = data.map(function(row) {
        return row.map(prepareCell).join(',');
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

    this.loadDescriptionURL(url);
  },

  loadDescriptionURL: function(url) {
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

    this.progress.leaves = 'loaded';

    this.views = data.views || [];
    this.saveViews();
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

    // this.loadViews(); // TODO
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
      var leaf = this.getLeafByName(filterName);
      var filterType = leaf.type;
      var filterValue = filter.value;

      switch (filterType) {
        case 'boolean':
          filterValue = filterValue === 'true' || filterValue === true;
          break;

        case 'number':
          filterValue = Number(filterValue);
          break;

        case 'float':
          filterValue = Number(filterValue);
          break;
      }

      console.log(filterValue, 'filterValue');

      this.displayItems = this.items.filter(function(item) {
        switch (filterType) {
          case 'list':
            return item[filterName] && item[filterName].indexOf(filterValue) !== -1;

          case 'date':
            return item[filterName] && item[filterName].toISOString().substr(0, 10) === filterValue;

          case 'counts':
            return item[filterName] && item[filterName].some(function(item) {
              return item.name === filterValue;
            });

          default:
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

  filterTable: function(event, details) {
    event.preventDefault();

    if (details.key && details.value) {
      this.filter = details;
      this.filterItems();
    } else {
      console.log('resetting filter');

      this.displayItems = this.items.map(function(item) {
        return item;
      });

      this.itemCount = this.displayItems.length;
      this.filter = null; // triggers repagination
      this.summariseLeaves();
    }
  },

  addView: function() {
    this.views.push({
      title: 'Untitled View',
    });
  },

  removeView: function(event, details, sender) {
    var index = sender.getAttribute('data-view-index');
    var view = this.views[index];

    this.$.storage.remove(view).then(function() {
      this.views.splice(index, 1);
    }.bind(this));
  },

  showObject: function(event, details) {
    console.log('show', details);

    this.leafPicker = details;
    this.$.overlay.opened = true;
  },

  // TODO: move these to a separate file
  summarisers: [
    {
      name: 'sum',
      label: 'Sum',
      type: 'float',
      types: ['number', 'float'],
      reduce: function(values) {
        return values.reduce(function(total, value) {
          return total + value;
        }, 0);
      }
    },
    {
      name: 'mean',
      label: 'Mean',
      type: 'float',
      types: ['number', 'float'],
      reduce: function(values) {
        var sum = values.reduce(function(sum, value) {
          return sum + value;
        }, 0);

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

        values.sort();

        var midpoint = Math.ceil(values.length / 2);

        if (values.length % 2 === 1) {
          return values[midpoint];
        }

        switch (leafType) {
          case 'number':
          case 'float':
            return (values[midpoint - 1] + values[midpoint]) / 2;

          default:
            return values[midpoint - 1];
        }
      }
    }
  ]
});
