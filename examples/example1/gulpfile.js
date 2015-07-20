var toIDOM = require('../../index.js');

var gulp = require('gulp');
var concat = require('gulp-concat');

gulp.task('default', function() {
    gulp.src(['*/*.ejs'])
        .pipe(toIDOM())
        .pipe(concat('templates.js'))
        .pipe(gulp.dest('bin/'));
});