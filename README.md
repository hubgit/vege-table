# vege-table

## Description

__vege-table__ is a [custom element](http://www.polymer-project.org/platform/custom-elements.html), built with [Polymer](http://www.polymer-project.org), that provides a web interface for building a table of data.

It does this by adding items (seeds) to a collection, then adding properties (leaves) to those items.

Each leaf is simply a JavaScript function, wrapped in a [promise](http://www.html5rocks.com/en/tutorials/es6/promises/). This allows the properties of items to be fetched asynchronously, and for leaves with dependencies to be chained together.

Once the table of data has been built, the data and table description can be exported and easily published online, viewed in the same interface but without the ability to update the data.

## Status

Pre-alpha. To create vege-tables you need to be able to write functions in JavaScript, set up some helper tools, and deal with things going unexpectedly wrong.

## Getting started

The easiest way to get started is to clone the [grocery-store](https://github.com/hubgit/grocery-store/) repository, copy one of the example folders (remove the .json files and add a unique `db` attribute to the `vege-table` element in `index.html`), then put the folder on a web server. There is admittedly little documentation at the moment, but hopefully that will improve soon…

Alternatively - or if you'd like to help with development - follow the full instructions below.

## Usage

1. Make sure you have [Bower](http://bower.io/) installed.
1. Create a new project folder, and run `bower init`.
1. Install vege-table and its dependencies: `bower install vege-table --save`
1. Create an `index.html` file.
1. Include the [Polymer](http://www.polymer-project.org) platform: `<script src="bower_components/platform/platform.js"></script>`
1. Use [an HTML import](http://www.polymer-project.org/platform/html-imports.html) to import the vege-table element: `<link rel="import" href="bower_components/vege-table/vege-table.html">`
1. Add the vege-table element to the page: `<vege-table db="your-database-name"></vege-table>`. Note that the “db” value should be a unique database identifier for each project.
1. Start a web server in the project folder: `python -m SimpleHTTPServer 9000` and open [http://localhost:9000/](http://localhost:9000/) in a web browser (ideally the very latest version of Chrome or Firefox).

Now you can add some seeds and some leaves to create your table.

To publish a table, export the data and description files and move them (as `data.json` and `description.json`) into the same folder as `index.html`. Then simply remove the `db` attribute from the `vege-table` element, and it will load everything from the exported files instead of the database.

## Important notes

There are several important things to bear in mind:

* There are bugs (both known and unknown) - this is still a very early release, and it uses some technologies that are not yet fully stable.
* __To get maximum performance, switch on Object.observe__: in Chrome 34, this is done by enabling “experimental JavaScript” in chrome://extensions - without Object.observe, polling objects for changes can get slow when there are a lot of items.
* Only some services add the CORS `Access-Control-Allow-Origin` header to their resources, so often resources cannot be fetched directly. To work around this (and providing benefits in other ways, such as caching), pass all request through [cache-proxy](https://github.com/hubgit/cache-proxy). View source on [an example table](examples/this-is-my-jam/) to see how to use `Request.prototype.prepare` to manipulate the URL before the request is sent.
* By default, IndexedDB (where the data is stored) is allowed to use up to 10% of the free disk space. After that, properties may start silently going missing and things may stop saving. TODO: investigate whether a browser extension will help with this.
* There’s very little error reporting yet, so keep the JavaScript console open to watch for progress and errors. ES6 Promises like to swallow exceptions, so sometimes nothing will be reported.

## Colophon

* [Polymer](http://www.polymer-project.org/)
* [CodeMirror](http://codemirror.net/)
* [Bootstrap](http://getbootstrap.com)
* [PouchDB](http://pouchdb.com/)
* [marked](https://github.com/chjj/marked)
* [prism](http://prismjs.com/)
* [web-resource](https://github.com/hubgit/web-resource)
* [cache-proxy](https://github.com/hubgit/cache-proxy)

## Inspirations

* [OpenRefine](http://openrefine.org/) / Google Refine / Piggybank / David Huynh
* Google Sheets / Apps Script / Fusion Tables
* [Tabulator](http://www.w3.org/2005/ajar/tab) / Tim Berners-Lee
* [Wolfram Language](http://www.wolfram.com/language/) / Stephen Wolfram
* [dat](http://dat-data.com/) / Max Ogden
* [R](http://www.r-project.org/) / [Hadley Wickham](http://had.co.nz/)
* [iPython Notebook](http://ipython.org/notebook.html)
* [ScraperWiki](https://scraperwiki.com/)
* [import.io](https://import.io)
* [Yahoo Pipes](http://pipes.yahoo.com/pipes/)
* Discussions in the [W3C CSV on the Web Working Group](http://www.w3.org/2013/csvw/), and the work of group chairs Jeni Tennison and Dan Brickley.

