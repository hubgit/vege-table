/*globals Resource:false, Context:false, console:false */

'use strict';

var Collection = function(url, params) {
    Resource.call(this, url, params);
};

Collection.prototype = Object.create(Resource.prototype);
//Collection.prototype.constructor = Collection;

Collection.prototype.get = function(responseType, headers) {
    var collection = this;

    return new Promise(function(resolve, reject) {
        var result = [];

        var proceed = function(next) {
            if (next) {
                fetch(next);
            } else {
                resolve(result);
            }
        };

        var save = function(items) {
            items.forEach(function(item) {
                if (typeof collection.emit === 'function') {
                    collection.emit(item);
                } else {
                    result.push(item);
                }
            });
        };

        var fetch = function(url) {
            var resource = new Resource(url);

            resource.get(responseType, headers).then(function(response) {
                var next = collection.next(response, resource.request);

                // array = url + params
                if (next instanceof Array) {
                    next = next[0] + collection.buildQueryString(next[1]);
                }

                // TODO: make this a Promise?
                var items = collection.items(response, resource.request);

                if (!items) {
                    proceed(next); // set "next" to null?
                }

                switch (responseType) {
                    case 'jsonld':
                        Promise.all(items.map(function(item) {
                            return Context.parse(item);
                        })).then(function(items) {
                            save(items);
                            proceed(next);
                        }, function(e) {
                            console.warn(e);
                        });
                        break;

                    default:
                        save(items);
                        proceed(next);
                        break;
                }
            }, reject);
        };

        fetch(collection.url);
    }, function(e) {
        console.error(e);
    });
};

Collection.prototype.items = function(response, request) {
    switch (request.responseType) {
        case 'json':
            if (Array.isArray(response)) {
                return response;
            }
            // TODO: object vs array
            if (response._items) {
                return response._items;
            }

            return response;
    }
};

Collection.prototype.next = function(response, request) {
    // may not be allowed to read the Link header
    try {
        var linkHeader = request.xhr.getResponseHeader('Link');

        if (linkHeader) {
            var links = request.parseLinkHeader(linkHeader);

            if (links.next) {
                return links.next;
            }
        }
    } catch (e) {
        console.warn(e);
    }

    switch (request.responseType) {
        case 'json':
            if (Array.isArray(response)) {
                return null;
            }

            if (response._links && response._links.next) {
                return response._links.next.href;
            }

            return null;

        // TODO: rel="next" in HTML
    }
};
