const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const audioProxyHandler = require('./server/audioProxyHandler');
require('dotenv').config();

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  
  return {
    entry: './src/main.ts',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'js/[name].[contenthash].js',
      clean: true,
      publicPath: '/'
    },
    resolve: {
      extensions: ['.ts', '.js', '.json'],
      alias: {
        '@': path.resolve(__dirname, 'src')
      },
      fallback: {
        "fs": false,
        "buffer": require.resolve("buffer/"),
        "react-native-fs": false
      }
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: 'ts-loader',
          exclude: /node_modules/
        },
        {
          test: /\.css$/,
          use: [
            isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
            'css-loader'
          ]
        },
        {
          test: /\.(png|jpg|jpeg|gif|svg)$/i,
          type: 'asset/resource',
          generator: {
            filename: 'images/[name].[contenthash][ext]'
          }
        },
        {
          test: /\.(mp3|wav|ogg|m4a)$/i,
          type: 'asset/resource',
          generator: {
            filename: 'audio/[name].[contenthash][ext]'
          }
        },
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/i,
          type: 'asset/resource',
          generator: {
            filename: 'fonts/[name].[contenthash][ext]'
          }
        }
      ]
    },
    plugins: [
      new webpack.ProvidePlugin({
        Buffer: ['buffer', 'Buffer'],
      }),
      new webpack.DefinePlugin({
        'process.env.SONIX_PROVIDER': JSON.stringify(process.env.SONIX_PROVIDER || 'jamendo'),
        'process.env.SONIX_JAMENDO_CLIENT_ID': JSON.stringify(process.env.SONIX_JAMENDO_CLIENT_ID || ''),
        'process.env.SONIX_AUDIUS_APP_NAME': JSON.stringify(process.env.SONIX_AUDIUS_APP_NAME || 'sonix-deck'),
      }),
      new HtmlWebpackPlugin({
        template: './src/index.html',
        filename: 'index.html',
        inject: 'body'
      }),
      ...(isProduction ? [
        new MiniCssExtractPlugin({
          filename: 'css/[name].[contenthash].css'
        })
      ] : []),
      new CopyWebpackPlugin({
        patterns: [
          {
            from: 'public',
            to: '',
            globOptions: {
              ignore: ['**/.DS_Store']
            }
          }
        ]
      })
    ],
    devServer: {
      static: [
        {
          directory: path.join(__dirname, 'dist')
        },
        {
          directory: path.join(__dirname, 'public'),
          publicPath: '/'
        }
      ],
      compress: true,
      port: 3000,
      hot: true,
      open: true,
      historyApiFallback: true,
      setupMiddlewares: (middlewares, devServer) => {
        if (!devServer || !devServer.app) {
          return middlewares;
        }

        const proxyMiddleware = (req, res, next) => {
          Promise.resolve(audioProxyHandler(req, res)).catch(next);
        };

        devServer.app.use('/api/audio-proxy', proxyMiddleware);
        return middlewares;
      }
    },
    optimization: {
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all'
          }
        }
      }
    },
    devtool: isProduction ? 'source-map' : 'eval-source-map'
  };
};