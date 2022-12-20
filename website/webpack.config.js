const path = require('path')

// Babel loader for Transpiling ES8 Javascript for browser usage
const babelLoader = {
	test: /\.js$/,
	include: [path.resolve(__dirname, '../app')],
	use: {
		loader: 'babel-loader',
		options: {
			presets: ['es2017']
		}
	}
}

// SCSS loader for transpiling SCSS files to CSS
const scssLoader = {
	test: /\.scss$/,
	use: ['style-loader', { loader: 'css-loader', options: { url: false } }, 'sass-loader']
}

// URL loader to resolve data-urls at build time
const urlLoader = {
	test: /\.(png|woff|woff2|eot|ttf|svg)$/,
	use: [{ loader: 'url-loader', options: { limit: 100000 } }]
}

// HTML load to allow us to import HTML templates into our JS files
const htmlLoader = {
	test: /\.html$/,
	use: [{ loader: 'html-loader', options: {sources: false }}]
}

const webpackConfig = {
	entry: './app/main.js', // Start at app/main.js
	output: {
		path: path.resolve(__dirname, 'public'),
		filename: 'bundle.js' // Output to public/bundle.js
	},
	module: { rules: [ babelLoader, scssLoader, urlLoader, htmlLoader ] },
	mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
}

if (webpackConfig.mode === 'development') {
	// Generate sourcemaps for dev build
	webpackConfig.devtool = 'eval-source-map'
}

module.exports = webpackConfig