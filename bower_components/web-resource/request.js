/*global Queue:false, console: false */

'use strict';

var queuesList = [];

var queues = {};

var Request = function(options) {
    this.url = options.url; // URL
    this.method = options.method || 'GET'; // HTTP method
    this.responseType = options.responseType || ''; // response type (e.g. 'json', 'document', 'text', 'xml')
    this.headers = options.headers || {}; // e.g. { Accept: 'application/json' }
    this.data = options.data || null; // POST data

    this.priority = options.priority || false;
    this.tries = options.tries || 1;

    this.delay = {
        rate: options.delayRate || 10,
        server: options.delayServer || 1
    };

    this.originalURL = this.url; // as prepare() may alter the URL
    this.prepare();

    this.deferred = {};

    this.promise = new Promise(function(resolve, reject) {
        this.deferred.resolve = resolve;
        this.deferred.reject = reject;
    }.bind(this));
};

Request.prototype.prepare = function() {
    // override this to alter the URL
};

Request.prototype.abort = function() {
    this.xhr.abort();
};

Request.prototype.enqueue = function() {
    if (!this.queued) {
        var queueName = this.queueName();

        this.queue = queues[queueName];

        if (!this.queue) {
            this.queue = new Queue({ 
                name: queueName,
                rateLimit: this.delay.server,
            });
            queues[queueName] = this.queue;
            queuesList.push(this.queue);
        }

        this.queue.add(this.run.bind(this));

        this.queued = true;
    }

    return this.promise;
};

Request.prototype.run = function() {
    return new Promise(function(resolve, reject) {
        this.queue.log({
            status: '…',
            url: this.originalURL
        });

        var xhr = this.xhr = new XMLHttpRequest();

        var onresponse = function() {
            console.log(xhr.status, this.url);

            // TODO: wrong item if parallel > 1
            this.queue.logs[0].status = xhr.status;

            //console.log('response', xhr.response);

            switch (xhr.status) {
                case 200: // ok
                case 201: // ok
                case 204: // ok
                //case 301: // redirect (if nofollow)
                //case 302: // redirect (if nofollow)
                //case 303: // redirect (if nofollow)
                    this.deferred.resolve(xhr.response);
                    resolve();
                    break;

                case 403: // rate-limited or forbidden
                case 429: // rate-limited
                    var delay = this.rateLimitDelay(xhr);
                    
                    if (delay === -1) {
                        console.log('Forbidden!');
                        this.queue.stop();
                    } else {
                        console.log('Rate-limited: sleeping for', delay, 'seconds');
                        this.queue.stop(delay * 1000);
                        this.queue.items.unshift(this.run.bind(this)); // add this request back on to the start of the queue
                        //this.deferred.notify('rate-limit');
                    }
                
                    reject();
                    break;

                case 500: // server error
                case 503: // unknown error
                    this.queue.stop(this.delay.server);

                    if (--this.tries) {
                        this.queue.items.unshift(this.run.bind(this)); // add this request back on to start of the queue
                    }

                    this.deferred.reject({
                        xhr: xhr,
                        request: this,
                        message: xhr.statusText
                    });
                    reject();
                    break;

                default:
                    this.deferred.reject({
                        xhr: xhr,
                        request: this,
                        message: xhr.statusText
                    });
                    reject();
                    break;
            }
        }.bind(this);

        xhr.onload = xhr.onerror = onresponse;
        xhr.open(this.method, this.url);
        xhr.responseType = this.responseType;

        if (this.headers) {
            // TODO: compatibility
            Object.keys(this.headers).forEach(function(key) {
                xhr.setRequestHeader(key, this.headers[key]);
            }.bind(this));
        }

        xhr.send(this.data);
    }.bind(this));
};

Request.prototype.rateLimitDelay = function(xhr) {
    var remaining = xhr.getResponseHeader('x-rate-limit-remaining');
    
    if (remaining) {
        return -1;
    }
    
    var reset = xhr.getResponseHeader('x-rate-limit-reset');

    if (!reset) {
        reset = xhr.getResponseHeader('x-ratelimit-reset');
    }

    // use the default if no rate-limit header
    if (!reset) {
        return this.delay.rate;
    }

    var delay = Math.ceil(reset - (Date.now() / 1000));
    console.log('delay', reset, delay);

    // 15 minute delay if the given delay seems incorrect (can be due to server time differences)
    if (delay < 10) {
        delay = 60 * 15;
    }

    return delay;
};

Request.prototype.queueName = function() {
    var a = document.createElement('a');
    a.href = this.originalURL;

    return a.host;
};

Request.prototype.parseLinkHeader = function(header) {
  var links = {};

  header.split(/\s*,\s*/).forEach(function(headerPart) {
    var parts = headerPart.split(/\s*;\s*/);

    var url = parts[0].replace(/<(.*)>/, '$1').trim();
    var name = parts[1].replace(/rel="(.*)"/, '$1').trim();

    links[name] = url;
  });

  return links;
};

