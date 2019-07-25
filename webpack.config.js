const version = JSON.stringify(require("./package.json").version).replace(/\"/g, '');

module.exports = [{
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
    },
}];