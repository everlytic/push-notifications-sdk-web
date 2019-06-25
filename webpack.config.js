const MinifyPlugin = require("babel-minify-webpack-plugin");
const version = JSON.stringify(require("./package.json").version).replace(/\"/g, '');

module.exports = [{
    entry: './src/everlytic-push-sdk.js',
    output: {
        'filename': 'everlytic-push-sdk-' + version + '.min.js',
    },
    plugins: [
        new MinifyPlugin()
    ]
}, {
    entry: './src/everlytic-push-sw.js',
    output: {
        'filename': 'everlytic-push-sw-' + version + '.min.js',
    },
    plugins: [
        new MinifyPlugin()
    ]
}];