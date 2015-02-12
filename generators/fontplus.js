var fontFamily = require('font-family');
var parse      = fontFamily.parse;
var stringify  = fontFamily.stringify;

module.exports = function(elements, text, fontName, newFontName) {

  return function(done) {

    // errors
    // ------

    if (FONTPLUS === undefined) {
      return done(new Error(
        'FONTPLUS JavaScript API doesn’t exist'
      ), elements, text, fontName, newFontName);
    }
    if (typeof FONTPLUS.load !== 'function') {
      return done(new Error(
        'FONTPLUS.load() doesn’t exist'
      ), elements, text, fontName, newFontName);
    }

    // load
    // ----

    FONTPLUS.load([{
      fontname: fontName,
      nickname: newFontName,
      text:     text,
    }], function(res) {

      // error
      // -----

      if (res.code !== 0) {
        return done(new Error(
          'FONTPLUS load error. code: ' + String(res.code)
        ), elements, text, fontName, newFontName);
      }

      // apply font to element
      // ---------------------

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

    });

  };

};
