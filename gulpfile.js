var gulp = require('gulp')
var tsc = require('gulp-tsc')

var locations = {
  src: ['./**/*.ts', '!typings/**', '!node_modules/**'],
  dest: './'
}

gulp.task('build', function () {
  return gulp.src(locations.src)

    // Compile ALL typescript sources as CommonJS modules.
    .pipe(tsc({
      module: 'CommonJS',
      sourcemap: false,
      emitError: false,
      outDir: locations.dest
    }))

    // Generate build outputs.
    .pipe(gulp.dest(locations.dest))
})

gulp.task('default', ['build'])
