'use strict';

var Queue = function(options) {
    this.options = options || {};
    this.name = this.options.name;
    this.parallel = this.options.parallel || 1; // how many requests can be running at the same time
    this.rateLimit = this.options.rateLimit || 25; // amount of time to wait between requests

    this.items = [];
    this.counter = 0;
    this.stopped = false;

    this.logs = []; // for use by success/failure handlers
};

Queue.prototype.stop = function(delay) {
    this.stopped = true;

    if (delay) {
        window.setTimeout(this.start.bind(this), delay);
    }
};

Queue.prototype.start = function() {
    this.stopped = false;
    this.next();
};

Queue.prototype.clear = function() {
    this.items = [];
    this.counter = 0;
};

Queue.prototype.next = function() {
    if (this.stopped) {
        return;
    }

    while (this.items.length && this.counter < this.parallel) {
        this.counter++;

        // continue on either success or failure
        var item = this.items.shift();

        item().then(this.onresult.bind(this), this.onresult.bind(this));
    }
};

Queue.prototype.onresult = function() {
    this.counter--;
    window.setTimeout(this.next.bind(this), this.rateLimit);
};

Queue.prototype.add = function(item) {
    if (item.priority) {
        this.items.unshift(item);
    } else {
        this.items.push(item);
    }

    this.next();
};

Queue.prototype.log = function(item) {
    if (this.logs.length > 4) {
        this.logs.pop();
    }

    this.logs.unshift(item);
};


