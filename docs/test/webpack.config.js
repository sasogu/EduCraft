'use strict'

var path = require('path')


module.exports = {
    mode: 'development',
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
        host: "0.0.0.0",
        stats: "minimal",
    },
}

