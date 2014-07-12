/*global Request:false, console:false */

'use strict';

var Resource = function(url, params) {
    if (!(this instanceof Resource)) {
        return new Resource(url, params);
    }

    if (url instanceof URL) {
        url = url.href;
    }

    this.url = url;

    if (params) {
        this.url += this.buildQueryString(params);
    }
};

Resource.prototype.buildQueryString = function(params) {
    var items = Object.keys(params).map(function(key) {
        return encodeURIComponent(key) + '=' + encodeURIComponent(params[key]);
    });

    return items.length ? '?' + items.join('&').replace(/%20/g, '+') : '';
};

Resource.prototype.prepareHeaders = function(headers, responseType) {
    headers = headers || {};

    switch (responseType) {
        case 'json':
            headers.accept = headers.accept || 'application/json';
            break;

        case 'jsonld':
            headers.accept = headers.accept || 'application/ld+json';
            break;

        case 'html':
            headers.accept = headers.accept || 'text/html';
            break;

        case 'xml':
            headers.accept = headers.accept || 'application/xml';
            break;

        case 'csv':
            headers.accept = headers.accept || 'text/csv';
            break;
    }

    return headers;
};

Resource.prototype.prepareResponseType = function(responseType) {
    switch (responseType) {
        case 'html':
        case 'xml':
            responseType = 'document';
            break;

        case 'jsonld':
            responseType = 'json';
            break;

        case 'csv':
            responseType = 'text';
            break;
    }

    return responseType;
};

Resource.prototype.get = function(responseType, headers) {
    //TODO: allow { priority: true } as options parameter?

    var options = {
        url: this.url,
        headers: this.prepareHeaders(headers, responseType),
        responseType: this.prepareResponseType(responseType),
    };

    console.log('request', options);

    // TODO: separate requests for subsequent gets (different mimetypes, etc)
    // TODO: return request, or the enqueue promise?
    this.request = new Request(options);

    return this.request.enqueue().then(function(response) {
        switch (responseType) {
            case 'html':
                // Content-Location header isn't supported natively by browsers,
                // so add a base element to HTML if needed

                if (!response.querySelector('base')) {
                    var base = response.createElement('base');
                    base.href = this.request.xhr.getResponseHeader('Content-Location');
                    response.querySelector('head').appendChild(base);
                }
                break;
        }

        return response;
    }.bind(this));
};

Resource.prototype.head = function(responseType, headers) {
    var options = {
        url: this.url,
        method: 'HEAD',
        headers: this.prepareHeaders(headers, responseType),
    };

    console.log('request', options);

    // TODO: separate requests for subsequent gets (different mimetypes, etc)
    // TODO: return request, or the enqueue promise?
    this.request = new Request(options);

    return this.request.enqueue();
};

Resource.prototype.post = function(responseType, headers, data) {
    var options = {
        url: this.url,
        method: 'POST',
        headers: this.prepareHeaders(headers, responseType),
        data: data
    };

    console.log('request', options);

    // TODO: separate requests for subsequent gets (different mimetypes, etc)
    // TODO: return request, or the enqueue promise?
    this.request = new Request(options);

    return this.request.enqueue();
};

Resource.prototype.absolute = function(path) {
    var url = new URL(path, this.url);

    return url.href;
};

