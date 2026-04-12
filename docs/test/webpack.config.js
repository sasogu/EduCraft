'use strict'

var path = require('path')

module.exports = function (_env, argv) {
    var mode = (argv && argv.mode) || process.env.NODE_ENV || 'development'

    return {
        mode: mode,
        devtool: mode === 'production' ? false : 'eval-cheap-module-source-map',
        entry: './index.js',
        output: {
            path: path.resolve('.'),
            filename: 'bundle.js',
        },
        resolve: {
            alias: {
                'dexie/dist/dexie.mjs': 'dexie/dist/dexie.js',
                'dexie/dist/dexie': 'dexie/dist/dexie.js',
                'dexie$': 'dexie/dist/dexie.js',
            },
            mainFields: ['main'],
        },
        module: {
            rules: [
                {
                    test: /\.mjs$/,
                    include: /node_modules/,
                    type: 'javascript/auto',
                },
            ],
        },
        devServer: {
            inline: true,
            host: '0.0.0.0',
            stats: 'minimal',
        },
    }
}
