import 'babel-polyfill';

const gulp = require('gulp');
const $ = require('gulp-load-plugins')({ pattern: '*' });
const config = require('../config');
const path = config.paths;

// ==============================================
// sass
// ==============================================
/* Tasks */
gulp.task('css', ['css:main', 'css:option']);
gulp.task('css:main', () => runningSass(path.main.sass, path.main.css));
gulp.task('css:option', () => runningSass(path.option.sass, path.option.css));
// ==============================================
/* functions */
function runningSass(_sass, _css){
	var pathSass = `${_sass}/*.scss`;
	var runSass = gulp.src(pathSass)
	.pipe($.plumber({ errorHandler: $.notify.onError('<%= error.message %>') }))
	// .pipe($.changed(css, { extension: '.css' }))
	.pipe($.sass(config.options.libsass))
	.pipe($.pleeease(config.options.pleeease))
	.pipe($.notify(config.options.notify.css))
	.pipe(gulp.dest(_css));

	return runSass;
}
// ==============================================
