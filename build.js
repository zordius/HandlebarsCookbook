require('object.assign').shim();

// configs
var configs = {
    out_dir: 'generated/',
    data_dir: 'bookdata/',
    partial_dir: 'partials/'
};

// required libs
var fs = require('fs');
var handlebars = require('handlebars');
var yaml = require('js-yaml');

module.exports = function () {
    // all book data
    var data = fs.readdirSync(configs.data_dir).map(function (fn) {
        return Object.assign(yaml.load(fs.readFileSync(configs.data_dir + fn, 'utf8'), {filename: fn}), {pagename: fn.replace(/.yaml/, '')});
    });

    var partials = fs.readdirSync(configs.partial_dir).reduce(function (O, fn) {
        O[fn] = fs.readFileSync(configs.partial_dir + fn, 'utf8');
        return O;
    }, {});

    if (!fs.existsSync(configs.out_dir)) {
        fs.mkdirSync(configs.out_dir);
    }

    handlebars.compile('{{#book_writer .}}{{> template}}{{/book_writer}}')(Object.assign(data, {configs: configs}), {
        partials: partials,
        helpers: require('./helpers')
    });
};
