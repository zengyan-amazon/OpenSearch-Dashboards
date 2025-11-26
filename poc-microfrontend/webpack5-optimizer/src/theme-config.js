/*
 * Separate webpack configuration for theme CSS files
 * This builds ONLY CSS themes without JavaScript duplication
 */

const Path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { REPO_ROOT } = require('@osd/utils');

exports.getWebpack5ThemeConfig = ({ dev = false } = {}) => ({
  mode: dev ? 'development' : 'production',
  
  // Theme-only entry points (CSS only)
  entry: {
    'osd-ui-shared-deps.v7.dark': ['@elastic/eui/dist/eui_theme_dark.css'],
    'osd-ui-shared-deps.v7.light': ['@elastic/eui/dist/eui_theme_light.css'],
    'osd-ui-shared-deps.v8.dark': ['@elastic/eui/dist/eui_theme_next_dark.css'],
    'osd-ui-shared-deps.v8.light': ['@elastic/eui/dist/eui_theme_next_light.css'],
    'osd-ui-shared-deps.v9.dark': ['@elastic/eui/dist/eui_theme_v9_dark.css'],
    'osd-ui-shared-deps.v9.light': ['@elastic/eui/dist/eui_theme_v9_light.css'],
  },
  
  output: {
    path: Path.resolve(REPO_ROOT, 'poc-microfrontend/dist/shared-deps'),
    filename: '[name].theme.js', // Temporary JS files (will be minimal)
  },

  plugins: [
    new MiniCssExtractPlugin({
      filename: '[name].css',
    }),
  ],

  module: {
    rules: [
      // CSS handling for themes
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
        ],
      },
    ],
  },

  // Disable JS optimization for CSS-only build
  optimization: {
    splitChunks: false,
  },

  performance: {
    hints: false,
  },
});
