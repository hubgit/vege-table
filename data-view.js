'use strict';

Polymer('data-view', {
  openEditor: function() {
    if (this.storage) {
      this.editing = this.view;

      this.async(function() {
        this.shadowRoot.getElementById('title').select();
      });
    }
  },

  closeEditor: function(event) {
    event.preventDefault();
    this.view = this.editing;
    this.editing = null;
    this.fire('view-changed');
    this.async(this.regenerate);
  },

  cancelEditor: function() {
    this.editing = null;
  },

  remove: function() {
    this.fire('remove-view');
  },

  itemsChanged: function() {
    this.regenerate();
  },

  regenerate: function() {
    var reducer = this.reducers[this.view.type].bind(this);
    this.data = reducer(this.items);

    if (this.view.type === 'counts') {
      this.viewData = this.data.slice(0, 50); // TODO: configurable
    }
  },

  getLeafByName: function(leafName) {
    for (var i = 0; i < this.leaves.length; i++) {
      var leaf = this.leaves[i];

      if (leaf.name === leafName) {
        return leaf;
      }
    }
  },

  removeView: function() {
    this.fire('remove-view');
  },

  filterTable: function(event, details, sender) {
    event.preventDefault();

    if (sender.classList.contains('active')) {
      this.fire('filter', null);
    } else {
      this.fire('filter', {
        key: this.view.leaf,
        value: sender.getAttribute('data-filter-value')
      });
    }
  },

  exportSummary: function() {
    var rows = this.data.map(function(row) {
      return [row.key, row.count];
    });

    rows.unshift([this.view.leaf, 'count']);

    this.fire('export-summary', {
      rows: rows,
      leaf: this.view.leaf
    });
  },

  exportValues: function() {
    var rows = this.data.map(function(row) {
      return [row.key];
    });

    this.fire('export-values', {
      rows: rows,
      leaf: this.view.leaf
    });
  },

  activeItem: function(item) {
    if (!this.filter) {
      return null;
    }

    if (this.filter.key !== this.view.leaf) {
      return null;
    }

    if (this.filter.value !== item.key) {
      return null;
    }

    return 'active';
  },

  reducers: {
    map: function(items) {
      if (!items.length) {
        return null;
      }

      var leafName = this.view.leaf;

      //console.log('items', items);

      var geojson = {
        type: 'FeatureCollection',
        features: []
      };

      items.forEach(function(item) {
        var value = item[leafName];
        var locations = Array.isArray(value) ? value : [value];

        locations.filter(function(location) {
          if (!location) {
            return false;
          }

          location.lat = parseFloat(location.lat);
          location.lng = parseFloat(location.lng);

          return location && Number.isFinite(location.lat) && Number.isFinite(location.lng);
        }).forEach(function(location) {
          var feature = {
            type: 'Feature',
            properties: {
              name: item.seed.name,
              popupContent: item.seed.description
            },
            geometry: {
              type: 'Point',
              coordinates: [location.lng, location.lat]
            }
          };

          geojson.features.push(feature);
        });
      });

      return geojson;
    },

    spotify: function(items) {
      var leafName = this.view.leaf;

      var tracks = [];

      items.forEach(function(item) {
        var value = item[leafName];

        // null or undefined
        if (value === null || value === undefined || value === '') {
          return;
        }

        if (Array.isArray(value)) {
          value.forEach(function(value) {
            tracks.push(value);
          });

          return;
        }

        tracks.push(value);
      });

      return 'spotify:trackset:vege-table:' + tracks.map(function(track) {
        return typeof track === 'object' ? track.uri : track;
      }).filter(function(value, index, self) {
        return self.indexOf(value) === index;
      }).slice(0,50).map(function(uri) {
        return uri.replace(/^spotify:track:/, '');
      }).join(',');
    },

    grid: function(items) {
      var leafName = this.view.leaf;
      var antileafName = this.view.antileaf;

      var counts = {};
      var columnCounts = {};
      var rowCounts = {};

      items.forEach(function(item) {
        var value = item[leafName];
        var antiValue = item[antileafName];

        if (!Array.isArray(value)) {
          value = [value];
        }

        if (!Array.isArray(antiValue)) {
          antiValue = [antiValue];
        }

        value.forEach(function(value) {
          antiValue.forEach(function(antiValue) {
            if (typeof columnCounts[value] === 'undefined') {
              columnCounts[value] = 0;
            }

            columnCounts[value]++;

            if (typeof rowCounts[antiValue] === 'undefined') {
              rowCounts[antiValue] = 0;
            }

            rowCounts[antiValue]++;

            if (typeof counts[antiValue] === 'undefined') {
              counts[antiValue] = {};
            }

            if (typeof counts[antiValue][value] === 'undefined') {
              counts[antiValue][value] = 0;
            }

            counts[antiValue][value]++;
          });
        });
      });

      var columns = Object.keys(columnCounts).sort(function(a, b) {
        return columnCounts[b] - columnCounts[a];
      }).slice(0, 10);

      var rows = Object.keys(rowCounts).sort(function(a, b) {
        return rowCounts[b] - rowCounts[a];
      }).slice(0, 10);

      var finalCounts = {};

      rows.forEach(function(row) {
        finalCounts[row] = {};

        columns.forEach(function(column) {
          finalCounts[row][column] = counts[row][column];
        });
      });

      return {
        x: columns,
        y: rows,
        counts: finalCounts
      };
    },

    nulls: function(items) {
      var leafName = this.view.leaf;

      var counts = items.reduce(function(counts, item) {
        if (item[leafName] === null || item[leafName] === undefined) {
          counts['true']++;
        } else {
          counts['false']++;
        }

        return counts;
      }, {
        'true': 0,
        'false': 0
      });

      return Object.keys(counts).map(function(key) {
        return {
          key: key,
          count: counts[key]
        };
      });

      // TODO: filtering
    },

    counts: function(items, leaf) {
      var leaf = this.getLeafByName(this.view.leaf);

      var leafName = leaf.name;
      var leafType = leaf.type;

      var values = items.map(function(item) {
        return item[leafName];
      });

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

          case 'boolean':
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
  }
});