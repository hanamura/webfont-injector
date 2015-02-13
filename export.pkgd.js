var fontplusData   = require('./node_modules/webfont-list/data/fontplus');
var typesquareData = require('./node_modules/webfont-list/data/typesquare');

var data = {};

for (var i = 0; i < typesquareData.length; ++i) {
  for (var j = 0; j < typesquareData[i].cssNames.length; ++j) {
    data[typesquareData[i].cssNames[j]] = 'typesquare';
  }
}
for (var i = 0; i < fontplusData.length; ++i) {
  for (var j = 0; j < fontplusData[i].cssNames.length; ++j) {
    data[fontplusData[i].cssNames[j]] = 'fontplus';
  }
}

window.WebfontInjector = require('./index');
window.WebfontInjector.data = data;
