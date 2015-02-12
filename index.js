var async      = require('async');
var fontFamily = require('font-family');
var uuid       = require('node-uuid');

var generators = {
  fontplus:   require('./generators/fontplus'),
  typesquare: require('./generators/typesquare'),
};

// clean
// =====

var clean = function(text) {

  // trim and strip useless chars
  // ----------------------------

  text = text.trim().replace(/[\n\r\t]+/g, '');

  // unique chars
  // ------------

  var cho = {};
  for (var i = 0; i < text.length; ++i) {
    cho[text.charAt(i)] = true;
  }
  var cha = [];
  for (var ch in cho) {
    cha.push(ch);
  }
  return cha.join('');

};

// traverse
// ========

var traverse = function(nodes, callback) {

  // nodes is array
  // --------------

  if (Array.isArray(nodes)) {
    for (var i = 0; i < nodes.length; ++i) {
      traverse(nodes[i], callback);
    }
    return;
  }

  // node has children
  // -----------------

  if (nodes.children.length) {
    var text = '';
    var node;

    for (var i = 0; i < nodes.childNodes.length; ++i) {
      node = nodes.childNodes[i];

      if (node instanceof Comment) {
        continue;
      }
      if (node instanceof Text) {
        text += node.textContent;
        continue;
      }
      traverse(node, callback);
    }

    if (text) {
      callback(nodes, text);
    }
    return;
  }

  // node is leaf
  // ------------

  if (nodes.textContent) {
    callback(nodes, nodes.textContent);
    return;
  }
};

// createTarget
// ============

var createSet = function(elements) {

  var set = {};

  traverse(elements, function(element, text) {

    // computed font-family
    // --------------------

    var css = getComputedStyle(element).fontFamily;
    if (!css) {
      return;
    }

    // font names
    // ----------

    var names = fontFamily.parse(css);

    for (var i = 0; i < names.length; ++i) {
      var name = names[i];

      if (!set[name]) {
        set[name] = {text: '', elements: []};
      }
      set[name].text += element.textContent;
      set[name].elements.push(element);
    }

  });

  // clean
  // -----

  var clonedSet = {};
  for (var name in set) {
    clonedSet[name] = set[name];
  }
  for (var name in clonedSet) {
    set[name].text = clean(set[name].text);
    if (!(set[name].text = clean(set[name].text))) {
      delete set[name];
    }
  }

  return set;
};

// inject
// ======

var inject = function(elements, done) {
  var data = WebfontInjector.data;
  var set = createSet(elements);
  var tasks = [];

  for (var fontName in set) {
    if (!data[fontName]) {
      continue;
    }
    var source      = data[fontName];
    var text        = set[fontName].text;
    var elements    = set[fontName].elements;
    var newFontName = 'injected-' + uuid.v4() + '-' + fontName.replace(/\s/g, '-');

    if (generators[source]) {
      tasks.push(generators[source](elements, text, fontName, newFontName));
    }
  }

  async.parallel(tasks, done);
};

// export
// ======

var WebfontInjector = {
  data: {},
  inject: inject,
};

module.exports = WebfontInjector;
