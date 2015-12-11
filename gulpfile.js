var gulp = require('gulp');
var del = require('del');
var eslint = require('gulp-eslint');
var browserSync = require('browser-sync').create();
var lint_files = ['*.js'];

gulp.task('watch', ['build'], function () {
    gulp.watch(lint_files, ['lint', 'build']);
    gulp.watch(['partials/*', 'bookdata/*'], ['build']);
});

gulp.task('lint', function () {
    return gulp.src(lint_files)
    .pipe(eslint())
    .pipe(eslint.format());
});

gulp.task('clean', function () {
    return del('generated/*');
});

gulp.task('build', ['clean'], function () {
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

gulp.task('default', ['watch', 'browser-sync']);
