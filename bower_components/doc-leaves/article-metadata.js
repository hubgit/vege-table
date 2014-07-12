'use strict';

Polymer('article-metadata', {
  storage: '',
  ready: function() {
    this.metadata = {};
  },
  storageChanged: function() {
    if (this.storage) {
      var value = window.localStorage.getItem(this.storage);

      this.metadata = JSON.parse(value) || {};
    }
  },
  metadataChanged: function() {
    var value = JSON.stringify(this.metadata);
    window.localStorage.setItem(this.storage, value);
  },
  addAuthor: function() {
    if (!this.metadata.authors) {
      this.metadata.authors = [];
    }

    this.metadata.authors.push({
      givenName: '',
      familyName: '',
      affiliations: []
    });

    this.async(function() {
      this.shadowRoot.querySelector('li:last-of-type article-author').openEditor();
    });
  },
  removeAuthor: function(event, details, sender) {
    var indexToRemove = sender.getAttribute('data-index');

    this.metadata.authors = this.metadata.authors.filter(function(author, index) {
      return index != indexToRemove;
    });

    this.metadataChanged();
  },
  addAffiliation: function() {
    if (!this.metadata.affiliations) {
      this.metadata.affiliations = [];
    }

    this.metadata.affiliations.push({
      department: '',
      institution: '',
      city: '',
      country: ''
    });

    this.async(function() {
      this.shadowRoot.querySelector('li:last-of-type article-affiliation').openEditor();
    });
  },
  removeAffiliation: function(event, details, sender) {
    var indexToRemove = sender.getAttribute('data-index');

    this.metadata.affiliations = this.metadata.affiliations.filter(function(author, index) {
      return index != indexToRemove;
    });

    this.metadataChanged();
  },
});