const { resolve } = require('path')
const ExtractTextPlugin = require('extract-text-webpack-plugin')

const extractCSS = new ExtractTextPlugin('bundle.css')

module.exports = {
  entry: resolve(__dirname, './src/main.js'),
  output: {
    path: resolve(__dirname, './dist'),
    filename: 'bundle.js',
  },
  module: {
    rules: [
      {
        test: /\.(js)$/,
        exclude: /(node_modules|bower_components)/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: [['env', { modules: false }]],
              plugins: ['transform-class-properties'],
            },
          },
        ],
      },
      {
        test: /\.(css)$/,
        // exclude: /(node_modules|bower_components)/,
        use: extractCSS.extract({
          fallback: 'style-loader',
          use: [
            { loader: 'css-loader' },
          ],
        }),
      },
    ],
  },
  plugins: [
    extractCSS,
  ],
}
