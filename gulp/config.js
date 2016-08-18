const path = require('path');
const root = path.resolve(`${__dirname}/..`);
module.exports = {
	root: root,
	paths: {
		main: {
			css: 'source/css',
			sass: 'sass',
		},
		option: {
			css: 'source/css',
			sass: 'sass',
		}
	},
	options: {
		libsass: {
			outputStyle: 'expanded'
		},
		pleeease: {
			mqpacker: true,
			minifier: false,
			sourcemaps: false,
			autoprefixer: {
				browsers: ['last 2 Chrome versions'],
				cascade: false
			}
		},
		notify: {
			uglify: {
				message: 'Watch Uglify finished running',
				onLast: true,
				icon: './node_modules/gulp-notify/assets/gulp.png'
			},
			css: {
				message: 'CSS Compiled finished running',
				onLast: true,
				icon: './node_modules/gulp-notify/assets/gulp.png'
			},
			sprite: {
				message: 'Generated an sprite image finished running',
				onLast: true,
				icon: './node_modules/gulp-notify/assets/gulp.png'
			}
		}
	}
};
