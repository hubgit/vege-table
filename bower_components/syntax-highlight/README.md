# &lt;syntax-highlight&gt;

A [Polymer](http://www.polymer-project.org) element for syntax highlighting with [Prism.js](http://prismjs.com/)

> Maintained by [Alf Eaton](https://github.com/hubgit).

## Demo

> [Check it live](http://addyosmani.github.io/syntax-highlight).

## Install

Install with [Bower](http://bower.io):

```sh
$ bower install --save syntax-highlight
```

## Usage

1. Import Web Components' polyfill:

```html
<script src="platform.js"></script>
```

2. Import Custom Element:

```html
<link rel="import" href="syntax-highlight.html">
```

3. Start using it!

```html
<pre is="syntax-highlight" language="javascript" content="{{ content }}"></pre>
```

## License

[MIT License](http://opensource.org/licenses/MIT)
