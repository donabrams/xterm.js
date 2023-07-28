/**
 * Copyright (c) 2023 Donald Abrams. All rights reserved.
 * @license MIT
 */

const path = require('path');

const CopyWebpackPlugin = require("copy-webpack-plugin");

const addonName = 'SkiaAddon';
const mainFile = 'xterm-addon-skia.js';

module.exports = {
  entry: `./out/${addonName}.js`,
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.js$/,
        use: ["source-map-loader"],
        enforce: "pre",
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    modules: ['./node_modules'],
    extensions: [ '.js' ],
    alias: {
      common: path.resolve('../../out/common'),
      browser: path.resolve('../../out/browser')
    }
  },
  output: {
    filename: mainFile,
    path: path.resolve('./lib'),
    library: addonName,
    libraryTarget: 'umd'
  },
  mode: 'production',
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        {
          from: "node_modules/canvaskit-wasm/bin/canvaskit.wasm",
          to: "canvaskit.wasm",
        },
      ]})
  ]
};
