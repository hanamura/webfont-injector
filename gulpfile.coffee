browserify = require 'browserify'
buffer     = require 'vinyl-buffer'
gulp       = require 'gulp'
rename     = require 'gulp-rename'
source     = require 'vinyl-source-stream'
uglify     = require 'gulp-uglify'
webserver  = require 'gulp-webserver'

pkg = require './package'

# build
# =====

build = (src, name, nameMin) ->
  browserify entries: [src]
    .bundle()
    .pipe source name
    .pipe buffer()
    .pipe gulp.dest '.'
    .pipe uglify()
    .pipe rename nameMin
    .pipe gulp.dest '.'

gulp.task 'export', ->
  build './export.js', \
        pkg.name + '.js', \
        pkg.name + '.min.js'

gulp.task 'export-pkgd', ->
  build './export.pkgd.js', \
        pkg.name + '.pkgd.js', \
        pkg.name + '.pkgd.min.js'

gulp.task 'build', ['export', 'export-pkgd']

# watch
# =====

gulp.task 'watch', ['build'], ->
  gulp.watch [
    'index.js'
    'export.js'
    'export-pkgd.js'
    'generators/**/*.js'
  ], ['export', 'export-pkgd']
