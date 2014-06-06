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
    var leaf = this.getLeafByName(this.view.leaf);

    this.data = this.reducers[this.view.type](this.items, leaf);
    this.viewData = this.data.slice(0, 50); // TODO: configurable
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
    map: function(items, leaf) {
      if (!items.length) {
        return null;
      }

      var geojson = {
        type: 'FeatureCollection',
        features: items.filter(function(item) {
          var location = item[leaf.name];

          return location && Number.isFinite(location.lat) && Number.isFinite(location.lng);
        }).map(function(item) {
          var value = item[leaf.name];

          return {
            type: 'Feature',
            properties: {
              name: item.seed.name,
              popupContent: item.seed.description
            },
            geometry: {
              type: 'Point',
              coordinates: [value.lng, value.lat]
            }
          };
        })
      };

      return geojson;
    },

    counts: function(items, leaf) {
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