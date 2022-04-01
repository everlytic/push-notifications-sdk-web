const version = JSON.stringify(require("./package.json").version).replace(/\"/g, '');
const CopyPlugin = require("copy-webpack-plugin");

module.exports = [{
    mode: 'production',
    plugins: [
        new CopyPlugin({
            patterns: [
                { from: __dirname + "/src/icon.png", to: "" },
                { from: __dirname + "/src/modal-close.png", to: "" },
                { from: __dirname + "/src/notification-icon.png", to: "" },
            ],
        }),
    ],
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /(node_modules|bower_components)/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env']
                    }
                }
            }
        ]
    },
    entry: './src/everlytic-push-sdk.js',
    output: {
        'filename': 'everlytic-push-sdk-' + version + '.min.js',
    }
}, {
    mode: 'production',
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /(node_modules|bower_components)/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env']
                    }
                }
            }
        ]
    },
    entry: './src/everlytic-push-sw.js',
    output: {
        'filename': 'everlytic-push-sw-' + version + '.min.js',
    }
},];