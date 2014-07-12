/* globals HTML:true, HTMLDocument:false */

'use strict';

window.HTML = {};

// get all properties as a key/value(s) object
HTML.microdata = function(node) {
  // select items of a certain type
  if (typeof node === 'string') {
    var root = arguments.length > 1 ? arguments[1] : document;
    return HTML.microdata(HTML.items(node, root));
  }

  // map an array of nodes
  if (Array.isArray(node)) {
    return node.map(HTML.microdata);
  }

  // the object always includes at least one itemtype
  var types = HTML.attrs('itemtype', node);

  var data = {
    type: types.length === 1 ? types[0] : types, // string, or array if multiple
  };

  HTML.propertyNodes(null, node).forEach(function(propertyNode) {
    var property = HTML.itemValue(propertyNode);

    HTML.attrs('itemprop', propertyNode).forEach(function(name) {
      /*
      if (typeof data[name] == 'undefined') {
        data[name] = [];
      }

      data[name].push(property);
      */

      // TODO: custom object that always return an array if iterated?
      // TODO: use schema.org ontology to decide if it's a singular or multiple property?

      if (typeof data[name] == 'undefined') {
        data[name] = property; // first item
      } else if (Array.isArray(data[name])) {
        data[name].push(property); // more items
      } else {
        data[name] = [data[name], property]; // second item
      }

    });
  });

  return data;
};

HTML.items = function(itemtype, node) {
  // only select top-level items
  return HTML.select(['[itemscope]:not([itemprop])'], node).filter(function(node) {
    // only find items of a certain itemtype
    return !itemtype || HTML.attrs('itemtype', node).indexOf(itemtype) !== -1;
  });
};

// get a space-separated attribute as an array
HTML.attrs = function(attribute, node) {
  var text = node.getAttribute(attribute) || '';

  return text.split(/\s+/).filter(function(item) {
    return item;
  });
};

// all property nodes, including those in referenced nodes
HTML.propertyNodes = function(itemprop, node) {
  var nodes = [node];

  HTML.attrs('itemref', node).forEach(function(id) {
    nodes.push(node.ownerDocument.getElementById(id));
  });

  var output = [];

  nodes.forEach(function(node) {
    var scopedProperties = HTML.select(['[itemscope] [itemprop]'], node);

    HTML.select(['[itemprop]'], node).filter(function(node) {
      return scopedProperties.indexOf(node) === -1;
    }).filter(function(node) {
      return !itemprop || HTML.attrs('itemprop', node).indexOf(itemprop) !== -1;
    }).forEach(function(node) {
      output.push(node);
    });
  });

  return output;
};

// get the value of a node
HTML.itemValue = function(node) {
  if (node.hasAttribute('itemscope')) {
    return HTML.microdata(node);
  }

  switch (node.nodeName) {
    case 'META':
    return node.getAttribute('content').trim();

    case 'DATA':
    case 'METER':
    return node.getAttribute('value').trim();

    case 'TIME':
    if (node.hasAttribute('datetime')) {
      return node.getAttribute('datetime').trim();
    }

    return node.textContent.trim();

    case 'AUDIO':
    case 'EMBED':
    case 'IFRAME':
    case 'IMG':
    case 'SOURCE':
    case 'TRACK':
    return node.src;

    case 'A':
    case 'AREA':
    case 'LINK':
    return node.href;

    case 'OBJECT':
    return node.getAttribute('data');

    default:
    return node.textContent.trim();
  }
};

// extract* functions derived from https://github.com/dnewcome/jath

// element-scoped querySelector/querySelectorAll
HTML.select = function(selector, template, node) {
  // TODO: extend the HTMLDocument and Element prototypes and avoid this parameter?
  if (!node) {
    if (template instanceof HTMLDocument || template instanceof Element) {
      node = template;
      template = null;
    } else {
      node = document;
    }
  }

  // split selector if attribute matched
  var attributePosition = selector.indexOf('@');
  if (attributePosition !== -1) {
    template = selector.substring(attributePosition).trim();
    selector = selector.substring(0, attributePosition).trim();
  }

  // avoid Polymer's querySelectorAll shim
  if (typeof window.unwrap === 'function') {
    node = window.unwrap(node);
  }

  var item;

  if (selector) {
    if (Array.isArray(selector)) {
      selector = selector[0];

      // document queries shouldn't have scope
      if (!(node instanceof HTMLDocument)) {
        selector = ':scope ' + selector;
      }

      var items = node.querySelectorAll(selector);
      console.log(items.length + ' items selected', template);
      items = Array.prototype.slice.call(items);

      if (!template) {
        return items;
      }

      return items.map(function(item) {
        return HTML.extract(template, item);
      });
    }

    // document queries shouldn't have scope
    if (!(node instanceof HTMLDocument)) {
      selector = ':scope ' + selector;
    }

    item = node.querySelector(selector);
  } else {
    item = node;
  }

  if (!item) {
    return null;
  }

  if (!template) {
    return item;
  }

  return HTML.extract(template, item);
};

HTML.extract = function(template, node) {
  node = node || document;

  if (Array.isArray(template)) {
    return HTML.select(template, '.', node);
  }

  if (typeof template === 'object') {
    return HTML.extractObject(template, node);
  }

  return HTML.extractItem(template, node);
};

HTML.extractObject = function(template, node) {
  var output = {};

  Object.keys(template).forEach(function(key) {
    output[key] = HTML.select(template[key], '.', node);
  });

  return output;
};

HTML.extractItem = function(template, node) {
  // TODO: template as function

  if (template.substring(0, 1) === ':') {
    return template.substring(1); // literal value, from template
  }

  var attributeName;
  var attributePosition = template.indexOf('@');

  if (attributePosition !== -1) {
    attributeName = template.substring(attributePosition + 1).trim();
    template = template.substring(0, attributePosition).trim();
  }

  var itemNode = (template && template !== '.') ? node.querySelector(template) : node;

  if (!itemNode) {
    return null;
  }

  if (attributeName) {
    // special attributes
    if (['href', 'src', 'data'].indexOf(attributeName) !== -1) {
      return itemNode[attributeName];
    }

    return itemNode.getAttribute(attributeName);
  }

  return itemNode.textContent.trim();
};