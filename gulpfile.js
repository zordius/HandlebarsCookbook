var gulp = require('gulp');
var eslint = require('gulp-eslint');
var browserSync = require('browser-sync').create();
var build = require('./build');
var lint_files = ['*.js'];

gulp.task('watch', function () {
    gulp.watch(['partials/*', 'helpers.js', 'bookdata/*'], ['build']);
    gulp.watch(lint_files, ['lint']);
});

gulp.task('lint', function () {
    return gulp.src(lint_files)
    .pipe(eslint())
    .pipe(eslint.format());
});

gulp.task('build', function () {
    build();
    browserSync.reload();
});

gulp.task('browser-sync', function() {
    browserSync.init({
        open: false,
        server: {
            baseDir: "./generated/"
        }
    });
});

gulp.task('default', ['watch', 'browser-sync']);
