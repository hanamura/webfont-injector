# webfont-injector

Simple APIs to load dynamic subsetting webfonts asynchronously.

## Usage

```javascript
// // you can use `require()` if you use browserify
// var WebfontInjector = require('webfont-injector');

// set font data
WebfontInjector.data = {
  '秀英明朝 M': 'typesquare',
  '秀英初号明朝 撰': 'typesquare',
  'FOT-筑紫ゴシック Pr5 R': 'fontplus',
  'FOT-筑紫A丸ゴシック Std R': 'fontplus'
};

setTimeout(function() {

  // append elements asynchronously
  var container = document.createElement('div');
  container.innerHTML = ''
    + '<div style="font-family: \'秀英明朝 M\', sans-serif">'
    +   'Load webfonts asynchronously. 非同期でウェブフォントをロード'
    + '</div>'
    + '<div style="font-family: \'秀英初号明朝 撰\', sans-serif">'
    +   'Load webfonts asynchronously. 非同期でウェブフォントをロード'
    + '</div>'
    + '<div style="font-family: \'FOT-筑紫ゴシック Pr5 R\', sans-serif">'
    +   'Load webfonts asynchronously. 非同期でウェブフォントをロード'
    + '</div>'
    + '<div style="font-family: \'FOT-筑紫A丸ゴシック Std R\', sans-serif">'
    +   'Load webfonts asynchronously. 非同期でウェブフォントをロード'
    + '</div>';
  document.body.appendChild(container);

  // load and inject webfonts asynchronously
  WebfontInjector.inject(container, function(err) {
    if (err) {
      console.log('error');
    } else {
      console.log('complete');
    }
  });

}, 1000);
```

## License

MIT
