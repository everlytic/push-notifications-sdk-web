const MinifyPlugin = require("babel-minify-webpack-plugin");
module.exports = [{
    entry: './src/everlytic-push-sdk.js',
    output: {
        'filename': 'everlytic-push-sdk.min.js',
    },
    plugins: [
        new MinifyPlugin()
    ]
}, {
    entry: './src/everlytic-push-sw.js',
    output: {
        'filename': 'everlytic-push-sw.min.js',
    },
    plugins: [
        new MinifyPlugin()
    ]
}];