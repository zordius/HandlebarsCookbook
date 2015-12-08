require('object.assign').shim();

// configs
var configs = {
    project_name: 'Handlebars Cookbook',
    out_dir: 'generated/',
    data_dir: 'bookdata/',
    partial_dir: 'partials/'
};

// required libs
var fs = require('fs');
var handlebars = require('handlebars');
var yaml = require('js-yaml');

module.exports = function () {
    delete require.cache[require.resolve('./helpers')];

    // all book data
    var data = fs.readdirSync(configs.data_dir).reduce(function (O, fn) {
        if (fn.match(/.yaml$/)) {
            O.push(Object.assign(yaml.load(fs.readFileSync(configs.data_dir + fn, 'utf8'), {filename: fn}), {pagename: O.length ? fn.replace(/.yaml/, '') : 'index'}));
        }
        return O;
    }, []);

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
