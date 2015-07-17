var HTMLtoIncrementalDOM = require('../index.js');

var gulp = require('gulp');
var concat = require('gulp-concat');

gulp.task('default', function() {
    gulp.src('./template/*.html')
        .pipe(HTMLtoIncrementalDOM())
        .pipe(concat('templates.js'))
        .pipe(gulp.dest('bin'));
});