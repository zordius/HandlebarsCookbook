const gulp = require('gulp')
const del = require('del')
const eslint = require('gulp-eslint')
const gulpless = require('gulp-less')

const browserSync = require('browser-sync').create()
const lintFiles = ['*.js']
const lessFiles = ['*.less']

const clean = () => del('generated/*.html')

const less = () =>
  gulp.src(lessFiles)
    .pipe(gulpless())
    .pipe(gulp.dest('generated'))
    .pipe(browserSync.stream())

const build = gulp.series(gulp.parallel(clean, less), () => {
  delete require.cache[require.resolve('./build')]
  require('./build')()
  browserSync.reload()
	console.log('build ok')
})

const watchless = gulp.series(less, () => {
  gulp.watch(lessFiles, less)
})

const lint = () =>
  gulp.src(lintFiles)
    .pipe(eslint())
    .pipe(eslint.format())

const watch = gulp.series(build, () => {
  process.env.NODE_DEV = 'development'
  gulp.watch(lintFiles, gulp.series(lint, build))
  gulp.watch(['partials/*', 'bookdata/*'], build)
})

const browsersync = () => {
  browserSync.init({
    open: false,
    server: {
      baseDir: "./generated/"
    }
  })
}

module.exports = {
  build,
	lint,
  default: gulp.parallel(watch, watchless, browsersync)
}
