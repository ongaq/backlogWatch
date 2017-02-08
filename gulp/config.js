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
				title: 'Gulp notifitication: Uglify',
				message: 'Generated file: <%= file.relative %> @ <%= options.date %>',
				templateOptions: {
					date: null
				},
				onLast: true,
				icon: `${root}/node_modules/gulp-notify/assets/gulp.png`
			},
			css: {
				title: 'Gulp notifitication: Sass',
				message: 'Generated file: <%= file.relative %> @ <%= options.date %>',
				templateOptions: {
					date: null
				},
				onLast: true,
				icon: `${root}/node_modules/gulp-notify/assets/gulp.png`
			}
		}
	}
};
