var gulp = require('gulp');
var del = require('del');
var eslint = require('gulp-eslint');
var less = require('gulp-less');
var browserSync = require('browser-sync').create();
var lint_files = ['*.js'];
var less_files = ['*.less'];

gulp.task('watch', ['build'], function () {
    gulp.watch(lint_files, ['lint', 'build']);
    gulp.watch(['partials/*', 'bookdata/*'], ['build']);
});

gulp.task('watchless', ['less'], function () {
    gulp.watch(less_files, ['less']);
});

gulp.task('lint', function () {
    return gulp.src(lint_files)
    .pipe(eslint())
    .pipe(eslint.format());
});

gulp.task('less', function () {
    return gulp.src(less_files)
    .pipe(less())
    .pipe(gulp.dest('generated'))
    .pipe(browserSync.stream());
});

gulp.task('clean', function () {
    return del('generated/*.html');
});

gulp.task('build', ['clean', 'less'], function () {
    delete require.cache[require.resolve('./build')];
    require('./build')();
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

gulp.task('default', ['watch', 'watchless', 'browser-sync']);
