var gulp = require('gulp')
var tsc = require('gulp-tsc')

var locations = {
  src: './tstags/**/*.ts',
  dest: './tstags'
}

gulp.task('watch', function () {
  return gulp.watch(locations.src, ['build'])
})

gulp.task('build', function () {
  return gulp.src(locations.src)
    .pipe(tsc({
      target: 'ES5',
      declarationFiles: false,
      noExternalResolve: true,
      emitError: false
    }))
    .pipe(gulp.dest(locations.dest))
})

gulp.task('default', ['build'])
