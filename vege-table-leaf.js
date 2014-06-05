/* globals Polymer:false, console:false */

'use strict';

Polymer('vege-table-leaf', {
  value: null,
  stringValue: null,
  type: '',
  specialType: true,
  specialTypes: ['json', 'html', 'xml', 'url', 'object', 'image', 'element', 'counts'],
  typeChanged: function() {
    this.specialType = (this.specialTypes.indexOf(this.type) !== -1);
  },
  valueChanged: function() {
    this.stringValue = this.convert();

    if (this.type == 'element') {
      this.$.element.innerHTML = '';
      this.$.element.appendChild(this.stringValue);
    }
  },
  convert: function() {
    if (this.value === null || this.value === undefined) {
      return null;
    }

    switch (this.type) {
      case 'json':
      return JSON.stringify(this.value, null, '  ');

      case 'number':
      return Math.round(this.value);

      case 'list':
      return this.value ? this.value.slice(0, 25).join('\n') : null; // TODO: remove slice

      case 'date':
      return this.value.toLocaleDateString(); // TODO: format

      case 'element':
      var element = document.createElement(this.value[0]);

      var attributes = this.value[1];
      Object.keys(attributes).forEach(function(key) {
        element[key] = attributes[key];
      });

      return element;

      //case 'url':
      //return this.value.href;

      //this.$.element.appendChild(element);
      //return;

      //var blob = new Blob([div.innerHTML], { type: 'text/html' });
      //return URL.createObjectURL(blob);

      default:
      return this.value;
    }
  },
  showObject: function() {
    var value = this.value;

    this.fire('show-object', {
      path: this.leafName,
      items: Object.keys(value).map(function(key) {
        return {
          key: key,
          value: JSON.stringify(value[key], null, '  ')
        };
      })
    });
  }
});