import 'babel-polyfill';

const gulp = require('gulp');
const $ = require('gulp-load-plugins')({ pattern: '*' });
const config = require('../config');
const path = config.paths;

// ==============================================
// watch
// ==============================================
/* Tasks */
gulp.task('w', ['watch']);
gulp.task('watch', () => watch());
// ==============================================
/* functions */
function watch(){
	// Sass
	$.watch(`sass/contents_style.scss`, () => gulp.start('css:main'));
	$.watch(`sass/options.scss`, () => gulp.start('css:option'));
}
// ==============================================
