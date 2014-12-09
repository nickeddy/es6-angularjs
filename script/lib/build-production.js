#!/usr/bin/env node

'use strict';

// # Build production
// Config-less assetgraph production builder
// Takes a root directory and outputs a optimized version
//
// How:
// 1. Find all *.html assets and build a graph with all linked resources
// 2. assetgraph builder does most of the optimization (concat, minify etc)
// 3. System.js bundle is created for System.import's, with a System.config
//
// Use:
// ./build-production.js --root ./client --outroot ./dist

var path = require('path');
var fs = require('fs');

var AssetGraph = require('assetgraph-builder');

var argv = require('minimist')(process.argv.slice(2));
var config = {
  root: argv.root,
  outRoot: argv.outroot,
  loadAssets: (argv._[0] ? argv._ : ['*.html', 'favicon.ico']),
  optimizeImages: false,
  inlineSize: 4096,
  sharedBundles: false,
  manifest: false,
  version: undefined,
  noCompress: false,
  stripDebug: false,
  browsers: ['> 1%', 'last 2 versions', 'Firefox ESR']
};

fs.readdirSync(path.resolve(__dirname, 'build-transforms')).forEach(function (fileName) {
  AssetGraph.registerTransform(path.resolve(__dirname, 'build-transforms', fileName));
});

if (!config.root || !config.outRoot) {
  throw new Error('--root and --outroot need to set');
}

new AssetGraph({ root: config.root })
  .logEvents({
    repl: undefined,
    stopOnWarning: false,
    suppressJavaScriptCommonJsRequireWarnings: true
  })
  .registerRequireJsConfig({
    preventPopulationOfJavaScriptAssetsUntilConfigHasBeenFound: true
  })
  .loadAssets(config.loadAssets)
  .removeRelations({
    type: 'HtmlScript',
    to: {
      url: /\/hint.js$/
    }
  }, {
    unresolved: true,
    detach: true,
    removeOrphan: true
  })
  .systemJsProduction({
    root: config.root,
    outRoot: config.outRoot,

    // comment out the below to use injection instead of bundling
    // override use of app-compiled, admin-compiled to ensure source maps
    configOverride: {
      map: {
        app: 'app',
        admin: 'admin'
      }
    },
    bundle: true
  })
  .buildProduction({
    version: config.version,
    optimizeImages: config.optimizeImages,
    inlineSize: config.inlineSize,
    browsers: config.browsers,
    manifest: config.manifest,
    sharedBundles: config.sharedBundles,
    noCompress: config.noCompress,
    stripDebug: config.stripDebug
  })
  .writeAssetsToDisc({ url: /^file:/, isLoaded: true }, config.outRoot)
  .writeStatsToStderr()
  .run();
