"use strict";
var webpack = require('webpack');
var path = require('path');
var glob_copy_webpack_plugin_1 = require('../plugins/glob-copy-webpack-plugin');
var suppress_entry_chunks_webpack_plugin_1 = require('../plugins/suppress-entry-chunks-webpack-plugin');
var package_chunk_sort_1 = require('../utilities/package-chunk-sort');
var base_href_webpack_1 = require('@angular-cli/base-href-webpack');
var webpack_build_utils_1 = require('./webpack-build-utils');
var autoprefixer = require('autoprefixer');
var ProgressPlugin = require('webpack/lib/ProgressPlugin');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var CopyWebpackPlugin = require('copy-webpack-plugin');
var SilentError = require('silent-error');
/**
 * Enumerate loaders and their dependencies from this file to let the dependency validator
 * know they are used.
 *
 * require('source-map-loader')
 * require('raw-loader')
 * require('script-loader')
 * require('json-loader')
 * require('url-loader')
 * require('file-loader')
 */
function getWebpackCommonConfig(projectRoot, environment, appConfig, baseHref, sourcemap, vendorChunk, verbose, progress) {
    var appRoot = path.resolve(projectRoot, appConfig.root);
    var appMain = path.resolve(appRoot, appConfig.main);
    var nodeModules = path.resolve(projectRoot, 'node_modules');
    var extraPlugins = [];
    var extraRules = [];
    var lazyChunks = [];
    var entryPoints = {
        main: [appMain]
    };
    if (!(environment in appConfig.environments)) {
        throw new SilentError("Environment \"" + environment + "\" does not exist.");
    }
    // process global scripts
    if (appConfig.scripts.length > 0) {
        var globalScrips = webpack_build_utils_1.extraEntryParser(appConfig.scripts, appRoot, 'scripts');
        // add entry points and lazy chunks
        globalScrips.forEach(function(script) {
            if (script.lazy) {
                lazyChunks.push(script.entry);
            }
            entryPoints[script.entry] = (entryPoints[script.entry] || []).concat(script.path);
        });
        // load global scripts using script-loader
        extraRules.push({
            include: globalScrips.map(function(script) { return script.path; }),
            test: /\.js$/,
            loader: 'script-loader'
        });
    }
    // process global styles
    if (appConfig.styles.length === 0) {
        // create css loaders for component css
        extraRules.push.apply(extraRules, webpack_build_utils_1.makeCssLoaders());
    } else {
        var globalStyles = webpack_build_utils_1.extraEntryParser(appConfig.styles, appRoot, 'styles');
        var extractedCssEntryPoints_1 = [];
        // add entry points and lazy chunks
        globalStyles.forEach(function(style) {
            if (style.lazy) {
                lazyChunks.push(style.entry);
            }
            if (!entryPoints[style.entry]) {
                // since this entry point doesn't exist yet, it's going to only have
                // extracted css and we can supress the entry point
                extractedCssEntryPoints_1.push(style.entry);
                entryPoints[style.entry] = (entryPoints[style.entry] || []).concat(style.path);
            } else {
                // existing entry point, just push the css in
                entryPoints[style.entry].push(style.path);
            }
        });
        // create css loaders for component css and for global css
        extraRules.push.apply(extraRules, webpack_build_utils_1.makeCssLoaders(globalStyles.map(function(style) { return style.path; })));
        if (extractedCssEntryPoints_1.length > 0) {
            // don't emit the .js entry point for extracted styles
            extraPlugins.push(new suppress_entry_chunks_webpack_plugin_1.SuppressEntryChunksWebpackPlugin({ chunks: extractedCssEntryPoints_1 }));
        }
    }
    if (vendorChunk) {
        extraPlugins.push(new webpack.optimize.CommonsChunkPlugin({
            name: 'vendor',
            chunks: ['main'],
            minChunks: function(module) { return module.userRequest && module.userRequest.startsWith(nodeModules); }
        }));
    }
    if (progress) {
        extraPlugins.push(new ProgressPlugin({ profile: verbose, colors: true }));
    }
    return {
        target: 'electron-renderer',
        externals: [
            (function() {
                var IGNORES = [
                    'electron'
                ];
                return function(context, request, callback) {
                    if (IGNORES.indexOf(request) >= 0) {
                        return callback(null, "require('" + request + "')");
                    }
                    return callback();
                };
            })()
        ],
        devtool: sourcemap ? 'source-map' : false,
        resolve: {
            extensions: ['.ts', '.js'],
            modules: [nodeModules],
        },
        resolveLoader: {
            modules: [nodeModules]
        },
        context: projectRoot,
        entry: entryPoints,
        output: {
            path: path.resolve(projectRoot, appConfig.outDir)
        },
        module: {
            rules: [
                { enforce: 'pre', test: /\.js$/, loader: 'source-map-loader', exclude: [nodeModules] },
                { test: /\.json$/, loader: 'json-loader' },
                { test: /\.(jpg|png|gif)$/, loader: 'url-loader?limit=10000' },
                { test: /\.html$/, loader: 'raw-loader' },
                { test: /\.(otf|ttf|woff|woff2)$/, loader: 'url-loader?limit=10000' },
                { test: /\.(eot|svg)$/, loader: 'file-loader' }
            ].concat(extraRules)
        },
        plugins: [
            new HtmlWebpackPlugin({
                template: path.resolve(appRoot, appConfig.index),
                filename: path.resolve(appConfig.outDir, appConfig.index),
                chunksSortMode: package_chunk_sort_1.packageChunkSort(['inline', 'styles', 'scripts', 'vendor', 'main']),
                excludeChunks: lazyChunks
            }),
            new base_href_webpack_1.BaseHrefWebpackPlugin({
                baseHref: baseHref
            }),
            new CopyWebpackPlugin([{
                context: path.resolve(appRoot),
                from: "entry.js"
            }]),
            new webpack.NormalModuleReplacementPlugin(
                // This plugin is responsible for swapping the environment files.
                // Since it takes a RegExp as first parameter, we need to escape the path.
                // See https://webpack.github.io/docs/list-of-plugins.html#normalmodulereplacementplugin
                new RegExp(path.resolve(appRoot, appConfig.environments['source'])
                    .replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&')), path.resolve(appRoot, appConfig.environments[environment])),
            new webpack.optimize.CommonsChunkPlugin({
                minChunks: Infinity,
                name: 'inline'
            }),
            new glob_copy_webpack_plugin_1.GlobCopyWebpackPlugin({
                patterns: appConfig.assets,
                globOptions: { cwd: appRoot, dot: true, ignore: '**/.gitkeep' }
            }),
            new webpack.LoaderOptionsPlugin({
                test: /\.(css|scss|sass|less|styl)$/,
                options: {
                    postcss: [autoprefixer()],
                    cssLoader: { sourceMap: sourcemap },
                    sassLoader: { sourceMap: sourcemap },
                    lessLoader: { sourceMap: sourcemap },
                    stylusLoader: { sourceMap: sourcemap },
                    // context needed as a workaround https://github.com/jtangelder/sass-loader/issues/285
                    context: projectRoot,
                },
            })
        ].concat(extraPlugins),
        node: {
            fs: 'empty',
            global: true,
            crypto: 'empty',
            tls: 'empty',
            net: 'empty',
            process: true,
            module: false,
            clearImmediate: false,
            setImmediate: false
        }
    };
}
exports.getWebpackCommonConfig = getWebpackCommonConfig;
//# sourceMappingURL=/Users/hans/Sources/angular-cli/packages/angular-cli/models/webpack-build-common.js.map