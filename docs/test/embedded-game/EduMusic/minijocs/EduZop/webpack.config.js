const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = (env, argv) => {
  const mode = argv.mode || 'production';

  return {
    mode,
    target: 'web',
    entry: path.resolve(__dirname, 'src/root.coffee'),
    output: {
      path: path.resolve(__dirname, 'docs'),
      filename: 'js/bundle.js',
      publicPath: mode === 'production' ? './' : '/',
      clean: true
    },
    resolve: {
      extensions: ['.coffee', '.js', '.json'],
      modules: [path.resolve(__dirname, 'src'), 'node_modules']
    },
    module: {
      rules: [
        {
          test: /\.coffee$/,
          use: 'coffee-loader'
        },
        {
          test: /\.styl$/,
          use: [
            'style-loader',
            'css-loader',
            {
              loader: 'stylus-loader',
              options: {
                webpackImporter: false,
                stylusOptions: {
                  includeCSS: true,
                  paths: [path.resolve(__dirname, 'node_modules')]
                }
              }
            }
          ]
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader']
        }
      ]
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: path.resolve(__dirname, 'src/index.html'),
        inject: 'body'
      }),
      new CopyPlugin({
        patterns: [
          { from: path.resolve(__dirname, 'src/static'), to: '.' },
          { from: path.resolve(__dirname, 'src/404.html'), to: '404.html' }
        ]
      }),
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(mode),
        'process.env.API_URL': JSON.stringify(process.env.API_URL || ''),
        'process.env.PORT': JSON.stringify(process.env.PORT || ''),
        'process.env.WEBPACK_DEV_HOSTNAME': JSON.stringify(process.env.WEBPACK_DEV_HOSTNAME || 'localhost')
      }),
      new webpack.ProvidePlugin({
        process: 'process/browser'
      })
    ],
    devtool: mode === 'production' ? false : 'source-map',
    devServer: {
      static: false,
      headers: {
        'Cache-Control': 'no-store'
      },
      historyApiFallback: true,
      open: false,
      port: 3004
    }
  };
};
