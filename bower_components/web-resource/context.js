/*globals Resource:false */

'use strict';

window.Context = {
  contexts: {},

  parse: function(item) {
    var url = item['@context'];
    var promise = this.contexts[url];

    if (!promise) {
      var resource = new Resource(url);

      promise = this.contexts[url] = resource.get('json');
    }

    return promise.then(function(context) {
      return context['@context'] ? this.convert(item, context['@context']) : item;
    }.bind(this));
  },

  convert: function(item, context) {
    Object.keys(item).forEach(function(key) {
      if (!context[key]) {
          //delete item[key];
          return;
      }

      var url, type, container;
      var description = context[key];

      if (typeof description === 'string') {
          url = description;
          type = 'string';
          container = null;
      } else {
          url = description['@id'];
          type = description['@type'] || 'string';
          container = description['@container'];
      }

      if (!url) {
        return;
      }

      type = type.replace(/^http:\/\/www\.w3\.org\/2001\/XMLSchema#/, '');

      var value = item[key];
      delete item[key]; // TODO: keep the original key?

      // TODO: use schema.org and other ontologies for type mapping

      switch (typeof value) {
          case 'string':
              switch (type) {
                  case 'dateTime':
                      value = new Date(value);
                      break;

                  case '@id':
                      //value = new URL(value);
                      break;
              }

              switch (container) {
                  case '@list':
                  case '@set':
                      value = Array.isArray(value) ? value : [value];
                      break;
              }
              break;
      }


      item[url] = value;
    });

    return item;
  },
};
