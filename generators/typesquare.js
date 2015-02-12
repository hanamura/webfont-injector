var fontFamily = require('font-family');
var parse      = fontFamily.parse;
var stringify  = fontFamily.stringify;

module.exports = function(elements, text, fontName, newFontName) {

  return function(done) {

    // errors
    // ------

    if (Ts === undefined) {
      return done(new Error(
        'TypeSquare JavaScript API doesn’t exist'
      ), elements, text, fontName, newFontName);
    }
    if (typeof Ts.dynamicCss !== 'function') {
      return done(new Error(
        'Ts.dynamicCss() doesn’t exist'
      ), elements, text, fontName, newFontName);
    }

    // load
    // ----

    Ts.dynamicCss(function(res) {

      // error
      // -----

      if (res.code !== 0) {
        return done(new Error(
          'TypeSquare load error. code: ' + String(res.code)
        ), elements, text, fontName, newFontName);
      }

      // create style element
      // --------------------

      var style = document.createElement('style');
      style.textContent = res.data;
      document.head.appendChild(style);

      // apply font to elements
      // ----------------------

      var element;
      var names;

      for (var i = 0; i < elements.length; ++i) {
        element = elements[i];
        names = parse(element.style.fontFamily);
        names.unshift(newFontName);
        element.style.fontFamily = stringify(names);
      }

      // finish
      // ------

      return done(null, elements, text, fontName, newFontName);

    }, text, fontName, newFontName, '', '');

  };
};
