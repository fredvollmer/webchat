/* eslint-disable no-console */
const path = require('path');
const merge = require('webpack-merge');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const config = require('./webpack.config.base');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const { version } = require('../package.json');

const cdnUrl = process.env.QUIQ_CDN || './';
const commitHash = process.env.GIT_COMMIT || 'dev';
const uniqueUrlPiece = `${version}-${commitHash.substring(0, 8)}`;
console.log(`cdn url is ${cdnUrl}`);
console.log(`uniqueUrlPiece is ${uniqueUrlPiece}`);

const GLOBALS = {
  'process.env': {
    NODE_ENV: JSON.stringify('production'),
  },
  __DEV__: JSON.stringify(JSON.parse(process.env.DEBUG || 'false')),
};

module.exports = merge(config, {
  output: {
    filename: `[name]-[chunkhash]-${uniqueUrlPiece}.js`,
    path: path.resolve(__dirname, '../dist'),
    publicPath: cdnUrl
  },
  debug: false,
  devtool: 'source-map',
  entry: {
    webchat: 'production',
    common: ['react', 'react-dom' ],
  },
  plugins: [
    new CopyWebpackPlugin([
      {
        from: 'app/assets',
        to: 'assets',
      },
    ]),
    // Avoid publishing files when compilation fails
    new webpack.NoErrorsPlugin(),
    new webpack.DefinePlugin(GLOBALS),
    new webpack.optimize.DedupePlugin(),
    new webpack.optimize.UglifyJsPlugin({
      compress: {
        warnings: false,
        screw_ie8: true,
        drop_console: true,
      },
      output: {
        comments: false,
      },
      sourceMap: true,
    }),
    new webpack.LoaderOptionsPlugin({
      minimize: true,
      debug: false,
    }),
    new webpack.optimize.CommonsChunkPlugin({
      name: 'common',
      filename: `[name]-[chunkhash]-${uniqueUrlPiece}.js`,
      minChunks: Infinity,
    }),
    new ExtractTextPlugin({
      filename: `[name]-[chunkhash]-${uniqueUrlPiece}.css`,
      allChunks: true,
    }),
  ],
  module: {
    noParse: /\.min\.js$/,
    loaders: [
      {
        test: /\.scss$/,
        include: [
          path.resolve(__dirname, '../app'),
          path.resolve(__dirname, '../app/components'),
        ],
        loader: ExtractTextPlugin.extract({
          fallbackLoader: 'style',
          loader: [
            { loader: 'css', query: { sourceMap: true } },
            'postcss',
            { loader: 'namespace-css', query: '#quiqWebChat' },
            { loader: 'sass', query: { outputStyle: 'compressed' } },
          ],
        }),
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg)$/,
        loader: 'url',
        query: {
          limit: 8192,
          name: `images/[name]-[chunkhash]-${uniqueUrlPiece}.[ext]`,
        },
      },
      {
        test: /\.(woff|woff2|ttf|eot)(\?v=\d+\.\d+\.\d+)?$/,
        loader: 'url',
        query: {
          limit: 8192,
          name: `fonts/[name]-[chunkhash]-${uniqueUrlPiece}.[ext]`,
        },
      },
    ],
  },
});
