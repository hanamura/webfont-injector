(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

},{"./index":4,"./node_modules/webfont-list/data/fontplus":9,"./node_modules/webfont-list/data/typesquare":10}],2:[function(require,module,exports){
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
        names = parse(getComputedStyle(element).fontFamily);
        index = names.indexOf(fontName);
        if (~ index) {
          names.splice(index, 1, newFontName);
          element.style.fontFamily = stringify(names);
        }
      }

      // finish
      // ------

      return done(null, elements, text, fontName, newFontName);

    });

  };

};

},{"font-family":7}],3:[function(require,module,exports){
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
        names = parse(getComputedStyle(element).fontFamily);
        index = names.indexOf(fontName);
        if (~ index) {
          names.splice(index, 1, newFontName);
          element.style.fontFamily = stringify(names);
        }
      }

      // finish
      // ------

      return done(null, elements, text, fontName, newFontName);

    }, text, fontName, newFontName, '', '');

  };
};

},{"font-family":7}],4:[function(require,module,exports){
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

},{"./generators/fontplus":2,"./generators/typesquare":3,"async":5,"font-family":7,"node-uuid":8}],5:[function(require,module,exports){
(function (process){
/*!
 * async
 * https://github.com/caolan/async
 *
 * Copyright 2010-2014 Caolan McMahon
 * Released under the MIT license
 */
/*jshint onevar: false, indent:4 */
/*global setImmediate: false, setTimeout: false, console: false */
(function () {

    var async = {};

    // global on the server, window in the browser
    var root, previous_async;

    root = this;
    if (root != null) {
      previous_async = root.async;
    }

    async.noConflict = function () {
        root.async = previous_async;
        return async;
    };

    function only_once(fn) {
        var called = false;
        return function() {
            if (called) throw new Error("Callback was already called.");
            called = true;
            fn.apply(root, arguments);
        }
    }

    //// cross-browser compatiblity functions ////

    var _toString = Object.prototype.toString;

    var _isArray = Array.isArray || function (obj) {
        return _toString.call(obj) === '[object Array]';
    };

    var _each = function (arr, iterator) {
        if (arr.forEach) {
            return arr.forEach(iterator);
        }
        for (var i = 0; i < arr.length; i += 1) {
            iterator(arr[i], i, arr);
        }
    };

    var _map = function (arr, iterator) {
        if (arr.map) {
            return arr.map(iterator);
        }
        var results = [];
        _each(arr, function (x, i, a) {
            results.push(iterator(x, i, a));
        });
        return results;
    };

    var _reduce = function (arr, iterator, memo) {
        if (arr.reduce) {
            return arr.reduce(iterator, memo);
        }
        _each(arr, function (x, i, a) {
            memo = iterator(memo, x, i, a);
        });
        return memo;
    };

    var _keys = function (obj) {
        if (Object.keys) {
            return Object.keys(obj);
        }
        var keys = [];
        for (var k in obj) {
            if (obj.hasOwnProperty(k)) {
                keys.push(k);
            }
        }
        return keys;
    };

    //// exported async module functions ////

    //// nextTick implementation with browser-compatible fallback ////
    if (typeof process === 'undefined' || !(process.nextTick)) {
        if (typeof setImmediate === 'function') {
            async.nextTick = function (fn) {
                // not a direct alias for IE10 compatibility
                setImmediate(fn);
            };
            async.setImmediate = async.nextTick;
        }
        else {
            async.nextTick = function (fn) {
                setTimeout(fn, 0);
            };
            async.setImmediate = async.nextTick;
        }
    }
    else {
        async.nextTick = process.nextTick;
        if (typeof setImmediate !== 'undefined') {
            async.setImmediate = function (fn) {
              // not a direct alias for IE10 compatibility
              setImmediate(fn);
            };
        }
        else {
            async.setImmediate = async.nextTick;
        }
    }

    async.each = function (arr, iterator, callback) {
        callback = callback || function () {};
        if (!arr.length) {
            return callback();
        }
        var completed = 0;
        _each(arr, function (x) {
            iterator(x, only_once(done) );
        });
        function done(err) {
          if (err) {
              callback(err);
              callback = function () {};
          }
          else {
              completed += 1;
              if (completed >= arr.length) {
                  callback();
              }
          }
        }
    };
    async.forEach = async.each;

    async.eachSeries = function (arr, iterator, callback) {
        callback = callback || function () {};
        if (!arr.length) {
            return callback();
        }
        var completed = 0;
        var iterate = function () {
            iterator(arr[completed], function (err) {
                if (err) {
                    callback(err);
                    callback = function () {};
                }
                else {
                    completed += 1;
                    if (completed >= arr.length) {
                        callback();
                    }
                    else {
                        iterate();
                    }
                }
            });
        };
        iterate();
    };
    async.forEachSeries = async.eachSeries;

    async.eachLimit = function (arr, limit, iterator, callback) {
        var fn = _eachLimit(limit);
        fn.apply(null, [arr, iterator, callback]);
    };
    async.forEachLimit = async.eachLimit;

    var _eachLimit = function (limit) {

        return function (arr, iterator, callback) {
            callback = callback || function () {};
            if (!arr.length || limit <= 0) {
                return callback();
            }
            var completed = 0;
            var started = 0;
            var running = 0;

            (function replenish () {
                if (completed >= arr.length) {
                    return callback();
                }

                while (running < limit && started < arr.length) {
                    started += 1;
                    running += 1;
                    iterator(arr[started - 1], function (err) {
                        if (err) {
                            callback(err);
                            callback = function () {};
                        }
                        else {
                            completed += 1;
                            running -= 1;
                            if (completed >= arr.length) {
                                callback();
                            }
                            else {
                                replenish();
                            }
                        }
                    });
                }
            })();
        };
    };


    var doParallel = function (fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [async.each].concat(args));
        };
    };
    var doParallelLimit = function(limit, fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [_eachLimit(limit)].concat(args));
        };
    };
    var doSeries = function (fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [async.eachSeries].concat(args));
        };
    };


    var _asyncMap = function (eachfn, arr, iterator, callback) {
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        if (!callback) {
            eachfn(arr, function (x, callback) {
                iterator(x.value, function (err) {
                    callback(err);
                });
            });
        } else {
            var results = [];
            eachfn(arr, function (x, callback) {
                iterator(x.value, function (err, v) {
                    results[x.index] = v;
                    callback(err);
                });
            }, function (err) {
                callback(err, results);
            });
        }
    };
    async.map = doParallel(_asyncMap);
    async.mapSeries = doSeries(_asyncMap);
    async.mapLimit = function (arr, limit, iterator, callback) {
        return _mapLimit(limit)(arr, iterator, callback);
    };

    var _mapLimit = function(limit) {
        return doParallelLimit(limit, _asyncMap);
    };

    // reduce only has a series version, as doing reduce in parallel won't
    // work in many situations.
    async.reduce = function (arr, memo, iterator, callback) {
        async.eachSeries(arr, function (x, callback) {
            iterator(memo, x, function (err, v) {
                memo = v;
                callback(err);
            });
        }, function (err) {
            callback(err, memo);
        });
    };
    // inject alias
    async.inject = async.reduce;
    // foldl alias
    async.foldl = async.reduce;

    async.reduceRight = function (arr, memo, iterator, callback) {
        var reversed = _map(arr, function (x) {
            return x;
        }).reverse();
        async.reduce(reversed, memo, iterator, callback);
    };
    // foldr alias
    async.foldr = async.reduceRight;

    var _filter = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (v) {
                if (v) {
                    results.push(x);
                }
                callback();
            });
        }, function (err) {
            callback(_map(results.sort(function (a, b) {
                return a.index - b.index;
            }), function (x) {
                return x.value;
            }));
        });
    };
    async.filter = doParallel(_filter);
    async.filterSeries = doSeries(_filter);
    // select alias
    async.select = async.filter;
    async.selectSeries = async.filterSeries;

    var _reject = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (v) {
                if (!v) {
                    results.push(x);
                }
                callback();
            });
        }, function (err) {
            callback(_map(results.sort(function (a, b) {
                return a.index - b.index;
            }), function (x) {
                return x.value;
            }));
        });
    };
    async.reject = doParallel(_reject);
    async.rejectSeries = doSeries(_reject);

    var _detect = function (eachfn, arr, iterator, main_callback) {
        eachfn(arr, function (x, callback) {
            iterator(x, function (result) {
                if (result) {
                    main_callback(x);
                    main_callback = function () {};
                }
                else {
                    callback();
                }
            });
        }, function (err) {
            main_callback();
        });
    };
    async.detect = doParallel(_detect);
    async.detectSeries = doSeries(_detect);

    async.some = function (arr, iterator, main_callback) {
        async.each(arr, function (x, callback) {
            iterator(x, function (v) {
                if (v) {
                    main_callback(true);
                    main_callback = function () {};
                }
                callback();
            });
        }, function (err) {
            main_callback(false);
        });
    };
    // any alias
    async.any = async.some;

    async.every = function (arr, iterator, main_callback) {
        async.each(arr, function (x, callback) {
            iterator(x, function (v) {
                if (!v) {
                    main_callback(false);
                    main_callback = function () {};
                }
                callback();
            });
        }, function (err) {
            main_callback(true);
        });
    };
    // all alias
    async.all = async.every;

    async.sortBy = function (arr, iterator, callback) {
        async.map(arr, function (x, callback) {
            iterator(x, function (err, criteria) {
                if (err) {
                    callback(err);
                }
                else {
                    callback(null, {value: x, criteria: criteria});
                }
            });
        }, function (err, results) {
            if (err) {
                return callback(err);
            }
            else {
                var fn = function (left, right) {
                    var a = left.criteria, b = right.criteria;
                    return a < b ? -1 : a > b ? 1 : 0;
                };
                callback(null, _map(results.sort(fn), function (x) {
                    return x.value;
                }));
            }
        });
    };

    async.auto = function (tasks, callback) {
        callback = callback || function () {};
        var keys = _keys(tasks);
        var remainingTasks = keys.length
        if (!remainingTasks) {
            return callback();
        }

        var results = {};

        var listeners = [];
        var addListener = function (fn) {
            listeners.unshift(fn);
        };
        var removeListener = function (fn) {
            for (var i = 0; i < listeners.length; i += 1) {
                if (listeners[i] === fn) {
                    listeners.splice(i, 1);
                    return;
                }
            }
        };
        var taskComplete = function () {
            remainingTasks--
            _each(listeners.slice(0), function (fn) {
                fn();
            });
        };

        addListener(function () {
            if (!remainingTasks) {
                var theCallback = callback;
                // prevent final callback from calling itself if it errors
                callback = function () {};

                theCallback(null, results);
            }
        });

        _each(keys, function (k) {
            var task = _isArray(tasks[k]) ? tasks[k]: [tasks[k]];
            var taskCallback = function (err) {
                var args = Array.prototype.slice.call(arguments, 1);
                if (args.length <= 1) {
                    args = args[0];
                }
                if (err) {
                    var safeResults = {};
                    _each(_keys(results), function(rkey) {
                        safeResults[rkey] = results[rkey];
                    });
                    safeResults[k] = args;
                    callback(err, safeResults);
                    // stop subsequent errors hitting callback multiple times
                    callback = function () {};
                }
                else {
                    results[k] = args;
                    async.setImmediate(taskComplete);
                }
            };
            var requires = task.slice(0, Math.abs(task.length - 1)) || [];
            var ready = function () {
                return _reduce(requires, function (a, x) {
                    return (a && results.hasOwnProperty(x));
                }, true) && !results.hasOwnProperty(k);
            };
            if (ready()) {
                task[task.length - 1](taskCallback, results);
            }
            else {
                var listener = function () {
                    if (ready()) {
                        removeListener(listener);
                        task[task.length - 1](taskCallback, results);
                    }
                };
                addListener(listener);
            }
        });
    };

    async.retry = function(times, task, callback) {
        var DEFAULT_TIMES = 5;
        var attempts = [];
        // Use defaults if times not passed
        if (typeof times === 'function') {
            callback = task;
            task = times;
            times = DEFAULT_TIMES;
        }
        // Make sure times is a number
        times = parseInt(times, 10) || DEFAULT_TIMES;
        var wrappedTask = function(wrappedCallback, wrappedResults) {
            var retryAttempt = function(task, finalAttempt) {
                return function(seriesCallback) {
                    task(function(err, result){
                        seriesCallback(!err || finalAttempt, {err: err, result: result});
                    }, wrappedResults);
                };
            };
            while (times) {
                attempts.push(retryAttempt(task, !(times-=1)));
            }
            async.series(attempts, function(done, data){
                data = data[data.length - 1];
                (wrappedCallback || callback)(data.err, data.result);
            });
        }
        // If a callback is passed, run this as a controll flow
        return callback ? wrappedTask() : wrappedTask
    };

    async.waterfall = function (tasks, callback) {
        callback = callback || function () {};
        if (!_isArray(tasks)) {
          var err = new Error('First argument to waterfall must be an array of functions');
          return callback(err);
        }
        if (!tasks.length) {
            return callback();
        }
        var wrapIterator = function (iterator) {
            return function (err) {
                if (err) {
                    callback.apply(null, arguments);
                    callback = function () {};
                }
                else {
                    var args = Array.prototype.slice.call(arguments, 1);
                    var next = iterator.next();
                    if (next) {
                        args.push(wrapIterator(next));
                    }
                    else {
                        args.push(callback);
                    }
                    async.setImmediate(function () {
                        iterator.apply(null, args);
                    });
                }
            };
        };
        wrapIterator(async.iterator(tasks))();
    };

    var _parallel = function(eachfn, tasks, callback) {
        callback = callback || function () {};
        if (_isArray(tasks)) {
            eachfn.map(tasks, function (fn, callback) {
                if (fn) {
                    fn(function (err) {
                        var args = Array.prototype.slice.call(arguments, 1);
                        if (args.length <= 1) {
                            args = args[0];
                        }
                        callback.call(null, err, args);
                    });
                }
            }, callback);
        }
        else {
            var results = {};
            eachfn.each(_keys(tasks), function (k, callback) {
                tasks[k](function (err) {
                    var args = Array.prototype.slice.call(arguments, 1);
                    if (args.length <= 1) {
                        args = args[0];
                    }
                    results[k] = args;
                    callback(err);
                });
            }, function (err) {
                callback(err, results);
            });
        }
    };

    async.parallel = function (tasks, callback) {
        _parallel({ map: async.map, each: async.each }, tasks, callback);
    };

    async.parallelLimit = function(tasks, limit, callback) {
        _parallel({ map: _mapLimit(limit), each: _eachLimit(limit) }, tasks, callback);
    };

    async.series = function (tasks, callback) {
        callback = callback || function () {};
        if (_isArray(tasks)) {
            async.mapSeries(tasks, function (fn, callback) {
                if (fn) {
                    fn(function (err) {
                        var args = Array.prototype.slice.call(arguments, 1);
                        if (args.length <= 1) {
                            args = args[0];
                        }
                        callback.call(null, err, args);
                    });
                }
            }, callback);
        }
        else {
            var results = {};
            async.eachSeries(_keys(tasks), function (k, callback) {
                tasks[k](function (err) {
                    var args = Array.prototype.slice.call(arguments, 1);
                    if (args.length <= 1) {
                        args = args[0];
                    }
                    results[k] = args;
                    callback(err);
                });
            }, function (err) {
                callback(err, results);
            });
        }
    };

    async.iterator = function (tasks) {
        var makeCallback = function (index) {
            var fn = function () {
                if (tasks.length) {
                    tasks[index].apply(null, arguments);
                }
                return fn.next();
            };
            fn.next = function () {
                return (index < tasks.length - 1) ? makeCallback(index + 1): null;
            };
            return fn;
        };
        return makeCallback(0);
    };

    async.apply = function (fn) {
        var args = Array.prototype.slice.call(arguments, 1);
        return function () {
            return fn.apply(
                null, args.concat(Array.prototype.slice.call(arguments))
            );
        };
    };

    var _concat = function (eachfn, arr, fn, callback) {
        var r = [];
        eachfn(arr, function (x, cb) {
            fn(x, function (err, y) {
                r = r.concat(y || []);
                cb(err);
            });
        }, function (err) {
            callback(err, r);
        });
    };
    async.concat = doParallel(_concat);
    async.concatSeries = doSeries(_concat);

    async.whilst = function (test, iterator, callback) {
        if (test()) {
            iterator(function (err) {
                if (err) {
                    return callback(err);
                }
                async.whilst(test, iterator, callback);
            });
        }
        else {
            callback();
        }
    };

    async.doWhilst = function (iterator, test, callback) {
        iterator(function (err) {
            if (err) {
                return callback(err);
            }
            var args = Array.prototype.slice.call(arguments, 1);
            if (test.apply(null, args)) {
                async.doWhilst(iterator, test, callback);
            }
            else {
                callback();
            }
        });
    };

    async.until = function (test, iterator, callback) {
        if (!test()) {
            iterator(function (err) {
                if (err) {
                    return callback(err);
                }
                async.until(test, iterator, callback);
            });
        }
        else {
            callback();
        }
    };

    async.doUntil = function (iterator, test, callback) {
        iterator(function (err) {
            if (err) {
                return callback(err);
            }
            var args = Array.prototype.slice.call(arguments, 1);
            if (!test.apply(null, args)) {
                async.doUntil(iterator, test, callback);
            }
            else {
                callback();
            }
        });
    };

    async.queue = function (worker, concurrency) {
        if (concurrency === undefined) {
            concurrency = 1;
        }
        function _insert(q, data, pos, callback) {
          if (!q.started){
            q.started = true;
          }
          if (!_isArray(data)) {
              data = [data];
          }
          if(data.length == 0) {
             // call drain immediately if there are no tasks
             return async.setImmediate(function() {
                 if (q.drain) {
                     q.drain();
                 }
             });
          }
          _each(data, function(task) {
              var item = {
                  data: task,
                  callback: typeof callback === 'function' ? callback : null
              };

              if (pos) {
                q.tasks.unshift(item);
              } else {
                q.tasks.push(item);
              }

              if (q.saturated && q.tasks.length === q.concurrency) {
                  q.saturated();
              }
              async.setImmediate(q.process);
          });
        }

        var workers = 0;
        var q = {
            tasks: [],
            concurrency: concurrency,
            saturated: null,
            empty: null,
            drain: null,
            started: false,
            paused: false,
            push: function (data, callback) {
              _insert(q, data, false, callback);
            },
            kill: function () {
              q.drain = null;
              q.tasks = [];
            },
            unshift: function (data, callback) {
              _insert(q, data, true, callback);
            },
            process: function () {
                if (!q.paused && workers < q.concurrency && q.tasks.length) {
                    var task = q.tasks.shift();
                    if (q.empty && q.tasks.length === 0) {
                        q.empty();
                    }
                    workers += 1;
                    var next = function () {
                        workers -= 1;
                        if (task.callback) {
                            task.callback.apply(task, arguments);
                        }
                        if (q.drain && q.tasks.length + workers === 0) {
                            q.drain();
                        }
                        q.process();
                    };
                    var cb = only_once(next);
                    worker(task.data, cb);
                }
            },
            length: function () {
                return q.tasks.length;
            },
            running: function () {
                return workers;
            },
            idle: function() {
                return q.tasks.length + workers === 0;
            },
            pause: function () {
                if (q.paused === true) { return; }
                q.paused = true;
                q.process();
            },
            resume: function () {
                if (q.paused === false) { return; }
                q.paused = false;
                q.process();
            }
        };
        return q;
    };
    
    async.priorityQueue = function (worker, concurrency) {
        
        function _compareTasks(a, b){
          return a.priority - b.priority;
        };
        
        function _binarySearch(sequence, item, compare) {
          var beg = -1,
              end = sequence.length - 1;
          while (beg < end) {
            var mid = beg + ((end - beg + 1) >>> 1);
            if (compare(item, sequence[mid]) >= 0) {
              beg = mid;
            } else {
              end = mid - 1;
            }
          }
          return beg;
        }
        
        function _insert(q, data, priority, callback) {
          if (!q.started){
            q.started = true;
          }
          if (!_isArray(data)) {
              data = [data];
          }
          if(data.length == 0) {
             // call drain immediately if there are no tasks
             return async.setImmediate(function() {
                 if (q.drain) {
                     q.drain();
                 }
             });
          }
          _each(data, function(task) {
              var item = {
                  data: task,
                  priority: priority,
                  callback: typeof callback === 'function' ? callback : null
              };
              
              q.tasks.splice(_binarySearch(q.tasks, item, _compareTasks) + 1, 0, item);

              if (q.saturated && q.tasks.length === q.concurrency) {
                  q.saturated();
              }
              async.setImmediate(q.process);
          });
        }
        
        // Start with a normal queue
        var q = async.queue(worker, concurrency);
        
        // Override push to accept second parameter representing priority
        q.push = function (data, priority, callback) {
          _insert(q, data, priority, callback);
        };
        
        // Remove unshift function
        delete q.unshift;

        return q;
    };

    async.cargo = function (worker, payload) {
        var working     = false,
            tasks       = [];

        var cargo = {
            tasks: tasks,
            payload: payload,
            saturated: null,
            empty: null,
            drain: null,
            drained: true,
            push: function (data, callback) {
                if (!_isArray(data)) {
                    data = [data];
                }
                _each(data, function(task) {
                    tasks.push({
                        data: task,
                        callback: typeof callback === 'function' ? callback : null
                    });
                    cargo.drained = false;
                    if (cargo.saturated && tasks.length === payload) {
                        cargo.saturated();
                    }
                });
                async.setImmediate(cargo.process);
            },
            process: function process() {
                if (working) return;
                if (tasks.length === 0) {
                    if(cargo.drain && !cargo.drained) cargo.drain();
                    cargo.drained = true;
                    return;
                }

                var ts = typeof payload === 'number'
                            ? tasks.splice(0, payload)
                            : tasks.splice(0, tasks.length);

                var ds = _map(ts, function (task) {
                    return task.data;
                });

                if(cargo.empty) cargo.empty();
                working = true;
                worker(ds, function () {
                    working = false;

                    var args = arguments;
                    _each(ts, function (data) {
                        if (data.callback) {
                            data.callback.apply(null, args);
                        }
                    });

                    process();
                });
            },
            length: function () {
                return tasks.length;
            },
            running: function () {
                return working;
            }
        };
        return cargo;
    };

    var _console_fn = function (name) {
        return function (fn) {
            var args = Array.prototype.slice.call(arguments, 1);
            fn.apply(null, args.concat([function (err) {
                var args = Array.prototype.slice.call(arguments, 1);
                if (typeof console !== 'undefined') {
                    if (err) {
                        if (console.error) {
                            console.error(err);
                        }
                    }
                    else if (console[name]) {
                        _each(args, function (x) {
                            console[name](x);
                        });
                    }
                }
            }]));
        };
    };
    async.log = _console_fn('log');
    async.dir = _console_fn('dir');
    /*async.info = _console_fn('info');
    async.warn = _console_fn('warn');
    async.error = _console_fn('error');*/

    async.memoize = function (fn, hasher) {
        var memo = {};
        var queues = {};
        hasher = hasher || function (x) {
            return x;
        };
        var memoized = function () {
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            var key = hasher.apply(null, args);
            if (key in memo) {
                async.nextTick(function () {
                    callback.apply(null, memo[key]);
                });
            }
            else if (key in queues) {
                queues[key].push(callback);
            }
            else {
                queues[key] = [callback];
                fn.apply(null, args.concat([function () {
                    memo[key] = arguments;
                    var q = queues[key];
                    delete queues[key];
                    for (var i = 0, l = q.length; i < l; i++) {
                      q[i].apply(null, arguments);
                    }
                }]));
            }
        };
        memoized.memo = memo;
        memoized.unmemoized = fn;
        return memoized;
    };

    async.unmemoize = function (fn) {
      return function () {
        return (fn.unmemoized || fn).apply(null, arguments);
      };
    };

    async.times = function (count, iterator, callback) {
        var counter = [];
        for (var i = 0; i < count; i++) {
            counter.push(i);
        }
        return async.map(counter, iterator, callback);
    };

    async.timesSeries = function (count, iterator, callback) {
        var counter = [];
        for (var i = 0; i < count; i++) {
            counter.push(i);
        }
        return async.mapSeries(counter, iterator, callback);
    };

    async.seq = function (/* functions... */) {
        var fns = arguments;
        return function () {
            var that = this;
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            async.reduce(fns, args, function (newargs, fn, cb) {
                fn.apply(that, newargs.concat([function () {
                    var err = arguments[0];
                    var nextargs = Array.prototype.slice.call(arguments, 1);
                    cb(err, nextargs);
                }]))
            },
            function (err, results) {
                callback.apply(that, [err].concat(results));
            });
        };
    };

    async.compose = function (/* functions... */) {
      return async.seq.apply(null, Array.prototype.reverse.call(arguments));
    };

    var _applyEach = function (eachfn, fns /*args...*/) {
        var go = function () {
            var that = this;
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            return eachfn(fns, function (fn, cb) {
                fn.apply(that, args.concat([cb]));
            },
            callback);
        };
        if (arguments.length > 2) {
            var args = Array.prototype.slice.call(arguments, 2);
            return go.apply(this, args);
        }
        else {
            return go;
        }
    };
    async.applyEach = doParallel(_applyEach);
    async.applyEachSeries = doSeries(_applyEach);

    async.forever = function (fn, callback) {
        function next(err) {
            if (err) {
                if (callback) {
                    return callback(err);
                }
                throw err;
            }
            fn(next);
        }
        next();
    };

    // Node.js
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = async;
    }
    // AMD / RequireJS
    else if (typeof define !== 'undefined' && define.amd) {
        define([], function () {
            return async;
        });
    }
    // included directly via <script> tag
    else {
        root.async = async;
    }

}());

}).call(this,require('_process'))
},{"_process":6}],6:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;

function drainQueue() {
    if (draining) {
        return;
    }
    draining = true;
    var currentQueue;
    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        var i = -1;
        while (++i < len) {
            currentQueue[i]();
        }
        len = queue.length;
    }
    draining = false;
}
process.nextTick = function (fun) {
    queue.push(fun);
    if (!draining) {
        setTimeout(drainQueue, 0);
    }
};

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],7:[function(require,module,exports){
// parse
// =====

// states
// ------

var PLAIN      = 0;
var STRINGS    = 1;
var ESCAPING   = 2;
var IDENTIFIER = 3;
var SEPARATING = 4;

// patterns
// --------

var identifierPattern = /[a-z0-9_-]/i;
var spacePattern      = /[\s\t]/;

// ---

var parse = function(str) {

  // vars
  // ----

  var starting = true;
  var state    = PLAIN;
  var buffer   = '';
  var i        = 0;
  var quote;
  var c;

  // result
  // ------

  var names  = [];

  // parse
  // -----

  while (true) {

    c = str[i];

    if (state === PLAIN) {

      if (!c && starting) {

        break;

      } else if (!c && !starting) {

        throw new Error('Parse error');

      } else if (c === '"' || c === "'") {

        quote = c;
        state = STRINGS;
        starting = false;

      } else if (spacePattern.test(c)) {
      } else if (identifierPattern.test(c)) {

        state = IDENTIFIER;
        starting = false;
        i--;

      } else {

        throw new Error('Parse error');

      }

    } else if (state === STRINGS) {

      if (!c) {

        throw new Error('Parse Error');

      } else if (c === "\\") {

        state = ESCAPING;

      } else if (c === quote) {

        names.push(buffer);
        buffer = '';
        state = SEPARATING;

      } else {

        buffer += c;

      }

    } else if (state === ESCAPING) {

      if (c === quote || c === "\\") {

        buffer += c;
        state = STRINGS;

      } else {

        throw new Error('Parse error');

      }

    } else if (state === IDENTIFIER) {

      if (!c) {

        names.push(buffer);
        break;

      } else if (identifierPattern.test(c)) {

        buffer += c;

      } else if (c === ',') {

        names.push(buffer);
        buffer = '';
        state = PLAIN;

      } else if (spacePattern.test(c)) {

        names.push(buffer);
        buffer = '';
        state = SEPARATING;

      } else {

        throw new Error('Parse error');

      }

    } else if (state === SEPARATING) {

      if (!c) {

        break;

      } else if (c === ',') {

        state = PLAIN;

      } else if (spacePattern.test(c)) {
      } else {

        throw new Error('Parse error');

      }

    }

    i++;

  }

  // result
  // ------

  return names;

};

// stringify
// =========

// pattern
// -------

var stringsPattern = /[^a-z0-9_-]/i;

// ---

var stringify = function(names, options) {

  // quote
  // -----

  var quote = options && options.quote || '"';
  if (quote !== '"' && quote !== "'") {
    throw new Error('Quote must be `\'` or `"`');
  }
  var quotePattern = new RegExp(quote, 'g');

  // stringify
  // ---------

  var safeNames = [];

  for (var i = 0; i < names.length; ++i) {
    var name = names[i];

    if (stringsPattern.test(name)) {
      name = name
        .replace(/\\/g, "\\\\")
        .replace(quotePattern, "\\" + quote);
      name = quote + name + quote;
    }
    safeNames.push(name);
  }

  // result
  // ------

  return safeNames.join(', ');
};

// export
// ======

module.exports = {
  parse:     parse,
  stringify: stringify,
};

},{}],8:[function(require,module,exports){
//     uuid.js
//
//     Copyright (c) 2010-2012 Robert Kieffer
//     MIT License - http://opensource.org/licenses/mit-license.php

(function() {
  var _global = this;

  // Unique ID creation requires a high quality random # generator.  We feature
  // detect to determine the best RNG source, normalizing to a function that
  // returns 128-bits of randomness, since that's what's usually required
  var _rng;

  // Node.js crypto-based RNG - http://nodejs.org/docs/v0.6.2/api/crypto.html
  //
  // Moderately fast, high quality
  if (typeof(_global.require) == 'function') {
    try {
      var _rb = _global.require('crypto').randomBytes;
      _rng = _rb && function() {return _rb(16);};
    } catch(e) {}
  }

  if (!_rng && _global.crypto && crypto.getRandomValues) {
    // WHATWG crypto-based RNG - http://wiki.whatwg.org/wiki/Crypto
    //
    // Moderately fast, high quality
    var _rnds8 = new Uint8Array(16);
    _rng = function whatwgRNG() {
      crypto.getRandomValues(_rnds8);
      return _rnds8;
    };
  }

  if (!_rng) {
    // Math.random()-based (RNG)
    //
    // If all else fails, use Math.random().  It's fast, but is of unspecified
    // quality.
    var  _rnds = new Array(16);
    _rng = function() {
      for (var i = 0, r; i < 16; i++) {
        if ((i & 0x03) === 0) r = Math.random() * 0x100000000;
        _rnds[i] = r >>> ((i & 0x03) << 3) & 0xff;
      }

      return _rnds;
    };
  }

  // Buffer class to use
  var BufferClass = typeof(_global.Buffer) == 'function' ? _global.Buffer : Array;

  // Maps for number <-> hex string conversion
  var _byteToHex = [];
  var _hexToByte = {};
  for (var i = 0; i < 256; i++) {
    _byteToHex[i] = (i + 0x100).toString(16).substr(1);
    _hexToByte[_byteToHex[i]] = i;
  }

  // **`parse()` - Parse a UUID into it's component bytes**
  function parse(s, buf, offset) {
    var i = (buf && offset) || 0, ii = 0;

    buf = buf || [];
    s.toLowerCase().replace(/[0-9a-f]{2}/g, function(oct) {
      if (ii < 16) { // Don't overflow!
        buf[i + ii++] = _hexToByte[oct];
      }
    });

    // Zero out remaining bytes if string was short
    while (ii < 16) {
      buf[i + ii++] = 0;
    }

    return buf;
  }

  // **`unparse()` - Convert UUID byte array (ala parse()) into a string**
  function unparse(buf, offset) {
    var i = offset || 0, bth = _byteToHex;
    return  bth[buf[i++]] + bth[buf[i++]] +
            bth[buf[i++]] + bth[buf[i++]] + '-' +
            bth[buf[i++]] + bth[buf[i++]] + '-' +
            bth[buf[i++]] + bth[buf[i++]] + '-' +
            bth[buf[i++]] + bth[buf[i++]] + '-' +
            bth[buf[i++]] + bth[buf[i++]] +
            bth[buf[i++]] + bth[buf[i++]] +
            bth[buf[i++]] + bth[buf[i++]];
  }

  // **`v1()` - Generate time-based UUID**
  //
  // Inspired by https://github.com/LiosK/UUID.js
  // and http://docs.python.org/library/uuid.html

  // random #'s we need to init node and clockseq
  var _seedBytes = _rng();

  // Per 4.5, create and 48-bit node id, (47 random bits + multicast bit = 1)
  var _nodeId = [
    _seedBytes[0] | 0x01,
    _seedBytes[1], _seedBytes[2], _seedBytes[3], _seedBytes[4], _seedBytes[5]
  ];

  // Per 4.2.2, randomize (14 bit) clockseq
  var _clockseq = (_seedBytes[6] << 8 | _seedBytes[7]) & 0x3fff;

  // Previous uuid creation time
  var _lastMSecs = 0, _lastNSecs = 0;

  // See https://github.com/broofa/node-uuid for API details
  function v1(options, buf, offset) {
    var i = buf && offset || 0;
    var b = buf || [];

    options = options || {};

    var clockseq = options.clockseq != null ? options.clockseq : _clockseq;

    // UUID timestamps are 100 nano-second units since the Gregorian epoch,
    // (1582-10-15 00:00).  JSNumbers aren't precise enough for this, so
    // time is handled internally as 'msecs' (integer milliseconds) and 'nsecs'
    // (100-nanoseconds offset from msecs) since unix epoch, 1970-01-01 00:00.
    var msecs = options.msecs != null ? options.msecs : new Date().getTime();

    // Per 4.2.1.2, use count of uuid's generated during the current clock
    // cycle to simulate higher resolution clock
    var nsecs = options.nsecs != null ? options.nsecs : _lastNSecs + 1;

    // Time since last uuid creation (in msecs)
    var dt = (msecs - _lastMSecs) + (nsecs - _lastNSecs)/10000;

    // Per 4.2.1.2, Bump clockseq on clock regression
    if (dt < 0 && options.clockseq == null) {
      clockseq = clockseq + 1 & 0x3fff;
    }

    // Reset nsecs if clock regresses (new clockseq) or we've moved onto a new
    // time interval
    if ((dt < 0 || msecs > _lastMSecs) && options.nsecs == null) {
      nsecs = 0;
    }

    // Per 4.2.1.2 Throw error if too many uuids are requested
    if (nsecs >= 10000) {
      throw new Error('uuid.v1(): Can\'t create more than 10M uuids/sec');
    }

    _lastMSecs = msecs;
    _lastNSecs = nsecs;
    _clockseq = clockseq;

    // Per 4.1.4 - Convert from unix epoch to Gregorian epoch
    msecs += 12219292800000;

    // `time_low`
    var tl = ((msecs & 0xfffffff) * 10000 + nsecs) % 0x100000000;
    b[i++] = tl >>> 24 & 0xff;
    b[i++] = tl >>> 16 & 0xff;
    b[i++] = tl >>> 8 & 0xff;
    b[i++] = tl & 0xff;

    // `time_mid`
    var tmh = (msecs / 0x100000000 * 10000) & 0xfffffff;
    b[i++] = tmh >>> 8 & 0xff;
    b[i++] = tmh & 0xff;

    // `time_high_and_version`
    b[i++] = tmh >>> 24 & 0xf | 0x10; // include version
    b[i++] = tmh >>> 16 & 0xff;

    // `clock_seq_hi_and_reserved` (Per 4.2.2 - include variant)
    b[i++] = clockseq >>> 8 | 0x80;

    // `clock_seq_low`
    b[i++] = clockseq & 0xff;

    // `node`
    var node = options.node || _nodeId;
    for (var n = 0; n < 6; n++) {
      b[i + n] = node[n];
    }

    return buf ? buf : unparse(b);
  }

  // **`v4()` - Generate random UUID**

  // See https://github.com/broofa/node-uuid for API details
  function v4(options, buf, offset) {
    // Deprecated - 'format' argument, as supported in v1.2
    var i = buf && offset || 0;

    if (typeof(options) == 'string') {
      buf = options == 'binary' ? new BufferClass(16) : null;
      options = null;
    }
    options = options || {};

    var rnds = options.random || (options.rng || _rng)();

    // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`
    rnds[6] = (rnds[6] & 0x0f) | 0x40;
    rnds[8] = (rnds[8] & 0x3f) | 0x80;

    // Copy bytes to buffer, if provided
    if (buf) {
      for (var ii = 0; ii < 16; ii++) {
        buf[i + ii] = rnds[ii];
      }
    }

    return buf || unparse(rnds);
  }

  // Export public API
  var uuid = v4;
  uuid.v1 = v1;
  uuid.v4 = v4;
  uuid.parse = parse;
  uuid.unparse = unparse;
  uuid.BufferClass = BufferClass;

  if (typeof define === 'function' && define.amd) {
    // Publish as AMD module
    define(function() {return uuid;});
  } else if (typeof(module) != 'undefined' && module.exports) {
    // Publish as node.js module
    module.exports = uuid;
  } else {
    // Publish as global (in browsers)
    var _previousRoot = _global.uuid;

    // **`noConflict()` - (browser only) to reset global 'uuid' var**
    uuid.noConflict = function() {
      _global.uuid = _previousRoot;
      return uuid;
    };

    _global.uuid = uuid;
  }
}).call(this);

},{}],9:[function(require,module,exports){
module.exports=[
	{
		"fontName": "筑紫A丸ゴシック Std L",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "丸ゴシック系",
		"cssNames": [
			"FOT-筑紫A丸ゴシック Std L",
			"TsukuARdGothicStd-L"
		]
	},
	{
		"fontName": "筑紫A丸ゴシック Std R",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "丸ゴシック系",
		"cssNames": [
			"FOT-筑紫A丸ゴシック Std R",
			"TsukuARdGothicStd-R"
		]
	},
	{
		"fontName": "筑紫A丸ゴシック Std M",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "丸ゴシック系",
		"cssNames": [
			"FOT-筑紫A丸ゴシック Std M",
			"TsukuARdGothicStd-M"
		]
	},
	{
		"fontName": "筑紫A丸ゴシック Std D",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "丸ゴシック系",
		"cssNames": [
			"FOT-筑紫A丸ゴシック Std D",
			"TsukuARdGothicStd-D"
		]
	},
	{
		"fontName": "筑紫A丸ゴシック Std B",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "丸ゴシック系",
		"cssNames": [
			"FOT-筑紫A丸ゴシック Std B",
			"TsukuARdGothicStd-B"
		]
	},
	{
		"fontName": "筑紫A丸ゴシック Std E",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "丸ゴシック系",
		"cssNames": [
			"FOT-筑紫A丸ゴシック Std E",
			"TsukuARdGothicStd-E"
		]
	},
	{
		"fontName": "筑紫B丸ゴシック Std L",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "丸ゴシック系",
		"cssNames": [
			"FOT-筑紫B丸ゴシック Std L",
			"TsukuBRdGothicStd-L"
		]
	},
	{
		"fontName": "筑紫B丸ゴシック Std R",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "丸ゴシック系",
		"cssNames": [
			"FOT-筑紫B丸ゴシック Std R",
			"TsukuBRdGothicStd-R"
		]
	},
	{
		"fontName": "筑紫B丸ゴシック Std M",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "丸ゴシック系",
		"cssNames": [
			"FOT-筑紫B丸ゴシック Std M",
			"TsukuBRdGothicStd-M"
		]
	},
	{
		"fontName": "筑紫B丸ゴシック Std D",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "丸ゴシック系",
		"cssNames": [
			"FOT-筑紫B丸ゴシック Std D",
			"TsukuBRdGothicStd-D"
		]
	},
	{
		"fontName": "筑紫B丸ゴシック Std B",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "丸ゴシック系",
		"cssNames": [
			"FOT-筑紫B丸ゴシック Std B",
			"TsukuBRdGothicStd-B"
		]
	},
	{
		"fontName": "筑紫B丸ゴシック Std E",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "丸ゴシック系",
		"cssNames": [
			"FOT-筑紫B丸ゴシック Std E",
			"TsukuBRdGothicStd-E"
		]
	},
	{
		"fontName": "筑紫明朝 Pr5 B",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-筑紫明朝 Pr5 B",
			"TsukuMinPr5-B"
		]
	},
	{
		"fontName": "筑紫明朝 Pr5 E",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-筑紫明朝 Pr5 E",
			"TsukuMinPr5-E"
		]
	},
	{
		"fontName": "筑紫明朝 Pr5 H",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-筑紫明朝 Pr5 H",
			"TsukuMinPr5-HV"
		]
	},
	{
		"fontName": "筑紫明朝 Pr5N B",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-筑紫明朝 Pr5N B",
			"TsukuMinPr5N-B"
		]
	},
	{
		"fontName": "筑紫明朝 Pr5N E",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-筑紫明朝 Pr5N E",
			"TsukuMinPr5N-E"
		]
	},
	{
		"fontName": "筑紫明朝 Pr5N H",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-筑紫明朝 Pr5N H",
			"TsukuMinPr5N-HV"
		]
	},
	{
		"fontName": "筑紫明朝 Pr6 L",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-筑紫明朝 Pr6 L",
			"TsukuMinPr6-L"
		]
	},
	{
		"fontName": "筑紫明朝 Pr6 LB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-筑紫明朝 Pr6 LB",
			"TsukuMinPr6-LB"
		]
	},
	{
		"fontName": "筑紫明朝 Pr6 R",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-筑紫明朝 Pr6 R",
			"TsukuMinPr6-R"
		]
	},
	{
		"fontName": "筑紫明朝 Pr6 RB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-筑紫明朝 Pr6 RB",
			"TsukuMinPr6-RB"
		]
	},
	{
		"fontName": "筑紫明朝 Pr6 M",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-筑紫明朝 Pr6 M",
			"TsukuMinPr6-M"
		]
	},
	{
		"fontName": "筑紫明朝 Pr6 D",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-筑紫明朝 Pr6 D",
			"TsukuMinPr6-D"
		]
	},
	{
		"fontName": "筑紫明朝 Pr6N L",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-筑紫明朝 Pr6N L",
			"TsukuMinPr6N-L"
		]
	},
	{
		"fontName": "筑紫明朝 Pr6N LB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-筑紫明朝 Pr6N LB",
			"TsukuMinPr6N-LB"
		]
	},
	{
		"fontName": "筑紫明朝 Pr6N R",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-筑紫明朝 Pr6N R",
			"TsukuMinPr6N-R"
		]
	},
	{
		"fontName": "筑紫明朝 Pr6N RB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-筑紫明朝 Pr6N RB",
			"TsukuMinPr6N-RB"
		]
	},
	{
		"fontName": "筑紫明朝 Pr6N M",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-筑紫明朝 Pr6N M",
			"TsukuMinPr6N-M"
		]
	},
	{
		"fontName": "筑紫明朝 Pr6N D",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-筑紫明朝 Pr6N D",
			"TsukuMinPr6N-D"
		]
	},
	{
		"fontName": "筑紫オールド明朝 Pro R",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-筑紫オールド明朝 Pro R",
			"TsukuOldMinPro-R"
		]
	},
	{
		"fontName": "筑紫A見出ミン Std E",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-筑紫A見出ミン Std E",
			"TsukuAMDMinStd-E"
		]
	},
	{
		"fontName": "筑紫B見出ミン Std E",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-筑紫B見出ミン Std E",
			"TsukuBMDMinStd-E"
		]
	},
	{
		"fontName": "筑紫ゴシック Pro B",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-筑紫ゴシック Pro B",
			"TsukuGoPro-B"
		]
	},
	{
		"fontName": "筑紫ゴシック Pro E",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-筑紫ゴシック Pro E",
			"TsukuGoPro-E"
		]
	},
	{
		"fontName": "筑紫ゴシック Pro H",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-筑紫ゴシック Pro H",
			"TsukuGoPro-H"
		]
	},
	{
		"fontName": "筑紫ゴシック Pro U",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-筑紫ゴシック Pro U",
			"TsukuGoPro-U"
		]
	},
	{
		"fontName": "筑紫ゴシック Pr5 L",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-筑紫ゴシック Pr5 L",
			"TsukuGoPr5-L"
		]
	},
	{
		"fontName": "筑紫ゴシック Pr5 R",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-筑紫ゴシック Pr5 R",
			"TsukuGoPr5-R"
		]
	},
	{
		"fontName": "筑紫ゴシック Pr5 M",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-筑紫ゴシック Pr5 M",
			"TsukuGoPr5-M"
		]
	},
	{
		"fontName": "筑紫ゴシック Pr5 D",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-筑紫ゴシック Pr5 D",
			"TsukuGoPr5-D"
		]
	},
	{
		"fontName": "筑紫ゴシック Pr5N L",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-筑紫ゴシック Pr5N L",
			"TsukuGoPr5N-L"
		]
	},
	{
		"fontName": "筑紫ゴシック Pr5N R",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-筑紫ゴシック Pr5N R",
			"TsukuGoPr5N-R"
		]
	},
	{
		"fontName": "筑紫ゴシック Pr5N M",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-筑紫ゴシック Pr5N M",
			"TsukuGoPr5N-M"
		]
	},
	{
		"fontName": "筑紫ゴシック Pr5N D",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-筑紫ゴシック Pr5N D",
			"TsukuGoPr5N-D"
		]
	},
	{
		"fontName": "スーラ Pro L",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "丸ゴシック系",
		"cssNames": [
			"FOT-スーラ Pro L",
			"SeuratPro-L"
		]
	},
	{
		"fontName": "スーラ Pro M",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "丸ゴシック系",
		"cssNames": [
			"FOT-スーラ Pro M",
			"SeuratPro-M"
		]
	},
	{
		"fontName": "スーラ Pro DB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "丸ゴシック系",
		"cssNames": [
			"FOT-スーラ Pro DB",
			"SeuratPro-DB"
		]
	},
	{
		"fontName": "スーラ Pro B",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "丸ゴシック系",
		"cssNames": [
			"FOT-スーラ Pro B",
			"SeuratPro-B"
		]
	},
	{
		"fontName": "スーラ Pro EB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "丸ゴシック系",
		"cssNames": [
			"FOT-スーラ Pro EB",
			"SeuratPro-EB"
		]
	},
	{
		"fontName": "スーラ Pro UB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "丸ゴシック系",
		"cssNames": [
			"FOT-スーラ Pro UB",
			"SeuratPro-UB"
		]
	},
	{
		"fontName": "スーラ ProN L",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "丸ゴシック系",
		"cssNames": [
			"FOT-スーラ ProN L",
			"SeuratProN-L"
		]
	},
	{
		"fontName": "スーラ ProN M",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "丸ゴシック系",
		"cssNames": [
			"FOT-スーラ ProN M",
			"SeuratProN-M"
		]
	},
	{
		"fontName": "スーラ ProN DB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "丸ゴシック系",
		"cssNames": [
			"FOT-スーラ ProN DB",
			"SeuratProN-DB"
		]
	},
	{
		"fontName": "スーラ ProN B",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "丸ゴシック系",
		"cssNames": [
			"FOT-スーラ ProN B",
			"SeuratProN-B"
		]
	},
	{
		"fontName": "スーラ ProN EB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "丸ゴシック系",
		"cssNames": [
			"FOT-スーラ ProN EB",
			"SeuratProN-EB"
		]
	},
	{
		"fontName": "スーラ ProN UB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "丸ゴシック系",
		"cssNames": [
			"FOT-スーラ ProN UB",
			"SeuratProN-UB"
		]
	},
	{
		"fontName": "学参丸ゴ Pro M",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "専門書体",
		"cssNames": [
			"FOT-学参丸ゴ Pro M",
			"GMaruGoPro-M"
		]
	},
	{
		"fontName": "学参丸ゴ Pro DB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "専門書体",
		"cssNames": [
			"FOT-学参丸ゴ Pro DB",
			"GMaruGoPro-DB"
		]
	},
	{
		"fontName": "学参丸ゴ Pro B",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "専門書体",
		"cssNames": [
			"FOT-学参丸ゴ Pro B",
			"GMaruGoPro-B"
		]
	},
	{
		"fontName": "ロダン Pro L",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ロダン Pro L",
			"RodinPro-L"
		]
	},
	{
		"fontName": "ロダン Pro M",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ロダン Pro M",
			"RodinPro-M"
		]
	},
	{
		"fontName": "ロダン Pro DB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ロダン Pro DB",
			"RodinPro-DB"
		]
	},
	{
		"fontName": "ロダン Pro B",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ロダン Pro B",
			"RodinPro-B"
		]
	},
	{
		"fontName": "ロダン Pro EB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ロダン Pro EB",
			"RodinPro-EB"
		]
	},
	{
		"fontName": "ロダン Pro UB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ロダン Pro UB",
			"RodinPro-UB"
		]
	},
	{
		"fontName": "ロダン ProN L",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ロダン ProN L",
			"RodinProN-L"
		]
	},
	{
		"fontName": "ロダン ProN M",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ロダン ProN M",
			"RodinProN-M"
		]
	},
	{
		"fontName": "ロダン ProN DB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ロダン ProN DB",
			"RodinProN-DB"
		]
	},
	{
		"fontName": "ロダン ProN B",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ロダン ProN B",
			"RodinProN-B"
		]
	},
	{
		"fontName": "ロダン ProN EB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ロダン ProN EB",
			"RodinProN-EB"
		]
	},
	{
		"fontName": "ロダン ProN UB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ロダン ProN UB",
			"RodinProN-UB"
		]
	},
	{
		"fontName": "ニューロダン Pro L",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ニューロダン Pro L",
			"NewRodinPro-L"
		]
	},
	{
		"fontName": "ニューロダン Pro M",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ニューロダン Pro M",
			"NewRodinPro-M"
		]
	},
	{
		"fontName": "ニューロダン Pro DB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ニューロダン Pro DB",
			"NewRodinPro-DB"
		]
	},
	{
		"fontName": "ニューロダン Pro B",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ニューロダン Pro B",
			"NewRodinPro-B"
		]
	},
	{
		"fontName": "ニューロダン Pro EB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ニューロダン Pro EB",
			"NewRodinPro-EB"
		]
	},
	{
		"fontName": "ニューロダン Pro UB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ニューロダン Pro UB",
			"NewRodinPro-UB"
		]
	},
	{
		"fontName": "ニューロダン ProN L",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ニューロダン ProN L",
			"NewRodinProN-L"
		]
	},
	{
		"fontName": "ニューロダン ProN M",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ニューロダン ProN M",
			"NewRodinProN-M"
		]
	},
	{
		"fontName": "ニューロダン ProN DB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ニューロダン ProN DB",
			"NewRodinProN-DB"
		]
	},
	{
		"fontName": "ニューロダン ProN B",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ニューロダン ProN B",
			"NewRodinProN-B"
		]
	},
	{
		"fontName": "ニューロダン ProN EB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ニューロダン ProN EB",
			"NewRodinProN-EB"
		]
	},
	{
		"fontName": "ニューロダン ProN UB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ニューロダン ProN UB",
			"NewRodinProN-UB"
		]
	},
	{
		"fontName": "セザンヌ Pro M",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-セザンヌ Pro M",
			"CezannePro-M"
		]
	},
	{
		"fontName": "セザンヌ Pro DB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-セザンヌ Pro DB",
			"CezannePro-DB"
		]
	},
	{
		"fontName": "セザンヌ Pro B",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-セザンヌ Pro B",
			"CezannePro-B"
		]
	},
	{
		"fontName": "セザンヌ Pro EB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-セザンヌ Pro EB",
			"CezannePro-EB"
		]
	},
	{
		"fontName": "セザンヌ ProN M",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-セザンヌ ProN M",
			"CezanneProN-M"
		]
	},
	{
		"fontName": "セザンヌ ProN DB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-セザンヌ ProN DB",
			"CezanneProN-DB"
		]
	},
	{
		"fontName": "セザンヌ ProN B",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-セザンヌ ProN B",
			"CezanneProN-B"
		]
	},
	{
		"fontName": "セザンヌ ProN EB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-セザンヌ ProN EB",
			"CezanneProN-EB"
		]
	},
	{
		"fontName": "ニューセザンヌ Pro M",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ニューセザンヌ Pro M",
			"NewCezannePro-M"
		]
	},
	{
		"fontName": "ニューセザンヌ Pro DB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ニューセザンヌ Pro DB",
			"NewCezannePro-DB"
		]
	},
	{
		"fontName": "ニューセザンヌ Pro B",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ニューセザンヌ Pro B",
			"NewCezannePro-B"
		]
	},
	{
		"fontName": "ニューセザンヌ Pro EB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ニューセザンヌ Pro EB",
			"NewCezannePro-EB"
		]
	},
	{
		"fontName": "ニューセザンヌ ProN M",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ニューセザンヌ ProN M",
			"NewCezanneProN-M"
		]
	},
	{
		"fontName": "ニューセザンヌ ProN DB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ニューセザンヌ ProN DB",
			"NewCezanneProN-DB"
		]
	},
	{
		"fontName": "ニューセザンヌ ProN B",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ニューセザンヌ ProN B",
			"NewCezanneProN-B"
		]
	},
	{
		"fontName": "ニューセザンヌ ProN EB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ニューセザンヌ ProN EB",
			"NewCezanneProN-EB"
		]
	},
	{
		"fontName": "マティス Pro L",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-マティス Pro L",
			"MatissePro-L"
		]
	},
	{
		"fontName": "マティス Pro M",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-マティス Pro M",
			"MatissePro-M"
		]
	},
	{
		"fontName": "マティス Pro DB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-マティス Pro DB",
			"MatissePro-DB"
		]
	},
	{
		"fontName": "マティス Pro B",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-マティス Pro B",
			"MatissePro-B"
		]
	},
	{
		"fontName": "マティス Pro EB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-マティス Pro EB",
			"MatissePro-EB"
		]
	},
	{
		"fontName": "マティス Pro UB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-マティス Pro UB",
			"MatissePro-UB"
		]
	},
	{
		"fontName": "マティス ProN L",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-マティス ProN L",
			"MatisseProN-L"
		]
	},
	{
		"fontName": "マティス ProN M",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-マティス ProN M",
			"MatisseProN-M"
		]
	},
	{
		"fontName": "マティス ProN DB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-マティス ProN DB",
			"MatisseProN-DB"
		]
	},
	{
		"fontName": "マティス ProN B",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-マティス ProN B",
			"MatisseProN-B"
		]
	},
	{
		"fontName": "マティス ProN EB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-マティス ProN EB",
			"MatisseProN-EB"
		]
	},
	{
		"fontName": "マティス ProN UB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-マティス ProN UB",
			"MatisseProN-UB"
		]
	},
	{
		"fontName": "グレコ Std M",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "楷書系",
		"cssNames": [
			"FOT-グレコ Std M",
			"GrecoStd-M"
		]
	},
	{
		"fontName": "グレコ Std DB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "楷書系",
		"cssNames": [
			"FOT-グレコ Std DB",
			"GrecoStd-DB"
		]
	},
	{
		"fontName": "グレコ Std B",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "楷書系",
		"cssNames": [
			"FOT-グレコ Std B",
			"GrecoStd-B"
		]
	},
	{
		"fontName": "ユトリロ Pro M",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "教科書系",
		"cssNames": [
			"FOT-ユトリロ Pro M",
			"UtrilloPro-M"
		]
	},
	{
		"fontName": "ユトリロ Pro DB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "教科書系",
		"cssNames": [
			"FOT-ユトリロ Pro DB",
			"UtrilloPro-DB"
		]
	},
	{
		"fontName": "クレー Pro M",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "硬筆系",
		"cssNames": [
			"FOT-クレー Pro M",
			"KleePro-M"
		]
	},
	{
		"fontName": "クレー Pro DB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "硬筆系",
		"cssNames": [
			"FOT-クレー Pro DB",
			"KleePro-DB"
		]
	},
	{
		"fontName": "ロダンひまわり Pro L",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ロダンひまわり Pro L",
			"RodinHimawariPro-L"
		]
	},
	{
		"fontName": "ロダンひまわり Pro M",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ロダンひまわり Pro M",
			"RodinHimawariPro-M"
		]
	},
	{
		"fontName": "ロダンひまわり Pro DB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ロダンひまわり Pro DB",
			"RodinHimawariPro-DB"
		]
	},
	{
		"fontName": "ロダンひまわり Pro B",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ロダンひまわり Pro B",
			"RodinHimawariPro-B"
		]
	},
	{
		"fontName": "ロダンひまわり Pro EB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ロダンひまわり Pro EB",
			"RodinHimawariPro-EB"
		]
	},
	{
		"fontName": "ロダンひまわり Pro UB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ロダンひまわり Pro UB",
			"RodinHimawariPro-UB"
		]
	},
	{
		"fontName": "ロダンカトレア Pro L",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ロダンカトレア Pro L",
			"RodinCattleyaPro-L"
		]
	},
	{
		"fontName": "ロダンカトレア Pro M",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ロダンカトレア Pro M",
			"RodinCattleyaPro-M"
		]
	},
	{
		"fontName": "ロダンカトレア Pro DB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ロダンカトレア Pro DB",
			"RodinCattleyaPro-DB"
		]
	},
	{
		"fontName": "ロダンカトレア Pro B",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ロダンカトレア Pro B",
			"RodinCattleyaPro-B"
		]
	},
	{
		"fontName": "ロダンカトレア Pro EB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ロダンカトレア Pro EB",
			"RodinCattleyaPro-EB"
		]
	},
	{
		"fontName": "ロダンカトレア Pro UB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ロダンカトレア Pro UB",
			"RodinCattleyaPro-UB"
		]
	},
	{
		"fontName": "ロダンローズ Pro DB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ロダンローズ Pro DB",
			"RodinRosePro-DB"
		]
	},
	{
		"fontName": "ロダンローズ Pro B",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ロダンローズ Pro B",
			"RodinRosePro-B"
		]
	},
	{
		"fontName": "ロダンローズ Pro EB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ロダンローズ Pro EB",
			"RodinRosePro-EB"
		]
	},
	{
		"fontName": "ロダンNTLG Pro L",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ロダンNTLG Pro L",
			"RodinNTLGPro-L"
		]
	},
	{
		"fontName": "ロダンNTLG Pro M",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ロダンNTLG Pro M",
			"RodinNTLGPro-M"
		]
	},
	{
		"fontName": "ロダンNTLG Pro DB ",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ロダンNTLG Pro DB",
			"RodinNTLGPro-DB"
		]
	},
	{
		"fontName": "ロダンNTLG Pro B",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ロダンNTLG Pro B",
			"RodinNTLGPro-B"
		]
	},
	{
		"fontName": "ロダンNTLG Pro EB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ロダンNTLG Pro EB",
			"RodinNTLGPro-EB"
		]
	},
	{
		"fontName": "ロダンNTLG Pro UB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ロダンNTLG Pro UB",
			"RodinNTLGPro-UB"
		]
	},
	{
		"fontName": "ロダン墨東 Pro L",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ロダン墨東 Pro L",
			"RodinBokutohPro-L"
		]
	},
	{
		"fontName": "ロダン墨東 Pro M",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ロダン墨東 Pro M",
			"RodinBokutohPro-M"
		]
	},
	{
		"fontName": "ロダン墨東 Pro DB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ロダン墨東 Pro DB",
			"RodinBokutohPro-DB"
		]
	},
	{
		"fontName": "ロダン墨東 Pro B",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ロダン墨東 Pro B",
			"RodinBokutohPro-B"
		]
	},
	{
		"fontName": "ロダン墨東 Pro EB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ロダン墨東 Pro EB",
			"RodinBokutohPro-EB"
		]
	},
	{
		"fontName": "ロダン墨東 Pro UB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ロダン墨東 Pro UB",
			"RodinBokutohPro-UB"
		]
	},
	{
		"fontName": "ロダンマリア Pro DB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ロダンマリア Pro DB",
			"RodinMariaPro-DB"
		]
	},
	{
		"fontName": "ロダンマリア Pro B",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ロダンマリア Pro B",
			"RodinMariaPro-B"
		]
	},
	{
		"fontName": "ロダンマリア Pro EB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ロダンマリア Pro EB",
			"RodinMariaPro-EB"
		]
	},
	{
		"fontName": "ロダンわんぱく Pro L",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ロダンわんぱく Pro L",
			"RodinWanpakuPro-L"
		]
	},
	{
		"fontName": "ロダンわんぱく Pro M",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ロダンわんぱく Pro M",
			"RodinWanpakuPro-M"
		]
	},
	{
		"fontName": "ロダンわんぱく Pro DB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ロダンわんぱく Pro DB",
			"RodinWanpakuPro-DB"
		]
	},
	{
		"fontName": "ロダンわんぱく Pro B",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ロダンわんぱく Pro B",
			"RodinWanpakuPro-B"
		]
	},
	{
		"fontName": "ロダンわんぱく Pro EB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ロダンわんぱく Pro EB",
			"RodinWanpakuPro-EB"
		]
	},
	{
		"fontName": "ロダンわんぱく Pro UB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ロダンわんぱく Pro UB",
			"RodinWanpakuPro-UB"
		]
	},
	{
		"fontName": "ロダンハッピー Pro L",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ロダンハッピー Pro L",
			"RodinHappyPro-L"
		]
	},
	{
		"fontName": "ロダンハッピー Pro M",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ロダンハッピー Pro M",
			"RodinHappyPro-M"
		]
	},
	{
		"fontName": "ロダンハッピー Pro DB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ロダンハッピー Pro DB",
			"RodinHappyPro-DB"
		]
	},
	{
		"fontName": "ロダンハッピー Pro B",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ロダンハッピー Pro B",
			"RodinHappyPro-B"
		]
	},
	{
		"fontName": "ロダンハッピー Pro EB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ロダンハッピー Pro EB",
			"RodinHappyPro-EB"
		]
	},
	{
		"fontName": "ロダンハッピー Pro UB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ロダンハッピー Pro UB",
			"RodinHappyPro-UB"
		]
	},
	{
		"fontName": "ロダンカミーユ Pro DB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ロダンカミーユ Pro DB",
			"RodinCamillePro-DB"
		]
	},
	{
		"fontName": "ロダンカミーユ Pro B",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ロダンカミーユ Pro B",
			"RodinCamillePro-B"
		]
	},
	{
		"fontName": "ロダンカミーユ Pro EB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-ロダンカミーユ Pro EB",
			"RodinCamillePro-EB"
		]
	},
	{
		"fontName": "スーラキャピー Pro M",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "丸ゴシック系",
		"cssNames": [
			"FOT-スーラキャピー Pro M",
			"SeuratCapiePro-M"
		]
	},
	{
		"fontName": "スーラキャピー Pro DB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "丸ゴシック系",
		"cssNames": [
			"FOT-スーラキャピー Pro DB",
			"SeuratCapiePro-DB"
		]
	},
	{
		"fontName": "スーラキャピー Pro B",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "丸ゴシック系",
		"cssNames": [
			"FOT-スーラキャピー Pro B",
			"SeuratCapiePro-B"
		]
	},
	{
		"fontName": "スーラキャピー Pro EB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "丸ゴシック系",
		"cssNames": [
			"FOT-スーラキャピー Pro EB",
			"SeuratCapiePro-EB"
		]
	},
	{
		"fontName": "セザンヌ墨東 Pro M",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-セザンヌ墨東 Pro M",
			"CezanneBokutohPro-M"
		]
	},
	{
		"fontName": "セザンヌ墨東 Pro DB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-セザンヌ墨東 Pro DB",
			"CezanneBokutohPro-DB"
		]
	},
	{
		"fontName": "セザンヌ墨東 Pro B",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-セザンヌ墨東 Pro B",
			"CezanneBokutohPro-B"
		]
	},
	{
		"fontName": "セザンヌ墨東 Pro EB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-セザンヌ墨東 Pro EB",
			"CezanneBokutohPro-EB"
		]
	},
	{
		"fontName": "マティスえれがんと Pro M",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-マティスえれがんと Pro M",
			"MatisseElegantoPro-M"
		]
	},
	{
		"fontName": "マティスえれがんと Pro DB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-マティスえれがんと Pro DB",
			"MatisseElegantoPro-DB"
		]
	},
	{
		"fontName": "マティスえれがんと Pro B",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-マティスえれがんと Pro B",
			"MatisseElegantoPro-B"
		]
	},
	{
		"fontName": "マティスえれがんと Pro EB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-マティスえれがんと Pro EB",
			"MatisseElegantoPro-EB"
		]
	},
	{
		"fontName": "マティスえれがんと Pro UB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-マティスえれがんと Pro UB",
			"MatisseElegantoPro-UB"
		]
	},
	{
		"fontName": "マティスはつひやまとPro M",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-マティスはつひやまとPro M",
			"MatisseHatsuhiPro-M"
		]
	},
	{
		"fontName": "マティスはつひやまとPro DB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-マティスはつひやまとPro DB",
			"MatisseHatsuhiPro-DB"
		]
	},
	{
		"fontName": "マティスはつひやまとPro B",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-マティスはつひやまとPro B",
			"MatisseHatsuhiPro-B"
		]
	},
	{
		"fontName": "マティスはつひやまとPro EB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-マティスはつひやまとPro EB",
			"MatisseHatsuhiPro-EB"
		]
	},
	{
		"fontName": "マティスわかばやまとPro M",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-マティスわかばやまとPro M",
			"MatisseWakabaPro-M"
		]
	},
	{
		"fontName": "マティスわかばやまとPro DB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-マティスわかばやまとPro DB",
			"MatisseWakabaPro-DB"
		]
	},
	{
		"fontName": "マティスわかばやまとPro B",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-マティスわかばやまとPro B",
			"MatisseWakabaPro-B"
		]
	},
	{
		"fontName": "マティスわかばやまとPro EB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-マティスわかばやまとPro EB",
			"MatisseWakabaPro-EB"
		]
	},
	{
		"fontName": "マティスみのりやまとPro M",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-マティスみのりやまとPro M",
			"MatisseMinoriPro-M"
		]
	},
	{
		"fontName": "マティスみのりやまとPro DB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-マティスみのりやまとPro DB",
			"MatisseMinoriPro-DB"
		]
	},
	{
		"fontName": "マティスみのりやまとPro B",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-マティスみのりやまとPro B",
			"MatisseMinoriPro-B"
		]
	},
	{
		"fontName": "マティスみのりやまとPro EB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-マティスみのりやまとPro EB",
			"MatisseMinoriPro-EB"
		]
	},
	{
		"fontName": "マティスV Pro L",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-マティスV Pro L",
			"MatisseVPro-L"
		]
	},
	{
		"fontName": "マティスV Pro M",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-マティスV Pro M",
			"MatisseVPro-M"
		]
	},
	{
		"fontName": "マティスV Pro DB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-マティスV Pro DB",
			"MatisseVPro-DB"
		]
	},
	{
		"fontName": "マティスV Pro B",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-マティスV Pro B",
			"MatisseVPro-B"
		]
	},
	{
		"fontName": "マティスV Pro EB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-マティスV Pro EB",
			"MatisseVPro-EB"
		]
	},
	{
		"fontName": "マティスV Pro UB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-マティスV Pro UB",
			"MatisseVPro-UB"
		]
	},
	{
		"fontName": "パール Std L",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "デザイン系",
		"cssNames": [
			"FOT-パール Std L",
			"PearlStd-L"
		]
	},
	{
		"fontName": "スキップ Std L",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "デザイン系",
		"cssNames": [
			"FOT-スキップ Std L",
			"SkipStd-L"
		]
	},
	{
		"fontName": "スキップ Std M",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "デザイン系",
		"cssNames": [
			"FOT-スキップ Std M",
			"SkipStd-M"
		]
	},
	{
		"fontName": "スキップ Std D",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "デザイン系",
		"cssNames": [
			"FOT-スキップ Std D",
			"SkipStd-D"
		]
	},
	{
		"fontName": "スキップ Std B",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "デザイン系",
		"cssNames": [
			"FOT-スキップ Std B",
			"SkipStd-B"
		]
	},
	{
		"fontName": "スキップ Std E",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "デザイン系",
		"cssNames": [
			"FOT-スキップ Std E",
			"SkipStd-E"
		]
	},
	{
		"fontName": "ハミング Std L",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "デザイン系",
		"cssNames": [
			"FOT-ハミング Std L",
			"HummingStd-L"
		]
	},
	{
		"fontName": "ハミング Std M",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "デザイン系",
		"cssNames": [
			"FOT-ハミング Std M",
			"HummingStd-M"
		]
	},
	{
		"fontName": "ハミング Std D",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "デザイン系",
		"cssNames": [
			"FOT-ハミング Std D",
			"HummingStd-D"
		]
	},
	{
		"fontName": "ハミング Std B",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "デザイン系",
		"cssNames": [
			"FOT-ハミング Std B",
			"HummingStd-B"
		]
	},
	{
		"fontName": "ハミング Std E",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "デザイン系",
		"cssNames": [
			"FOT-ハミング Std E",
			"HummingStd-E"
		]
	},
	{
		"fontName": "アンチックセザンヌ Pro M",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "専門書体",
		"cssNames": [
			"FOT-アンチックセザンヌ Pro M",
			"AnticCezannePro-M"
		]
	},
	{
		"fontName": "アンチックセザンヌ Pro DB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "専門書体",
		"cssNames": [
			"FOT-アンチックセザンヌ Pro DB",
			"AnticCezannePro-DB"
		]
	},
	{
		"fontName": "モード明朝A Std B",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-モード明朝A Std B",
			"ModeMinAStd-B"
		]
	},
	{
		"fontName": "モード明朝B Std B",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-モード明朝B Std B",
			"ModeMinBStd-B"
		]
	},
	{
		"fontName": "大江戸勘亭流 Std E",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "江戸文字系",
		"cssNames": [
			"FOT-大江戸勘亭流 Std E",
			"OedKtrStd-E"
		]
	},
	{
		"fontName": "万葉行書 Std E",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "行書系",
		"cssNames": [
			"FOT-万葉行書 Std E",
			"ManyoGyoshoStd-E"
		]
	},
	{
		"fontName": "万葉草書 Std E",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "草書系",
		"cssNames": [
			"FOT-万葉草書 Std E",
			"ManyoSoshoStd-E"
		]
	},
	{
		"fontName": "万葉古印 Std B",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "古印系",
		"cssNames": [
			"FOT-万葉古印 Std B",
			"ManyoKoinStd-B"
		]
	},
	{
		"fontName": "万葉古印ラージ Std B",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "古印系",
		"cssNames": [
			"FOT-万葉古印ラージ Std B",
			"ManyoKoinLargeStd-B"
		]
	},
	{
		"fontName": "角隷 Std L",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "隷書系",
		"cssNames": [
			"FOT-角隷 Std L",
			"KakureiStd-L"
		]
	},
	{
		"fontName": "角隷 Std M",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "隷書系",
		"cssNames": [
			"FOT-角隷 Std M",
			"KakureiStd-M"
		]
	},
	{
		"fontName": "角隷 Std EB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "隷書系",
		"cssNames": [
			"FOT-角隷 Std EB",
			"KakureiStd-EB"
		]
	},
	{
		"fontName": "豊隷 Std EB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "隷書系",
		"cssNames": [
			"FOT-豊隷 Std EB",
			"HoureiStd-EB"
		]
	},
	{
		"fontName": "ニューシネマA Std D",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "専門書体",
		"cssNames": [
			"FOT-ニューシネマA Std D",
			"NewCinemaAStd-D"
		]
	},
	{
		"fontName": "ニューシネマB Std D",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "専門書体",
		"cssNames": [
			"FOT-ニューシネマB Std D",
			"NewCinemaBStd-D"
		]
	},
	{
		"fontName": "くろかね Std EB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "デザイン系",
		"cssNames": [
			"FOT-くろかね Std EB",
			"KurokaneStd-EB"
		]
	},
	{
		"fontName": "ぶどう Std L",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "デザイン系",
		"cssNames": [
			"FOT-ぶどう Std L",
			"BudoStd-L"
		]
	},
	{
		"fontName": "古今江戸 Std EB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "江戸文字系",
		"cssNames": [
			"FOT-古今江戸 Std EB",
			"KokinEdoStd-EB"
		]
	},
	{
		"fontName": "古今髭 Std EB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "江戸文字系",
		"cssNames": [
			"FOT-古今髭 Std EB",
			"KokinHigeStd-EB"
		]
	},
	{
		"fontName": "アニト Std L",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "丸ゴシック系",
		"cssNames": [
			"FOT-アニト Std L",
			"AnitoStd-L"
		]
	},
	{
		"fontName": "アニト Std M",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "丸ゴシック系",
		"cssNames": [
			"FOT-アニト Std M",
			"AnitoStd-M"
		]
	},
	{
		"fontName": "アニト Std Relief",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "デザイン系",
		"cssNames": [
			"FOT-アニト Std Relief",
			"AnitoStd-Relief"
		]
	},
	{
		"fontName": "アニト Std Inline",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "デザイン系",
		"cssNames": [
			"FOT-アニト Std Inline",
			"AnitoStd-Inline"
		]
	},
	{
		"fontName": "あられ Std DB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "デザイン系",
		"cssNames": [
			"FOT-あられ Std DB",
			"AraletStd-DB"
		]
	},
	{
		"fontName": "ラグランパンチ Std UB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "デザイン系",
		"cssNames": [
			"FOT-ラグランパンチ Std UB",
			"RaglanPunchStd-UB"
		]
	},
	{
		"fontName": "ラグラン Std UB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "デザイン系",
		"cssNames": [
			"FOT-ラグラン Std UB",
			"RaglanStd-UB"
		]
	},
	{
		"fontName": "ランパートTL Std EB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "デザイン系",
		"cssNames": [
			"FOT-ランパートTL Std EB",
			"RampartTLStd-EB"
		]
	},
	{
		"fontName": "ランパート Std EB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "デザイン系",
		"cssNames": [
			"FOT-ランパート Std EB",
			"RampartStd-EB"
		]
	},
	{
		"fontName": "シャドウTL Std B",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "デザイン系",
		"cssNames": [
			"FOT-シャドウTL Std B",
			"ShadowTLStd-B"
		]
	},
	{
		"fontName": "シャドウ Std B",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "デザイン系",
		"cssNames": [
			"FOT-シャドウ Std B",
			"ShadowStd-B"
		]
	},
	{
		"fontName": "コミックレゲエ Std B",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "デザイン系",
		"cssNames": [
			"FOT-コミックレゲエ Std B",
			"ComicReggaeStd-B"
		]
	},
	{
		"fontName": "レゲエ Std B",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "デザイン系",
		"cssNames": [
			"FOT-レゲエ Std B",
			"ReggaeStd-B"
		]
	},
	{
		"fontName": "コミックミステリ Std DB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "デザイン系",
		"cssNames": [
			"FOT-コミックミステリ Std DB",
			"ComicMysteryStd-DB"
		]
	},
	{
		"fontName": "ミステリ Std DB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "デザイン系",
		"cssNames": [
			"FOT-ミステリ Std DB",
			"MysteryStd-DB"
		]
	},
	{
		"fontName": "コメット Std B",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "デザイン系",
		"cssNames": [
			"FOT-コメット Std B",
			"CometStd-B"
		]
	},
	{
		"fontName": "カラット Std UB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "デザイン系",
		"cssNames": [
			"FOT-カラット Std UB",
			"CaratStd-UB"
		]
	},
	{
		"fontName": "ライラ Std DB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "デザイン系",
		"cssNames": [
			"FOT-ライラ Std DB",
			"LyraStd-DB"
		]
	},
	{
		"fontName": "ステッキ Std",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "デザイン系",
		"cssNames": [
			"FOT-ステッキ Std",
			"StickStd-B"
		]
	},
	{
		"fontName": "ドット明朝 12 Std M",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "デザイン系",
		"cssNames": [
			"FOT-ドット明朝 12 Std M",
			"DotMincho12Std-M"
		]
	},
	{
		"fontName": "ドット明朝 16 Std M",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "デザイン系",
		"cssNames": [
			"FOT-ドット明朝 16 Std M",
			"DotMincho16Std-M"
		]
	},
	{
		"fontName": "ドットゴシック 12 Std M",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "デザイン系",
		"cssNames": [
			"FOT-ドットゴシック 12 Std M",
			"DotGothic12Std-M"
		]
	},
	{
		"fontName": "ドットゴシック 16 Std M",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "デザイン系",
		"cssNames": [
			"FOT-ドットゴシック 16 Std M",
			"DotGothic16Std-M"
		]
	},
	{
		"fontName": "スティールワーク Std B",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "デザイン系",
		"cssNames": [
			"FOT-スティールワーク Std B",
			"SteelworkStd-B"
		]
	},
	{
		"fontName": "マカロニ Std DB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "デザイン系",
		"cssNames": [
			"FOT-マカロニ Std DB",
			"MacaroniStd-DB"
		]
	},
	{
		"fontName": "レイルウェイ Std B",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "デザイン系",
		"cssNames": [
			"FOT-レイルウェイ Std B",
			"RailwayStd-B"
		]
	},
	{
		"fontName": "キアロ Std B",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "デザイン系",
		"cssNames": [
			"FOT-キアロ Std B",
			"ChiaroStd-B"
		]
	},
	{
		"fontName": "ロックンロール Std DB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "デザイン系",
		"cssNames": [
			"FOT-ロックンロール Std DB",
			"RocknRollStd-DB"
		]
	},
	{
		"fontName": "スランプ Std DB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "デザイン系",
		"cssNames": [
			"FOT-スランプ Std DB",
			"SlumpStd-DB"
		]
	},
	{
		"fontName": "ロウディ Std EB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "デザイン系",
		"cssNames": [
			"FOT-ロウディ Std EB",
			"RowdyStd-EB"
		]
	},
	{
		"fontName": "Popハッピネス Std EB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "デザイン系",
		"cssNames": [
			"FOT-Popハッピネス Std EB",
			"PopHappinessStd-EB"
		]
	},
	{
		"fontName": "Popフューリ Std B",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "デザイン系",
		"cssNames": [
			"FOT-Popフューリ Std B",
			"PopFuryStd-B"
		]
	},
	{
		"fontName": "Popジョイ Std B",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "デザイン系",
		"cssNames": [
			"FOT-Popジョイ Std B",
			"PopJoyStd-B"
		]
	},
	{
		"fontName": "テロップ明朝 Pro D",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-テロップ明朝 Pro D",
			"TelopMinPro-D"
		]
	},
	{
		"fontName": "テロップ明朝 Pro B",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-テロップ明朝 Pro B",
			"TelopMinPro-B"
		]
	},
	{
		"fontName": "テロップ明朝 Pro E",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-テロップ明朝 Pro E",
			"TelopMinPro-E"
		]
	},
	{
		"fontName": "テロップ明朝 Pro H",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-テロップ明朝 Pro H",
			"TelopMinPro-HV"
		]
	},
	{
		"fontName": "テロップ明朝 ProN D",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-テロップ明朝 ProN D",
			"TelopMinProN-D"
		]
	},
	{
		"fontName": "テロップ明朝 ProN B",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-テロップ明朝 ProN B",
			"TelopMinProN-B"
		]
	},
	{
		"fontName": "テロップ明朝 ProN E",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-テロップ明朝 ProN E",
			"TelopMinProN-E"
		]
	},
	{
		"fontName": "テロップ明朝 ProN H",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-テロップ明朝 ProN H",
			"TelopMinProN-HV"
		]
	},
	{
		"fontName": "筑紫Aオールド明朝 Pr6 L",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-筑紫Aオールド明朝 Pr6 L",
			"TsukuAOldMinPr6-L"
		]
	},
	{
		"fontName": "筑紫Aオールド明朝 Pr6 R",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-筑紫Aオールド明朝 Pr6 R",
			"TsukuAOldMinPr6-R"
		]
	},
	{
		"fontName": "筑紫Aオールド明朝 Pr6 M",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-筑紫Aオールド明朝 Pr6 M",
			"TsukuAOldMinPr6-M"
		]
	},
	{
		"fontName": "筑紫Aオールド明朝 Pr6 D",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-筑紫Aオールド明朝 Pr6 D",
			"TsukuAOldMinPr6-D"
		]
	},
	{
		"fontName": "筑紫Aオールド明朝 Pr6 B",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-筑紫Aオールド明朝 Pr6 B",
			"TsukuAOldMinPr6-B"
		]
	},
	{
		"fontName": "筑紫Aオールド明朝 Pr6 E",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-筑紫Aオールド明朝 Pr6 E",
			"TsukuAOldMinPr6-E"
		]
	},
	{
		"fontName": "筑紫Aオールド明朝 Pr6N L",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-筑紫Aオールド明朝 Pr6N L",
			"TsukuAOldMinPr6N-L"
		]
	},
	{
		"fontName": "筑紫Aオールド明朝 Pr6N R",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-筑紫Aオールド明朝 Pr6N R",
			"TsukuAOldMinPr6N-R"
		]
	},
	{
		"fontName": "筑紫Aオールド明朝 Pr6N M",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-筑紫Aオールド明朝 Pr6N M",
			"TsukuAOldMinPr6N-M"
		]
	},
	{
		"fontName": "筑紫Aオールド明朝 Pr6N D",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-筑紫Aオールド明朝 Pr6N D",
			"TsukuAOldMinPr6N-D"
		]
	},
	{
		"fontName": "筑紫Aオールド明朝 Pr6N B",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-筑紫Aオールド明朝 Pr6N B",
			"TsukuAOldMinPr6N-B"
		]
	},
	{
		"fontName": "筑紫Aオールド明朝 Pr6N E",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-筑紫Aオールド明朝 Pr6N E",
			"TsukuAOldMinPr6N-E"
		]
	},
	{
		"fontName": "筑紫Bオールド明朝 Pr6 R",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-筑紫Bオールド明朝 Pr6 R",
			"TsukuBOldMinPr6-R"
		]
	},
	{
		"fontName": "筑紫Bオールド明朝 Pr6N R",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-筑紫Bオールド明朝 Pr6N R",
			"TsukuBOldMinPr6N-R"
		]
	},
	{
		"fontName": "アーク Std R",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "デザイン系",
		"cssNames": [
			"FOT-アーク Std R",
			"arcStd-R"
		]
	},
	{
		"fontName": "ユールカ Std UB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "デザイン系",
		"cssNames": [
			"FOT-ユールカ Std UB",
			"YurukaStd-UB"
		]
	},
	{
		"fontName": "筑紫Cオールド明朝 Pr6 R",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-筑紫Cオールド明朝 Pr6 R",
			"TsukuCOldMinPr6-R"
		]
	},
	{
		"fontName": "筑紫Cオールド明朝 Pr6N R",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-筑紫Cオールド明朝 Pr6N R",
			"TsukuCOldMinPr6N-R"
		]
	},
	{
		"fontName": "筑紫オールドゴシック Std B",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-筑紫オールドゴシック Std B",
			"TsukuOldGothicStd-B"
		]
	},
	{
		"fontName": "UD明朝 Pro L",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-UD明朝 Pro L",
			"UDMinchoPro-L"
		]
	},
	{
		"fontName": "UD明朝 Pro M",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-UD明朝 Pro M",
			"UDMinchoPro-M"
		]
	},
	{
		"fontName": "UD明朝 Pro DB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-UD明朝 Pro DB",
			"UDMinchoPro-DB"
		]
	},
	{
		"fontName": "UD明朝 Pro B",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-UD明朝 Pro B",
			"UDMinchoPro-B"
		]
	},
	{
		"fontName": "UD丸ゴ_ラージ Pro L",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "丸ゴシック系",
		"cssNames": [
			"FOT-UD丸ゴ_ラージ Pro L",
			"UDMarugo_LargePro-L"
		]
	},
	{
		"fontName": "UD丸ゴ_ラージ Pro M",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "丸ゴシック系",
		"cssNames": [
			"FOT-UD丸ゴ_ラージ Pro M",
			"UDMarugo_LargePro-M"
		]
	},
	{
		"fontName": "UD丸ゴ_ラージ Pro DB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "丸ゴシック系",
		"cssNames": [
			"FOT-UD丸ゴ_ラージ Pro DB",
			"UDMarugo_LargePro-DB"
		]
	},
	{
		"fontName": "UD丸ゴ_ラージ Pro B",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "丸ゴシック系",
		"cssNames": [
			"FOT-UD丸ゴ_ラージ Pro B",
			"UDMarugo_LargePro-B"
		]
	},
	{
		"fontName": "UD角ゴ_ラージ Pro L",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-UD角ゴ_ラージ Pro L",
			"UDKakugo_LargePro-L"
		]
	},
	{
		"fontName": "UD角ゴ_ラージ Pro R",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-UD角ゴ_ラージ Pro R",
			"UDKakugo_LargePro-R"
		]
	},
	{
		"fontName": "UD角ゴ_ラージ Pro M",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-UD角ゴ_ラージ Pro M",
			"UDKakugo_LargePro-M"
		]
	},
	{
		"fontName": "UD角ゴ_ラージ Pro DB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-UD角ゴ_ラージ Pro DB",
			"UDKakugo_LargePro-DB"
		]
	},
	{
		"fontName": "UD角ゴ_ラージ Pro B",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"FOT-UD角ゴ_ラージ Pro B",
			"UDKakugo_LargePro-B"
		]
	},
	{
		"fontName": "筑紫B明朝 Pr6N L",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-筑紫B明朝 Pr6N L",
			"TsukuBMinPr6N-L"
		]
	},
	{
		"fontName": "筑紫B明朝 Pr6 L",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-筑紫B明朝 Pr6 L",
			"TsukuBMinPr6-L"
		]
	},
	{
		"fontName": "筑紫アンティークS明朝 Std L",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-筑紫アンティークS明朝 Std L",
			"TsukuAntiqueSMinStd-L"
		]
	},
	{
		"fontName": "筑紫アンティークL明朝 Std L",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"FOT-筑紫アンティークL明朝 Std L",
			"TsukuAntiqueLMinStd-L"
		]
	},
	{
		"fontName": "ベビポップ Std EB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "デザイン系",
		"cssNames": [
			"FOT-ベビポップ Std EB",
			"BabyPopStd-EB"
		]
	},
	{
		"fontName": "あおかね Std EB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "デザイン系",
		"cssNames": [
			"FOT-あおかね Std EB",
			"AokaneStd-EB"
		]
	},
	{
		"fontName": "F+UD-筑紫明朝 R",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"F+UD-筑紫明朝 R",
			"F+UD-TsukuMin R"
		]
	},
	{
		"fontName": "F+UD-筑紫明朝 D",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"F+UD-筑紫明朝 D",
			"F+UD-TsukuMin D"
		]
	},
	{
		"fontName": "F+UD-筑紫明朝 E",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "明朝系",
		"cssNames": [
			"F+UD-筑紫明朝 E",
			"F+UD-TsukuMin E"
		]
	},
	{
		"fontName": "F+UD-スーラ M",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "丸ゴシック系",
		"cssNames": [
			"F+UD-スーラ M",
			"F+UD-Seurat M"
		]
	},
	{
		"fontName": "F+UD-スーラ DB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "丸ゴシック系",
		"cssNames": [
			"F+UD-スーラ DB",
			"F+UD-Seurat DB"
		]
	},
	{
		"fontName": "F+UD-スーラ B",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "丸ゴシック系",
		"cssNames": [
			"F+UD-スーラ B",
			"F+UD-Seurat B"
		]
	},
	{
		"fontName": "F+UD-ニューロダン M",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"F+UD-ニューロダン M",
			"F+UD-NewRodin M"
		]
	},
	{
		"fontName": "F+UD-ニューロダン DB",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"F+UD-ニューロダン DB",
			"F+UD-NewRodin DB"
		]
	},
	{
		"fontName": "F+UD-ニューロダン B",
		"language": "日本語",
		"foundry": "FONTWORKS",
		"category": "ゴシック系",
		"cssNames": [
			"F+UD-ニューロダン B",
			"F+UD-NewRodin B"
		]
	},
	{
		"fontName": "イワタUDゴシックL表示用",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "ゴシック系",
		"cssNames": [
			"I-OTF-UDゴ表示Pro L",
			"IwaUDGoDspPro-Lt"
		]
	},
	{
		"fontName": "イワタUDゴシックR表示用",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "ゴシック系",
		"cssNames": [
			"I-OTF-UDゴ表示Pro R",
			"IwaUDGoDspPro-Th"
		]
	},
	{
		"fontName": "イワタUDゴシックRA表示用",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "ゴシック系",
		"cssNames": [
			"I-OTF-UDゴ表示Pro RA",
			"IwaUDGoDspPro-RA"
		]
	},
	{
		"fontName": "イワタUDゴシックM表示用",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "ゴシック系",
		"cssNames": [
			"I-OTF-UDゴ表示Pro M",
			"IwaUDGoDspPro-Md"
		]
	},
	{
		"fontName": "イワタUDゴシックB表示用",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "ゴシック系",
		"cssNames": [
			"I-OTF-UDゴ表示Pro B",
			"IwaUDGoDspPro-Bd"
		]
	},
	{
		"fontName": "イワタUDゴシックE表示用",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "ゴシック系",
		"cssNames": [
			"I-OTF-UDゴ表示Pro E",
			"IwaUDGoDspPro-Eb"
		]
	},
	{
		"fontName": "イワタUDゴシックH表示用",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "ゴシック系",
		"cssNames": [
			"I-OTF-UDゴ表示Pro H",
			"IwaUDGoDspPro-Hv"
		]
	},
	{
		"fontName": "イワタUDゴシックL本文用",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "ゴシック系",
		"cssNames": [
			"I-OTF-UDゴ本文Pro L",
			"IwaUDGoHonPro-Lt"
		]
	},
	{
		"fontName": "イワタUDゴシックR本文用",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "ゴシック系",
		"cssNames": [
			"I-OTF-UDゴ本文Pro R",
			"IwaUDGoHonPro-Th"
		]
	},
	{
		"fontName": "イワタUDゴシックRA本文用",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "ゴシック系",
		"cssNames": [
			"I-OTF-UDゴ本文Pro RA",
			"IwaUDGoHonPro-RA"
		]
	},
	{
		"fontName": "イワタUDゴシックM本文用",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "ゴシック系",
		"cssNames": [
			"I-OTF-UDゴ本文Pro M",
			"IwaUDGoHonPro-Md"
		]
	},
	{
		"fontName": "イワタUD丸ゴシックL",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "丸ゴシック系",
		"cssNames": [
			"I-OTF-UD丸ゴPro L",
			"IwaUDRGoPro-Lt"
		]
	},
	{
		"fontName": "イワタUD丸ゴシックR",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "丸ゴシック系",
		"cssNames": [
			"I-OTF-UD丸ゴPro R",
			"IwaUDRGoPro-Th"
		]
	},
	{
		"fontName": "イワタUD丸ゴシックM",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "丸ゴシック系",
		"cssNames": [
			"I-OTF-UD丸ゴPro M",
			"IwaUDRGoPro-Md"
		]
	},
	{
		"fontName": "イワタUD丸ゴシックB",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "丸ゴシック系",
		"cssNames": [
			"I-OTF-UD丸ゴPro B",
			"IwaUDRGoPro-Bd"
		]
	},
	{
		"fontName": "イワタUD丸ゴシックE",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "丸ゴシック系",
		"cssNames": [
			"I-OTF-UD丸ゴPro E",
			"IwaUDRGoPro-Eb"
		]
	},
	{
		"fontName": "イワタUD明朝R",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "明朝系",
		"cssNames": [
			"I-OTF-UD明朝Pro R",
			"IwaUDMinPro-Th"
		]
	},
	{
		"fontName": "イワタUD明朝M",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "明朝系",
		"cssNames": [
			"I-OTF-UD明朝Pro M",
			"IwaUDMinPro-Md"
		]
	},
	{
		"fontName": "イワタUD明朝D",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "明朝系",
		"cssNames": [
			"I-OTF-UD明朝Pro D",
			"IwaUDMinPro-Db"
		]
	},
	{
		"fontName": "イワタUD明朝RかなA",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "明朝系",
		"cssNames": [
			"I-OTF-UD明朝KAPro R",
			"IwaUDMinKAPro-Th"
		]
	},
	{
		"fontName": "イワタUD明朝MかなA",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "明朝系",
		"cssNames": [
			"I-OTF-UD明朝KAPro M",
			"IwaUDMinKAPro-Md"
		]
	},
	{
		"fontName": "イワタUD明朝DかなA",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "明朝系",
		"cssNames": [
			"I-OTF-UD明朝KAPro D",
			"IwaUDMinKAPro-Db"
		]
	},
	{
		"fontName": "イワタUD明朝RかなB",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "明朝系",
		"cssNames": [
			"I-OTF-UD明朝KBPro R",
			"IwaUDMinKBPro-Th"
		]
	},
	{
		"fontName": "イワタUD明朝MかなB",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "明朝系",
		"cssNames": [
			"I-OTF-UD明朝KBPro M",
			"IwaUDMinKBPro-Md"
		]
	},
	{
		"fontName": "イワタUD明朝DかなB",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "明朝系",
		"cssNames": [
			"I-OTF-UD明朝KBPro D",
			"IwaUDMinKBPro-Db"
		]
	},
	{
		"fontName": "イワタUD明朝RかなC",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "明朝系",
		"cssNames": [
			"I-OTF-UD明朝KCPro R",
			"IwaUDMinKCPro-Th"
		]
	},
	{
		"fontName": "イワタUD明朝MかなC",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "明朝系",
		"cssNames": [
			"I-OTF-UD明朝KCPro M",
			"IwaUDMinKCPro-Md"
		]
	},
	{
		"fontName": "イワタUD明朝DかなC",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "明朝系",
		"cssNames": [
			"I-OTF-UD明朝KCPro D",
			"IwaUDMinKCPro-Db"
		]
	},
	{
		"fontName": "イワタUD明朝RかなD",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "明朝系",
		"cssNames": [
			"I-OTF-UD明朝KDPro R",
			"IwaUDMinKDPro-Th"
		]
	},
	{
		"fontName": "イワタUD明朝MかなD",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "明朝系",
		"cssNames": [
			"I-OTF-UD明朝KDPro M",
			"IwaUDMinKDPro-Md"
		]
	},
	{
		"fontName": "イワタUD明朝DかなD",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "明朝系",
		"cssNames": [
			"I-OTF-UD明朝KDPro D",
			"IwaUDMinKDPro-Db"
		]
	},
	{
		"fontName": "イワタUD新聞明朝",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "明朝系",
		"cssNames": [
			"I-OTF-UD新聞明朝Pro Mp",
			"IwaUDNwMPro-Mp"
		]
	},
	{
		"fontName": "イワタUD新聞ゴシック",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "ゴシック系",
		"cssNames": [
			"I-OTF-UD新聞ゴシックPro Dp",
			"IwaUDNwGPro-Dp"
		]
	},
	{
		"fontName": "イワタ細明朝体",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "明朝系",
		"cssNames": [
			"I-OTF明朝Pro L",
			"IwaMinPro-Lt"
		]
	},
	{
		"fontName": "イワタ中細明朝体",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "明朝系",
		"cssNames": [
			"I-OTF明朝Pro R",
			"IwaMinPro-Th"
		]
	},
	{
		"fontName": "イワタ中明朝体",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "明朝系",
		"cssNames": [
			"I-OTF明朝Pro M",
			"IwaMinPro-Md"
		]
	},
	{
		"fontName": "イワタ太明朝体",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "明朝系",
		"cssNames": [
			"I-OTF明朝Pro B",
			"IwaMinPro-Bd"
		]
	},
	{
		"fontName": "イワタ特太明朝体",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "明朝系",
		"cssNames": [
			"I-OTF明朝Pro E",
			"IwaMinPro-Eb"
		]
	},
	{
		"fontName": "イワタ明朝体オールド",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "明朝系",
		"cssNames": [
			"I-OTF明朝オールドPro R",
			"IwaOMinPro-Th"
		]
	},
	{
		"fontName": "イワタ中明朝体オールド",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "明朝系",
		"cssNames": [
			"I-OTF明朝オールドPro M",
			"IwaOMinPro-Md"
		]
	},
	{
		"fontName": "イワタ太明朝体オールド",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "明朝系",
		"cssNames": [
			"I-OTF明朝オールドPro B",
			"IwaOMinPro-Bd"
		]
	},
	{
		"fontName": "イワタ特太明朝体オールド",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "明朝系",
		"cssNames": [
			"I-OTF明朝オールドPro E",
			"IwaOMinPro-Eb"
		]
	},
	{
		"fontName": "イワタ極太明朝体オールド",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "明朝系",
		"cssNames": [
			"I-OTF明朝オールドPro H",
			"IwaOMinPro-Hv"
		]
	},
	{
		"fontName": "イワタ細ゴシック体オールド",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "ゴシック系",
		"cssNames": [
			"I-OTFゴシックオールドPro L",
			"IwaOGoPro-Lt"
		]
	},
	{
		"fontName": "イワタ中ゴシック体オールド",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "ゴシック系",
		"cssNames": [
			"I-OTFゴシックオールドPro M",
			"IwaOGoPro-Md"
		]
	},
	{
		"fontName": "イワタ中太ゴシック体オールド",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "ゴシック系",
		"cssNames": [
			"I-OTFゴシックオールドPro D",
			"IwaOGoPro-Db"
		]
	},
	{
		"fontName": "イワタ太ゴシック体オールド",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "ゴシック系",
		"cssNames": [
			"I-OTFゴシックオールドPro B",
			"IwaOGoPro-Bd"
		]
	},
	{
		"fontName": "イワタ特太ゴシック体オールド",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "ゴシック系",
		"cssNames": [
			"I-OTFゴシックオールドPro E",
			"IwaOGoPro-Eb"
		]
	},
	{
		"fontName": "イワタ極太ゴシック体オールド",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "ゴシック系",
		"cssNames": [
			"I-OTFゴシックオールドPro H",
			"IwaOGoPro-Hv"
		]
	},
	{
		"fontName": "イワタ細丸ゴシック体",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "丸ゴシック系",
		"cssNames": [
			"I-OTF丸ゴシックPro L",
			"IwaRGoPro-Lt"
		]
	},
	{
		"fontName": "イワタ中丸ゴシック体",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "丸ゴシック系",
		"cssNames": [
			"I-OTF丸ゴシックPro M",
			"IwaRGoPro-Md"
		]
	},
	{
		"fontName": "イワタ中太丸ゴシック体",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "丸ゴシック系",
		"cssNames": [
			"I-OTF丸ゴシックPro D",
			"IwaRGoPro-Db"
		]
	},
	{
		"fontName": "イワタ太丸ゴシック体",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "丸ゴシック系",
		"cssNames": [
			"I-OTF丸ゴシックPro B",
			"IwaRGoPro-Bd"
		]
	},
	{
		"fontName": "イワタ新ゴシック体L",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "ゴシック系",
		"cssNames": [
			"I-OTF新ゴシックPro L",
			"IwaNGoPro-Lt"
		]
	},
	{
		"fontName": "イワタ新ゴシック体R",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "ゴシック系",
		"cssNames": [
			"I-OTF新ゴシックPro R",
			"IwaNGoPro-Th"
		]
	},
	{
		"fontName": "イワタ新ゴシック体M",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "ゴシック系",
		"cssNames": [
			"I-OTF新ゴシックPro M",
			"IwaNGoPro-Md"
		]
	},
	{
		"fontName": "イワタ新ゴシック体B",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "ゴシック系",
		"cssNames": [
			"I-OTF新ゴシックPro B",
			"IwaNGoPro-Bd"
		]
	},
	{
		"fontName": "イワタ新ゴシック体E",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "ゴシック系",
		"cssNames": [
			"I-OTF新ゴシックPro E",
			"IwaNGoPro-Eb"
		]
	},
	{
		"fontName": "イワタ新ゴシック体H",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "ゴシック系",
		"cssNames": [
			"I-OTF新ゴシックPro H",
			"IwaNGoPro-Hv"
		]
	},
	{
		"fontName": "イワタ新ゴシック体U",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "ゴシック系",
		"cssNames": [
			"I-OTF新ゴシックPro U",
			"IwaNGoPro-Ul"
		]
	},
	{
		"fontName": "イワタ正楷書体",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "楷書系",
		"cssNames": [
			"I-OTF楷書Pro M",
			"IwaKaiPro-Md"
		]
	},
	{
		"fontName": "イワタ中太楷書体",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "楷書系",
		"cssNames": [
			"I-OTF楷書Pro D",
			"IwaKaiPro-Db"
		]
	},
	{
		"fontName": "イワタ特太楷書体",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "楷書系",
		"cssNames": [
			"I-OTF楷書E",
			"IwaKai-Eb"
		]
	},
	{
		"fontName": "イワタ行書体",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "行書系",
		"cssNames": [
			"I-OTF行書Pro M",
			"IwaGyoPro-Md"
		]
	},
	{
		"fontName": "イワタ太行書体",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "行書系",
		"cssNames": [
			"I-OTF行書Pro B",
			"IwaGyoPro-Bd"
		]
	},
	{
		"fontName": "イワタ隷書体",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "隷書系",
		"cssNames": [
			"I-OTF隷書Pro M",
			"IwaReiPro-Md"
		]
	},
	{
		"fontName": "イワタ新隷書体",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "隷書系",
		"cssNames": [
			"I-OTF新隷書Pro M",
			"IwaNReiPro-Md"
		]
	},
	{
		"fontName": "イワタ宋朝体",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "宋朝系",
		"cssNames": [
			"I-OTF宋朝Pro M",
			"IwaSouPro-Md"
		]
	},
	{
		"fontName": "イワタ宋朝体新がな",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "宋朝系",
		"cssNames": [
			"I-OTF宋朝新がなPro M",
			"IwaSouNPro-Md"
		]
	},
	{
		"fontName": "弘道軒清朝体現代版",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "清朝系",
		"cssNames": [
			"I-OTF弘道軒清朝現代版Pro",
			"IwaSeiGePro-Bd"
		]
	},
	{
		"fontName": "弘道軒清朝体復刻版",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "清朝系",
		"cssNames": [
			"I-OTF弘道軒清朝復刻版Pro",
			"IwaSeiFuPro-Bd"
		]
	},
	{
		"fontName": "イワタ勘亭流",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "江戸文字系",
		"cssNames": [
			"I-OTF勘亭流 B",
			"IwaKANTEI-Bd"
		]
	},
	{
		"fontName": "イワタ新聞明朝体",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "明朝系",
		"cssNames": [
			"I-OTF新聞明朝Pro R",
			"IwaMNewsPro-Th"
		]
	},
	{
		"fontName": "イワタ新聞中明朝体",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "明朝系",
		"cssNames": [
			"I-OTF新聞明朝Pro M",
			"IwaMNewsPro-Md"
		]
	},
	{
		"fontName": "イワタ新聞明朝体新がな",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "明朝系",
		"cssNames": [
			"I-OTF新聞明朝新がなPro R",
			"IwaNMNewsPro-Th"
		]
	},
	{
		"fontName": "イワタ新聞中明朝体新がな",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "明朝系",
		"cssNames": [
			"I-OTF新聞明朝新がなPro M",
			"IwaNMNewsPro-Md"
		]
	},
	{
		"fontName": "イワタ新聞ゴシック体",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "ゴシック系",
		"cssNames": [
			"I-OTF新聞ゴシックPro M",
			"IwaGNewsPro-Md"
		]
	},
	{
		"fontName": "イワタ新聞中ゴシック体",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "ゴシック系",
		"cssNames": [
			"I-OTF新聞ゴシックPro Mp",
			"IwaGNewsPro-Mp"
		]
	},
	{
		"fontName": "イワタ新聞中太ゴシック体",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "ゴシック系",
		"cssNames": [
			"I-OTF新聞ゴシックPro D",
			"IwaGNewsPro-Db"
		]
	},
	{
		"fontName": "イワタ新聞ゴシック体新がな",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "ゴシック系",
		"cssNames": [
			"I-OTF新聞ゴシック新がなPro M",
			"IwaNGNewsPro-Md"
		]
	},
	{
		"fontName": "イワタ新聞中ゴシック体新がな",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "ゴシック系",
		"cssNames": [
			"I-OTF新聞ゴシック新がなPro Mp",
			"IwaNGNewsPro-Mp"
		]
	},
	{
		"fontName": "イワタ新聞中太ゴシック体新がな",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "ゴシック系",
		"cssNames": [
			"I-OTF新聞ゴシック新がなPro D",
			"IwaNGNewsPro-Db"
		]
	},
	{
		"fontName": "イワタ細教科書体",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "教科書系",
		"cssNames": [
			"I-OTF教科書Pro L",
			"IwaTxtPro-Lt"
		]
	},
	{
		"fontName": "イワタ中太教科書体",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "教科書系",
		"cssNames": [
			"I-OTF教科書Pro D",
			"IwaTxtPro-Db"
		]
	},
	{
		"fontName": "イワタ太教科書体",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "教科書系",
		"cssNames": [
			"I-OTF教科書Pro B",
			"IwaTxtPro-Bd"
		]
	},
	{
		"fontName": "イワタ特太教科書体",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "教科書系",
		"cssNames": [
			"I-OTF教科書Pro E",
			"IwaTxtPro-Eb"
		]
	},
	{
		"fontName": "Gイワタ細教科書体",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "教科書系",
		"cssNames": [
			"I-OTF-G教科書Pro L",
			"IwaGTxtPro-Lt"
		]
	},
	{
		"fontName": "Gイワタ中太教科書体",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "教科書系",
		"cssNames": [
			"I-OTF-G教科書Pro D",
			"IwaGTxtPro-Db"
		]
	},
	{
		"fontName": "Gイワタ中太A教科書体",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "教科書系",
		"cssNames": [
			"I-OTF-G教科書Pro DA",
			"IwaGTxtPro-DA"
		]
	},
	{
		"fontName": "Gイワタ太教科書体",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "教科書系",
		"cssNames": [
			"I-OTF-G教科書Pro B",
			"IwaGTxtPro-Bd"
		]
	},
	{
		"fontName": "Gイワタ特太教科書体",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "教科書系",
		"cssNames": [
			"I-OTF-G教科書Pro H",
			"IwaGTxtPro-Hv"
		]
	},
	{
		"fontName": "Gイワタ中明朝体",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "明朝系",
		"cssNames": [
			"I-OTF-G明朝Pro M",
			"IwaGMinPro-Md"
		]
	},
	{
		"fontName": "Gイワタ太明朝体",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "明朝系",
		"cssNames": [
			"I-OTF-G明朝Pro B",
			"IwaGMinPro-Bd"
		]
	},
	{
		"fontName": "Gイワタ中ゴシック体",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "ゴシック系",
		"cssNames": [
			"I-OTF-GゴシックPro M",
			"IwaGGoPro-Md"
		]
	},
	{
		"fontName": "Gイワタ太ゴシック体",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "ゴシック系",
		"cssNames": [
			"I-OTF-GゴシックPro B",
			"IwaGGoPro-Bd"
		]
	},
	{
		"fontName": "Gイワタ中丸ゴシック体",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "丸ゴシック系",
		"cssNames": [
			"I-OTF-G丸ゴシックPro M",
			"IwaGRGoPro-Md"
		]
	},
	{
		"fontName": "Gイワタ太丸ゴシック体",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "丸ゴシック系",
		"cssNames": [
			"I-OTF-G丸ゴシックPro B",
			"IwaGRGoPro-Bd"
		]
	},
	{
		"fontName": "Gイワタ新ゴシック体M",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "ゴシック系",
		"cssNames": [
			"I-OTF-G新ゴシックPro M",
			"IwaGNGoPro-Md"
		]
	},
	{
		"fontName": "Gイワタ新ゴシック体B",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "ゴシック系",
		"cssNames": [
			"I-OTF-G新ゴシックPro B",
			"IwaGNGoPro-Bd"
		]
	},
	{
		"fontName": "イワタ角ポップ体B",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "デザイン系",
		"cssNames": [
			"I-OTF角ポップ B",
			"IwaKPOP-Bd"
		]
	},
	{
		"fontName": "イワタ角ポップ体E",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "デザイン系",
		"cssNames": [
			"I-OTF角ポップ E",
			"IwaKPOP-Eb"
		]
	},
	{
		"fontName": "イワタ丸ポップ体B",
		"language": "日本語",
		"foundry": "IWATA",
		"category": "デザイン系",
		"cssNames": [
			"I-OTF丸ポップ B",
			"IwaRPOP-Bd"
		]
	},
	{
		"fontName": "桜花（SBH-Ouka-R）",
		"language": "日本語",
		"foundry": "白舟書体(LETS)",
		"category": "その他の筆系",
		"cssNames": [
			"HOT-桜花 Std R",
			"OukaStd-R"
		]
	},
	{
		"fontName": "静月（SBH-Seigetsu-R）",
		"language": "日本語",
		"foundry": "白舟書体(LETS)",
		"category": "その他の筆系",
		"cssNames": [
			"HOT-静月 Std R",
			"SeigetsuStd-R"
		]
	},
	{
		"fontName": "唐草（SBH-Karakusa-R）",
		"language": "日本語",
		"foundry": "白舟書体(LETS)",
		"category": "その他の筆系",
		"cssNames": [
			"HOT-唐草 Std R",
			"KarakusaStd-R"
		]
	},
	{
		"fontName": "鯨海酔侯（SBH-Geikaisuiko-R）",
		"language": "日本語",
		"foundry": "白舟書体(LETS)",
		"category": "その他の筆系",
		"cssNames": [
			"HOT-鯨海酔侯 Std R",
			"GeikaisuikoStd-R"
		]
	},
	{
		"fontName": "天真（SBH-Tenshin-R）",
		"language": "日本語",
		"foundry": "白舟書体(LETS)",
		"category": "その他の筆系",
		"cssNames": [
			"HOT-天真 Std R",
			"TenshinStd-R"
		]
	},
	{
		"fontName": "京円（SBH-KyoMadoka-R）",
		"language": "日本語",
		"foundry": "白舟書体(LETS)",
		"category": "その他の筆系",
		"cssNames": [
			"HOT-京円 Std R",
			"KyoMadokaStd-R"
		]
	},
	{
		"fontName": "京円かな太（SBH-KyoMadokaKanalarge-R）",
		"language": "日本語",
		"foundry": "白舟書体(LETS)",
		"category": "その他の筆系",
		"cssNames": [
			"HOT-京円かな太 Std R",
			"KyoMadokaKanalargeStd-R"
		]
	},
	{
		"fontName": "白雨（SBH-Hakuu-R）",
		"language": "日本語",
		"foundry": "白舟書体(LETS)",
		"category": "その他の筆系",
		"cssNames": [
			"HOT-白雨 Std R",
			"HakuuStd-R"
		]
	},
	{
		"fontName": "侍（SBH-Samurai-R）",
		"language": "日本語",
		"foundry": "白舟書体(LETS)",
		"category": "その他の筆系",
		"cssNames": [
			"HOT-さむらい Std R",
			"SamuraiStd-R"
		]
	},
	{
		"fontName": "忍者（SBH-Ninja-R）",
		"language": "日本語",
		"foundry": "白舟書体(LETS)",
		"category": "その他の筆系",
		"cssNames": [
			"HOT-忍者 Std R",
			"NinjaStd-R"
		]
	},
	{
		"fontName": "隼風（SBH-Shunpu-R）",
		"language": "日本語",
		"foundry": "白舟書体(LETS)",
		"category": "その他の筆系",
		"cssNames": [
			"HOT-隼風 Std R",
			"ShunpuStd-R"
		]
	},
	{
		"fontName": "まめ吉（SBH-Mamekichi-R）",
		"language": "日本語",
		"foundry": "白舟書体(LETS)",
		"category": "その他の筆系",
		"cssNames": [
			"HOT-まめ吉 Std R",
			"MamekichiStd-R"
		]
	},
	{
		"fontName": "まめ楽（SBH-Mameraku-R）",
		"language": "日本語",
		"foundry": "白舟書体(LETS)",
		"category": "その他の筆系",
		"cssNames": [
			"HOT-まめ楽 Std R",
			"MamerakuStd-R"
		]
	},
	{
		"fontName": "まめ福（SBH-Mamefuku-R）",
		"language": "日本語",
		"foundry": "白舟書体(LETS)",
		"category": "その他の筆系",
		"cssNames": [
			"HOT-まめ福 Std R",
			"MamefukuStd-R"
		]
	},
	{
		"fontName": "魂心（SBH-Konshin-R）",
		"language": "日本語",
		"foundry": "白舟書体(LETS)",
		"category": "その他の筆系",
		"cssNames": [
			"HOT-魂心 Std R",
			"KonshinStd-R"
		]
	},
	{
		"fontName": "白舟楷書（SBH-Kaisho-R）",
		"language": "日本語",
		"foundry": "白舟書体(LETS)",
		"category": "楷書系",
		"cssNames": [
			"HOT-白舟楷書 Std R",
			"KaishoStd-R"
		]
	},
	{
		"fontName": "白舟太楷書（SBH-FKaisho-B）",
		"language": "日本語",
		"foundry": "白舟書体(LETS)",
		"category": "楷書系",
		"cssNames": [
			"HOT-白舟太楷書 Std B",
			"FKaishoStd-B"
		]
	},
	{
		"fontName": "白舟極太楷書（SBH-GFKaisho-E）",
		"language": "日本語",
		"foundry": "白舟書体(LETS)",
		"category": "楷書系",
		"cssNames": [
			"HOT-白舟極太楷書 Std E",
			"GFKaishoStd-E"
		]
	},
	{
		"fontName": "白舟行書（SBH-Gyosho-R）",
		"language": "日本語",
		"foundry": "白舟書体(LETS)",
		"category": "行書系",
		"cssNames": [
			"HOT-白舟行書 Std R",
			"GyoshoStd-R"
		]
	},
	{
		"fontName": "白舟太行書（SBH-FGyosho-B）",
		"language": "日本語",
		"foundry": "白舟書体(LETS)",
		"category": "行書系",
		"cssNames": [
			"HOT-白舟太行書 Std B",
			"FGyoshoStd-B"
		]
	},
	{
		"fontName": "白舟極太行書（SBH-GFGyosho-E）",
		"language": "日本語",
		"foundry": "白舟書体(LETS)",
		"category": "行書系",
		"cssNames": [
			"HOT-白舟極太行書 Std E",
			"GFGyoshoStd-E"
		]
	},
	{
		"fontName": "白舟草書（SBH-Sosho-R）",
		"language": "日本語",
		"foundry": "白舟書体(LETS)",
		"category": "草書系",
		"cssNames": [
			"HOT-白舟草書 Std R",
			"SoshoStd-R"
		]
	},
	{
		"fontName": "白舟太草書（SBH-FSosho-B）",
		"language": "日本語",
		"foundry": "白舟書体(LETS)",
		"category": "草書系",
		"cssNames": [
			"HOT-白舟太草書 Std B",
			"FSoshoStd-B"
		]
	},
	{
		"fontName": "白舟極太草書（SBH-GFSosho-E）",
		"language": "日本語",
		"foundry": "白舟書体(LETS)",
		"category": "草書系",
		"cssNames": [
			"HOT-白舟極太草書 Std E",
			"GFSoshoStd-E"
		]
	},
	{
		"fontName": "白舟隷書R（SBH-ReishoR-R）",
		"language": "日本語",
		"foundry": "白舟書体(LETS)",
		"category": "隷書系",
		"cssNames": [
			"HOT-白舟隷書R Std R",
			"ReishoRStd-R"
		]
	},
	{
		"fontName": "白舟太隷書R（SBH-FReishoR-B）",
		"language": "日本語",
		"foundry": "白舟書体(LETS)",
		"category": "隷書系",
		"cssNames": [
			"HOT-白舟太隷書R Std B",
			"FReishoRStd-B"
		]
	},
	{
		"fontName": "白舟太隷書（SBH-FReisho-B）",
		"language": "日本語",
		"foundry": "白舟書体(LETS)",
		"category": "隷書系",
		"cssNames": [
			"HOT-白舟太隷書 Std B",
			"FReishoStd-B"
		]
	},
	{
		"fontName": "白舟極太隷書（SBH-GFReisho-E）",
		"language": "日本語",
		"foundry": "白舟書体(LETS)",
		"category": "隷書系",
		"cssNames": [
			"HOT-白舟極太隷書 Std E",
			"GFReishoStd-E"
		]
	},
	{
		"fontName": "白舟古印体（SBH-Kointai-R）",
		"language": "日本語",
		"foundry": "白舟書体(LETS)",
		"category": "古印系",
		"cssNames": [
			"HOT-白舟古印体 Std R",
			"KointaiStd-R"
		]
	},
	{
		"fontName": "白舟太古印体（SBH-FKointai-B）",
		"language": "日本語",
		"foundry": "白舟書体(LETS)",
		"category": "古印系",
		"cssNames": [
			"HOT-白舟太古印体 Std B",
			"FKointaiStd-B"
		]
	},
	{
		"fontName": "白舟極細印相体（SBH-GokuhosoInsotai-L）",
		"language": "日本語",
		"foundry": "白舟書体(LETS)",
		"category": "印相系",
		"cssNames": [
			"HOT-白舟極細印相体 Std L",
			"GokuhosoInsotaiStd-L"
		]
	},
	{
		"fontName": "白舟印相体（SBH-Insotai-R）",
		"language": "日本語",
		"foundry": "白舟書体(LETS)",
		"category": "印相系",
		"cssNames": [
			"HOT-白舟印相体 Std R",
			"InsotaiStd-R"
		]
	},
	{
		"fontName": "武骨(SBH-Bukotsu-U)",
		"language": "日本語",
		"foundry": "白舟書体(LETS)",
		"category": "デザイン系",
		"cssNames": [
			"HOT-武骨 Std U",
			"BukotsuStd-U"
		]
	},
	{
		"fontName": "花墨(SBH-Kasumi-U)",
		"language": "日本語",
		"foundry": "白舟書体(LETS)",
		"category": "デザイン系",
		"cssNames": [
			"HOT-花墨 Std U",
			"KasumiStd-U"
		]
	},
	{
		"fontName": "金時(SBH-Kintoki-U)",
		"language": "日本語",
		"foundry": "白舟書体(LETS)",
		"category": "デザイン系",
		"cssNames": [
			"HOT-金時 Std U",
			"KintokiStd-U"
		]
	},
	{
		"fontName": "京紫(SBH-KyoMurasaki-E)",
		"language": "日本語",
		"foundry": "白舟書体(LETS)",
		"category": "デザイン系",
		"cssNames": [
			"HOT-京紫 Std E",
			"KyoMurasakiStd-E"
		]
	},
	{
		"fontName": "大髭113(SBH-Ohige113-HV)",
		"language": "日本語",
		"foundry": "白舟書体(LETS)",
		"category": "デザイン系",
		"cssNames": [
			"HOT-大髭113 Std H",
			"Ohige113Std-H"
		]
	},
	{
		"fontName": "大髭115(SBH-Ohige115-HV)",
		"language": "日本語",
		"foundry": "白舟書体(LETS)",
		"category": "デザイン系",
		"cssNames": [
			"HOT-大髭115 Std H",
			"Ohige115Std-H"
		]
	},
	{
		"fontName": "白舟甲骨(SBH-Koukotsu-M)",
		"language": "日本語",
		"foundry": "白舟書体(LETS)",
		"category": "専門書体",
		"cssNames": [
			"HOT-白舟甲骨 Std M",
			"KoukotsuStd-M"
		]
	},
	{
		"fontName": "白舟小篆(SBH-Syoten-L)",
		"language": "日本語",
		"foundry": "白舟書体(LETS)",
		"category": "篆書系",
		"cssNames": [
			"HOT-白舟小篆 Std L",
			"SyotenStd-L"
		]
	},
	{
		"fontName": "白舟細篆書(SBH-HTensho-L)",
		"language": "日本語",
		"foundry": "白舟書体(LETS)",
		"category": "篆書系",
		"cssNames": [
			"HOT-白舟細篆書 Std L",
			"HTenshoStd-L"
		]
	},
	{
		"fontName": "白舟篆書(SBH-Tensho-M)",
		"language": "日本語",
		"foundry": "白舟書体(LETS)",
		"category": "篆書系",
		"cssNames": [
			"HOT-白舟篆書 Std M",
			"TenshoStd-M"
		]
	},
	{
		"fontName": "白舟太篆書(SBH-FTensho-D)",
		"language": "日本語",
		"foundry": "白舟書体(LETS)",
		"category": "篆書系",
		"cssNames": [
			"HOT-白舟太篆書 Std D",
			"FTenshoStd-D"
		]
	},
	{
		"fontName": "白舟篆古印(SBH-Tenkoin-M)",
		"language": "日本語",
		"foundry": "白舟書体(LETS)",
		"category": "古印系",
		"cssNames": [
			"HOT-白舟篆古印 Std M",
			"TenkoinStd-M"
		]
	},
	{
		"fontName": "白舟九畳篆細(SBH-Kujotenhoso-EL)",
		"language": "日本語",
		"foundry": "白舟書体(LETS)",
		"category": "専門書体",
		"cssNames": [
			"HOT-白舟九畳篆細 Std EL",
			"KujotenhosoStd-EL"
		]
	},
	{
		"fontName": "白舟九畳篆ラフ(SBH-KujotenR-L)",
		"language": "日本語",
		"foundry": "白舟書体(LETS)",
		"category": "専門書体",
		"cssNames": [
			"HOT-白舟九畳篆ラフ Std L",
			"KujotenRStd-L"
		]
	},
	{
		"fontName": "白舟角崩白文(SBH-Kakukuzusihaku-B)",
		"language": "日本語",
		"foundry": "白舟書体(LETS)",
		"category": "専門書体",
		"cssNames": [
			"HOT-白舟角崩白文 Std B",
			"KakukuzusihakuStd-B"
		]
	},
	{
		"fontName": "白舟角崩朱文(SBH-Kakukuzusishu-B)",
		"language": "日本語",
		"foundry": "白舟書体(LETS)",
		"category": "専門書体",
		"cssNames": [
			"HOT-白舟角崩朱文 Std B",
			"KakukuzusishuStd-B"
		]
	},
	{
		"fontName": "白舟細楷書",
		"language": "日本語",
		"foundry": "白舟書体(パッケージ)",
		"category": "楷書系",
		"cssNames": [
			"白舟細楷書",
			"HakusyuKaisyoLight"
		]
	},
	{
		"fontName": "白舟楷書",
		"language": "日本語",
		"foundry": "白舟書体(パッケージ)",
		"category": "楷書系",
		"cssNames": [
			"白舟楷書",
			"HakusyuKaisyo"
		]
	},
	{
		"fontName": "白舟太楷書",
		"language": "日本語",
		"foundry": "白舟書体(パッケージ)",
		"category": "楷書系",
		"cssNames": [
			"白舟太楷書",
			"HakusyuKaisyoBold"
		]
	},
	{
		"fontName": "白舟極太楷書",
		"language": "日本語",
		"foundry": "白舟書体(パッケージ)",
		"category": "楷書系",
		"cssNames": [
			"白舟極太楷書",
			"HakusyuKaisyoExtraBold"
		]
	},
	{
		"fontName": "白舟細楷書Pro",
		"language": "日本語",
		"foundry": "白舟書体(パッケージ)",
		"category": "楷書系",
		"cssNames": [
			"白舟細楷書Pro",
			"HakusyuKaisyoLightPro"
		]
	},
	{
		"fontName": "白舟楷書Pro",
		"language": "日本語",
		"foundry": "白舟書体(パッケージ)",
		"category": "楷書系",
		"cssNames": [
			"白舟楷書Pro",
			"HakusyuKaisyoPro"
		]
	},
	{
		"fontName": "白舟太楷書Pro",
		"language": "日本語",
		"foundry": "白舟書体(パッケージ)",
		"category": "楷書系",
		"cssNames": [
			"白舟太楷書Pro",
			"HakusyuKaisyoBoldPro"
		]
	},
	{
		"fontName": "白舟極太楷書Pro",
		"language": "日本語",
		"foundry": "白舟書体(パッケージ)",
		"category": "楷書系",
		"cssNames": [
			"白舟極太楷書Pro",
			"HakusyuKaisyoExtraBoldPro"
		]
	},
	{
		"fontName": "白舟太楷書fs",
		"language": "日本語",
		"foundry": "白舟書体(パッケージ)",
		"category": "楷書系",
		"cssNames": [
			"白舟太楷書fs",
			"HkusyuKaisyoBold_fs"
		]
	},
	{
		"fontName": "白舟極太楷書fs",
		"language": "日本語",
		"foundry": "白舟書体(パッケージ)",
		"category": "楷書系",
		"cssNames": [
			"白舟極太楷書fs",
			"HakusyuKaisyoExtraBoldFs"
		]
	},
	{
		"fontName": "白舟細行書",
		"language": "日本語",
		"foundry": "白舟書体(パッケージ)",
		"category": "行書系",
		"cssNames": [
			"白舟細行書",
			"HakusyuGyousyoLight"
		]
	},
	{
		"fontName": "白舟行書",
		"language": "日本語",
		"foundry": "白舟書体(パッケージ)",
		"category": "行書系",
		"cssNames": [
			"白舟行書",
			"HakusyuGyousyo"
		]
	},
	{
		"fontName": "白舟太行書",
		"language": "日本語",
		"foundry": "白舟書体(パッケージ)",
		"category": "行書系",
		"cssNames": [
			"白舟太行書",
			"HakusyuGyousyoBold"
		]
	},
	{
		"fontName": "白舟極太行書",
		"language": "日本語",
		"foundry": "白舟書体(パッケージ)",
		"category": "行書系",
		"cssNames": [
			"白舟極太行書",
			"HakusyuGyosyoExtraBold"
		]
	},
	{
		"fontName": "白舟行書Pro",
		"language": "日本語",
		"foundry": "白舟書体(パッケージ)",
		"category": "行書系",
		"cssNames": [
			"白舟行書Pro",
			"HakusyuGyosyoPro"
		]
	},
	{
		"fontName": "白舟太行書Pro",
		"language": "日本語",
		"foundry": "白舟書体(パッケージ)",
		"category": "行書系",
		"cssNames": [
			"白舟太行書Pro",
			"HakusyuGyosyoBoldPro"
		]
	},
	{
		"fontName": "白舟太行書fs",
		"language": "日本語",
		"foundry": "白舟書体(パッケージ)",
		"category": "行書系",
		"cssNames": [
			"白舟太行書fs",
			"HakusyuGyosyoBold_fs"
		]
	},
	{
		"fontName": "白舟極太行書fs",
		"language": "日本語",
		"foundry": "白舟書体(パッケージ)",
		"category": "行書系",
		"cssNames": [
			"白舟極太行書fs",
			"HakusyuGyosyoExtraBoldFs"
		]
	},
	{
		"fontName": "白舟細隷書",
		"language": "日本語",
		"foundry": "白舟書体(パッケージ)",
		"category": "隷書系",
		"cssNames": [
			"白舟細隷書",
			"HakusyuReisyoLight"
		]
	},
	{
		"fontName": "白舟隷書",
		"language": "日本語",
		"foundry": "白舟書体(パッケージ)",
		"category": "隷書系",
		"cssNames": [
			"白舟隷書",
			"HakusyuReisyo"
		]
	},
	{
		"fontName": "白舟太隷書",
		"language": "日本語",
		"foundry": "白舟書体(パッケージ)",
		"category": "隷書系",
		"cssNames": [
			"白舟太隷書",
			"HakusyuReisyoBold"
		]
	},
	{
		"fontName": "白舟極太隷書",
		"language": "日本語",
		"foundry": "白舟書体(パッケージ)",
		"category": "隷書系",
		"cssNames": [
			"白舟極太隷書",
			"HakusyuReisyoExtraBold"
		]
	},
	{
		"fontName": "白舟隷書Pro",
		"language": "日本語",
		"foundry": "白舟書体(パッケージ)",
		"category": "隷書系",
		"cssNames": [
			"白舟隷書Pro",
			"HakusyuReisyoPro"
		]
	},
	{
		"fontName": "白舟太隷書Pro",
		"language": "日本語",
		"foundry": "白舟書体(パッケージ)",
		"category": "隷書系",
		"cssNames": [
			"白舟太隷書Pro",
			"HakusyuReisyoBoldPro"
		]
	},
	{
		"fontName": "白舟太隷書fs",
		"language": "日本語",
		"foundry": "白舟書体(パッケージ)",
		"category": "隷書系",
		"cssNames": [
			"白舟太隷書fs",
			"HakusyuReisyoBold_fs"
		]
	},
	{
		"fontName": "白舟極太隷書fs",
		"language": "日本語",
		"foundry": "白舟書体(パッケージ)",
		"category": "隷書系",
		"cssNames": [
			"白舟極太隷書fs",
			"HakusyuReisyoExtraBoldFs"
		]
	},
	{
		"fontName": "白舟細古印体",
		"language": "日本語",
		"foundry": "白舟書体(パッケージ)",
		"category": "古印系",
		"cssNames": [
			"白舟細古印体",
			"HakusyuKointaiLight"
		]
	},
	{
		"fontName": "白舟古印体",
		"language": "日本語",
		"foundry": "白舟書体(パッケージ)",
		"category": "古印系",
		"cssNames": [
			"白舟古印体",
			"HakusyuKointai"
		]
	},
	{
		"fontName": "白舟太古印体",
		"language": "日本語",
		"foundry": "白舟書体(パッケージ)",
		"category": "古印系",
		"cssNames": [
			"白舟太古印体",
			"HakusyuKointaiBold"
		]
	},
	{
		"fontName": "白舟古印体Pro",
		"language": "日本語",
		"foundry": "白舟書体(パッケージ)",
		"category": "古印系",
		"cssNames": [
			"白舟古印体Pro",
			"HakusyuKointaiPro"
		]
	},
	{
		"fontName": "白舟太古印体Pro",
		"language": "日本語",
		"foundry": "白舟書体(パッケージ)",
		"category": "古印系",
		"cssNames": [
			"白舟太古印体Pro",
			"HakusyuKointaiBoldPro"
		]
	},
	{
		"fontName": "白舟極細印相体",
		"language": "日本語",
		"foundry": "白舟書体(パッケージ)",
		"category": "印相系",
		"cssNames": [
			"白舟極細印相体",
			"HkInsoutaiExtraLight"
		]
	},
	{
		"fontName": "白舟印相体",
		"language": "日本語",
		"foundry": "白舟書体(パッケージ)",
		"category": "印相系",
		"cssNames": [
			"白舟印相体",
			"HkInsoutai"
		]
	},
	{
		"fontName": "白舟細篆書",
		"language": "日本語",
		"foundry": "白舟書体(パッケージ)",
		"category": "篆書系",
		"cssNames": [
			"白舟細篆書",
			"HakusyuTensyoLight"
		]
	},
	{
		"fontName": "白舟篆書",
		"language": "日本語",
		"foundry": "白舟書体(パッケージ)",
		"category": "篆書系",
		"cssNames": [
			"白舟篆書",
			"HakusyuTensyo"
		]
	},
	{
		"fontName": "白舟太篆書",
		"language": "日本語",
		"foundry": "白舟書体(パッケージ)",
		"category": "篆書系",
		"cssNames": [
			"白舟太篆書",
			"HakusyuTensyoBold"
		]
	},
	{
		"fontName": "白舟草書Pro",
		"language": "日本語",
		"foundry": "白舟書体(パッケージ)",
		"category": "草書系",
		"cssNames": [
			"白舟草書Pro",
			"HakusyuSousyoPro"
		]
	},
	{
		"fontName": "白舟太草書Pro",
		"language": "日本語",
		"foundry": "白舟書体(パッケージ)",
		"category": "草書系",
		"cssNames": [
			"白舟太草書Pro",
			"HakusyuSousyoBoldPro"
		]
	},
	{
		"fontName": "白舟極太草書",
		"language": "日本語",
		"foundry": "白舟書体(パッケージ)",
		"category": "草書系",
		"cssNames": [
			"白舟極太草書",
			"HakusyuSousyoExtraBold"
		]
	},
	{
		"fontName": "白舟太草書fs",
		"language": "日本語",
		"foundry": "白舟書体(パッケージ)",
		"category": "草書系",
		"cssNames": [
			"白舟太草書fs",
			"HakusyuSousyoBold_fs"
		]
	},
	{
		"fontName": "白舟極太草書fs",
		"language": "日本語",
		"foundry": "白舟書体(パッケージ)",
		"category": "草書系",
		"cssNames": [
			"白舟極太草書fs",
			"HakusyuSousyoExtraBoldFs"
		]
	},
	{
		"fontName": "白舟篆古印",
		"language": "日本語",
		"foundry": "白舟書体(パッケージ)",
		"category": "古印系",
		"cssNames": [
			"白舟篆古印",
			"HakusyuTenkoin"
		]
	},
	{
		"fontName": "白舟小篆",
		"language": "日本語",
		"foundry": "白舟書体(パッケージ)",
		"category": "篆書系",
		"cssNames": [
			"白舟小篆",
			"HakusyuSyouten"
		]
	},
	{
		"fontName": "白舟甲骨",
		"language": "日本語",
		"foundry": "白舟書体(パッケージ)",
		"category": "専門書体",
		"cssNames": [
			"白舟甲骨",
			"HakusyuKoukotu"
		]
	},
	{
		"fontName": "白舟九畳篆ラフ",
		"language": "日本語",
		"foundry": "白舟書体(パッケージ)",
		"category": "専門書体",
		"cssNames": [
			"白舟九畳篆ラフ",
			"hkkjtr"
		]
	},
	{
		"fontName": "白舟九畳篆細",
		"language": "日本語",
		"foundry": "白舟書体(パッケージ)",
		"category": "専門書体",
		"cssNames": [
			"白舟九畳篆細",
			"hkkjtl"
		]
	},
	{
		"fontName": "白舟角崩朱文",
		"language": "日本語",
		"foundry": "白舟書体(パッケージ)",
		"category": "専門書体",
		"cssNames": [
			"白舟角崩朱文",
			"hkkakus"
		]
	},
	{
		"fontName": "白舟角崩白文",
		"language": "日本語",
		"foundry": "白舟書体(パッケージ)",
		"category": "専門書体",
		"cssNames": [
			"白舟角崩白文",
			"hkkakuh"
		]
	},
	{
		"fontName": "鯨海酔侯",
		"language": "日本語",
		"foundry": "白舟書体(パッケージ)",
		"category": "その他の筆系",
		"cssNames": [
			"鯨海酔侯",
			"GeikaiSuikou"
		]
	},
	{
		"fontName": "鯨海酔侯S",
		"language": "日本語",
		"foundry": "白舟書体(パッケージ)",
		"category": "その他の筆系",
		"cssNames": [
			"鯨海酔侯S",
			"GeikaiSuikouSmall"
		]
	},
	{
		"fontName": "京円",
		"language": "日本語",
		"foundry": "白舟書体(パッケージ)",
		"category": "その他の筆系",
		"cssNames": [
			"京円",
			"KyoMadoka"
		]
	},
	{
		"fontName": "京円かな太",
		"language": "日本語",
		"foundry": "白舟書体(パッケージ)",
		"category": "その他の筆系",
		"cssNames": [
			"京円かな太",
			"KyoMadokaKanaB"
		]
	},
	{
		"fontName": "さむらい",
		"language": "日本語",
		"foundry": "白舟書体(パッケージ)",
		"category": "その他の筆系",
		"cssNames": [
			"さむらい",
			"Samurai"
		]
	},
	{
		"fontName": "隼風",
		"language": "日本語",
		"foundry": "白舟書体(パッケージ)",
		"category": "その他の筆系",
		"cssNames": [
			"隼風",
			"Shunpu"
		]
	},
	{
		"fontName": "唐草",
		"language": "日本語",
		"foundry": "白舟書体(パッケージ)",
		"category": "その他の筆系",
		"cssNames": [
			"唐草",
			"Karakusa"
		]
	},
	{
		"fontName": "桜花",
		"language": "日本語",
		"foundry": "白舟書体(パッケージ)",
		"category": "その他の筆系",
		"cssNames": [
			"桜花",
			"Ohka"
		]
	},
	{
		"fontName": "魂心",
		"language": "日本語",
		"foundry": "白舟書体(パッケージ)",
		"category": "その他の筆系",
		"cssNames": [
			"魂心",
			"Konshin"
		]
	},
	{
		"fontName": "静月",
		"language": "日本語",
		"foundry": "白舟書体(パッケージ)",
		"category": "その他の筆系",
		"cssNames": [
			"静月",
			"Seigetsu"
		]
	},
	{
		"fontName": "白雨",
		"language": "日本語",
		"foundry": "白舟書体(パッケージ)",
		"category": "その他の筆系",
		"cssNames": [
			"白雨",
			"Hakuu"
		]
	},
	{
		"fontName": "天真",
		"language": "日本語",
		"foundry": "白舟書体(パッケージ)",
		"category": "その他の筆系",
		"cssNames": [
			"天真",
			"Tenshin"
		]
	},
	{
		"fontName": "花墨(花墨ｓを使用)",
		"language": "日本語",
		"foundry": "白舟書体(パッケージ)",
		"category": "その他の筆系",
		"cssNames": [
			"花墨",
			"Kasumi"
		]
	},
	{
		"fontName": "花墨s",
		"language": "日本語",
		"foundry": "白舟書体(パッケージ)",
		"category": "その他の筆系",
		"cssNames": [
			"花墨s",
			"Kasumi_s"
		]
	},
	{
		"fontName": "大髭113",
		"language": "日本語",
		"foundry": "白舟書体(パッケージ)",
		"category": "その他の筆系",
		"cssNames": [
			"大髭113",
			"Ohhige113"
		]
	},
	{
		"fontName": "大髭115",
		"language": "日本語",
		"foundry": "白舟書体(パッケージ)",
		"category": "その他の筆系",
		"cssNames": [
			"大髭115",
			"Ohhige115"
		]
	},
	{
		"fontName": "忍者",
		"language": "日本語",
		"foundry": "白舟書体(パッケージ)",
		"category": "その他の筆系",
		"cssNames": [
			"忍者",
			"Ninja"
		]
	},
	{
		"fontName": "金時",
		"language": "日本語",
		"foundry": "白舟書体(パッケージ)",
		"category": "その他の筆系",
		"cssNames": [
			"金時",
			"Kintoki"
		]
	},
	{
		"fontName": "阿吽U",
		"language": "日本語",
		"foundry": "白舟書体(パッケージ)",
		"category": "その他の筆系",
		"cssNames": [
			"阿吽U",
			"AunU"
		]
	},
	{
		"fontName": "阿吽M",
		"language": "日本語",
		"foundry": "白舟書体(パッケージ)",
		"category": "その他の筆系",
		"cssNames": [
			"阿吽M",
			"AunM"
		]
	},
	{
		"fontName": "武骨",
		"language": "日本語",
		"foundry": "白舟書体(パッケージ)",
		"category": "その他の筆系",
		"cssNames": [
			"武骨",
			"Bukotsu"
		]
	},
	{
		"fontName": "まめ吉",
		"language": "日本語",
		"foundry": "白舟書体(パッケージ)",
		"category": "その他の筆系",
		"cssNames": [
			"まめ吉",
			"Mamekichi"
		]
	},
	{
		"fontName": "まめ楽",
		"language": "日本語",
		"foundry": "白舟書体(パッケージ)",
		"category": "その他の筆系",
		"cssNames": [
			"まめ楽",
			"Mameraku"
		]
	},
	{
		"fontName": "まめ福",
		"language": "日本語",
		"foundry": "白舟書体(パッケージ)",
		"category": "その他の筆系",
		"cssNames": [
			"まめ福",
			"Mamefuku"
		]
	},
	{
		"fontName": "まめ吉FS",
		"language": "日本語",
		"foundry": "白舟書体(パッケージ)",
		"category": "その他の筆系",
		"cssNames": [
			"まめ吉FS",
			"Mamekichi_fs"
		]
	},
	{
		"fontName": "まめ楽FS",
		"language": "日本語",
		"foundry": "白舟書体(パッケージ)",
		"category": "その他の筆系",
		"cssNames": [
			"まめ楽FS",
			"Mameraku_fs"
		]
	},
	{
		"fontName": "まめ福FS",
		"language": "日本語",
		"foundry": "白舟書体(パッケージ)",
		"category": "その他の筆系",
		"cssNames": [
			"まめ福FS",
			"Mamefuku_fs"
		]
	},
	{
		"fontName": "NUDモトヤアポロ2B",
		"language": "日本語",
		"foundry": "MOTOYA",
		"category": "デザイン系",
		"cssNames": [
			"NUDモトヤアポロ Std W2b",
			"NudMotoyaAporoStd-W2b"
		]
	},
	{
		"fontName": "NUDモトヤアポロ3",
		"language": "日本語",
		"foundry": "MOTOYA",
		"category": "デザイン系",
		"cssNames": [
			"NUDモトヤアポロ Std W3",
			"NudMotoyaAporoStd-W3"
		]
	},
	{
		"fontName": "NUDモトヤアポロ4",
		"language": "日本語",
		"foundry": "MOTOYA",
		"category": "デザイン系",
		"cssNames": [
			"NUDモトヤアポロ Std W4",
			"NudMotoyaAporoStd-W4"
		]
	},
	{
		"fontName": "NUDモトヤアポロ5",
		"language": "日本語",
		"foundry": "MOTOYA",
		"category": "デザイン系",
		"cssNames": [
			"NUDモトヤアポロ Std W5",
			"NudMotoyaAporoStd-W5"
		]
	},
	{
		"fontName": "NUDモトヤアポロ6",
		"language": "日本語",
		"foundry": "MOTOYA",
		"category": "デザイン系",
		"cssNames": [
			"NUDモトヤアポロ Std W6",
			"NudMotoyaAporoStd-W6"
		]
	},
	{
		"fontName": "NUDモトヤシーダ2B",
		"language": "日本語",
		"foundry": "MOTOYA",
		"category": "ゴシック系",
		"cssNames": [
			"NUDモトヤシーダ Std W2b",
			"NudMotoyaCedarStd-W2b"
		]
	},
	{
		"fontName": "NUDモトヤシーダ3",
		"language": "日本語",
		"foundry": "MOTOYA",
		"category": "ゴシック系",
		"cssNames": [
			"NUDモトヤシーダ Std W3",
			"NudMotoyaCedarStd-W3"
		]
	},
	{
		"fontName": "NUDモトヤシーダ4",
		"language": "日本語",
		"foundry": "MOTOYA",
		"category": "ゴシック系",
		"cssNames": [
			"NUDモトヤシーダ Std W4",
			"NudMotoyaCedarStd-W4"
		]
	},
	{
		"fontName": "NUDモトヤシーダ5",
		"language": "日本語",
		"foundry": "MOTOYA",
		"category": "ゴシック系",
		"cssNames": [
			"NUDモトヤシーダ Std W5",
			"NudMotoyaCedarStd-W5"
		]
	},
	{
		"fontName": "NUDモトヤシーダ6",
		"language": "日本語",
		"foundry": "MOTOYA",
		"category": "ゴシック系",
		"cssNames": [
			"NUDモトヤシーダ Std W6",
			"NudMotoyaCedarStd-W6"
		]
	},
	{
		"fontName": "NUDモトヤマルベリ2B",
		"language": "日本語",
		"foundry": "MOTOYA",
		"category": "丸ゴシック系",
		"cssNames": [
			"NUDモトヤマルベリ Std W2b",
			"NudMotoyaMaruStd-W2b"
		]
	},
	{
		"fontName": "NUDモトヤマルベリ3",
		"language": "日本語",
		"foundry": "MOTOYA",
		"category": "丸ゴシック系",
		"cssNames": [
			"NUDモトヤマルベリ Std W3",
			"NudMotoyaMaruStd-W3"
		]
	},
	{
		"fontName": "NUDモトヤマルベリ4",
		"language": "日本語",
		"foundry": "MOTOYA",
		"category": "丸ゴシック系",
		"cssNames": [
			"NUDモトヤマルベリ Std W4",
			"NudMotoyaMaruStd-W4"
		]
	},
	{
		"fontName": "NUDモトヤマルベリ5",
		"language": "日本語",
		"foundry": "MOTOYA",
		"category": "丸ゴシック系",
		"cssNames": [
			"NUDモトヤマルベリ Std W5",
			"NudMotoyaMaruStd-W5"
		]
	},
	{
		"fontName": "NUDモトヤマルベリ6",
		"language": "日本語",
		"foundry": "MOTOYA",
		"category": "丸ゴシック系",
		"cssNames": [
			"NUDモトヤマルベリ Std W6",
			"NudMotoyaMaruStd-W6"
		]
	},
	{
		"fontName": "NUDモトヤ明朝2B",
		"language": "日本語",
		"foundry": "MOTOYA",
		"category": "明朝系",
		"cssNames": [
			"NUDモトヤ明朝 Std W2b",
			"NudMotoyaMinchoStd-W2b"
		]
	},
	{
		"fontName": "NUDモトヤ明朝3",
		"language": "日本語",
		"foundry": "MOTOYA",
		"category": "明朝系",
		"cssNames": [
			"NUDモトヤ明朝 Std W3",
			"NudMotoyaMinchoStd-W3"
		]
	},
	{
		"fontName": "NUDモトヤ明朝4",
		"language": "日本語",
		"foundry": "MOTOYA",
		"category": "明朝系",
		"cssNames": [
			"NUDモトヤ明朝 Std W4",
			"NudMotoyaMinchoStd-W4"
		]
	},
	{
		"fontName": "NUDモトヤ明朝5",
		"language": "日本語",
		"foundry": "MOTOYA",
		"category": "明朝系",
		"cssNames": [
			"NUDモトヤ明朝 Std W5",
			"NudMotoyaMinchoStd-W5"
		]
	},
	{
		"fontName": "NUDモトヤ明朝6",
		"language": "日本語",
		"foundry": "MOTOYA",
		"category": "明朝系",
		"cssNames": [
			"NUDモトヤ明朝 Std W6",
			"NudMotoyaMinchoStd-W6"
		]
	},
	{
		"fontName": "モトヤ正楷書3",
		"language": "日本語",
		"foundry": "MOTOYA",
		"category": "楷書系",
		"cssNames": [
			"モトヤ正楷書 Std W3",
			"MotoyaSeikaiStd-W3"
		]
	},
	{
		"fontName": "モトヤ正楷書5",
		"language": "日本語",
		"foundry": "MOTOYA",
		"category": "楷書系",
		"cssNames": [
			"モトヤ正楷書 Std W5",
			"MotoyaSeikaiStd-W5"
		]
	},
	{
		"fontName": "モトヤ隷書2",
		"language": "日本語",
		"foundry": "MOTOYA",
		"category": "隷書系",
		"cssNames": [
			"モトヤ隷書 Std W2",
			"MotoyaReisyoStd-W2"
		]
	},
	{
		"fontName": "モトヤ隷書4",
		"language": "日本語",
		"foundry": "MOTOYA",
		"category": "隷書系",
		"cssNames": [
			"モトヤ隷書 Std W4",
			"MotoyaReisyoStd-W4"
		]
	},
	{
		"fontName": "モトヤ隷書6",
		"language": "日本語",
		"foundry": "MOTOYA",
		"category": "隷書系",
		"cssNames": [
			"モトヤ隷書 Std W6",
			"MotoyaReisyoStd-W6"
		]
	},
	{
		"fontName": "モトヤ行書3",
		"language": "日本語",
		"foundry": "MOTOYA",
		"category": "行書系",
		"cssNames": [
			"モトヤ行書 Std W3",
			"MotoyaGyosyoStd-W3"
		]
	},
	{
		"fontName": "モトヤ大楷5",
		"language": "日本語",
		"foundry": "MOTOYA",
		"category": "楷書系",
		"cssNames": [
			"モトヤ大楷 Std W5",
			"MotoyaOkaiStd-W5"
		]
	},
	{
		"fontName": "モトヤ教科書3",
		"language": "日本語",
		"foundry": "MOTOYA",
		"category": "教科書系",
		"cssNames": [
			"モトヤ教科書 Std W3",
			"MotoyaKyotaiStd-W3"
		]
	},
	{
		"fontName": "モトヤ教科書4",
		"language": "日本語",
		"foundry": "MOTOYA",
		"category": "教科書系",
		"cssNames": [
			"モトヤ教科書 Std W4",
			"MotoyaKyotaiStd-W4"
		]
	},
	{
		"fontName": "モトヤバーチ3",
		"language": "日本語",
		"foundry": "MOTOYA",
		"category": "デザイン系",
		"cssNames": [
			"モトヤバーチ Std W3",
			"MotoyaBirchStd-W3"
		]
	},
	{
		"fontName": "モトヤバーチ5",
		"language": "日本語",
		"foundry": "MOTOYA",
		"category": "デザイン系",
		"cssNames": [
			"モトヤバーチ Std W5",
			"MotoyaBirchStd-W5"
		]
	},
	{
		"fontName": "モトヤバーチ6",
		"language": "日本語",
		"foundry": "MOTOYA",
		"category": "デザイン系",
		"cssNames": [
			"モトヤバーチ Std W6",
			"MotoyaBirchStd-W6"
		]
	},
	{
		"fontName": "モトヤステンシルアポロ4",
		"language": "日本語",
		"foundry": "MOTOYA",
		"category": "デザイン系",
		"cssNames": [
			"モトヤstアポロ Std W4",
			"MotoyaStAporoStd-W4"
		]
	},
	{
		"fontName": "モトヤステンシルアポロ6",
		"language": "日本語",
		"foundry": "MOTOYA",
		"category": "デザイン系",
		"cssNames": [
			"モトヤstアポロ Std W6",
			"MotoyaStAporoStd-W6"
		]
	},
	{
		"fontName": "モトヤ丸アポロ4",
		"language": "日本語",
		"foundry": "MOTOYA",
		"category": "デザイン系",
		"cssNames": [
			"モトヤ丸アポロ Std W4",
			"MotoyaMaAporoStd-W4"
		]
	},
	{
		"fontName": "モトヤ丸アポロ6",
		"language": "日本語",
		"foundry": "MOTOYA",
		"category": "デザイン系",
		"cssNames": [
			"モトヤ丸アポロ Std W6",
			"MotoyaMaAporoStd-W6"
		]
	},
	{
		"fontName": "モトヤ装飾LIアポロ6",
		"language": "日本語",
		"foundry": "MOTOYA",
		"category": "デザイン系",
		"cssNames": [
			"ﾓﾄﾔ装飾LIｱﾎﾟﾛ Jis W6",
			"MtySousyokuLiAJis-W6"
		]
	},
	{
		"fontName": "モトヤ装飾LIシーダ6",
		"language": "日本語",
		"foundry": "MOTOYA",
		"category": "デザイン系",
		"cssNames": [
			"ﾓﾄﾔ装飾LIｼｰﾀﾞ Jis W6",
			"MtySousyokuLiCJis-W6"
		]
	},
	{
		"fontName": "モトヤ装飾LIマルベリ6",
		"language": "日本語",
		"foundry": "MOTOYA",
		"category": "デザイン系",
		"cssNames": [
			"ﾓﾄﾔ装飾LIﾏﾙﾍﾞﾘ Jis W6",
			"MtySousyokuLiMrJis-W6"
		]
	},
	{
		"fontName": "モトヤ装飾LIバーチ6",
		"language": "日本語",
		"foundry": "MOTOYA",
		"category": "デザイン系",
		"cssNames": [
			"ﾓﾄﾔ装飾LIﾊﾞｰﾁ Jis W6",
			"MtySousyokuLiBcJis-W6"
		]
	},
	{
		"fontName": "モトヤ装飾SHアポロ6",
		"language": "日本語",
		"foundry": "MOTOYA",
		"category": "デザイン系",
		"cssNames": [
			"ﾓﾄﾔ装飾SHｱﾎﾟﾛ Jis W6",
			"MtySousyokuShAJis-W6"
		]
	},
	{
		"fontName": "モトヤ装飾SHシーダ6",
		"language": "日本語",
		"foundry": "MOTOYA",
		"category": "デザイン系",
		"cssNames": [
			"ﾓﾄﾔ装飾SHｼｰﾀﾞ Jis W6",
			"MtySousyokuShCJis-W6"
		]
	},
	{
		"fontName": "モトヤ装飾SHマルベリ6",
		"language": "日本語",
		"foundry": "MOTOYA",
		"category": "デザイン系",
		"cssNames": [
			"ﾓﾄﾔ装飾SHﾏﾙﾍﾞﾘ Jis W6",
			"MtySousyokuShMrJis-W6"
		]
	},
	{
		"fontName": "モトヤ装飾SHバーチ6",
		"language": "日本語",
		"foundry": "MOTOYA",
		"category": "デザイン系",
		"cssNames": [
			"ﾓﾄﾔ装飾SHﾊﾞｰﾁ Jis W6",
			"MtySousyokuShBcJis-W6"
		]
	},
	{
		"fontName": "モトヤ装飾EMシーダ6",
		"language": "日本語",
		"foundry": "MOTOYA",
		"category": "デザイン系",
		"cssNames": [
			"ﾓﾄﾔ装飾EMｼｰﾀﾞ Jis W6",
			"MtySousyokuEmCJis-W6"
		]
	},
	{
		"fontName": "モトヤ装飾EMマルベリ6",
		"language": "日本語",
		"foundry": "MOTOYA",
		"category": "デザイン系",
		"cssNames": [
			"ﾓﾄﾔ装飾EMﾏﾙﾍﾞﾘ Jis W6",
			"MtySousyokuEmMrJis-W6"
		]
	},
	{
		"fontName": "モトヤ装飾EMバーチ6",
		"language": "日本語",
		"foundry": "MOTOYA",
		"category": "デザイン系",
		"cssNames": [
			"ﾓﾄﾔ装飾EMﾊﾞｰﾁ Jis W6",
			"MtySousyokuEmBcJis-W6"
		]
	},
	{
		"fontName": "モトヤ装飾EMアポロ6",
		"language": "日本語",
		"foundry": "MOTOYA",
		"category": "デザイン系",
		"cssNames": [
			"ﾓﾄﾔ装飾EMｱﾎﾟﾛ Jis W6",
			"MtySousyokuEmAJis-W6"
		]
	},
	{
		"fontName": "モトヤステンシルアポロ4－お試し版：1,365文字種制限",
		"language": "日本語",
		"foundry": "MOTOYA",
		"category": "デザイン系",
		"cssNames": [
			"NTモトヤstアポロ Std W4",
			"NtMotoya StAporo Std W4"
		]
	},
	{
		"fontName": "モトヤ丸アポロ４－お試し版：1,365文字種制限",
		"language": "日本語",
		"foundry": "MOTOYA",
		"category": "デザイン系",
		"cssNames": [
			"NTモトヤ丸アポロ Std W4",
			"NtMotoya MaAporo Std W4"
		]
	},
	{
		"fontName": "モトヤバーチ3－お試し版：1,365文字種制限",
		"language": "日本語",
		"foundry": "MOTOYA",
		"category": "デザイン系",
		"cssNames": [
			"NTモトヤバーチ Std W3",
			"NtMotoya Birch Std W3"
		]
	},
	{
		"fontName": "リュウミン R-KL",
		"language": "日本語",
		"foundry": "MORISAWA",
		"category": "明朝系",
		"cssNames": [
			"リュウミン R-KL",
			"Ryumin Regular KL"
		]
	},
	{
		"fontName": "リュウミン M-KL",
		"language": "日本語",
		"foundry": "MORISAWA",
		"category": "明朝系",
		"cssNames": [
			"リュウミン M-KL",
			"Ryumin Medium KL"
		]
	},
	{
		"fontName": "リュウミン B-KL",
		"language": "日本語",
		"foundry": "MORISAWA",
		"category": "明朝系",
		"cssNames": [
			"リュウミン B-KL",
			"Ryumin Bold KL"
		]
	},
	{
		"fontName": "リュウミン R-KL JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"category": "明朝系",
		"cssNames": [
			"リュウミン R-KL JIS2004",
			"Ryumin Regular KL JIS2004"
		]
	},
	{
		"fontName": "リュウミン M-KL JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"category": "明朝系",
		"cssNames": [
			"リュウミン M-KL JIS2004",
			"Ryumin Medium KL JIS2004"
		]
	},
	{
		"fontName": "リュウミン B-KL JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"category": "明朝系",
		"cssNames": [
			"リュウミン B-KL JIS2004",
			"Ryumin Bold KL JIS2004"
		]
	},
	{
		"fontName": "新ゴ R",
		"language": "日本語",
		"foundry": "MORISAWA",
		"category": "ゴシック系",
		"cssNames": [
			"新ゴ R",
			"Shin Go Regular"
		]
	},
	{
		"fontName": "新ゴ M",
		"language": "日本語",
		"foundry": "MORISAWA",
		"category": "ゴシック系",
		"cssNames": [
			"新ゴ M",
			"Shin Go Medium"
		]
	},
	{
		"fontName": "新ゴ B",
		"language": "日本語",
		"foundry": "MORISAWA",
		"category": "ゴシック系",
		"cssNames": [
			"新ゴ B",
			"Shin Go Bold"
		]
	},
	{
		"fontName": "新ゴ R JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"category": "ゴシック系",
		"cssNames": [
			"新ゴ R JIS2004",
			"Shin Go Regular JIS2004"
		]
	},
	{
		"fontName": "新ゴ M JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"category": "ゴシック系",
		"cssNames": [
			"新ゴ M JIS2004",
			"Shin Go Medium JIS2004"
		]
	},
	{
		"fontName": "新ゴ B JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"category": "ゴシック系",
		"cssNames": [
			"新ゴ B JIS2004",
			"Shin Go Bold JIS2004"
		]
	},
	{
		"fontName": "新丸ゴ R",
		"language": "日本語",
		"foundry": "MORISAWA",
		"category": "丸ゴシック系",
		"cssNames": [
			"新丸ゴ R",
			"Shin Maru Go Regular"
		]
	},
	{
		"fontName": "新丸ゴ M",
		"language": "日本語",
		"foundry": "MORISAWA",
		"category": "丸ゴシック系",
		"cssNames": [
			"新丸ゴ M",
			"Shin Maru Go Medium"
		]
	},
	{
		"fontName": "新丸ゴ B",
		"language": "日本語",
		"foundry": "MORISAWA",
		"category": "丸ゴシック系",
		"cssNames": [
			"新丸ゴ B",
			"Shin Maru Go Bold"
		]
	},
	{
		"fontName": "新丸ゴ R JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"category": "丸ゴシック系",
		"cssNames": [
			"新丸ゴ R JIS2004",
			"Shin Maru Go Regular JIS2004"
		]
	},
	{
		"fontName": "新丸ゴ M JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"category": "丸ゴシック系",
		"cssNames": [
			"新丸ゴ M JIS2004",
			"Shin Maru Go Medium JIS2004"
		]
	},
	{
		"fontName": "新丸ゴ B JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"category": "丸ゴシック系",
		"cssNames": [
			"新丸ゴ B JIS2004",
			"Shin Maru Go Bold JIS2004"
		]
	},
	{
		"fontName": "ゴシックMB101 R",
		"language": "日本語",
		"foundry": "MORISAWA",
		"category": "ゴシック系",
		"cssNames": [
			"ゴシックMB101 R",
			"Gothic MB101 Regular"
		]
	},
	{
		"fontName": "ゴシックMB101 M",
		"language": "日本語",
		"foundry": "MORISAWA",
		"category": "ゴシック系",
		"cssNames": [
			"ゴシックMB101 M",
			"Gothic MB101 Medium"
		]
	},
	{
		"fontName": "ゴシックMB101 B",
		"language": "日本語",
		"foundry": "MORISAWA",
		"category": "ゴシック系",
		"cssNames": [
			"ゴシックMB101 B",
			"Gothic MB101 Bold"
		]
	},
	{
		"fontName": "ゴシックMB101 R JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"category": "ゴシック系",
		"cssNames": [
			"ゴシックMB101 R JIS2004",
			"Gothic MB101 Regular JIS2004"
		]
	},
	{
		"fontName": "中ゴシックBBB",
		"language": "日本語",
		"foundry": "MORISAWA",
		"category": "ゴシック系",
		"cssNames": [
			"中ゴシックBBB",
			"Gothic Medium BBB"
		]
	},
	{
		"fontName": "ゴシックMB101 M JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"category": "ゴシック系",
		"cssNames": [
			"ゴシックMB101 M JIS2004",
			"Gothic MB101 Medium JIS2004"
		]
	},
	{
		"fontName": "ゴシックMB101 B JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"category": "ゴシック系",
		"cssNames": [
			"ゴシックMB101 B JIS2004",
			"Gothic MB101 Bold JIS2004"
		]
	},
	{
		"fontName": "中ゴシックBBB JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"category": "ゴシック系",
		"cssNames": [
			"中ゴシックBBB JIS2004",
			"Gothic Medium BBB JIS2004"
		]
	},
	{
		"fontName": "太ミンA101",
		"language": "日本語",
		"foundry": "MORISAWA",
		"category": "明朝系",
		"cssNames": [
			"太ミンA101",
			"Futo Min A101"
		]
	},
	{
		"fontName": "太ミンA101 JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"category": "明朝系",
		"cssNames": [
			"太ミンA101 JIS2004",
			"Futo Min A101 JIS2004"
		]
	},
	{
		"fontName": "太ゴB101",
		"language": "日本語",
		"foundry": "MORISAWA",
		"category": "ゴシック系",
		"cssNames": [
			"太ゴB101",
			"Futo Go B101"
		]
	},
	{
		"fontName": "太ゴB101 JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"category": "ゴシック系",
		"cssNames": [
			"太ゴB101 JIS2004",
			"Futo Go B101 JIS2004"
		]
	},
	{
		"fontName": "見出ミンMA31",
		"language": "日本語",
		"foundry": "MORISAWA",
		"category": "明朝系",
		"cssNames": [
			"見出ミンMA31",
			"Midashi Min MA31"
		]
	},
	{
		"fontName": "見出ミンMA31 JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"category": "明朝系",
		"cssNames": [
			"見出ミンMA31 JIS2004",
			"Midashi Min MA31 JIS2004"
		]
	},
	{
		"fontName": "見出ゴMB31",
		"language": "日本語",
		"foundry": "MORISAWA",
		"category": "ゴシック系",
		"cssNames": [
			"見出ゴMB31",
			"Midashi Go MB31"
		]
	},
	{
		"fontName": "見出ゴMB31 JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"category": "ゴシック系",
		"cssNames": [
			"見出ゴMB31 JIS2004",
			"Midashi Go MB31 JIS2004"
		]
	},
	{
		"fontName": "新正楷書CBSK1",
		"language": "日本語",
		"foundry": "MORISAWA",
		"category": "楷書系",
		"cssNames": [
			"新正楷書CBSK1",
			"Shinsei Kaisho CBSK1"
		]
	},
	{
		"fontName": "じゅん 101",
		"language": "日本語",
		"foundry": "MORISAWA",
		"category": "丸ゴシック系",
		"cssNames": [
			"じゅん 101",
			"Jun 101"
		]
	},
	{
		"fontName": "フォーク R",
		"language": "日本語",
		"foundry": "MORISAWA",
		"category": "デザイン系",
		"cssNames": [
			"フォーク R",
			"Folk Regular"
		]
	},
	{
		"fontName": "フォーク M",
		"language": "日本語",
		"foundry": "MORISAWA",
		"category": "デザイン系",
		"cssNames": [
			"フォーク M",
			"Folk Medium"
		]
	},
	{
		"fontName": "フォーク B",
		"language": "日本語",
		"foundry": "MORISAWA",
		"category": "デザイン系",
		"cssNames": [
			"フォーク B",
			"Folk Bold"
		]
	},
	{
		"fontName": "丸フォーク R",
		"language": "日本語",
		"foundry": "MORISAWA",
		"category": "デザイン系",
		"cssNames": [
			"丸フォーク R",
			"Maru Folk Regular"
		]
	},
	{
		"fontName": "丸フォーク M",
		"language": "日本語",
		"foundry": "MORISAWA",
		"category": "デザイン系",
		"cssNames": [
			"丸フォーク M",
			"Maru Folk Medium"
		]
	},
	{
		"fontName": "丸フォーク B",
		"language": "日本語",
		"foundry": "MORISAWA",
		"category": "デザイン系",
		"cssNames": [
			"丸フォーク B",
			"Maru Folk Bold"
		]
	},
	{
		"fontName": "カクミン R",
		"language": "日本語",
		"foundry": "MORISAWA",
		"category": "デザイン系",
		"cssNames": [
			"カクミン R",
			"Kakumin Regular"
		]
	},
	{
		"fontName": "カクミン M",
		"language": "日本語",
		"foundry": "MORISAWA",
		"category": "デザイン系",
		"cssNames": [
			"カクミン M",
			"Kakumin Medium"
		]
	},
	{
		"fontName": "カクミン B",
		"language": "日本語",
		"foundry": "MORISAWA",
		"category": "デザイン系",
		"cssNames": [
			"カクミン B",
			"Kakumin Bold"
		]
	},
	{
		"fontName": "UD黎ミン R",
		"language": "日本語",
		"foundry": "MORISAWA",
		"category": "明朝系",
		"cssNames": [
			"UD黎ミン R",
			"UD Reimin Regular"
		]
	},
	{
		"fontName": "UD黎ミン M",
		"language": "日本語",
		"foundry": "MORISAWA",
		"category": "明朝系",
		"cssNames": [
			"UD黎ミン M",
			"UD Reimin Medium"
		]
	},
	{
		"fontName": "UD黎ミン B",
		"language": "日本語",
		"foundry": "MORISAWA",
		"category": "明朝系",
		"cssNames": [
			"UD黎ミン B",
			"UD Reimin Bold"
		]
	},
	{
		"fontName": "UD新ゴ R ",
		"language": "日本語",
		"foundry": "MORISAWA",
		"category": "ゴシック系",
		"cssNames": [
			"UD新ゴ R",
			"UD Shin Go Regular"
		]
	},
	{
		"fontName": "UD新ゴ M",
		"language": "日本語",
		"foundry": "MORISAWA",
		"category": "ゴシック系",
		"cssNames": [
			"UD新ゴ M",
			"UD Shin Go Medium"
		]
	},
	{
		"fontName": "UD新ゴ B",
		"language": "日本語",
		"foundry": "MORISAWA",
		"category": "ゴシック系",
		"cssNames": [
			"UD新ゴ B",
			"UD Shin Go Bold"
		]
	},
	{
		"fontName": "UD新ゴNT R",
		"language": "日本語",
		"foundry": "MORISAWA",
		"category": "ゴシック系",
		"cssNames": [
			"UD新ゴNT R",
			"UD Shin Go NT Regular"
		]
	},
	{
		"fontName": "UD新ゴNT M",
		"language": "日本語",
		"foundry": "MORISAWA",
		"category": "ゴシック系",
		"cssNames": [
			"UD新ゴNT M",
			"UD Shin Go NT Medium"
		]
	},
	{
		"fontName": "UD新ゴNT B",
		"language": "日本語",
		"foundry": "MORISAWA",
		"category": "ゴシック系",
		"cssNames": [
			"UD新ゴNT B",
			"UD Shin Go NT Bold"
		]
	},
	{
		"fontName": "UD新丸ゴ R",
		"language": "日本語",
		"foundry": "MORISAWA",
		"category": "丸ゴシック系",
		"cssNames": [
			"UD新丸ゴ R",
			"UD Shin Maru Go Regular"
		]
	},
	{
		"fontName": "UD新丸ゴ M",
		"language": "日本語",
		"foundry": "MORISAWA",
		"category": "丸ゴシック系",
		"cssNames": [
			"UD新丸ゴ M",
			"UD Shin Maru Go Medium"
		]
	},
	{
		"fontName": "UD新丸ゴ B",
		"language": "日本語",
		"foundry": "MORISAWA",
		"category": "丸ゴシック系",
		"cssNames": [
			"UD新丸ゴ B",
			"UD Shin Maru Go Bold"
		]
	},
	{
		"fontName": "ヒラギノ角ゴ ProN W3",
		"language": "日本語",
		"foundry": "SCREEN",
		"category": "ゴシック系",
		"cssNames": [
			"FP-ヒラギノ角ゴ ProN W3",
			"FP-HiraKakuProN-W3"
		]
	},
	{
		"fontName": "ヒラギノ角ゴ ProN W6",
		"language": "日本語",
		"foundry": "SCREEN",
		"category": "ゴシック系",
		"cssNames": [
			"FP-ヒラギノ角ゴ ProN W6",
			"FP-HiraKakuProN-W6"
		]
	},
	{
		"fontName": "ヒラギノ角ゴ StdN W8",
		"language": "日本語",
		"foundry": "SCREEN",
		"category": "ゴシック系",
		"cssNames": [
			"FP-ヒラギノ角ゴ StdN W8",
			"FP-HiraKakuStdN-W8"
		]
	},
	{
		"fontName": "ヒラギノ丸ゴ ProN W4",
		"language": "日本語",
		"foundry": "SCREEN",
		"category": "丸ゴシック系",
		"cssNames": [
			"FP-ヒラギノ丸ゴ ProN W4",
			"FP-HiraMaruProN-W4"
		]
	},
	{
		"fontName": "ヒラギノ明朝 ProN W3",
		"language": "日本語",
		"foundry": "SCREEN",
		"category": "明朝系",
		"cssNames": [
			"FP-ヒラギノ明朝 ProN W3",
			"FP-HiraMinProN-W3"
		]
	},
	{
		"fontName": "ヒラギノ明朝 ProN W6",
		"language": "日本語",
		"foundry": "SCREEN",
		"category": "明朝系",
		"cssNames": [
			"FP-ヒラギノ明朝 ProN W6",
			"FP-HiraMinProN-W6"
		]
	},
	{
		"fontName": "YDGothic120",
		"language": "韓国語",
		"foundry": "YoonDesign",
		"category": "ゴシック系",
		"cssNames": [
			"FOTK-YDGothic 120",
			"FOTK-YDGothic120"
		]
	},
	{
		"fontName": "YDGothic130",
		"language": "韓国語",
		"foundry": "YoonDesign",
		"category": "ゴシック系",
		"cssNames": [
			"FOTK-YDGothic 130",
			"FOTKYDGothic130"
		]
	},
	{
		"fontName": "YDGothic140",
		"language": "韓国語",
		"foundry": "YoonDesign",
		"category": "ゴシック系",
		"cssNames": [
			"FOTK-YDGothic 140",
			"FOTKYDGothic140"
		]
	},
	{
		"fontName": "UttumBatang",
		"language": "韓国語",
		"foundry": "YoonDesign",
		"category": "明朝系",
		"cssNames": [
			"FOTK-UttumBatang"
		]
	},
	{
		"fontName": "UttumBatangBold",
		"language": "韓国語",
		"foundry": "YoonDesign",
		"category": "明朝系",
		"cssNames": [
			"FOTK-UttumBatang Bold"
		]
	},
	{
		"fontName": "UttumDotum",
		"language": "韓国語",
		"foundry": "YoonDesign",
		"category": "ゴシック系",
		"cssNames": [
			"FOTK-UttumDotum"
		]
	},
	{
		"fontName": "UttumDotumBold",
		"language": "韓国語",
		"foundry": "YoonDesign",
		"category": "ゴシック系",
		"cssNames": [
			"FOTK-UttumDotum Bold"
		]
	},
	{
		"fontName": "丸明オールド",
		"language": "日本語",
		"foundry": "カタオカデザインワークス",
		"category": "明朝系",
		"cssNames": [
			"丸明オールド",
			"MaruminOld"
		]
	},
	{
		"fontName": "丸明Fuji",
		"language": "日本語",
		"foundry": "カタオカデザインワークス",
		"category": "明朝系",
		"cssNames": [
			"丸明Fuji",
			"MaruminFuji"
		]
	},
	{
		"fontName": "丸明Katura",
		"language": "日本語",
		"foundry": "カタオカデザインワークス",
		"category": "明朝系",
		"cssNames": [
			"丸明Katura",
			"MaruminKatura"
		]
	},
	{
		"fontName": "丸明Kiso",
		"language": "日本語",
		"foundry": "カタオカデザインワークス",
		"category": "明朝系",
		"cssNames": [
			"丸明Kiso",
			"MaruminKiso"
		]
	},
	{
		"fontName": "丸明Shinano",
		"language": "日本語",
		"foundry": "カタオカデザインワークス",
		"category": "明朝系",
		"cssNames": [
			"丸明Shinano",
			"MaruminShinano"
		]
	},
	{
		"fontName": "丸明Tikuma",
		"language": "日本語",
		"foundry": "カタオカデザインワークス",
		"category": "明朝系",
		"cssNames": [
			"丸明Tikuma",
			"MaruminTikuma"
		]
	},
	{
		"fontName": "丸明Yoshino",
		"language": "日本語",
		"foundry": "カタオカデザインワークス",
		"category": "明朝系",
		"cssNames": [
			"丸明Yoshino",
			"MaruminYoshino"
		]
	},
	{
		"fontName": "Iroha 21popura",
		"language": "日本語",
		"foundry": "カタオカデザインワークス",
		"category": "ゴシック系",
		"cssNames": [
			"Iroha 21popura",
			"iroha-21popura"
		]
	},
	{
		"fontName": "Iroha 22momi",
		"language": "日本語",
		"foundry": "カタオカデザインワークス",
		"category": "ゴシック系",
		"cssNames": [
			"Iroha 22momi",
			"iroha-22momi"
		]
	},
	{
		"fontName": "Iroha 23kaede",
		"language": "日本語",
		"foundry": "カタオカデザインワークス",
		"category": "ゴシック系",
		"cssNames": [
			"Iroha 23kaede",
			"iroha-23kaede"
		]
	},
	{
		"fontName": "Iroha 24matu",
		"language": "日本語",
		"foundry": "カタオカデザインワークス",
		"category": "ゴシック系",
		"cssNames": [
			"Iroha 24matu",
			"iroha-24matu"
		]
	},
	{
		"fontName": "Iroha 25icho",
		"language": "日本語",
		"foundry": "カタオカデザインワークス",
		"category": "ゴシック系",
		"cssNames": [
			"Iroha 25icho",
			"iroha-25icho"
		]
	},
	{
		"fontName": "Iroha 26tubaki",
		"language": "日本語",
		"foundry": "カタオカデザインワークス",
		"category": "ゴシック系",
		"cssNames": [
			"Iroha 26tubaki",
			"iroha-26tubaki"
		]
	},
	{
		"fontName": "Iroha 27keyaki",
		"language": "日本語",
		"foundry": "カタオカデザインワークス",
		"category": "ゴシック系",
		"cssNames": [
			"Iroha 27keyaki",
			"iroha-27keyaki"
		]
	},
	{
		"fontName": "Iroha 28kiri",
		"language": "日本語",
		"foundry": "カタオカデザインワークス",
		"category": "ゴシック系",
		"cssNames": [
			"Iroha 28kiri",
			"iroha-28kiri"
		]
	},
	{
		"fontName": "Iroha 29ume",
		"language": "日本語",
		"foundry": "カタオカデザインワークス",
		"category": "ゴシック系",
		"cssNames": [
			"Iroha 29ume",
			"iroha-29ume"
		]
	},
	{
		"fontName": "Iroha 30momiji",
		"language": "日本語",
		"foundry": "カタオカデザインワークス",
		"category": "ゴシック系",
		"cssNames": [
			"Iroha 30momiji",
			"iroha-30momiji"
		]
	},
	{
		"fontName": "Iroha 31nire",
		"language": "日本語",
		"foundry": "カタオカデザインワークス",
		"category": "ゴシック系",
		"cssNames": [
			"Iroha 31nire",
			"iroha-31nire"
		]
	},
	{
		"fontName": "Iroha 32sakura",
		"language": "日本語",
		"foundry": "カタオカデザインワークス",
		"category": "ゴシック系",
		"cssNames": [
			"Iroha 32sakura",
			"iroha-32sakura"
		]
	},
	{
		"fontName": "丸丸gothic A&Sr",
		"language": "日本語",
		"foundry": "カタオカデザインワークス",
		"category": "丸ゴシック系",
		"cssNames": [
			"丸丸gothic A&Sr",
			"MarumaruGothicA&Sr"
		]
	},
	{
		"fontName": "丸丸gothic A&Lr",
		"language": "日本語",
		"foundry": "カタオカデザインワークス",
		"category": "丸ゴシック系",
		"cssNames": [
			"丸丸gothic A&Lr",
			"MarumaruGothicA&Lr"
		]
	},
	{
		"fontName": "丸丸gothic B&Sr",
		"language": "日本語",
		"foundry": "カタオカデザインワークス",
		"category": "丸ゴシック系",
		"cssNames": [
			"丸丸gothic B&Sr",
			"MarumaruGothicB&Sr"
		]
	},
	{
		"fontName": "丸丸gothic B&Lr",
		"language": "日本語",
		"foundry": "カタオカデザインワークス",
		"category": "丸ゴシック系",
		"cssNames": [
			"丸丸gothic B&Lr",
			"MarumaruGothicB&Lr"
		]
	},
	{
		"fontName": "丸丸gothic C&Sr",
		"language": "日本語",
		"foundry": "カタオカデザインワークス",
		"category": "丸ゴシック系",
		"cssNames": [
			"丸丸gothic C&Sr",
			"MarumaruGothicC&Sr"
		]
	},
	{
		"fontName": "丸丸gothic C&Lr",
		"language": "日本語",
		"foundry": "カタオカデザインワークス",
		"category": "丸ゴシック系",
		"cssNames": [
			"丸丸gothic C&Lr",
			"MarumaruGothicC&Lr"
		]
	},
	{
		"fontName": "佑字【肅】",
		"language": "日本語",
		"foundry": "カタオカデザインワークス",
		"category": "楷書系",
		"cssNames": [
			"佑字／肅",
			"Yuji-syuku"
		]
	},
	{
		"fontName": "佑字【舞】",
		"language": "日本語",
		"foundry": "カタオカデザインワークス",
		"category": "楷書系",
		"cssNames": [
			"佑字／舞",
			"Yuji-mai"
		]
	},
	{
		"fontName": "佑字【朴】",
		"language": "日本語",
		"foundry": "カタオカデザインワークス",
		"category": "楷書系",
		"cssNames": [
			"佑字／朴",
			"Yuji-boku"
		]
	},
	{
		"fontName": "山本庵 StdN R",
		"language": "日本語",
		"foundry": "カタオカデザインワークス",
		"category": "その他の筆系",
		"cssNames": [
			"山本庵 StdN R",
			"Yamamotoan"
		]
	},
	{
		"fontName": "方正书宋_GBK",
		"language": "中国語",
		"foundry": "方正",
		"category": "明朝系",
		"cssNames": [
			"方正书宋_GBK",
			"FZShuSong-Z01"
		]
	},
	{
		"fontName": "方正黑体_GBK",
		"language": "中国語",
		"foundry": "方正",
		"category": "ゴシック系",
		"cssNames": [
			"方正黑体_GBK",
			"FZHei-B01"
		]
	},
	{
		"fontName": "方正楷体_GBK",
		"language": "中国語",
		"foundry": "方正",
		"category": "楷書系",
		"cssNames": [
			"方正楷体_GBK",
			"FZKai-Z03"
		]
	},
	{
		"fontName": "方正仿宋_GBK",
		"language": "中国語",
		"foundry": "方正",
		"category": "明朝系",
		"cssNames": [
			"方正仿宋_GBK",
			"FZFangSong-Z02"
		]
	},
	{
		"fontName": "方正小标宋简体",
		"language": "中国語",
		"foundry": "方正",
		"category": "明朝系",
		"cssNames": [
			"方正小标宋简体",
			"FZXiaoBiaoSong-B05S"
		]
	},
	{
		"fontName": "方正小标宋繁体",
		"language": "中国語",
		"foundry": "方正",
		"category": "明朝系",
		"cssNames": [
			"方正小标宋繁体",
			"FZXiaoBiaoSong-B05T"
		]
	},
	{
		"fontName": "方正细圆简体",
		"language": "中国語",
		"foundry": "方正",
		"category": "ゴシック系",
		"cssNames": [
			"方正细圆简体",
			"FZXiYuan-M01S"
		]
	},
	{
		"fontName": "方正细圆繁体",
		"language": "中国語",
		"foundry": "方正",
		"category": "ゴシック系",
		"cssNames": [
			"方正细圆繁体",
			"FZXiYuan-M01T"
		]
	},
	{
		"fontName": "方正准圆简体",
		"language": "中国語",
		"foundry": "方正",
		"category": "ゴシック系",
		"cssNames": [
			"方正准圆简体",
			"FZZhunYuan-M02S"
		]
	},
	{
		"fontName": "方正准圆繁体",
		"language": "中国語",
		"foundry": "方正",
		"category": "ゴシック系",
		"cssNames": [
			"方正准圆繁体",
			"FZZhunYuan-M02T"
		]
	},
	{
		"fontName": "方正琥珀简体",
		"language": "中国語",
		"foundry": "方正",
		"category": "デザイン系",
		"cssNames": [
			"方正琥珀简体",
			"FZHuPo-M04S"
		]
	},
	{
		"fontName": "方正琥珀繁体",
		"language": "中国語",
		"foundry": "方正",
		"category": "デザイン系",
		"cssNames": [
			"方正琥珀繁体",
			"FZHuPo-M04T"
		]
	},
	{
		"fontName": "方正综艺简体",
		"language": "中国語",
		"foundry": "方正",
		"category": "デザイン系",
		"cssNames": [
			"方正综艺简体",
			"FZZongYi-M05S"
		]
	},
	{
		"fontName": "方正综艺繁体",
		"language": "中国語",
		"foundry": "方正",
		"category": "デザイン系",
		"cssNames": [
			"方正综艺繁体",
			"FZZongYi-M05T"
		]
	},
	{
		"fontName": "方正姚体简体",
		"language": "中国語",
		"foundry": "方正",
		"category": "デザイン系",
		"cssNames": [
			"方正姚体简体",
			"FZYaoTi-M06S"
		]
	},
	{
		"fontName": "方正姚体繁体",
		"language": "中国語",
		"foundry": "方正",
		"category": "デザイン系",
		"cssNames": [
			"方正姚体繁体",
			"FZYaoTi-M06T"
		]
	},
	{
		"fontName": "方正水柱简体",
		"language": "中国語",
		"foundry": "方正",
		"category": "デザイン系",
		"cssNames": [
			"方正水柱简体",
			"FZShuiZhu-M08S"
		]
	},
	{
		"fontName": "方正水柱繁体",
		"language": "中国語",
		"foundry": "方正",
		"category": "デザイン系",
		"cssNames": [
			"方正水柱繁体",
			"FZShuiZhu-M08T"
		]
	},
	{
		"fontName": "方正彩云简体",
		"language": "中国語",
		"foundry": "方正",
		"category": "デザイン系",
		"cssNames": [
			"方正彩云简体",
			"FZCaiYun-M09S"
		]
	},
	{
		"fontName": "方正彩云繁体",
		"language": "中国語",
		"foundry": "方正",
		"category": "デザイン系",
		"cssNames": [
			"方正彩云繁体",
			"FZCaiYun-M09T"
		]
	},
	{
		"fontName": "方正超粗黑简体",
		"language": "中国語",
		"foundry": "方正",
		"category": "ゴシック系",
		"cssNames": [
			"方正超粗黑简体",
			"FZChaoCuHei-M10S"
		]
	},
	{
		"fontName": "方正超粗黑繁体",
		"language": "中国語",
		"foundry": "方正",
		"category": "ゴシック系",
		"cssNames": [
			"方正超粗黑繁体",
			"FZChaoCuHei-M10T"
		]
	},
	{
		"fontName": "方正稚艺简体",
		"language": "中国語",
		"foundry": "方正",
		"category": "デザイン系",
		"cssNames": [
			"方正稚艺简体",
			"FZZhiYi-M12S"
		]
	},
	{
		"fontName": "方正稚艺繁体",
		"language": "中国語",
		"foundry": "方正",
		"category": "デザイン系",
		"cssNames": [
			"方正稚艺繁体",
			"FZZhiYi-M12T"
		]
	},
	{
		"fontName": "方正细珊瑚简体",
		"language": "中国語",
		"foundry": "方正",
		"category": "デザイン系",
		"cssNames": [
			"方正细珊瑚简体",
			"FZXiShanHu-M13S"
		]
	},
	{
		"fontName": "方正细珊瑚繁体",
		"language": "中国語",
		"foundry": "方正",
		"category": "デザイン系",
		"cssNames": [
			"方正细珊瑚繁体",
			"FZXiShanHu-M13T"
		]
	},
	{
		"fontName": "方正中倩简体",
		"language": "中国語",
		"foundry": "方正",
		"category": "デザイン系",
		"cssNames": [
			"方正中倩简体",
			"FZZhongQian-M16S"
		]
	},
	{
		"fontName": "方正中倩繁体",
		"language": "中国語",
		"foundry": "方正",
		"category": "デザイン系",
		"cssNames": [
			"方正中倩繁体",
			"FZZhongQian-M16T"
		]
	},
	{
		"fontName": "方正胖娃简体",
		"language": "中国語",
		"foundry": "方正",
		"category": "デザイン系",
		"cssNames": [
			"方正胖娃简体",
			"FZPangWa-M18S"
		]
	},
	{
		"fontName": "方正胖娃繁体",
		"language": "中国語",
		"foundry": "方正",
		"category": "デザイン系",
		"cssNames": [
			"方正胖娃繁体",
			"FZPangWa-M18T"
		]
	},
	{
		"fontName": "方正隶书简体",
		"language": "中国語",
		"foundry": "方正",
		"category": "隷書系",
		"cssNames": [
			"方正隶书简体",
			"FZLiShu-S01S"
		]
	},
	{
		"fontName": "方正隶书繁体",
		"language": "中国語",
		"foundry": "方正",
		"category": "隷書系",
		"cssNames": [
			"方正隶书繁体",
			"FZLiShu-S01T"
		]
	},
	{
		"fontName": "方正魏碑简体",
		"language": "中国語",
		"foundry": "方正",
		"category": "その他の筆系",
		"cssNames": [
			"方正魏碑简体",
			"FZWeiBei-S03S"
		]
	},
	{
		"fontName": "方正魏碑繁体",
		"language": "中国語",
		"foundry": "方正",
		"category": "その他の筆系",
		"cssNames": [
			"方正魏碑繁体",
			"FZWeiBei-S03T"
		]
	},
	{
		"fontName": "方正行楷简体",
		"language": "中国語",
		"foundry": "方正",
		"category": "行書系",
		"cssNames": [
			"方正行楷简体",
			"FZXingKai-S04S"
		]
	},
	{
		"fontName": "方正行楷繁体",
		"language": "中国語",
		"foundry": "方正",
		"category": "行書系",
		"cssNames": [
			"方正行楷繁体",
			"FZXingKai-S04T"
		]
	},
	{
		"fontName": "方正舒体简体",
		"language": "中国語",
		"foundry": "方正",
		"category": "その他の筆系",
		"cssNames": [
			"方正舒体简体",
			"FZShuTi-S05S"
		]
	},
	{
		"fontName": "方正舒体繁体",
		"language": "中国語",
		"foundry": "方正",
		"category": "その他の筆系",
		"cssNames": [
			"方正舒体繁体",
			"FZShuTi-S05T"
		]
	},
	{
		"fontName": "方正康体简体",
		"language": "中国語",
		"foundry": "方正",
		"category": "その他の筆系",
		"cssNames": [
			"方正康体简体",
			"FZKangTi-S07S"
		]
	},
	{
		"fontName": "方正康体繁体",
		"language": "中国語",
		"foundry": "方正",
		"category": "その他の筆系",
		"cssNames": [
			"方正康体繁体",
			"FZKangTi-S07T"
		]
	},
	{
		"fontName": "方正黄草简体",
		"language": "中国語",
		"foundry": "方正",
		"category": "草書系",
		"cssNames": [
			"方正黄草简体",
			"FZHuangCao-S09S"
		]
	},
	{
		"fontName": "方正瘦金书简体",
		"language": "中国語",
		"foundry": "方正",
		"category": "その他の筆系",
		"cssNames": [
			"方正瘦金书简体",
			"FZShouJinShu-S10S"
		]
	},
	{
		"fontName": "方正瘦金书繁体",
		"language": "中国語",
		"foundry": "方正",
		"category": "その他の筆系",
		"cssNames": [
			"方正瘦金书繁体",
			"FZShouJinShu-S10T"
		]
	},
	{
		"fontName": "方正卡通简体",
		"language": "中国語",
		"foundry": "方正",
		"category": "デザイン系",
		"cssNames": [
			"方正卡通简体",
			"FZKaTong-M19S"
		]
	},
	{
		"fontName": "方正卡通繁体",
		"language": "中国語",
		"foundry": "方正",
		"category": "デザイン系",
		"cssNames": [
			"方正卡通繁体",
			"FZKaTong-M19T"
		]
	},
	{
		"fontName": "方正水黑简体",
		"language": "中国語",
		"foundry": "方正",
		"category": "デザイン系",
		"cssNames": [
			"方正水黑简体",
			"FZShuiHei-M21S"
		]
	},
	{
		"fontName": "方正水黑繁体",
		"language": "中国語",
		"foundry": "方正",
		"category": "デザイン系",
		"cssNames": [
			"方正水黑繁体",
			"FZShuiHei-M21T"
		]
	},
	{
		"fontName": "方正毡笔黑简体",
		"language": "中国語",
		"foundry": "方正",
		"category": "デザイン系",
		"cssNames": [
			"方正毡笔黑简体",
			"FZZhanBiHei-M22S"
		]
	},
	{
		"fontName": "方正毡笔黑繁体",
		"language": "中国語",
		"foundry": "方正",
		"category": "デザイン系",
		"cssNames": [
			"方正毡笔黑繁体",
			"FZZhanBiHei-M22T"
		]
	},
	{
		"fontName": "方正小篆体",
		"language": "中国語",
		"foundry": "方正",
		"category": "篆書系",
		"cssNames": [
			"方正小篆体",
			"FZXiaoZhuanTi-S13T"
		]
	},
	{
		"fontName": "方正硬笔楷书简体",
		"language": "中国語",
		"foundry": "方正",
		"category": "楷書系",
		"cssNames": [
			"方正硬笔楷书简体",
			"FZYingBiKaiShu-S15S"
		]
	},
	{
		"fontName": "方正硬笔楷书繁体",
		"language": "中国語",
		"foundry": "方正",
		"category": "楷書系",
		"cssNames": [
			"方正硬笔楷书繁体",
			"FZYingBiKaiShu-S15T"
		]
	},
	{
		"fontName": "方正硬笔行书简体",
		"language": "中国語",
		"foundry": "方正",
		"category": "行書系",
		"cssNames": [
			"方正硬笔行书简体",
			"FZYingBiXingShu-S16S"
		]
	},
	{
		"fontName": "方正硬笔行书繁体",
		"language": "中国語",
		"foundry": "方正",
		"category": "行書系",
		"cssNames": [
			"方正硬笔行书繁体",
			"FZYingBiXingShu-S16T"
		]
	},
	{
		"fontName": "方正北魏楷书简体",
		"language": "中国語",
		"foundry": "方正",
		"category": "楷書系",
		"cssNames": [
			"方正北魏楷书简体",
			"FZBeiWeiKaiShu-Z15S"
		]
	},
	{
		"fontName": "方正北魏楷书繁体",
		"language": "中国語",
		"foundry": "方正",
		"category": "楷書系",
		"cssNames": [
			"方正北魏楷书繁体",
			"FZBeiWeiKaiShu-Z15T"
		]
	},
	{
		"fontName": "方正剪纸简体",
		"language": "中国語",
		"foundry": "方正",
		"category": "デザイン系",
		"cssNames": [
			"方正剪纸简体",
			"FZJianZhi-M23S"
		]
	},
	{
		"fontName": "方正剪纸繁体",
		"language": "中国語",
		"foundry": "方正",
		"category": "デザイン系",
		"cssNames": [
			"方正剪纸繁体",
			"FZJianZhi-M23T"
		]
	},
	{
		"fontName": "方正胖头鱼简体",
		"language": "中国語",
		"foundry": "方正",
		"category": "デザイン系",
		"cssNames": [
			"方正胖头鱼简体",
			"FZPangTouYu-M24S"
		]
	},
	{
		"fontName": "方正粗活意简体",
		"language": "中国語",
		"foundry": "方正",
		"category": "デザイン系",
		"cssNames": [
			"方正粗活意简体",
			"FZCuHuoYi-M25S"
		]
	},
	{
		"fontName": "方正粗活意繁体",
		"language": "中国語",
		"foundry": "方正",
		"category": "デザイン系",
		"cssNames": [
			"方正粗活意繁体",
			"FZCuHuoYi-M25T"
		]
	}
]

},{}],10:[function(require,module,exports){
module.exports=[
	{
		"fontName": "リュウミン L-KL",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"リュウミン L-KL",
			"Ryumin Light KL"
		]
	},
	{
		"fontName": "リュウミン R-KL",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"リュウミン R-KL",
			"Ryumin Regular KL"
		]
	},
	{
		"fontName": "リュウミン M-KL",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"リュウミン M-KL",
			"Ryumin Medium KL"
		]
	},
	{
		"fontName": "リュウミン B-KL",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"リュウミン B-KL",
			"Ryumin Bold KL"
		]
	},
	{
		"fontName": "リュウミン EB-KL",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"リュウミン EB-KL",
			"Ryumin ExtraBold KL"
		]
	},
	{
		"fontName": "リュウミン H-KL",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"リュウミン H-KL",
			"Ryumin Heavy KL"
		]
	},
	{
		"fontName": "リュウミン EH-KL",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"リュウミン EH-KL",
			"Ryumin ExtraHeavy KL"
		]
	},
	{
		"fontName": "リュウミン U-KL",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"リュウミン U-KL",
			"Ryumin Ultra KL"
		]
	},
	{
		"fontName": "黎ミン L",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"黎ミン L",
			"Reimin Light"
		]
	},
	{
		"fontName": "黎ミン R",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"黎ミン R",
			"Reimin Regular"
		]
	},
	{
		"fontName": "黎ミン M",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"黎ミン M",
			"Reimin Medium"
		]
	},
	{
		"fontName": "黎ミン B",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"黎ミン B",
			"Reimin Bold"
		]
	},
	{
		"fontName": "黎ミン EB",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"黎ミン EB",
			"Reimin ExtraBold"
		]
	},
	{
		"fontName": "黎ミン H",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"黎ミン H",
			"Reimin Heavy"
		]
	},
	{
		"fontName": "黎ミン EH",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"黎ミン EH",
			"Reimin ExtraHeavy"
		]
	},
	{
		"fontName": "黎ミン U",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"黎ミン U",
			"Reimin Ultra"
		]
	},
	{
		"fontName": "黎ミンY10 L",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"黎ミンY10 L",
			"Reimin Y10 Light"
		]
	},
	{
		"fontName": "黎ミンY10 R",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"黎ミンY10 R",
			"Reimin Y10 Regular"
		]
	},
	{
		"fontName": "黎ミンY10 M",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"黎ミンY10 M",
			"Reimin Y10 Medium"
		]
	},
	{
		"fontName": "黎ミンY10 B",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"黎ミンY10 B",
			"Reimin Y10 Bold"
		]
	},
	{
		"fontName": "黎ミンY10 EB",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"黎ミンY10 EB",
			"Reimin Y10 ExtraBold"
		]
	},
	{
		"fontName": "黎ミンY10 H",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"黎ミンY10 H",
			"Reimin Y10 Heavy"
		]
	},
	{
		"fontName": "黎ミンY10 EH",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"黎ミンY10 EH",
			"Reimin Y10 ExtraHeavy"
		]
	},
	{
		"fontName": "黎ミンY10 U",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"黎ミンY10 U",
			"Reimin Y10 Ultra"
		]
	},
	{
		"fontName": "黎ミンY20 R",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"黎ミンY20 R",
			"Reimin Y20 Regular"
		]
	},
	{
		"fontName": "黎ミンY20 M",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"黎ミンY20 M",
			"Reimin Y20 Medium"
		]
	},
	{
		"fontName": "黎ミンY20 B",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"黎ミンY20 B",
			"Reimin Y20 Bold"
		]
	},
	{
		"fontName": "黎ミンY20 EB",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"黎ミンY20 EB",
			"Reimin Y20 ExtraBold"
		]
	},
	{
		"fontName": "黎ミンY20 H",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"黎ミンY20 H",
			"Reimin Y20 Heavy"
		]
	},
	{
		"fontName": "黎ミンY20 EH",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"黎ミンY20 EH",
			"Reimin Y20 ExtraHeavy"
		]
	},
	{
		"fontName": "黎ミンY20 U",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"黎ミンY20 U",
			"Reimin Y20 Ultra"
		]
	},
	{
		"fontName": "黎ミンY30 M",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"黎ミンY30 M",
			"Reimin Y30 Medium"
		]
	},
	{
		"fontName": "黎ミンY30 B",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"黎ミンY30 B",
			"Reimin Y30 Bold"
		]
	},
	{
		"fontName": "黎ミンY30 EB",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"黎ミンY30 EB",
			"Reimin Y30 ExtraBold"
		]
	},
	{
		"fontName": "黎ミンY30 H",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"黎ミンY30 H",
			"Reimin Y30 Heavy"
		]
	},
	{
		"fontName": "黎ミンY30 EH",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"黎ミンY30 EH",
			"Reimin Y30 ExtraHeavy"
		]
	},
	{
		"fontName": "黎ミンY30 U",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"黎ミンY30 U",
			"Reimin Y30 Ultra"
		]
	},
	{
		"fontName": "黎ミンY40 B",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"黎ミンY40 B",
			"Reimin Y40 Bold"
		]
	},
	{
		"fontName": "黎ミンY40 EB",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"黎ミンY40 EB",
			"Reimin Y40 ExtraBold"
		]
	},
	{
		"fontName": "黎ミンY40 H",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"黎ミンY40 H",
			"Reimin Y40 Heavy"
		]
	},
	{
		"fontName": "黎ミンY40 EH",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"黎ミンY40 EH",
			"Reimin Y40 ExtraHeavy"
		]
	},
	{
		"fontName": "黎ミンY40 U",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"黎ミンY40 U",
			"Reimin Y40 Ultra"
		]
	},
	{
		"fontName": "太ミンA101",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"太ミンA101",
			"Futo Min A101"
		]
	},
	{
		"fontName": "見出ミンMA1",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"見出ミンMA1",
			"Midashi Min MA1"
		]
	},
	{
		"fontName": "見出ミンMA31",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"見出ミンMA31",
			"Midashi Min MA31"
		]
	},
	{
		"fontName": "秀英明朝 L",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"秀英明朝 L",
			"Shuei Mincho L"
		]
	},
	{
		"fontName": "秀英明朝 M",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"秀英明朝 M",
			"Shuei Mincho M"
		]
	},
	{
		"fontName": "秀英明朝 B",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"秀英明朝 B",
			"Shuei Mincho B"
		]
	},
	{
		"fontName": "秀英初号明朝",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"秀英初号明朝",
			"Shuei ShogoMincho"
		]
	},
	{
		"fontName": "秀英初号明朝 撰",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"秀英初号明朝 撰",
			"Shuei ShogoMincho Sen"
		]
	},
	{
		"fontName": "秀英横太明朝 M",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"秀英横太明朝 M",
			"Shuei Yokobuto Min M"
		]
	},
	{
		"fontName": "秀英横太明朝 B",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"秀英横太明朝 B",
			"Shuei Yokobuto Min B"
		]
	},
	{
		"fontName": "凸版文久明朝 R",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"凸版文久明朝 R",
			"Toppan Bunkyu Mincho R"
		]
	},
	{
		"fontName": "光朝",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"光朝",
			"Kocho"
		]
	},
	{
		"fontName": "A1明朝",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"A1明朝",
			"A1 Mincho"
		]
	},
	{
		"fontName": "リュウミン L-KL JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"リュウミン L-KL JIS2004",
			"Ryumin Light KL JIS2004"
		]
	},
	{
		"fontName": "リュウミン R-KL JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"リュウミン R-KL JIS2004",
			"Ryumin Regular KL JIS2004"
		]
	},
	{
		"fontName": "リュウミン M-KL JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"リュウミン M-KL JIS2004",
			"Ryumin Medium KL JIS2004"
		]
	},
	{
		"fontName": "リュウミン B-KL JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"リュウミン B-KL JIS2004",
			"Ryumin Bold KL JIS2004"
		]
	},
	{
		"fontName": "リュウミン EB-KL JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"リュウミン EB-KL JIS2004",
			"Ryumin ExtraBold KL JIS2004"
		]
	},
	{
		"fontName": "リュウミン H-KL JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"リュウミン H-KL JIS2004",
			"Ryumin Heavy KL JIS2004"
		]
	},
	{
		"fontName": "リュウミン EH-KL JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"リュウミン EH-KL JIS2004",
			"Ryumin ExtraHeavy KL JIS2004"
		]
	},
	{
		"fontName": "リュウミン U-KL JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"リュウミン U-KL JIS2004",
			"Ryumin Ultra KL JIS2004"
		]
	},
	{
		"fontName": "黎ミン L JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"黎ミン L JIS2004",
			"Reimin Light JIS2004"
		]
	},
	{
		"fontName": "黎ミン R JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"黎ミン R JIS2004",
			"Reimin Regular JIS2004"
		]
	},
	{
		"fontName": "黎ミン M JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"黎ミン M JIS2004",
			"Reimin Medium JIS2004"
		]
	},
	{
		"fontName": "黎ミン B JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"黎ミン B JIS2004",
			"Reimin Bold JIS2004"
		]
	},
	{
		"fontName": "黎ミン EB JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"黎ミン EB JIS2004",
			"Reimin ExtraBold JIS2004"
		]
	},
	{
		"fontName": "黎ミン H JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"黎ミン H JIS2004",
			"Reimin Heavy JIS2004"
		]
	},
	{
		"fontName": "黎ミン EH JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"黎ミン EH JIS2004",
			"Reimin ExtraHeavy JIS2004"
		]
	},
	{
		"fontName": "黎ミン U JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"黎ミン U JIS2004",
			"Reimin Ultra JIS2004"
		]
	},
	{
		"fontName": "黎ミンY10 L JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"黎ミンY10 L JIS2004",
			"Reimin Y10 Light JIS2004"
		]
	},
	{
		"fontName": "黎ミンY10 R JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"黎ミンY10 R JIS2004",
			"Reimin Y10 Regular JIS2004"
		]
	},
	{
		"fontName": "黎ミンY10 M JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"黎ミンY10 M JIS2004",
			"Reimin Y10 Medium JIS2004"
		]
	},
	{
		"fontName": "黎ミンY10 B JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"黎ミンY10 B JIS2004",
			"Reimin Y10 Bold JIS2004"
		]
	},
	{
		"fontName": "黎ミンY10 EB JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"黎ミンY10 EB JIS2004",
			"Reimin Y10 ExtraBold JIS2004"
		]
	},
	{
		"fontName": "黎ミンY10 H JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"黎ミンY10 H JIS2004",
			"Reimin Y10 Heavy JIS2004"
		]
	},
	{
		"fontName": "黎ミンY10 EH JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"黎ミンY10 EH JIS2004",
			"Reimin Y10 ExtraHeavy JIS2004"
		]
	},
	{
		"fontName": "黎ミンY10 U JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"黎ミンY10 U JIS2004",
			"Reimin Y10 Ultra JIS2004"
		]
	},
	{
		"fontName": "黎ミンY20 R JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"黎ミンY20 R JIS2004",
			"Reimin Y20 Regular JIS2004"
		]
	},
	{
		"fontName": "黎ミンY20 M JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"黎ミンY20 M JIS2004",
			"Reimin Y20 Medium JIS2004"
		]
	},
	{
		"fontName": "黎ミンY20 B JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"黎ミンY20 B JIS2004",
			"Reimin Y20 Bold JIS2004"
		]
	},
	{
		"fontName": "黎ミンY20 EB JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"黎ミンY20 EB JIS2004",
			"Reimin Y20 ExtraBold JIS2004"
		]
	},
	{
		"fontName": "黎ミンY20 H JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"黎ミンY20 H JIS2004",
			"Reimin Y20 Heavy JIS2004"
		]
	},
	{
		"fontName": "黎ミンY20 EH JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"黎ミンY20 EH JIS2004",
			"Reimin Y20 ExtraHeavy JIS2004"
		]
	},
	{
		"fontName": "黎ミンY20 U JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"黎ミンY20 U JIS2004",
			"Reimin Y20 Ultra JIS2004"
		]
	},
	{
		"fontName": "黎ミンY30 M JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"黎ミンY30 M JIS2004",
			"Reimin Y30 Medium JIS2004"
		]
	},
	{
		"fontName": "黎ミンY30 B JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"黎ミンY30 B JIS2004",
			"Reimin Y30 Bold JIS2004"
		]
	},
	{
		"fontName": "黎ミンY30 EB JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"黎ミンY30 EB JIS2004",
			"Reimin Y30 ExtraBold JIS2004"
		]
	},
	{
		"fontName": "黎ミンY30 H JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"黎ミンY30 H JIS2004",
			"Reimin Y30 Heavy JIS2004"
		]
	},
	{
		"fontName": "黎ミンY30 EH JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"黎ミンY30 EH JIS2004",
			"Reimin Y30 ExtraHeavy JIS2004"
		]
	},
	{
		"fontName": "黎ミンY30 U JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"黎ミンY30 U JIS2004",
			"Reimin Y30 Ultra JIS2004"
		]
	},
	{
		"fontName": "黎ミンY40 B JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"黎ミンY40 B JIS2004",
			"Reimin Y40 Bold JIS2004"
		]
	},
	{
		"fontName": "黎ミンY40 EB JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"黎ミンY40 EB JIS2004",
			"Reimin Y40 ExtraBold JIS2004"
		]
	},
	{
		"fontName": "黎ミンY40 H JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"黎ミンY40 H JIS2004",
			"Reimin Y40 Heavy JIS2004"
		]
	},
	{
		"fontName": "黎ミンY40 EH JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"黎ミンY40 EH JIS2004",
			"Reimin Y40 ExtraHeavy JIS2004"
		]
	},
	{
		"fontName": "黎ミンY40 U JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"黎ミンY40 U JIS2004",
			"Reimin Y40 Ultra JIS2004"
		]
	},
	{
		"fontName": "太ミンA101 JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"太ミンA101 JIS2004",
			"Futo Min A101 JIS2004"
		]
	},
	{
		"fontName": "見出ミンMA31 JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"見出ミンMA31 JIS2004",
			"Midashi Min MA31 JIS2004"
		]
	},
	{
		"fontName": "秀英明朝 L JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"秀英明朝 L JIS2004",
			"Shuei Mincho L JIS2004"
		]
	},
	{
		"fontName": "秀英明朝 M JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"秀英明朝 M JIS2004",
			"Shuei Mincho M JIS2004"
		]
	},
	{
		"fontName": "秀英明朝 B JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"秀英明朝 B JIS2004",
			"Shuei Mincho B JIS2004"
		]
	},
	{
		"fontName": "凸版文久明朝 R JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"凸版文久明朝 R JIS2004",
			"Toppan Bunkyu Mincho R JIS2004"
		]
	},
	{
		"fontName": "新ゴ EL",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"新ゴ EL",
			"Shin Go ExLight"
		]
	},
	{
		"fontName": "新ゴ L",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"新ゴ L",
			"Shin Go Light"
		]
	},
	{
		"fontName": "新ゴ R",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"新ゴ R",
			"Shin Go Regular"
		]
	},
	{
		"fontName": "新ゴ M",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"新ゴ M",
			"Shin Go Medium"
		]
	},
	{
		"fontName": "新ゴ DB",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"新ゴ DB",
			"Shin Go DeBold"
		]
	},
	{
		"fontName": "新ゴ B",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"新ゴ B",
			"Shin Go Bold"
		]
	},
	{
		"fontName": "新ゴ H",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"新ゴ H",
			"Shin Go Heavy"
		]
	},
	{
		"fontName": "新ゴ U",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"新ゴ U",
			"Shin Go Ultra"
		]
	},
	{
		"fontName": "ゴシックMB101 L",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"ゴシックMB101 L",
			"Gothic MB101 Light"
		]
	},
	{
		"fontName": "ゴシックMB101 R",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"ゴシックMB101 R",
			"Gothic MB101 Regular"
		]
	},
	{
		"fontName": "ゴシックMB101 M",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"ゴシックMB101 M",
			"Gothic MB101 Medium"
		]
	},
	{
		"fontName": "ゴシックMB101 DB",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"ゴシックMB101 DB",
			"Gothic MB101 DemiBold"
		]
	},
	{
		"fontName": "ゴシックMB101 B",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"ゴシックMB101 B",
			"Gothic MB101 Bold"
		]
	},
	{
		"fontName": "ゴシックMB101 H",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"ゴシックMB101 H",
			"Gothic MB101 Heavy"
		]
	},
	{
		"fontName": "ゴシックMB101 U",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"ゴシックMB101 U",
			"Gothic MB101 Ultra"
		]
	},
	{
		"fontName": "中ゴシックBBB",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"中ゴシックBBB",
			"Gothic Medium BBB"
		]
	},
	{
		"fontName": "太ゴB101",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"太ゴB101",
			"Futo Go B101"
		]
	},
	{
		"fontName": "見出ゴMB1",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"見出ゴMB1",
			"Midashi Go MB1"
		]
	},
	{
		"fontName": "見出ゴMB31",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"見出ゴMB31",
			"Midashi Go MB31"
		]
	},
	{
		"fontName": "秀英角ゴシック金 L",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"秀英角ゴシック金 L",
			"Shuei KakuGo Kin L"
		]
	},
	{
		"fontName": "秀英角ゴシック金 B",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"秀英角ゴシック金 B",
			"Shuei KakuGo Kin B"
		]
	},
	{
		"fontName": "秀英角ゴシック銀 L",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"秀英角ゴシック銀 L",
			"Shuei KakuGo Gin L"
		]
	},
	{
		"fontName": "秀英角ゴシック銀 B",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"秀英角ゴシック銀 B",
			"Shuei KakuGo Gin B"
		]
	},
	{
		"fontName": "新ゴ EL JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"新ゴ EL JIS2004",
			"Shin Go ExLight JIS2004"
		]
	},
	{
		"fontName": "新ゴ L JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"新ゴ L JIS2004",
			"Shin Go Light JIS2004"
		]
	},
	{
		"fontName": "新ゴ R JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"新ゴ R JIS2004",
			"Shin Go Regular JIS2004"
		]
	},
	{
		"fontName": "新ゴ M JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"新ゴ M JIS2004",
			"Shin Go Medium JIS2004"
		]
	},
	{
		"fontName": "新ゴ DB JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"新ゴ DB JIS2004",
			"Shin Go DeBold JIS2004"
		]
	},
	{
		"fontName": "新ゴ B JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"新ゴ B JIS2004",
			"Shin Go Bold JIS2004"
		]
	},
	{
		"fontName": "新ゴ H JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"新ゴ H JIS2004",
			"Shin Go Heavy JIS2004"
		]
	},
	{
		"fontName": "新ゴ U JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"新ゴ U JIS2004",
			"Shin Go Ultra JIS2004"
		]
	},
	{
		"fontName": "ゴシックMB101 L JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"ゴシックMB101 L JIS2004",
			"Gothic MB101 Light JIS2004"
		]
	},
	{
		"fontName": "ゴシックMB101 R JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"ゴシックMB101 R JIS2004",
			"Gothic MB101 Regular JIS2004"
		]
	},
	{
		"fontName": "ゴシックMB101 M JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"ゴシックMB101 M JIS2004",
			"Gothic MB101 Medium JIS2004"
		]
	},
	{
		"fontName": "ゴシックMB101 DB JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"ゴシックMB101 DB JIS2004",
			"Gothic MB101 DemiBold JIS2004"
		]
	},
	{
		"fontName": "ゴシックMB101 B JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"ゴシックMB101 B JIS2004",
			"Gothic MB101 Bold JIS2004"
		]
	},
	{
		"fontName": "ゴシックMB101 H JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"ゴシックMB101 H JIS2004",
			"Gothic MB101 Heavy JIS2004"
		]
	},
	{
		"fontName": "ゴシックMB101 U JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"ゴシックMB101 U JIS2004",
			"Gothic MB101 Ultra JIS2004"
		]
	},
	{
		"fontName": "中ゴシックBBB JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"中ゴシックBBB JIS2004",
			"Gothic Medium BBB JIS2004"
		]
	},
	{
		"fontName": "太ゴB101 JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"太ゴB101 JIS2004",
			"Futo Go B101 JIS2004"
		]
	},
	{
		"fontName": "見出ゴMB31 JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"見出ゴMB31 JIS2004",
			"Midashi Go MB31 JIS2004"
		]
	},
	{
		"fontName": "じゅん 101",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"じゅん 101",
			"Jun 101"
		]
	},
	{
		"fontName": "じゅん 201",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"じゅん 201",
			"Jun 201"
		]
	},
	{
		"fontName": "じゅん 34",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"じゅん 34",
			"Jun 34"
		]
	},
	{
		"fontName": "じゅん 501",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"じゅん 501",
			"Jun 501"
		]
	},
	{
		"fontName": "新丸ゴ L",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"新丸ゴ L",
			"Shin Maru Go Light"
		]
	},
	{
		"fontName": "新丸ゴ R",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"新丸ゴ R",
			"Shin Maru Go Regular"
		]
	},
	{
		"fontName": "新丸ゴ M",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"新丸ゴ M",
			"Shin Maru Go Medium"
		]
	},
	{
		"fontName": "新丸ゴ DB",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"新丸ゴ DB",
			"Shin Maru Go DemiBold"
		]
	},
	{
		"fontName": "新丸ゴ B",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"新丸ゴ B",
			"Shin Maru Go Bold"
		]
	},
	{
		"fontName": "新丸ゴ H",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"新丸ゴ H",
			"Shin Maru Go Heavy"
		]
	},
	{
		"fontName": "新丸ゴ U",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"新丸ゴ U",
			"Shin Maru Go Ultra"
		]
	},
	{
		"fontName": "ソフトゴシック L",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"ソフトゴシック L",
			"Soft Gothic Light"
		]
	},
	{
		"fontName": "ソフトゴシック R",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"ソフトゴシック R",
			"Soft Gothic Regular"
		]
	},
	{
		"fontName": "ソフトゴシック M",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"ソフトゴシック M",
			"Soft Gothic Medium"
		]
	},
	{
		"fontName": "ソフトゴシック DB",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"ソフトゴシック DB",
			"Soft Gothic DemiBold"
		]
	},
	{
		"fontName": "ソフトゴシック B",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"ソフトゴシック B",
			"Soft Gothic Bold"
		]
	},
	{
		"fontName": "ソフトゴシック H",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"ソフトゴシック H",
			"Soft Gothic Heavy"
		]
	},
	{
		"fontName": "ソフトゴシック U",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"ソフトゴシック U",
			"Soft Gothic Ultra"
		]
	},
	{
		"fontName": "秀英丸ゴシック L",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"秀英丸ゴシック L",
			"Shuei MaruGo L"
		]
	},
	{
		"fontName": "秀英丸ゴシック B",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"秀英丸ゴシック B",
			"Shuei MaruGo B"
		]
	},
	{
		"fontName": "新丸ゴ L JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"新丸ゴ L JIS2004",
			"Shin Maru Go Light JIS2004"
		]
	},
	{
		"fontName": "新丸ゴ R JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"新丸ゴ R JIS2004",
			"Shin Maru Go Regular JIS2004"
		]
	},
	{
		"fontName": "新丸ゴ M JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"新丸ゴ M JIS2004",
			"Shin Maru Go Medium JIS2004"
		]
	},
	{
		"fontName": "新丸ゴ DB JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"新丸ゴ DB JIS2004",
			"Shin Maru Go DemiBold JIS2004"
		]
	},
	{
		"fontName": "新丸ゴ B JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"新丸ゴ B JIS2004",
			"Shin Maru Go Bold JIS2004"
		]
	},
	{
		"fontName": "新丸ゴ H JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"新丸ゴ H JIS2004",
			"Shin Maru Go Heavy JIS2004"
		]
	},
	{
		"fontName": "新丸ゴ U JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"新丸ゴ U JIS2004",
			"Shin Maru Go Ultra JIS2004"
		]
	},
	{
		"fontName": "フォーク R",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"フォーク R",
			"Folk Regular"
		]
	},
	{
		"fontName": "フォーク M",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"フォーク M",
			"Folk Medium"
		]
	},
	{
		"fontName": "フォーク B",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"フォーク B",
			"Folk Bold"
		]
	},
	{
		"fontName": "フォーク H",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"フォーク H",
			"Folk Heavy"
		]
	},
	{
		"fontName": "丸フォーク R",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"丸フォーク R",
			"Maru Folk Regular"
		]
	},
	{
		"fontName": "丸フォーク M",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"丸フォーク M",
			"Maru Folk Medium"
		]
	},
	{
		"fontName": "丸フォーク B",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"丸フォーク B",
			"Maru Folk Bold"
		]
	},
	{
		"fontName": "丸フォーク H",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"丸フォーク H",
			"Maru Folk Heavy"
		]
	},
	{
		"fontName": "カクミン R",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"カクミン R",
			"Kakumin Regular"
		]
	},
	{
		"fontName": "カクミン M",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"カクミン M",
			"Kakumin Medium"
		]
	},
	{
		"fontName": "カクミン B",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"カクミン B",
			"Kakumin Bold"
		]
	},
	{
		"fontName": "カクミン H",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"カクミン H",
			"Kakumin Heavy"
		]
	},
	{
		"fontName": "解ミン 宙 R",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"解ミン 宙 R",
			"Kaimin Sora Regular"
		]
	},
	{
		"fontName": "解ミン 宙 M",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"解ミン 宙 M",
			"Kaimin Sora Medium"
		]
	},
	{
		"fontName": "解ミン 宙 B",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"解ミン 宙 B",
			"Kaimin Sora Bold"
		]
	},
	{
		"fontName": "解ミン 宙 H",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"解ミン 宙 H",
			"Kaimin Sora Heavy"
		]
	},
	{
		"fontName": "解ミン 月 R",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"解ミン 月 R",
			"Kaimin Tsuki Regular"
		]
	},
	{
		"fontName": "解ミン 月 M",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"解ミン 月 M",
			"Kaimin Tsuki Medium"
		]
	},
	{
		"fontName": "解ミン 月 B",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"解ミン 月 B",
			"Kaimin Tsuki Bold"
		]
	},
	{
		"fontName": "解ミン 月 H",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"解ミン 月 H",
			"Kaimin Tsuki Heavy"
		]
	},
	{
		"fontName": "モアリア R",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"モアリア R",
			"Moaria Regular"
		]
	},
	{
		"fontName": "モアリア B",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"モアリア B",
			"Moaria Bold"
		]
	},
	{
		"fontName": "シネマレター",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"シネマレター",
			"Cinema Letter"
		]
	},
	{
		"fontName": "トーキング",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"トーキング",
			"Talking"
		]
	},
	{
		"fontName": "タカモダン",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"タカモダン",
			"Takamodern"
		]
	},
	{
		"fontName": "竹 L",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"竹 L",
			"Take Light"
		]
	},
	{
		"fontName": "竹 M",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"竹 M",
			"Take Medium"
		]
	},
	{
		"fontName": "竹 B",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"竹 B",
			"Take Bold"
		]
	},
	{
		"fontName": "竹 H",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"竹 H",
			"Take Heavy"
		]
	},
	{
		"fontName": "トンネル 細線(Tightline)",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"トンネル 細線",
			"Tunnel Tightline"
		]
	},
	{
		"fontName": "トンネル 太線(Wideline)",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"トンネル 太線",
			"Tunnel Wideline"
		]
	},
	{
		"fontName": "明石",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"明石",
			"Akashi"
		]
	},
	{
		"fontName": "徐明",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"徐明",
			"Jomin"
		]
	},
	{
		"fontName": "那欽",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"那欽",
			"Nachin"
		]
	},
	{
		"fontName": "くもやじ",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"くもやじ",
			"Kumoyaji"
		]
	},
	{
		"fontName": "ハルクラフト",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"ハルクラフト",
			"Harucraft"
		]
	},
	{
		"fontName": "プリティー桃",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"プリティー桃",
			"Pretty Momo"
		]
	},
	{
		"fontName": "はるひ学園",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"はるひ学園",
			"Haruhi Gakuen"
		]
	},
	{
		"fontName": "すずむし",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"すずむし",
			"Suzumushi"
		]
	},
	{
		"fontName": "新ゴ シャドウ",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"新ゴ シャドウ",
			"Shin Go Shadow"
		]
	},
	{
		"fontName": "新ゴ エンボス",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"新ゴ エンボス",
			"Shin Go Emboss"
		]
	},
	{
		"fontName": "新ゴ ライン",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"新ゴ ライン",
			"Shin Go Line"
		]
	},
	{
		"fontName": "新ゴ 太ライン",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"新ゴ 太ライン",
			"Shin Go Futoline"
		]
	},
	{
		"fontName": "新丸ゴ シャドウ",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"新丸ゴ シャドウ",
			"Shin Maru Go Shadow"
		]
	},
	{
		"fontName": "新丸ゴ エンボス",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"新丸ゴ エンボス",
			"Shin Maru Go Emboss"
		]
	},
	{
		"fontName": "新丸ゴ ライン",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"新丸ゴ ライン",
			"Shin Maru Go Line"
		]
	},
	{
		"fontName": "新丸ゴ 太ライン",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"新丸ゴ 太ライン",
			"Shin Maru Go Futoline"
		]
	},
	{
		"fontName": "正楷書CB1",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"正楷書CB1",
			"Sei Kaisho CB1"
		]
	},
	{
		"fontName": "新正楷書CBSK1",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"新正楷書CBSK1",
			"Shinsei Kaisho CBSK1"
		]
	},
	{
		"fontName": "欧体楷書",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"欧体楷書",
			"Outai Kaisho"
		]
	},
	{
		"fontName": "楷書MCBK1",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"楷書MCBK1",
			"Kaisho MCBK1"
		]
	},
	{
		"fontName": "教科書ICA L",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"教科書ICA L",
			"Kyoukasho ICA Light"
		]
	},
	{
		"fontName": "教科書ICA R",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"教科書ICA R",
			"Kyoukasho ICA Regular"
		]
	},
	{
		"fontName": "教科書ICA M",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"教科書ICA M",
			"Kyoukasho ICA Medium"
		]
	},
	{
		"fontName": "角新行書 L",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"角新行書 L",
			"Kakushin Gyousho Light"
		]
	},
	{
		"fontName": "角新行書 M",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"角新行書 M",
			"Kakushin Gyousho Medium"
		]
	},
	{
		"fontName": "隷書E1",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"隷書E1",
			"Reisho E1"
		]
	},
	{
		"fontName": "隷書101",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"隷書101",
			"Reisho 101"
		]
	},
	{
		"fontName": "陸隷",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"陸隷",
			"Likurei"
		]
	},
	{
		"fontName": "勘亭流",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"勘亭流",
			"Kanteiryu"
		]
	},
	{
		"fontName": "ひげ文字",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"ひげ文字",
			"Higemoji"
		]
	},
	{
		"fontName": "UD黎ミン L",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD黎ミン L",
			"UD Reimin Light"
		]
	},
	{
		"fontName": "UD黎ミン R",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD黎ミン R",
			"UD Reimin Regular"
		]
	},
	{
		"fontName": "UD黎ミン M",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD黎ミン M",
			"UD Reimin Medium"
		]
	},
	{
		"fontName": "UD黎ミン B",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD黎ミン B",
			"UD Reimin Bold"
		]
	},
	{
		"fontName": "UD黎ミン EB",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD黎ミン EB",
			"UD Reimin ExtraBold"
		]
	},
	{
		"fontName": "UD黎ミン H",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD黎ミン H",
			"UD Reimin Heavy"
		]
	},
	{
		"fontName": "UD黎ミン L JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD黎ミン L JIS2004",
			"UD Reimin Light JIS2004"
		]
	},
	{
		"fontName": "UD黎ミン R JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD黎ミン R JIS2004",
			"UD Reimin Regular JIS2004"
		]
	},
	{
		"fontName": "UD黎ミン M JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD黎ミン M JIS2004",
			"UD Reimin Medium JIS2004"
		]
	},
	{
		"fontName": "UD黎ミン B JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD黎ミン B JIS2004",
			"UD Reimin Bold JIS2004"
		]
	},
	{
		"fontName": "UD黎ミン EB JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD黎ミン EB JIS2004",
			"UD Reimin ExtraBold JIS2004"
		]
	},
	{
		"fontName": "UD黎ミン H JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD黎ミン H JIS2004",
			"UD Reimin Heavy JIS2004"
		]
	},
	{
		"fontName": "UD新ゴ L",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ L",
			"UD Shin Go Light"
		]
	},
	{
		"fontName": "UD新ゴ R",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ R",
			"UD Shin Go Regular"
		]
	},
	{
		"fontName": "UD新ゴ M",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ M",
			"UD Shin Go Medium"
		]
	},
	{
		"fontName": "UD新ゴ DB",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ DB",
			"UD Shin Go DemiBold"
		]
	},
	{
		"fontName": "UD新ゴ B",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ B",
			"UD Shin Go Bold"
		]
	},
	{
		"fontName": "UD新ゴ H",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ H",
			"UD Shin Go Heavy"
		]
	},
	{
		"fontName": "UD新ゴNT L",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴNT L",
			"UD Shin Go NT Light"
		]
	},
	{
		"fontName": "UD新ゴNT R",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴNT R",
			"UD Shin Go NT Regular"
		]
	},
	{
		"fontName": "UD新ゴNT M",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴNT M",
			"UD Shin Go NT Medium"
		]
	},
	{
		"fontName": "UD新ゴNT DB",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴNT DB",
			"UD Shin Go NT DemiBold"
		]
	},
	{
		"fontName": "UD新ゴNT B",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴNT B",
			"UD Shin Go NT Bold"
		]
	},
	{
		"fontName": "UD新ゴNT H",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴNT H",
			"UD Shin Go NT Heavy"
		]
	},
	{
		"fontName": "UD新ゴ L JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ L JIS2004",
			"UD Shin Go Light JIS2004"
		]
	},
	{
		"fontName": "UD新ゴ R JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ R JIS2004",
			"UD Shin Go Regular JIS2004"
		]
	},
	{
		"fontName": "UD新ゴ M JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ M JIS2004",
			"UD Shin Go Medium JIS2004"
		]
	},
	{
		"fontName": "UD新ゴ DB JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ DB JIS2004",
			"UD Shin Go DemiBold JIS2004"
		]
	},
	{
		"fontName": "UD新ゴ B JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ B JIS2004",
			"UD Shin Go Bold JIS2004"
		]
	},
	{
		"fontName": "UD新ゴ H JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ H JIS2004",
			"UD Shin Go Heavy JIS2004"
		]
	},
	{
		"fontName": "UD新ゴNT L JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴNT L JIS2004",
			"UD Shin Go NT Light JIS2004"
		]
	},
	{
		"fontName": "UD新ゴNT R JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴNT R JIS2004",
			"UD Shin Go NT Regular JIS2004"
		]
	},
	{
		"fontName": "UD新ゴNT M JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴNT M JIS2004",
			"UD Shin Go NT Medium JIS2004"
		]
	},
	{
		"fontName": "UD新ゴNT DB JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴNT DB JIS2004",
			"UD Shin Go NT DemiBold JIS2004"
		]
	},
	{
		"fontName": "UD新ゴNT B JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴNT B JIS2004",
			"UD Shin Go NT Bold JIS2004"
		]
	},
	{
		"fontName": "UD新ゴNT H JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴNT H JIS2004",
			"UD Shin Go NT Heavy JIS2004"
		]
	},
	{
		"fontName": "UD新丸ゴ L",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新丸ゴ L",
			"UD Shin Maru Go Light"
		]
	},
	{
		"fontName": "UD新丸ゴ R",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新丸ゴ R",
			"UD Shin Maru Go Regular"
		]
	},
	{
		"fontName": "UD新丸ゴ M",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新丸ゴ M",
			"UD Shin Maru Go Medium"
		]
	},
	{
		"fontName": "UD新丸ゴ DB",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新丸ゴ DB",
			"UD Shin Maru Go DemiBold"
		]
	},
	{
		"fontName": "UD新丸ゴ B",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新丸ゴ B",
			"UD Shin Maru Go Bold"
		]
	},
	{
		"fontName": "UD新丸ゴ H",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新丸ゴ H",
			"UD Shin Maru Go Heavy"
		]
	},
	{
		"fontName": "UD新丸ゴ L JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新丸ゴ L JIS2004",
			"UD Shin Maru Go Light JIS2004"
		]
	},
	{
		"fontName": "UD新丸ゴ R JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新丸ゴ R JIS2004",
			"UD Shin Maru Go Regular JIS2004"
		]
	},
	{
		"fontName": "UD新丸ゴ M JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新丸ゴ M JIS2004",
			"UD Shin Maru Go Medium JIS2004"
		]
	},
	{
		"fontName": "UD新丸ゴ DB JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新丸ゴ DB JIS2004",
			"UD Shin Maru Go DeBold JIS2004"
		]
	},
	{
		"fontName": "UD新丸ゴ B JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新丸ゴ B JIS2004",
			"UD Shin Maru Go Bold JIS2004"
		]
	},
	{
		"fontName": "UD新丸ゴ H JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新丸ゴ H JIS2004",
			"UD Shin Maru Go Heavy JIS2004"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス90 EL",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス90 EL",
			"UD Shin Go Conde90 EL"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス90 L",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス90 L",
			"UD Shin Go Conde90 L"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス90 R",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス90 R",
			"UD Shin Go Conde90 R"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス90 M",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス90 M",
			"UD Shin Go Conde90 M"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス90 DB",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス90 DB",
			"UD Shin Go Conde90 DB"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス90 B",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス90 B",
			"UD Shin Go Conde90 B"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス90 H",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス90 H",
			"UD Shin Go Conde90 H"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス90 U",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス90 U",
			"UD Shin Go Conde90 U"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス80 EL",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス80 EL",
			"UD Shin Go Conde80 EL"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス80 L",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス80 L",
			"UD Shin Go Conde80 L"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス80 R",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス80 R",
			"UD Shin Go Conde80 R"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス80 M",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス80 M",
			"UD Shin Go Conde80 M"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス80 DB",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス80 DB",
			"UD Shin Go Conde80 DB"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス80 B",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス80 B",
			"UD Shin Go Conde80 B"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス80 H",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス80 H",
			"UD Shin Go Conde80 H"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス80 U",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス80 U",
			"UD Shin Go Conde80 U"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス70 EL",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス70 EL",
			"UD Shin Go Conde70 EL"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス70 L",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス70 L",
			"UD Shin Go Conde70 L"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス70 R",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス70 R",
			"UD Shin Go Conde70 R"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス70 M",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス70 M",
			"UD Shin Go Conde70 M"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス70 DB",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス70 DB",
			"UD Shin Go Conde70 DB"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス70 B",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス70 B",
			"UD Shin Go Conde70 B"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス70 H",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス70 H",
			"UD Shin Go Conde70 H"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス70 U",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス70 U",
			"UD Shin Go Conde70 U"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス60 EL",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス60 EL",
			"UD Shin Go Conde60 EL"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス60 L",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス60 L",
			"UD Shin Go Conde60 L"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス60 R",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス60 R",
			"UD Shin Go Conde60 R"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス60 M",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス60 M",
			"UD Shin Go Conde60 M"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス60 DB",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス60 DB",
			"UD Shin Go Conde60 DB"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス60 B",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス60 B",
			"UD Shin Go Conde60 B"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス60 H",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス60 H",
			"UD Shin Go Conde60 H"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス60 U",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス60 U",
			"UD Shin Go Conde60 U"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス50 EL",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス50 EL",
			"UD Shin Go Conde50 EL"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス50 L",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス50 L",
			"UD Shin Go Conde50 L"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス50 R",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス50 R",
			"UD Shin Go Conde50 R"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス50 M",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス50 M",
			"UD Shin Go Conde50 M"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス50 DB",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス50 DB",
			"UD Shin Go Conde50 DB"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス50 B",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス50 B",
			"UD Shin Go Conde50 B"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス50 H",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス50 H",
			"UD Shin Go Conde50 H"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス50 U",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス50 U",
			"UD Shin Go Conde50 U"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス90 EL JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス90 EL JIS2004",
			"UD Shin Go Conde90 EL JIS2004"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス90 L JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス90 L JIS2004",
			"UD Shin Go Conde90 L JIS2004"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス90 R JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス90 R JIS2004",
			"UD Shin Go Conde90 R JIS2004"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス90 M JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス90 M JIS2004",
			"UD Shin Go Conde90 M JIS2004"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス90 DB JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス90 DB JIS2004",
			"UD Shin Go Conde90 DB JIS2004"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス90 B JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス90 B JIS2004",
			"UD Shin Go Conde90 B JIS2004"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス90 H JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス90 H JIS2004",
			"UD Shin Go Conde90 H JIS2004"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス90 U JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス90 U JIS2004",
			"UD Shin Go Conde90 U JIS2004"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス80 EL JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス80 EL JIS2004",
			"UD Shin Go Conde80 EL JIS2004"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス80 L JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス80 L JIS2004",
			"UD Shin Go Conde80 L JIS2004"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス80 R JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス80 R JIS2004",
			"UD Shin Go Conde80 R JIS2004"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス80 M JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス80 M JIS2004",
			"UD Shin Go Conde80 M JIS2004"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス80 DB JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス80 DB JIS2004",
			"UD Shin Go Conde80 DB JIS2004"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス80 B JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス80 B JIS2004",
			"UD Shin Go Conde80 B JIS2004"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス80 H JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス80 H JIS2004",
			"UD Shin Go Conde80 H JIS2004"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス80 U JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス80 U JIS2004",
			"UD Shin Go Conde80 U JIS2004"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス70 EL JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス70 EL JIS2004",
			"UD Shin Go Conde70 EL JIS2004"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス70 L JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス70 L JIS2004",
			"UD Shin Go Conde70 L JIS2004"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス70 R JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス70 R JIS2004",
			"UD Shin Go Conde70 R JIS2004"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス70 M JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス70 M JIS2004",
			"UD Shin Go Conde70 M JIS2004"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス70 DB JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス70 DB JIS2004",
			"UD Shin Go Conde70 DB JIS2004"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス70 B JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス70 B JIS2004",
			"UD Shin Go Conde70 B JIS2004"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス70 H JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス70 H JIS2004",
			"UD Shin Go Conde70 H JIS2004"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス70 U JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス70 U JIS2004",
			"UD Shin Go Conde70 U JIS2004"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス60 EL JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス60 EL JIS2004",
			"UD Shin Go Conde60 EL JIS2004"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス60 L JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス60 L JIS2004",
			"UD Shin Go Conde60 L JIS2004"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス60 R JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス60 R JIS2004",
			"UD Shin Go Conde60 R JIS2004"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス60 M JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス60 M JIS2004",
			"UD Shin Go Conde60 M JIS2004"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス60 DB JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス60 DB JIS2004",
			"UD Shin Go Conde60 DB JIS2004"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス60 B JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス60 B JIS2004",
			"UD Shin Go Conde60 B JIS2004"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス60 H JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス60 H JIS2004",
			"UD Shin Go Conde60 H JIS2004"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス60 U JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス60 U JIS2004",
			"UD Shin Go Conde60 U JIS2004"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス50 EL JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス50 EL JIS2004",
			"UD Shin Go Conde50 EL JIS2004"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス50 L JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス50 L JIS2004",
			"UD Shin Go Conde50 L JIS2004"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス50 R JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス50 R JIS2004",
			"UD Shin Go Conde50 R JIS2004"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス50 M JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス50 M JIS2004",
			"UD Shin Go Conde50 M JIS2004"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス50 DB JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス50 DB JIS2004",
			"UD Shin Go Conde50 DB JIS2004"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス50 B JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス50 B JIS2004",
			"UD Shin Go Conde50 B JIS2004"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス50 H JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス50 H JIS2004",
			"UD Shin Go Conde50 H JIS2004"
		]
	},
	{
		"fontName": "UD新ゴ コンデンス50 U JIS2004",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ コンデンス50 U JIS2004",
			"UD Shin Go Conde50 U JIS2004"
		]
	},
	{
		"fontName": "学参 常改リュウミン L-KL",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"学参 常改リュウミン L-KL",
			"GJ Ryumin Light KL"
		]
	},
	{
		"fontName": "学参 常改リュウミン R-KL",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"学参 常改リュウミン R-KL",
			"GJ Ryumin Regular KL"
		]
	},
	{
		"fontName": "学参 常改リュウミン M-KL",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"学参 常改リュウミン M-KL",
			"GJ Ryumin Medium KL"
		]
	},
	{
		"fontName": "学参 常改リュウミン B-KL",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"学参 常改リュウミン B-KL",
			"GJ Ryumin Bold KL"
		]
	},
	{
		"fontName": "学参 常改新ゴ L",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"学参 常改新ゴ L",
			"GJ Shin Go Light"
		]
	},
	{
		"fontName": "学参 常改新ゴ R",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"学参 常改新ゴ R",
			"GJ Shin Go Regular"
		]
	},
	{
		"fontName": "学参 常改新ゴ M",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"学参 常改新ゴ M",
			"GJ Shin Go Medium"
		]
	},
	{
		"fontName": "学参 常改新ゴ DB",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"学参 常改新ゴ DB",
			"GJ Shin Go DemiBold"
		]
	},
	{
		"fontName": "学参 常改新ゴ B",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"学参 常改新ゴ B",
			"GJ Shin Go Bold"
		]
	},
	{
		"fontName": "学参 常改中ゴシックBBB",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"学参 常改中ゴシックBBB",
			"GJ Gothic Medium BBB"
		]
	},
	{
		"fontName": "学参 常改太ゴB101",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"学参 常改太ゴB101",
			"GJ Futo Go B101"
		]
	},
	{
		"fontName": "学参 常改じゅん 34",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"学参 常改じゅん 34",
			"GJ Jun 34"
		]
	},
	{
		"fontName": "学参 常改じゅん 501",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"学参 常改じゅん 501",
			"GJ Jun 501"
		]
	},
	{
		"fontName": "学参 常改新丸ゴ L",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"学参 常改新丸ゴ L",
			"GJ Shin Maru Go Light"
		]
	},
	{
		"fontName": "学参 常改新丸ゴ R",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"学参 常改新丸ゴ R",
			"GJ Shin Maru Go Regular"
		]
	},
	{
		"fontName": "学参 常改新丸ゴ M",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"学参 常改新丸ゴ M",
			"GJ Shin Maru Go Medium"
		]
	},
	{
		"fontName": "学参 常改新丸ゴ DB",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"学参 常改新丸ゴ DB",
			"GJ Shin Maru Go DemiBold"
		]
	},
	{
		"fontName": "学参 常改新丸ゴ B",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"学参 常改新丸ゴ B",
			"GJ Shin Maru Go Bold"
		]
	},
	{
		"fontName": "学参 常改教科書ICA L",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"学参 常改教科書ICA L",
			"GJ Kyoukasho ICA Light"
		]
	},
	{
		"fontName": "学参 常改教科書ICA R",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"学参 常改教科書ICA R",
			"GJ Kyoukasho ICA Regular"
		]
	},
	{
		"fontName": "学参 常改教科書ICA M",
		"language": "日本語",
		"foundry": "MORISAWA",
		"cssNames": [
			"学参 常改教科書ICA M",
			"GJ Kyoukasho ICA Medium"
		]
	},
	{
		"fontName": "UD新ゴ ハングル EL",
		"language": "韓国語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ ハングル EL",
			"UD Shin Go Hangul ExtraLight"
		]
	},
	{
		"fontName": "UD新ゴ ハングル L",
		"language": "韓国語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ ハングル L",
			"UD Shin Go Hangul Light"
		]
	},
	{
		"fontName": "UD新ゴ ハングル R",
		"language": "韓国語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ ハングル R",
			"UD Shin Go Hangul Regular"
		]
	},
	{
		"fontName": "UD新ゴ ハングル M",
		"language": "韓国語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ ハングル M",
			"UD Shin Go Hangul Medium"
		]
	},
	{
		"fontName": "UD新ゴ ハングル DB",
		"language": "韓国語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ ハングル DB",
			"UD Shin Go Hangul DemiBold"
		]
	},
	{
		"fontName": "UD新ゴ ハングル B",
		"language": "韓国語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ ハングル B",
			"UD Shin Go Hangul Bold"
		]
	},
	{
		"fontName": "UD新ゴ ハングル H",
		"language": "韓国語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ ハングル H",
			"UD Shin Go Hangul Heavy"
		]
	},
	{
		"fontName": "UD新ゴ ハングル U",
		"language": "韓国語",
		"foundry": "MORISAWA",
		"cssNames": [
			"UD新ゴ ハングル U",
			"UD Shin Go Hangul Ultra"
		]
	},
	{
		"fontName": "ヒラギノ明朝 W3 JIS2004",
		"language": "日本語",
		"foundry": "大日本スクリーン製造",
		"cssNames": [
			"ヒラギノ明朝 W3 JIS2004",
			"Hiragino Mincho W3 JIS2004"
		]
	},
	{
		"fontName": "ヒラギノ明朝 W6 JIS2004",
		"language": "日本語",
		"foundry": "大日本スクリーン製造",
		"cssNames": [
			"ヒラギノ明朝 W6 JIS2004",
			"Hiragino Mincho W6 JIS2004"
		]
	},
	{
		"fontName": "ヒラギノ角ゴ W3 JIS2004",
		"language": "日本語",
		"foundry": "大日本スクリーン製造",
		"cssNames": [
			"ヒラギノ角ゴ W3 JIS2004",
			"Hiragino Kaku Gothic W3 JIS2004"
		]
	},
	{
		"fontName": "ヒラギノ角ゴ W6 JIS2004",
		"language": "日本語",
		"foundry": "大日本スクリーン製造",
		"cssNames": [
			"ヒラギノ角ゴ W6 JIS2004",
			"Hiragino Kaku Gothic W6 JIS2004"
		]
	},
	{
		"fontName": "ヒラギノ角ゴ W8 JIS2004",
		"language": "日本語",
		"foundry": "大日本スクリーン製造",
		"cssNames": [
			"ヒラギノ角ゴ W8 JIS2004",
			"Hiragino Kaku Gothic W8 JIS2004"
		]
	},
	{
		"fontName": "ヒラギノ丸ゴ W4 JIS2004",
		"language": "日本語",
		"foundry": "大日本スクリーン製造",
		"cssNames": [
			"ヒラギノ丸ゴ W4 JIS2004",
			"Hiragino Maru Gothic W4 JIS2004"
		]
	},
	{
		"fontName": "本明朝-Book （標準がな）",
		"language": "日本語",
		"foundry": "タイプバンク",
		"cssNames": [
			"本明朝-Book （標準がな）",
			"HonMincho-Book"
		]
	},
	{
		"fontName": "本明朝-Book 小がな",
		"language": "日本語",
		"foundry": "タイプバンク",
		"cssNames": [
			"本明朝-Book 小がな",
			"HonMinKok-Book"
		]
	},
	{
		"fontName": "本明朝-Book 新がな",
		"language": "日本語",
		"foundry": "タイプバンク",
		"cssNames": [
			"本明朝-Book 新がな",
			"HonMinSink-Book"
		]
	},
	{
		"fontName": "本明朝-Book 新小がな",
		"language": "日本語",
		"foundry": "タイプバンク",
		"cssNames": [
			"本明朝-Book 新小がな",
			"HonMinSKok-Book"
		]
	},
	{
		"fontName": "本明朝-L （標準がな）",
		"language": "日本語",
		"foundry": "タイプバンク",
		"cssNames": [
			"本明朝-L （標準がな）",
			"HonMincho-L"
		]
	},
	{
		"fontName": "本明朝-M （標準がな）",
		"language": "日本語",
		"foundry": "タイプバンク",
		"cssNames": [
			"本明朝-M （標準がな）",
			"HonMincho-M"
		]
	},
	{
		"fontName": "本明朝-L 小がな",
		"language": "日本語",
		"foundry": "タイプバンク",
		"cssNames": [
			"本明朝-L 小がな",
			"HonMinKok-L"
		]
	},
	{
		"fontName": "本明朝-M 小がな",
		"language": "日本語",
		"foundry": "タイプバンク",
		"cssNames": [
			"本明朝-M 小がな",
			"HonMinKok-M"
		]
	},
	{
		"fontName": "本明朝-L 新がな",
		"language": "日本語",
		"foundry": "タイプバンク",
		"cssNames": [
			"本明朝-L 新がな",
			"HonMinSink-L"
		]
	},
	{
		"fontName": "本明朝-M 新がな",
		"language": "日本語",
		"foundry": "タイプバンク",
		"cssNames": [
			"本明朝-M 新がな",
			"HonMinSink-M"
		]
	},
	{
		"fontName": "本明朝-L 新小がな",
		"language": "日本語",
		"foundry": "タイプバンク",
		"cssNames": [
			"本明朝-L 新小がな",
			"HonMinSKok-L"
		]
	},
	{
		"fontName": "本明朝-M 新小がな",
		"language": "日本語",
		"foundry": "タイプバンク",
		"cssNames": [
			"本明朝-M 新小がな",
			"HonMinSKok-M"
		]
	},
	{
		"fontName": "本明朝-BII （標準がな）",
		"language": "日本語",
		"foundry": "タイプバンク",
		"cssNames": [
			"本明朝-BII （標準がな）",
			"HonMincho-B"
		]
	},
	{
		"fontName": "本明朝-EII （標準がな）",
		"language": "日本語",
		"foundry": "タイプバンク",
		"cssNames": [
			"本明朝-EII （標準がな）",
			"HonMincho-E"
		]
	},
	{
		"fontName": "本明朝-U （標準がな）",
		"language": "日本語",
		"foundry": "タイプバンク",
		"cssNames": [
			"本明朝-U （標準がな）",
			"HonMincho-U"
		]
	},
	{
		"fontName": "本明朝-BII 新がな",
		"language": "日本語",
		"foundry": "タイプバンク",
		"cssNames": [
			"本明朝-BII 新がな",
			"HonMinSink-B"
		]
	},
	{
		"fontName": "本明朝-EII 新がな",
		"language": "日本語",
		"foundry": "タイプバンク",
		"cssNames": [
			"本明朝-EII 新がな",
			"HonMinSink-E"
		]
	},
	{
		"fontName": "本明朝-U 新がな",
		"language": "日本語",
		"foundry": "タイプバンク",
		"cssNames": [
			"本明朝-U 新がな",
			"HonMinSink-U"
		]
	},
	{
		"fontName": "ナウ-MM",
		"language": "日本語",
		"foundry": "タイプバンク",
		"cssNames": [
			"ナウ-MM",
			"NOW-MM"
		]
	},
	{
		"fontName": "ナウ-MB",
		"language": "日本語",
		"foundry": "タイプバンク",
		"cssNames": [
			"ナウ-MB",
			"NOW-MB"
		]
	},
	{
		"fontName": "ナウ-ME",
		"language": "日本語",
		"foundry": "タイプバンク",
		"cssNames": [
			"ナウ-ME",
			"NOW-ME"
		]
	},
	{
		"fontName": "ナウ-MU",
		"language": "日本語",
		"foundry": "タイプバンク",
		"cssNames": [
			"ナウ-MU",
			"NOW-MU"
		]
	},
	{
		"fontName": "本明朝-Book （標準がな） JIS2004",
		"language": "日本語",
		"foundry": "タイプバンク",
		"cssNames": [
			"本明朝-Book （標準がな） JIS2004",
			"HonMincho-Book JIS2004"
		]
	},
	{
		"fontName": "本明朝-Book 小がな JIS2004",
		"language": "日本語",
		"foundry": "タイプバンク",
		"cssNames": [
			"本明朝-Book 小がな JIS2004",
			"HonMinKok-Book JIS2004"
		]
	},
	{
		"fontName": "本明朝-Book 新がな JIS2004",
		"language": "日本語",
		"foundry": "タイプバンク",
		"cssNames": [
			"本明朝-Book 新がな JIS2004",
			"HonMinSink-Book JIS2004"
		]
	},
	{
		"fontName": "本明朝-Book 新小がな JIS2004",
		"language": "日本語",
		"foundry": "タイプバンク",
		"cssNames": [
			"本明朝-Book 新小がな JIS2004",
			"HonMinSKok-Book JIS2004"
		]
	},
	{
		"fontName": "ナウ-GM",
		"language": "日本語",
		"foundry": "タイプバンク",
		"cssNames": [
			"ナウ-GM",
			"NOW-GM"
		]
	},
	{
		"fontName": "ナウ-GB",
		"language": "日本語",
		"foundry": "タイプバンク",
		"cssNames": [
			"ナウ-GB",
			"NOW-GB"
		]
	},
	{
		"fontName": "ナウ-GE",
		"language": "日本語",
		"foundry": "タイプバンク",
		"cssNames": [
			"ナウ-GE",
			"NOW-GE"
		]
	},
	{
		"fontName": "ナウ-GU",
		"language": "日本語",
		"foundry": "タイプバンク",
		"cssNames": [
			"ナウ-GU",
			"NOW-GU"
		]
	},
	{
		"fontName": "G2サンセリフ-B",
		"language": "日本語",
		"foundry": "タイプバンク",
		"cssNames": [
			"G2サンセリフ-B",
			"GSanSerif-B"
		]
	},
	{
		"fontName": "G2サンセリフ-U",
		"language": "日本語",
		"foundry": "タイプバンク",
		"cssNames": [
			"G2サンセリフ-U",
			"GSanSerif-U"
		]
	},
	{
		"fontName": "ぶらっしゅ",
		"language": "日本語",
		"foundry": "タイプバンク",
		"cssNames": [
			"ぶらっしゅ",
			"Brush-U"
		]
	},
	{
		"fontName": "ぽっくる",
		"language": "日本語",
		"foundry": "タイプバンク",
		"cssNames": [
			"ぽっくる",
			"Pokkru-B"
		]
	},
	{
		"fontName": "篠-M",
		"language": "日本語",
		"foundry": "タイプバンク",
		"cssNames": [
			"篠-M",
			"Shino-M"
		]
	},
	{
		"fontName": "篠-B",
		"language": "日本語",
		"foundry": "タイプバンク",
		"cssNames": [
			"篠-B",
			"Shino-B"
		]
	},
	{
		"fontName": "羽衣-M",
		"language": "日本語",
		"foundry": "タイプバンク",
		"cssNames": [
			"羽衣-M",
			"Hagoromo-M"
		]
	},
	{
		"fontName": "羽衣-B",
		"language": "日本語",
		"foundry": "タイプバンク",
		"cssNames": [
			"羽衣-B",
			"Hagoromo-B"
		]
	},
	{
		"fontName": "TB古印体",
		"language": "日本語",
		"foundry": "タイプバンク",
		"cssNames": [
			"TB古印体",
			"Kointai-M"
		]
	},
	{
		"fontName": "日活正楷書体",
		"language": "日本語",
		"foundry": "タイプバンク",
		"cssNames": [
			"日活正楷書体",
			"NikkatsuSeiKai-L"
		]
	},
	{
		"fontName": "花胡蝶-L",
		"language": "日本語",
		"foundry": "タイプバンク",
		"cssNames": [
			"花胡蝶-L",
			"HanaKocho-Lt"
		]
	},
	{
		"fontName": "花胡蝶-M",
		"language": "日本語",
		"foundry": "タイプバンク",
		"cssNames": [
			"花胡蝶-M",
			"HanaKocho-Md"
		]
	},
	{
		"fontName": "花胡蝶-B",
		"language": "日本語",
		"foundry": "タイプバンク",
		"cssNames": [
			"花胡蝶-B",
			"HanaKocho-Bd"
		]
	},
	{
		"fontName": "花蓮華-L",
		"language": "日本語",
		"foundry": "タイプバンク",
		"cssNames": [
			"花蓮華-L",
			"HanaRenge-Lt"
		]
	},
	{
		"fontName": "花蓮華-M",
		"language": "日本語",
		"foundry": "タイプバンク",
		"cssNames": [
			"花蓮華-M",
			"HanaRenge-Md"
		]
	},
	{
		"fontName": "花蓮華-B",
		"language": "日本語",
		"foundry": "タイプバンク",
		"cssNames": [
			"花蓮華-B",
			"HanaRenge-Bd"
		]
	},
	{
		"fontName": "花牡丹-DB",
		"language": "日本語",
		"foundry": "タイプバンク",
		"cssNames": [
			"花牡丹-DB",
			"HanaBotan-DB"
		]
	},
	{
		"fontName": "TBUDゴシック SL",
		"language": "日本語",
		"foundry": "タイプバンク",
		"cssNames": [
			"TBUDゴシック SL",
			"TBUDGothic SL"
		]
	},
	{
		"fontName": "TBUDゴシック R",
		"language": "日本語",
		"foundry": "タイプバンク",
		"cssNames": [
			"TBUDゴシック R",
			"TBUDGothic R"
		]
	},
	{
		"fontName": "TBUDゴシック B",
		"language": "日本語",
		"foundry": "タイプバンク",
		"cssNames": [
			"TBUDゴシック B",
			"TBUDGothic B"
		]
	},
	{
		"fontName": "TBUDゴシック E",
		"language": "日本語",
		"foundry": "タイプバンク",
		"cssNames": [
			"TBUDゴシック E",
			"TBUDGothic E"
		]
	},
	{
		"fontName": "TBUDゴシック H",
		"language": "日本語",
		"foundry": "タイプバンク",
		"cssNames": [
			"TBUDゴシック H",
			"TBUDGothic H"
		]
	},
	{
		"fontName": "TBUD丸ゴシック SL",
		"language": "日本語",
		"foundry": "タイプバンク",
		"cssNames": [
			"TBUD丸ゴシック SL",
			"TBUDRGothic SL"
		]
	},
	{
		"fontName": "TBUD丸ゴシック R",
		"language": "日本語",
		"foundry": "タイプバンク",
		"cssNames": [
			"TBUD丸ゴシック R",
			"TBUDRGothic R"
		]
	},
	{
		"fontName": "TBUD丸ゴシック B",
		"language": "日本語",
		"foundry": "タイプバンク",
		"cssNames": [
			"TBUD丸ゴシック B",
			"TBUDRGothic B"
		]
	},
	{
		"fontName": "TBUD丸ゴシック H",
		"language": "日本語",
		"foundry": "タイプバンク",
		"cssNames": [
			"TBUD丸ゴシック H",
			"TBUDRGothic H"
		]
	},
	{
		"fontName": "TBUD明朝 M",
		"language": "日本語",
		"foundry": "タイプバンク",
		"cssNames": [
			"TBUD明朝 M",
			"TBUDMincho M"
		]
	},
	{
		"fontName": "TBUD明朝 H",
		"language": "日本語",
		"foundry": "タイプバンク",
		"cssNames": [
			"TBUD明朝 H",
			"TBUDMincho H"
		]
	},
	{
		"fontName": "UDタイポス58",
		"language": "日本語",
		"foundry": "タイプバンク",
		"cssNames": [
			"UDタイポス58",
			"UDTypos58"
		]
	},
	{
		"fontName": "UDタイポス510",
		"language": "日本語",
		"foundry": "タイプバンク",
		"cssNames": [
			"UDタイポス510",
			"UDTypos510"
		]
	},
	{
		"fontName": "UDタイポス512",
		"language": "日本語",
		"foundry": "タイプバンク",
		"cssNames": [
			"UDタイポス512",
			"UDTypos512"
		]
	},
	{
		"fontName": "UDタイポス515",
		"language": "日本語",
		"foundry": "タイプバンク",
		"cssNames": [
			"UDタイポス515",
			"UDTypos515"
		]
	},
	{
		"fontName": "FB Agency Regular",
		"language": "欧文",
		"foundry": "The Font Bureau, Inc.",
		"cssNames": [
			"FB Agency Regular"
		]
	},
	{
		"fontName": "FB Agency Bold",
		"language": "欧文",
		"foundry": "The Font Bureau, Inc.",
		"cssNames": [
			"FB Agency Bold"
		]
	},
	{
		"fontName": "FB Agenda Medium Condensed",
		"language": "欧文",
		"foundry": "The Font Bureau, Inc.",
		"cssNames": [
			"FB Agenda Medium Condensed"
		]
	},
	{
		"fontName": "FB Agenda Bold Condensed",
		"language": "欧文",
		"foundry": "The Font Bureau, Inc.",
		"cssNames": [
			"FB Agenda Bold Condensed"
		]
	},
	{
		"fontName": "FB Benton Sans Book",
		"language": "欧文",
		"foundry": "The Font Bureau, Inc.",
		"cssNames": [
			"FB Benton Sans Book"
		]
	},
	{
		"fontName": "FB Benton Sans Regular",
		"language": "欧文",
		"foundry": "The Font Bureau, Inc.",
		"cssNames": [
			"FB Benton Sans Regular"
		]
	},
	{
		"fontName": "FB Benton Sans Medium",
		"language": "欧文",
		"foundry": "The Font Bureau, Inc.",
		"cssNames": [
			"FB Benton Sans Medium"
		]
	},
	{
		"fontName": "FB Benton Sans Bold",
		"language": "欧文",
		"foundry": "The Font Bureau, Inc.",
		"cssNames": [
			"FB Benton Sans Bold"
		]
	},
	{
		"fontName": "FB Berlin Sans Roman",
		"language": "欧文",
		"foundry": "The Font Bureau, Inc.",
		"cssNames": [
			"FB Berlin Sans Roman"
		]
	},
	{
		"fontName": "FB Californian Text Roman",
		"language": "欧文",
		"foundry": "The Font Bureau, Inc.",
		"cssNames": [
			"FB Californian Text Roman"
		]
	},
	{
		"fontName": "FB Californian Text Italic",
		"language": "欧文",
		"foundry": "The Font Bureau, Inc.",
		"cssNames": [
			"FB Californian Text Italic"
		]
	},
	{
		"fontName": "FB Condor Regular",
		"language": "欧文",
		"foundry": "The Font Bureau, Inc.",
		"cssNames": [
			"FB Condor Regular"
		]
	},
	{
		"fontName": "FB Condor Bold",
		"language": "欧文",
		"foundry": "The Font Bureau, Inc.",
		"cssNames": [
			"FB Condor Bold"
		]
	},
	{
		"fontName": "FB Giza One Three",
		"language": "欧文",
		"foundry": "The Font Bureau, Inc.",
		"cssNames": [
			"FB Giza One Three"
		]
	},
	{
		"fontName": "FB Miller Display Light",
		"language": "欧文",
		"foundry": "The Font Bureau, Inc.",
		"cssNames": [
			"FB Miller Display Light"
		]
	},
	{
		"fontName": "FB Miller Display Roman",
		"language": "欧文",
		"foundry": "The Font Bureau, Inc.",
		"cssNames": [
			"FB Miller Display Roman"
		]
	},
	{
		"fontName": "FB Miller Display Semibold",
		"language": "欧文",
		"foundry": "The Font Bureau, Inc.",
		"cssNames": [
			"FB Miller Display Semibold"
		]
	},
	{
		"fontName": "FB Miller Display Bold",
		"language": "欧文",
		"foundry": "The Font Bureau, Inc.",
		"cssNames": [
			"FB Miller Display Bold"
		]
	},
	{
		"fontName": "FB Sloop Script One",
		"language": "欧文",
		"foundry": "The Font Bureau, Inc.",
		"cssNames": [
			"FB Sloop Script One"
		]
	},
	{
		"fontName": "FB Sloop Script Two",
		"language": "欧文",
		"foundry": "The Font Bureau, Inc.",
		"cssNames": [
			"FB Sloop Script Two"
		]
	},
	{
		"fontName": "FB Sloop Script Three",
		"language": "欧文",
		"foundry": "The Font Bureau, Inc.",
		"cssNames": [
			"FB Sloop Script Three"
		]
	},
	{
		"fontName": "FB Shimano Square Light Narrow",
		"language": "欧文",
		"foundry": "The Font Bureau, Inc.",
		"cssNames": [
			"FB Shimano Square Light Narrow"
		]
	},
	{
		"fontName": "FB Vonness Light",
		"language": "欧文",
		"foundry": "The Font Bureau, Inc.",
		"cssNames": [
			"FB Vonness Light"
		]
	},
	{
		"fontName": "FB Vonness Book",
		"language": "欧文",
		"foundry": "The Font Bureau, Inc.",
		"cssNames": [
			"FB Vonness Book"
		]
	},
	{
		"fontName": "FB Vonness Medium",
		"language": "欧文",
		"foundry": "The Font Bureau, Inc.",
		"cssNames": [
			"FB Vonness Medium"
		]
	},
	{
		"fontName": "FB Vonness Bold",
		"language": "欧文",
		"foundry": "The Font Bureau, Inc.",
		"cssNames": [
			"FB Vonness Bold"
		]
	},
	{
		"fontName": "FB Ibis RE Regular",
		"language": "欧文",
		"foundry": "The Font Bureau, Inc.",
		"cssNames": [
			"FB Ibis RE Regular"
		]
	},
	{
		"fontName": "FB Ibis RE Italic",
		"language": "欧文",
		"foundry": "The Font Bureau, Inc.",
		"cssNames": [
			"FB Ibis RE Italic"
		]
	},
	{
		"fontName": "FB PoynterSerif RE Regular",
		"language": "欧文",
		"foundry": "The Font Bureau, Inc.",
		"cssNames": [
			"FB PoynterSerif RE Regular"
		]
	},
	{
		"fontName": "FB PoynterSerif RE Italic",
		"language": "欧文",
		"foundry": "The Font Bureau, Inc.",
		"cssNames": [
			"FB PoynterSerif RE Italic"
		]
	},
	{
		"fontName": "AR Ming B (文鼎粗明）",
		"language": "中国語（繁体）",
		"foundry": "ARPHIC",
		"cssNames": [
			"AR Ming B"
		]
	},
	{
		"fontName": "AR Ming H (文鼎特明）",
		"language": "中国語（繁体）",
		"foundry": "ARPHIC",
		"cssNames": [
			"AR Ming H"
		]
	},
	{
		"fontName": "AR UDShuyuanhei M (文鼎UD書苑黑体）",
		"language": "中国語（繁体）",
		"foundry": "ARPHIC",
		"cssNames": [
			"AR UDShuyuanhei M"
		]
	},
	{
		"fontName": "AR Hei B (文鼎粗黑）",
		"language": "中国語（繁体）",
		"foundry": "ARPHIC",
		"cssNames": [
			"AR Hei B"
		]
	},
	{
		"fontName": "AR Hei H (文鼎特黑）",
		"language": "中国語（繁体）",
		"foundry": "ARPHIC",
		"cssNames": [
			"AR Hei H"
		]
	},
	{
		"fontName": "AR Biaosong B (文鼎小標宋）",
		"language": "中国語（簡体）",
		"foundry": "ARPHIC",
		"cssNames": [
			"AR Biaosong B"
		]
	},
	{
		"fontName": "AR Dabiaosong H (文鼎大標宋）",
		"language": "中国語（簡体）",
		"foundry": "ARPHIC",
		"cssNames": [
			"AR Dabiaosong H"
		]
	},
	{
		"fontName": "HY ShuSongYiTi (漢儀書宋一体）",
		"language": "中国語（簡体）",
		"foundry": "HANYI",
		"cssNames": [
			"HY ShuSongYiTi"
		]
	},
	{
		"fontName": "HY ZhongSongTi (漢儀中宋体）",
		"language": "中国語（簡体）",
		"foundry": "HANYI",
		"cssNames": [
			"HY ZhongSongTi"
		]
	},
	{
		"fontName": "HY CuSongTi (漢儀粗宋体）",
		"language": "中国語（簡体）",
		"foundry": "HANYI",
		"cssNames": [
			"HY CuSongTi"
		]
	},
	{
		"fontName": "AR Crystalhei DB (文鼎晶栩中粗黑）",
		"language": "中国語（簡体）",
		"foundry": "ARPHIC",
		"cssNames": [
			"AR Crystalhei DB"
		]
	},
	{
		"fontName": "AR UDJingxihei DB (文鼎UD晶熙中粗黑）",
		"language": "中国語（簡体）",
		"foundry": "ARPHIC",
		"cssNames": [
			"AR UDJingxihei DB"
		]
	},
	{
		"fontName": "AR Newhei U (文鼎新特粗黑）",
		"language": "中国語（簡体）",
		"foundry": "ARPHIC",
		"cssNames": [
			"AR Newhei U"
		]
	},
	{
		"fontName": "HY ZhongDengXianTi (漢儀中等線体)",
		"language": "中国語（簡体）",
		"foundry": "HANYI",
		"cssNames": [
			"HY ZhongDengXianTi"
		]
	},
	{
		"fontName": "HY DaHeiTi (漢儀大黒体)",
		"language": "中国語（簡体）",
		"foundry": "HANYI",
		"cssNames": [
			"HY DaHeiTi"
		]
	},
	{
		"fontName": "SD Myungjo Light",
		"language": "韓国語",
		"foundry": "SANDOLL",
		"cssNames": [
			"SD Myungjo Light"
		]
	},
	{
		"fontName": "SD Myungjo Bold",
		"language": "韓国語",
		"foundry": "SANDOLL",
		"cssNames": [
			"SD Myungjo Bold"
		]
	},
	{
		"fontName": "SD Gothic Neo1 Light",
		"language": "韓国語",
		"foundry": "SANDOLL",
		"cssNames": [
			"SD Gothic Neo1 Light"
		]
	},
	{
		"fontName": "SD Gothic Neo1 Medium",
		"language": "韓国語",
		"foundry": "SANDOLL",
		"cssNames": [
			"SD Gothic Neo1 Medium"
		]
	},
	{
		"fontName": "SD Gothic Neo1 ExtraBold",
		"language": "韓国語",
		"foundry": "SANDOLL",
		"cssNames": [
			"SD Gothic Neo1 ExtraBold"
		]
	}
]

},{}]},{},[1]);
