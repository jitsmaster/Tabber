const path = require('path');

module.exports = {
	mode: 'development',
	devtool: 'inline-source-map',
	entry: './src/index.jsx',
	output: {
		filename: 'main.js',
		path: __dirname
	},
	resolve: {
		extensions: ['.js', '.jsx', '.json']
	},
	module: {
		rules: [
			{
				test: /\.(js|jsx)$/,
				exclude: /node_modules/,
				use: {
					loader: 'babel-loader',
					options: {
						presets: [
							'@babel/preset-env',
							['@babel/preset-react', { runtime: 'automatic' }]
						]
					}
				}
			}
		]
	}
};